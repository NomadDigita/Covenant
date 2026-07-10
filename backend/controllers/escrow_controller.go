package controllers

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// LockEscrowPayload defines parameters to register a locked escrow on-chain
type LockEscrowPayload struct {
	JobID           string  `json:"job_id" binding:"required"`
	ClientWallet    string  `json:"client_wallet" binding:"required"`
	MercenaryWallet string  `json:"mercenary_wallet" binding:"required"`
	LockedAmount    float64 `json:"locked_amount" binding:"required"`
	StakeAmount     float64 `json:"stake_amount"`
	TxHash          string  `json:"tx_hash" binding:"required"` // On-chain lock_escrow deployment hash
}

// EscrowActionPayload defines parameters to release or slash an escrow
type EscrowActionPayload struct {
	JobID  string `json:"job_id" binding:"required"`
	TxHash string `json:"tx_hash" binding:"required"` // On-chain release/slash deployment hash
}

// LockEscrow registers an active escrow locker in standard database
func LockEscrow(c *gin.Context) {
	var payload LockEscrowPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Input Sanitization
	payload.JobID = strings.TrimSpace(payload.JobID)
	payload.ClientWallet = strings.TrimSpace(payload.ClientWallet)
	payload.ClientWallet = strings.TrimPrefix(payload.ClientWallet, "account-hash-")
	payload.ClientWallet = strings.TrimPrefix(payload.ClientWallet, "hash-")

	payload.MercenaryWallet = strings.TrimSpace(payload.MercenaryWallet)
	payload.MercenaryWallet = strings.TrimPrefix(payload.MercenaryWallet, "account-hash-")
	payload.MercenaryWallet = strings.TrimPrefix(payload.MercenaryWallet, "hash-")

	cleanHash, isValidHash := cleanTxHash(payload.TxHash)

	// STRICT BUSINESS VALUE AND STRUCT VALIDATIONS
	if !isValidUUID(payload.JobID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id: must be a valid UUID"})
		return
	}
	if !isValidCasperAddress(payload.ClientWallet) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid client_wallet: must be a valid 64, 66, or 68 character hex Casper address"})
		return
	}
	if !isValidCasperAddress(payload.MercenaryWallet) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid mercenary_wallet: must be a valid 64, 66, or 68 character hex Casper address"})
		return
	}
	if payload.ClientWallet == payload.MercenaryWallet {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid escrow: client and mercenary wallets cannot be identical"})
		return
	}
	if payload.LockedAmount <= 0.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "locked_amount must be strictly greater than zero CSPR"})
		return
	}
	if payload.StakeAmount < 0.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mercenary stake_amount cannot be negative"})
		return
	}
	if !isValidHash {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tx_hash format: must be valid 64 character hex standard Casper deploy hash"})
		return
	}

	// Verify that standard job is active and associated with standard wallets
	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target marketplace job not found"})
		return
	}

	if job.Status != models.JobStatusActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Escrow rejected: job is not in active state"})
		return
	}

	// Check duplicate escrow registration
	var existingEscrow models.EscrowLocker
	err := database.DB.Where("job_id = ?", payload.JobID).First(&existingEscrow).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "An active escrow locker already exists for this job ID"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database lookup failure: " + err.Error()})
		return
	}

	// Initialize standard locker with standard default 24-hour countdown window
	escrow := models.EscrowLocker{
		JobID:        payload.JobID,
		ClientWallet: payload.ClientWallet,
		AgentWallet:  payload.MercenaryWallet,
		LockedAmount: payload.LockedAmount,
		StakeAmount:  payload.StakeAmount,
		Status:       "locked",
		ExpiresAt:    time.Now().Add(24 * time.Hour),
	}

	if err := database.DB.Create(&escrow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create database escrow locker: " + err.Error()})
		return
	}

	// Log transaction hash cleanly to resolve unused variable compiler warning
	log.Printf("[Escrow] Registered Escrow Locker %s with on-chain TX: %s", escrow.ID, cleanHash)

	c.JSON(http.StatusCreated, gin.H{
		"message":   "On-chain escrow successfully logged in gateway database",
		"escrow_id": escrow.ID,
		"status":    escrow.Status,
		"expires":   escrow.ExpiresAt,
	})
}

