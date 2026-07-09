package controllers

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Regex compile targets for UUID, transaction hashes, and titles
var (
	uuidRegex   = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	txHashRegex = regexp.MustCompile(`^[0-9a-fA-F]{64}$`)
)

// PostJobPayload defines parameters for creating a job contract
type PostJobPayload struct {
	CreatorAddress string  `json:"creator_address" binding:"required"`
	Title          string  `json:"title" binding:"required"`
	Description    string  `json:"description"`
	Budget         float64 `json:"budget" binding:"required"`
}

// AssignJobPayload defines parameters for hiring an agent for a job
type AssignJobPayload struct {
	JobID           string `json:"job_id" binding:"required"`
	ProviderAddress string `json:"provider_address" binding:"required"`
}

// CompleteJobPayload defines parameters for finalizing a job contract
type CompleteJobPayload struct {
	JobID  string `json:"job_id" binding:"required"`
	TxHash string `json:"tx_hash" binding:"required"` // On-chain settlement transaction hash is mandatory for stabilization
}

// isValidUUID verifies standard UUID format to prevent database query crashes
func isValidUUID(id string) bool {
	return uuidRegex.MatchString(id)
}

// cleanTxHash strips common prefixes and checks if it conforms to Casper standard 32-byte hex deploy hashes
func cleanTxHash(hash string) (string, bool) {
	clean := strings.TrimSpace(hash)
	clean = strings.TrimPrefix(clean, "0x")
	clean = strings.TrimPrefix(clean, "hash-")
	return clean, txHashRegex.MatchString(clean)
}

// PostJob publishes a new job on Covenant Market
func PostJob(c *gin.Context) {
	var payload PostJobPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Input Sanitization
	payload.CreatorAddress = strings.TrimSpace(payload.CreatorAddress)
	payload.CreatorAddress = strings.TrimPrefix(payload.CreatorAddress, "account-hash-")
	payload.CreatorAddress = strings.TrimPrefix(payload.CreatorAddress, "hash-")
	payload.Title = strings.TrimSpace(payload.Title)
	payload.Description = strings.TrimSpace(payload.Description)

	// STRICT BUSINESS BOUNDARY CHECKS
	if !isValidCasperAddress(payload.CreatorAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid creator_address format: must be valid 64 or 66 character standard Casper key"})
		return
	}
	if len(payload.Title) < 5 || len(payload.Title) > 255 || !nameRegex.MatchString(payload.Title) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid title: must be 5-255 characters and contain only alphanumeric symbols, underscores, hyphens, or spaces"})
		return
	}
	if len(payload.Description) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "description exceeds maximum allowed limit of 1000 characters"})
		return
	}
	if payload.Budget <= 0.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid budget: must be greater than zero CSPR"})
		return
	}
	if payload.Budget > 100000000.0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid budget: exceeds protocol threshold parameters"})
		return
	}

	// Resolve creator agent
	var creator models.Agent
	if err := database.DB.Where("wallet_address = ?", payload.CreatorAddress).First(&creator).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Creator agent profile not found in registration database"})
		return
	}

	job := models.MarketplaceJob{
		CreatorID:   creator.ID,
		Title:       payload.Title,
		Description: payload.Description,
		Budget:      payload.Budget,
		Status:      models.JobStatusOpen,
	}

	if err := database.DB.Create(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write job posting to marketplace: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Job posted successfully to Covenant Market",
		"job_id":  job.ID,
		"status":  job.Status,
	})
}

// AssignJob updates a job state to active and binds it to a provider agent
func AssignJob(c *gin.Context) {
	var payload AssignJobPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Input Sanitization
	payload.JobID = strings.TrimSpace(payload.JobID)
	payload.ProviderAddress = strings.TrimSpace(payload.ProviderAddress)
	payload.ProviderAddress = strings.TrimPrefix(payload.ProviderAddress, "account-hash-")
	payload.ProviderAddress = strings.TrimPrefix(payload.ProviderAddress, "hash-")

	// STRICT BUSINESS BOUNDARY CHECKS
	if !isValidUUID(payload.JobID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id: must be a valid UUID format"})
		return
	}
	if !isValidCasperAddress(payload.ProviderAddress) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid provider_address format: must be valid 64 or 66 character standard Casper key"})
		return
	}

	// Resolve provider agent
	var provider models.Agent
	if err := database.DB.Where("wallet_address = ?", payload.ProviderAddress).First(&provider).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider agent profile not registered"})
		return
	}

	// Fetch open job
	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	if job.Status != models.JobStatusOpen {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job assignment rejected: job is not in open status"})
		return
	}

	// Ensure provider cannot hire themselves
	if job.CreatorID == provider.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Self-hiring violation: Creator agent cannot execute their own marketplace jobs"})
		return
	}

	// Bind agent and active state
	job.ProviderID = &provider.ID
	job.Status = models.JobStatusActive

	if err := database.DB.Save(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign provider to job: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Agent assigned and hired successfully",
		"job_id":  job.ID,
		"status":  job.Status,
	})
}

