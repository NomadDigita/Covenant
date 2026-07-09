package controllers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PaymentPayload defines parameters for executing a machine micropayment
type PaymentPayload struct {
	SenderWallet   string  `json:"sender_wallet" binding:"required"`
	ReceiverWallet string  `json:"receiver_wallet" binding:"required"`
	Amount         float64 `json:"amount" binding:"required"`
	Memo           string  `json:"memo"`
	TxHash         string  `json:"tx_hash" binding:"required"` // Pre-signed or executed on-chain hash
}

// ExecutePayment logs and registers an agent-to-agent payment (CovenantPay / x402)
func ExecutePayment(c *gin.Context) {
	var payload PaymentPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Input Sanitization
	payload.SenderWallet = strings.TrimSpace(payload.SenderWallet)
	payload.SenderWallet = strings.TrimPrefix(payload.SenderWallet, "account-hash-")
	payload.SenderWallet = strings.TrimPrefix(payload.SenderWallet, "hash-")

	payload.ReceiverWallet = strings.TrimSpace(payload.ReceiverWallet)
	payload.ReceiverWallet = strings.TrimPrefix(payload.ReceiverWallet, "account-hash-")
	payload.ReceiverWallet = strings.TrimPrefix(payload.ReceiverWallet, "hash-")

	payload.Memo = strings.TrimSpace(payload.Memo)
	cleanHash, isValidHash := cleanTxHash(payload.TxHash)

	// STRICT BUSINESS BOUNDARY VALIDATIONS
	if !isValidCasperAddress(payload.SenderWallet) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sender_wallet: must be a valid 64 or 66 character hex standard Casper address"})
		return
	}
	if !isValidCasperAddress(payload.ReceiverWallet) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver_wallet: must be a valid 64 or 66 character hex standard Casper address"})
		return
	}
	if payload.SenderWallet == payload.ReceiverWallet {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transfer: sender and receiver wallets cannot be identical"})
		return
	}
	if payload.Amount <= 0.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment amount must be strictly greater than zero CSPR"})
		return
	}
	if payload.Amount > 100000000.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment amount exceeds maximum allowed threshold limits"})
		return
	}
	if len(payload.Memo) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment memo cannot exceed maximum of 255 characters"})
		return
	}
	if payload.Memo != "" && !nameRegex.MatchString(payload.Memo) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid memo format: must contain only alphanumeric symbols, underscores, hyphens, or spaces"})
		return
	}
	if !isValidHash {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tx_hash format: must be valid 64 character hex standard Casper deploy hash"})
		return
	}

	// Validate transaction uniqueness
	var existingTx models.Transaction
	err := database.DB.Where("tx_hash = ?", cleanHash).First(&existingTx).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Transaction with this hash has already been processed and logged"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failure during verification: " + err.Error()})
		return
	}

	// 1. Process payment inside database
	tx := models.Transaction{
		SenderWallet:   payload.SenderWallet,
		ReceiverWallet: payload.ReceiverWallet,
		Amount:         payload.Amount,
		Memo:           payload.Memo,
		TxHash:         cleanHash,
		Status:         "successful", // Handled inside middleware deploy reader loops
	}

	if err := database.DB.Create(&tx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record transaction log: " + err.Error()})
		return
	}

	// 2. Query and adjust dynamic Credit Score statistics for the Sender Agent if registered
	var senderAgent models.Agent
	err = database.DB.Where("wallet_address = ?", payload.SenderWallet).First(&senderAgent).Error
	if err == nil {
		// Increment sender volume inside a thread-safe transaction block
		err = database.DB.Transaction(func(dbTx *gorm.DB) error {
			var credit models.CreditScore
			if err := dbTx.Where("agent_id = ?", senderAgent.ID).First(&credit).Error; err == nil {
				credit.TransactionVolume += payload.Amount
				return dbTx.Save(&credit).Error
			}
			return nil
		})
		if err != nil {
			log.Printf("[Payment Warning] Volume adjustment database transaction failed: %v", err)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "x402 Micropayment processed and logged successfully",
		"transaction_id": tx.ID,
		"status":         tx.Status,
	})
}

// GetPaymentHistory retrieves the transaction logs for auditing
func GetPaymentHistory(c *gin.Context) {
	wallet := strings.TrimSpace(c.Query("wallet"))
	wallet = strings.TrimPrefix(wallet, "account-hash-")
	wallet = strings.TrimPrefix(wallet, "hash-")

	var txs []models.Transaction
	query := database.DB

	if wallet != "" {
		if !isValidCasperAddress(wallet) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid wallet query parameter: must be valid 64 or 66 character standard Casper address"})
			return
		}
		query = query.Where("sender_wallet = ? OR receiver_wallet = ?", wallet, wallet)
	}

	if err := query.Order("timestamp desc").Find(&txs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database retrieval of payments failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, txs)
}