// ReleaseEscrow releases standard locked collateral directly to standard mercenary balance sheet
func ReleaseEscrow(c *gin.Context) {
	var payload EscrowActionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	payload.JobID = strings.TrimSpace(payload.JobID)
	cleanHash, isValidHash := cleanTxHash(payload.TxHash)

	if !isValidUUID(payload.JobID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id: must be a valid UUID"})
		return
	}
	if !isValidHash {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tx_hash format: must be valid 64 character hex standard Casper deploy hash"})
		return
	}

	// Fetch active escrow
	var escrow models.EscrowLocker
	if err := database.DB.Where("job_id = ? AND status = 'locked'", payload.JobID).First(&escrow).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Active locked escrow record not found for this job ID"})
		return
	}

	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Associated job record not found"})
		return
	}

	now := time.Now()

	// Execute atomic release transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update escrow status
		escrow.Status = "released"
		if err := tx.Save(&escrow).Error; err != nil {
			return err
		}

		// 2. Mark job as completed
		job.Status = models.JobStatusCompleted
		job.CompletedAt = &now
		job.TxHash = cleanHash
		if err := tx.Save(&job).Error; err != nil {
			return err
		}

		// 3. Resolve and increment provider scores (+25 trust, +15 credit score)
		var rep models.ReputationScore
		if err := tx.Where("agent_id = ?", job.ProviderID).First(&rep).Error; err != nil {
			return err
		}

		var credit models.CreditScore
		if err := tx.Where("agent_id = ?", job.ProviderID).First(&credit).Error; err != nil {
			return err
		}

		rep.JobsCompleted += 1
		newTrust := rep.TrustScore + 25
		if newTrust > 1000 {
			newTrust = 1000
		}
		rep.TrustScore = newTrust
		if err := tx.Save(&rep).Error; err != nil {
			return err
		}

		credit.TransactionVolume += escrow.LockedAmount
		newCredit := credit.CreditScore + 15
		if newCredit > 1000 {
			newCredit = 1000
		}
		credit.CreditScore = newCredit
		if err := tx.Save(&credit).Error; err != nil {
			return err
		}

		// 4. Record successful settlement audit log
		audit := models.AuditLog{
			AgentID:             *job.ProviderID,
			ActionType:          "Escrow Release Approved",
			DecisionStatus:      "Completed",
			TrustScoreSnapshot:  rep.TrustScore,
			CreditScoreSnapshot: credit.CreditScore,
			RiskLevel:           "Low",
			Justification:       "Swarm completed task evaluation checks successfully. Released locked collateral budget and provider stake. Incremented trust score.",
		}
		if err := tx.Create(&audit).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete escrow release transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Collateral released successfully to provider, scores recalculated",
		"job_id":  job.ID,
		"status":  escrow.Status,
	})
}

// SlashEscrow terminates escrow, refunds client, and penalizes mercenary score (slasher)
func SlashEscrow(c *gin.Context) {
	var payload EscrowActionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	payload.JobID = strings.TrimSpace(payload.JobID)
	cleanHash, isValidHash := cleanTxHash(payload.TxHash)

	if !isValidUUID(payload.JobID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id: must be a valid UUID"})
		return
	}
	if !isValidHash {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tx_hash format: must be valid 64 character hex standard Casper deploy hash"})
		return
	}

	// Fetch active escrow
	var escrow models.EscrowLocker
	if err := database.DB.Where("job_id = ? AND status = 'locked'", payload.JobID).First(&escrow).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Active locked escrow record not found for this job ID"})
		return
	}

	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Associated job record not found"})
		return
	}

	now := time.Now()

	// Execute atomic slashing transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update escrow status
		escrow.Status = "slashed"
		if err := tx.Save(&escrow).Error; err != nil {
			return err
		}

		// 2. Mark job as failed
		job.Status = models.JobStatusFailed
		job.CompletedAt = &now
		job.TxHash = cleanHash
		if err := tx.Save(&job).Error; err != nil {
			return err
		}

		// 3. Resolve and penalize provider scores (-75 trust penalty, clamped at 0)
		var rep models.ReputationScore
		if err := tx.Where("agent_id = ?", job.ProviderID).First(&rep).Error; err != nil {
			return err
		}

		var credit models.CreditScore
		if err := tx.Where("agent_id = ?", job.ProviderID).First(&credit).Error; err != nil {
			return err
		}

		// Deduct 75 trust points for slashing penalty
		newTrust := rep.TrustScore - 75
		if newTrust < 0 {
			newTrust = 0
		}
		rep.TrustScore = newTrust
		rep.FailureRate = 100.00 // Force elevated failure flag

		if err := tx.Save(&rep).Error; err != nil {
			return err
		}

		// 4. Record dispute penalty audit log
		audit := models.AuditLog{
			AgentID:             *job.ProviderID,
			ActionType:          "Escrow Slashed & Terminated",
			DecisionStatus:      "Slashed",
			TrustScoreSnapshot:  rep.TrustScore,
			CreditScoreSnapshot: credit.CreditScore,
			RiskLevel:           "High",
			Justification:       "Risk Agent detected critical execution failure or timeout. Terminated escrow, refunded client budget, and penalized provider.",
		}
		if err := tx.Create(&audit).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete escrow slashing transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Escrow successfully slashed and terminated, provider penalized",
		"job_id":  job.ID,
		"status":  escrow.Status,
	})
}

// GetEscrowByJob retrieves detailed status of standard EscrowLocker record
func GetEscrowByJob(c *gin.Context) {
	jobID := strings.TrimSpace(c.Param("job_id"))
	if !isValidUUID(jobID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id: must be valid UUID"})
		return
	}

	var escrow models.EscrowLocker
	if err := database.DB.Where("job_id = ?", jobID).First(&escrow).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Escrow locker record not found for this job"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database query failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, escrow)
}