// CompleteJob closes a job contract and recalculates scores for the provider agent
func CompleteJob(c *gin.Context) {
	var payload CompleteJobPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Input Sanitization
	payload.JobID = strings.TrimSpace(payload.JobID)
	cleanHash, isValidHash := cleanTxHash(payload.TxHash)

	// STRICT BUSINESS BOUNDARY CHECKS
	if !isValidUUID(payload.JobID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid job_id: must be a valid UUID format"})
		return
	}
	if !isValidHash {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tx_hash format: must be valid 64 character hex standard Casper deploy hash"})
		return
	}

	// Fetch active job
	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	if job.Status != models.JobStatusActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job completion rejected: target job state is not active"})
		return
	}

	if job.ProviderID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Hiring integrity error: No provider has been assigned to this active job"})
		return
	}

	providerID := *job.ProviderID
	now := time.Now()

	// Execute metrics adjustment inside a database transaction to preserve consistency under high concurrent load
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Close out the Marketplace Job
		job.Status = models.JobStatusCompleted
		job.CompletedAt = &now
		job.TxHash = cleanHash
		if err := tx.Save(&job).Error; err != nil {
			return err
		}

		// 2. Fetch provider's current scores
		var rep models.ReputationScore
		if err := tx.Where("agent_id = ?", providerID).First(&rep).Error; err != nil {
			return err
		}

		var credit models.CreditScore
		if err := tx.Where("agent_id = ?", providerID).First(&credit).Error; err != nil {
			return err
		}

		// 3. Recalculate Reputation Scores
		rep.JobsCompleted += 1
		newTrust := rep.TrustScore + 25
		if newTrust > 1000 {
			newTrust = 1000
		}
		rep.TrustScore = newTrust
		
		// If success rate calculations are dynamic based on historical totals
		if rep.JobsCompleted > 0 {
			rep.SuccessRate = 100.00 // Default state unless failures are explicitly written by Risk Agent
		}

		if err := tx.Save(&rep).Error; err != nil {
			return err
		}

		// 4. Recalculate Credit Score
		credit.TransactionVolume += job.Budget
		newCredit := credit.CreditScore + 15
		if newCredit > 1000 {
			newCredit = 1000
		}
		credit.CreditScore = newCredit
		if err := tx.Save(&credit).Error; err != nil {
			return err
		}

		// 5. Generate Audit Log Entry
		audit := models.AuditLog{
			AgentID:             providerID,
			ActionType:          "Job Completion",
			DecisionStatus:      "Processed",
			TrustScoreSnapshot:  rep.TrustScore,
			CreditScoreSnapshot: credit.CreditScore,
			RiskLevel:           "Low",
			Justification:       "Successful job execution completed. Adjusted Trust Score to higher level of reliability. Recorded increment of payment volume on-chain.",
		}
		if err := tx.Create(&audit).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete transaction processing: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Job successfully resolved, scores recalculated",
		"job_id":  job.ID,
		"status":  job.Status,
	})
}

// GetMarketplaceJobs retrieves all listed jobs by their status (e.g., active, open)
func GetMarketplaceJobs(c *gin.Context) {
	status := strings.ToLower(strings.TrimSpace(c.Query("status")))
	var jobs []models.MarketplaceJob

	query := database.DB
	if status != "" {
		if status != "open" && status != "active" && status != "completed" && status != "failed" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid status query parameter: must be open, active, completed, or failed"})
			return
		}
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at desc").Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database retrieval failure: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, jobs)
}