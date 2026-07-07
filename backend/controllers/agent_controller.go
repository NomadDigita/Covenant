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
	"strings" // FIXED: Explicitly utilizing standard strings package
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

// QueryCasperNodeRPC executes a JSON-RPC query against the Casper Testnet nodes
func QueryCasperNodeRPC(method string, params interface{}) (map[string]interface{}, error) {
	nodeURL := "https://rpc.testnet.casper.network/rpc"
	
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "method",
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

	// Query Casper contract dictionary storage key using state_get_dictionary_item
	params := map[string]interface{}{
		"state_root_hash": "",
		"dictionary_identifier": map[string]interface{}{
			"ContractNamedKey": map[string]interface{}{
				"key":             contractHash,
				"dictionary_name": "profiles",
				"dictionary_item_key": walletAddress,
			},
		},
	}

	_, err := QueryCasperNodeRPC("state_get_dictionary_item", params)
	if err != nil {
		log.Printf("[On-Chain Audit] Verification failed for wallet %s: %v", walletAddress, err)
		return false
	}

	log.Printf("[On-Chain Audit] Verified on-chain AgentRegistry record for: %s", walletAddress)
	return true
}

// GetOnChainRating reads the live, un-mocked score directly from the deployed contract on Casper Testnet
func GetOnChainRating(contractHashEnvKey string, walletAddress string, defaultVal int) int {
	contractHash := os.Getenv(contractHashEnvKey)
	if contractHash == "" {
		return defaultVal
	}

	params := map[string]interface{}{
		"state_root_hash": "",
		"dictionary_identifier": map[string]interface{}{
			"ContractNamedKey": map[string]interface{}{
				"key":             contractHash,
				"dictionary_name": "scores",
				"dictionary_item_key": walletAddress,
			},
		},
	}

	response, err := QueryCasperNodeRPC("state_get_dictionary_item", params)
	if err != nil {
		log.Printf("[On-Chain Audit] Failed to fetch live score from %s: %v. Using local cache.", contractHashEnvKey, err)
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

	// FIXED: Utilizing standard strings.TrimSpace to remove all hidden carriage returns (\r) and newlines (\n)
	payload.WalletAddress = strings.TrimSpace(payload.WalletAddress)
	payload.OwnerAddress = strings.TrimSpace(payload.OwnerAddress)

	if payload.WalletAddress == "" || payload.Name == "" || payload.OwnerAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet_address, name, and owner_address are required"})
		return
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