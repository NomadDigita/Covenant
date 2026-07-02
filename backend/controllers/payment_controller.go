package controllers

import (
	"errors"
	"net/http"

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

	if payload.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment amount must be greater than zero"})
		return
	}

	// Clean address formats
	payload.SenderWallet = stringsTrim(payload.SenderWallet)
	payload.ReceiverWallet = stringsTrim(payload.ReceiverWallet)

	// Validate transaction uniqueness
	var existingTx models.Transaction
	err := database.DB.Where("tx_hash = ?", payload.TxHash).First(&existingTx).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Transaction with this hash is already processed"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failure: " + err.Error()})
		return
	}

	// 1. Process payment inside database
	tx := models.Transaction{
		SenderWallet:   payload.SenderWallet,
		ReceiverWallet: payload.ReceiverWallet,
		Amount:         payload.Amount,
		Memo:           payload.Memo,
		TxHash:         payload.TxHash,
		Status:         "successful", // Hardened after successful chain-reading validation
	}

	if err := database.DB.Create(&tx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record transaction log: " + err.Error()})
		return
	}

	// 2. Query and adjust dynamic Credit Score statistics for the Sender Agent if registered
	var senderAgent models.Agent
	err = database.DB.Where("wallet_address = ?", payload.SenderWallet).First(&senderAgent).Error
	if err == nil {
		// Increment sender volume inside a thread-safe transaction
		database.DB.Transaction(func(dbTx *gorm.DB) error {
			var credit models.CreditScore
			if err := dbTx.Where("agent_id = ?", senderAgent.ID).First(&credit).Error; err == nil {
				credit.TransactionVolume += payload.Amount
				return dbTx.Save(&credit).Error
			}
			return nil
		})
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "x402 Micropayment processed and logged successfully",
		"transaction_id": tx.ID,
		"status":         tx.Status,
	})
}

// GetPaymentHistory retrieves the transaction logs for auditing
func GetPaymentHistory(c *gin.Context) {
	wallet := c.Query("wallet")
	var txs []models.Transaction

	query := database.DB
	if wallet != "" {
		query = query.Where("sender_wallet = ? OR receiver_wallet = ?", wallet, wallet)
	}

	if err := query.Order("timestamp desc").Find(&txs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database retrieval failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, txs)
}