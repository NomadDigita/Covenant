package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"backend/database"
	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Regex compilation for input sanitization
var (
	hexRegex    = regexp.MustCompile(`^[0-9a-fA-F]+$`)
	nameRegex   = regexp.MustCompile(`^[a-zA-Z0-9_\-\s]+$`)
	semverRegex = regexp.MustCompile(`^v?[0-9]+\.[0-9]+\.[0-9]+$`)
)

// RegisterAgentPayload defines the parameters required to register a new AI Agent
type RegisterAgentPayload struct {
	WalletAddress string   `json:"wallet_address" binding:"required"`
	Name          string   `json:"name" binding:"required"`
	OwnerAddress  string   `json:"owner_address" binding:"required"`
	Capabilities  []string `json:"capabilities"`
	Version       string   `json:"version"`
	Description   string   `json:"description"`
}

// isValidCasperAddress checks if the trimmed key represents a valid Casper Public Key or Account Hash
func isValidCasperAddress(addr string) bool {
	clean := strings.TrimSpace(addr)
	clean = strings.TrimPrefix(clean, "account-hash-")
	clean = strings.TrimPrefix(clean, "hash-")
	
	length := len(clean)
	// A valid Casper public key is 66 chars (starting with 01 or 02). 
	// A valid Casper account hash or contract hash is exactly 64 chars.
	if length != 64 && length != 66 {
		return false
	}
	return hexRegex.MatchString(clean)
}

// QueryCasperNodeRPC executes a JSON-RPC query against the Casper Testnet nodes
func QueryCasperNodeRPC(method string, params interface{}) (map[string]interface{}, error) {
	nodeURL := "https://rpc.testnet.casper.network/rpc"
	
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  method,
		"params":  params,
	}

	jsonPayload, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", nodeURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var rpcResponse map[string]interface{}
	if err := json.Unmarshal(body, &rpcResponse); err != nil {
		return nil, err
	}

	if errResponse, exists := rpcResponse["error"]; exists {
		return nil, fmt.Errorf("Casper RPC Error: %v", errResponse)
	}

	return rpcResponse, nil
}

// VerifyOnChainRegistration checks if the wallet address is registered inside the on-chain AgentRegistry contract
func VerifyOnChainRegistration(walletAddress string) bool {
	contractHash := os.Getenv("CONTRACT_HASH_AGENT_REGISTRY")
	if contractHash == "" {
		log.Println("[Warning] CONTRACT_HASH_AGENT_REGISTRY is not set. Skipping on-chain verification.")
		return true // Fallback to allow database-only flow if hash is not set
	}

	// Clean and validate address structure
	cleanAddress := strings.TrimSpace(walletAddress)
	cleanAddress = strings.TrimPrefix(cleanAddress, "account-hash-")
	cleanAddress = strings.TrimPrefix(cleanAddress, "hash-")

	if !isValidCasperAddress(cleanAddress) {
		log.Printf("[On-Chain Audit] Rejected invalid wallet format: %s", walletAddress)
		return false
	}

	// Deriving correct 64-character BLAKE2b-256 Odra dictionary key
	dictionaryKey, err := utils.ConvertAddressToDictionaryKey(cleanAddress)
	if err != nil {
		log.Printf("[On-Chain Audit] Failed to derive Odra dictionary key for wallet %s: %v", walletAddress, err)
		return false
	}

	// Query Casper contract dictionary storage key using state_get_dictionary_item
	params := map[string]interface{}{
		"state_root_hash": "",
		"dictionary_identifier": map[string]interface{}{
			"ContractNamedKey": map[string]interface{}{
				"key":                 contractHash,
				"dictionary_name":     "profiles",
				"dictionary_item_key": dictionaryKey,
			},
		},
	}

	_, err = QueryCasperNodeRPC("state_get_dictionary_item", params)
	if err != nil {
		log.Printf("[On-Chain Audit] Verification failed for wallet %s (dictionary_key: %s): %v", walletAddress, dictionaryKey, err)
		return false
	}

	log.Printf("[On-Chain Audit] Verified on-chain AgentRegistry record for: %s (dictionary_key: %s)", walletAddress, dictionaryKey)
	return true
}

