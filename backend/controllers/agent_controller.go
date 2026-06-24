package controllers

import (
	"errors"
	"net/http"

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

// RegisterAgent handles the creation of a new Agent ID profile on-chain mirroring
func RegisterAgent(c *gin.Context) {
	var payload RegisterAgentPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Clean inputs
	payload.WalletAddress = stringsTrim(payload.WalletAddress)
	payload.OwnerAddress = stringsTrim(payload.OwnerAddress)

	if payload.WalletAddress == "" || payload.Name == "" || payload.OwnerAddress == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet_address, name, and owner_address are required"})
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

// GetAgentByWallet fetches an agent's complete profile, reputation details, and credit logs
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

	var credit models.CreditScore
	database.DB.Where("agent_id = ?", agent.ID).First(&credit)

	c.JSON(http.StatusOK, gin.H{
		"identity":   agent,
		"reputation": reputation,
		"credit":     credit,
	})
}

// Helper utility function for string trimming
func stringsTrim(val string) string {
	return uint8Trim(val)
}

func uint8Trim(val string) string {
	for len(val) > 0 && val[0] == ' ' {
		val = val[1:]
	}
	for len(val) > 0 && val[len(val)-1] == ' ' {
		val = val[:len(val)-1]
	}
	return val
}