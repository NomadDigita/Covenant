package controllers

import (
	"net/http"
	"time"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	TxHash string `json:"tx_hash"` // On-chain settlement transaction hash
}

// PostJob publishes a new job on Covenant Market
func PostJob(c *gin.Context) {
	var payload PostJobPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Resolve creator agent
	var creator models.Agent
	if err := database.DB.Where("wallet_address = ?", payload.CreatorAddress).First(&creator).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Creator agent profile not found"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post job: " + err.Error()})
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

	// Resolve provider agent
	var provider models.Agent
	if err := database.DB.Where("wallet_address = ?", payload.ProviderAddress).First(&provider).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Provider agent profile not found"})
		return
	}

	// Fetch open job
	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	if job.Status != models.JobStatusOpen {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job is not in open status"})
		return
	}

	// Bind agent and active state
	job.ProviderID = &provider.ID
	job.Status = models.JobStatusActive

	if err := database.DB.Save(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign job: " + err.Error()})
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

	// Fetch active job
	var job models.MarketplaceJob
	if err := database.DB.First(&job, "id = ?", payload.JobID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	if job.Status != models.JobStatusActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job is not active; cannot be completed"})
		return
	}

	if job.ProviderID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No assigned provider linked to this job"})
		return
	}

	providerID := *job.ProviderID
	now := time.Now()

	// Execute metrics adjustment inside a database transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Close out the Marketplace Job
		job.Status = models.JobStatusCompleted
		job.CompletedAt = &now
		job.TxHash = payload.TxHash
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
		// Increment Trust Score by 25 points per successful task (cap at 1000)
		newTrust := rep.TrustScore + 25
		if newTrust > 1000 {
			newTrust = 1000
		}
		rep.TrustScore = newTrust
		rep.SuccessRate = 100.00 // Adjust dynamic rate logic if failures are added later
		if err := tx.Save(&rep).Error; err != nil {
			return err
		}

		// 4. Recalculate Credit Score
		credit.TransactionVolume += job.Budget
		// Increment Credit Score by 15 points per completed trade (cap at 1000)
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
	status := c.Query("status")
	var jobs []models.MarketplaceJob

	query := database.DB
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at desc").Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, jobs)
}