// GetOnChainRating reads the live, un-mocked score directly from the deployed contract on Casper Testnet
func GetOnChainRating(contractHashEnvKey string, walletAddress string, defaultVal int) int {
	contractHash := os.Getenv(contractHashEnvKey)
	if contractHash == "" {
		return defaultVal
	}

	// Clean and validate address structure
	cleanAddress := strings.TrimSpace(walletAddress)
	cleanAddress = strings.TrimPrefix(cleanAddress, "account-hash-")
	cleanAddress = strings.TrimPrefix(cleanAddress, "hash-")

	if !isValidCasperAddress(cleanAddress) {
		log.Printf("[On-Chain Audit] Rating rejected malformed wallet format: %s", walletAddress)
		return defaultVal
	}

	// Derive the correct BLAKE2b-256 hash dictionary key expected by Odra structures on-chain
	dictionaryKey, err := utils.ConvertAddressToDictionaryKey(cleanAddress)
	if err != nil {
		log.Printf("[On-Chain Audit] Failed to derive Odra dictionary key for wallet %s: %v. Using local cache fallback.", walletAddress, err)
		return defaultVal
	}

	params := map[string]interface{}{
		"state_root_hash": "",
		"dictionary_identifier": map[string]interface{}{
			"ContractNamedKey": map[string]interface{}{
				"key":                 contractHash,
				"dictionary_name":     "scores",
				"dictionary_item_key": dictionaryKey,
			},
		},
	}

	response, err := QueryCasperNodeRPC("state_get_dictionary_item", params)
	if err != nil {
		log.Printf("[On-Chain Audit] Failed to fetch live score from %s: %v (dictionary_key: %s). Using local cache.", contractHashEnvKey, err, dictionaryKey)
		return defaultVal
	}

	if result, ok := response["result"].(map[string]interface{}); ok {
		if storedValue, ok := result["stored_value"].(map[string]interface{}); ok {
			if clValue, ok := storedValue["CLValue"].(map[string]interface{}); ok {
				if parsedVal, exists := clValue["parsed"]; exists {
					if numericVal, ok := parsedVal.(float64); ok {
						return int(numericVal)
					}
				}
			}
		}
	}

	return defaultVal
}

// RegisterAgent handles the creation of a new Agent ID profile
func RegisterAgent(c *gin.Context) {
	var payload RegisterAgentPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Standardize and sanitize inputs. Strip newlines, spaces, and duplicate prefixes
	payload.WalletAddress = strings.TrimSpace(payload.WalletAddress)
	payload.WalletAddress = strings.TrimPrefix(payload.WalletAddress, "account-hash-")
	payload.WalletAddress = strings.TrimPrefix(payload.WalletAddress, "hash-")

	payload.OwnerAddress = strings.TrimSpace(payload.OwnerAddress)
	payload.OwnerAddress = strings.TrimPrefix(payload.OwnerAddress, "account-hash-")
	payload.OwnerAddress = strings.TrimPrefix(payload.OwnerAddress, "hash-")

	payload.Name = strings.TrimSpace(payload.Name)
	payload.Version = strings.TrimSpace(payload.Version)
	payload.Description = strings.TrimSpace(payload.Description)

	// STRICT VALUE AND FORMAT VALIDATIONS
	if !isValidCasperAddress(payload.WalletAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid wallet_address: must be a valid 64 or 66 character hex standard Casper address"})
		return
	}
	if !isValidCasperAddress(payload.OwnerAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid owner_address: must be a valid 64 or 66 character hex standard Casper address"})
		return
	}
	if len(payload.Name) < 2 || len(payload.Name) > 100 || !nameRegex.MatchString(payload.Name) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid name: must be 2-100 characters and contain alphanumeric symbols, underscores, hyphens, or spaces"})
		return
	}
	if payload.Version != "" && !semverRegex.MatchString(payload.Version) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version: must follow standard semantic versioning rules (e.g. 1.0.0)"})
		return
	}
	if len(payload.Description) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "description exceeds maximum allowed length of 1000 characters"})
		return
	}
	if len(payload.Capabilities) > 15 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "capabilities list cannot contain more than 15 tags"})
		return
	}

	// Validate individual capability elements
	for idx, capVal := range payload.Capabilities {
		trimmedCap := strings.TrimSpace(capVal)
		if len(trimmedCap) < 2 || len(trimmedCap) > 50 || !nameRegex.MatchString(trimmedCap) {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid capability at index %d: must be 2-50 alphanumeric characters", idx)})
			return
		}
		payload.Capabilities[idx] = trimmedCap
	}

	// Verify that the Agent has registered their profile on-chain on Casper Testnet first
	if !VerifyOnChainRegistration(payload.WalletAddress) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Registration rejected. The wallet address is not registered on-chain inside the AgentRegistry contract. Please deploy your CovenantID profile first."})
		return
	}

	// Execute inside a database transaction to preserve referential integrity
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Check if the agent already exists
		var existingAgent models.Agent
		err := tx.Where("wallet_address = ?", payload.WalletAddress).First(&existingAgent).Error
		if err == nil {
			return errors.New("agent with this wallet address already registered")
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		// 1. Create Agent Identity Record (CovenantID)
		agent := models.Agent{
			WalletAddress: payload.WalletAddress,
			Name:          payload.Name,
			OwnerAddress:  payload.OwnerAddress,
			Capabilities:  payload.Capabilities,
			Version:       payload.Version,
			Description:   payload.Description,
		}
		if err := tx.Create(&agent).Error; err != nil {
			return err
		}

		// 2. Initialize CovenantScore (Reputation Score profile)
		reputation := models.ReputationScore{
			AgentID:         agent.ID,
			TrustScore:      500, // Baseline start
			JobsCompleted:   0,
			SuccessRate:     100.00,
			FailureRate:     0.00,
			CommunityRating: 5.00,
		}
		if err := tx.Create(&reputation).Error; err != nil {
			return err
		}

		// 3. Initialize CovenantCredit (Credit Score profile)
		credit := models.CreditScore{
			AgentID:            agent.ID,
			CreditScore:        500, // Baseline start
			TransactionVolume:  0.0,
			PaymentReliability: 100.00,
		}
		if err := tx.Create(&credit).Error; err != nil {
			return err
		}

		// 4. Record Initial Audit Log
		audit := models.AuditLog{
			AgentID:             agent.ID,
			ActionType:          "Agent Registration",
			DecisionStatus:      "Created",
			TrustScoreSnapshot:  500,
			CreditScoreSnapshot: 500,
			RiskLevel:           "Low",
			Justification:       "Agent registered successfully. Established verifiable identity layer (CovenantID) and initialized baseline credit and reputation templates.",
		}
		if err := tx.Create(&audit).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete agent registration: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Agent registered successfully",
		"wallet_address": payload.WalletAddress,
		"initial_scores": gin.H{
			"trust_score":  500,
			"credit_score": 500,
		},
	})
}

// GetAgentByWallet fetches an agent's complete profile
func GetAgentByWallet(c *gin.Context) {
	walletAddress := c.Param("wallet")
	if walletAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet parameter is required"})
		return
	}

	var agent models.Agent
	if err := database.DB.Where("wallet_address = ?", walletAddress).First(&agent).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Agent profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	var reputation models.ReputationScore
	database.DB.Where("agent_id = ?", agent.ID).First(&reputation)

	reputation.TrustScore = GetOnChainRating("CONTRACT_HASH_REPUTATION", walletAddress, reputation.TrustScore)

	var credit models.CreditScore
	database.DB.Where("agent_id = ?", agent.ID).First(&credit)

	credit.CreditScore = GetOnChainRating("CONTRACT_HASH_CREDIT", walletAddress, credit.CreditScore)

	c.JSON(http.StatusOK, gin.H{
		"identity":   agent,
		"reputation": reputation,
		"credit":     credit,
	})
}