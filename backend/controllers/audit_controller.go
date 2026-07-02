package controllers

import (
	"errors"
	"net/http"

	"backend/database"
	"backend/models"
	"backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuditExplanationPayload defines parameters to request an automated decision audit
type AuditExplanationPayload struct {
	AgentID    string `json:"agent_id" binding:"required"`
	ActionType string `json:"action_type" binding:"required"` // E.g., 'Loan Approval', 'Compliance Flag'
	RiskLevel  string `json:"risk_level" binding:"required"`  // Low, Medium, High
	Detail     string `json:"detail" binding:"required"`      // E.g., 'Agent requested CSPR 1000 loan with 127 successful jobs'
}

// RequestAuditExplanation triggers the Audit Agent (Gemini) to explain a decision and log it on-chain mirror
func RequestAuditExplanation(c *gin.Context) {
	var payload AuditExplanationPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload format: " + err.Error()})
		return
	}

	// Verify agent existence
	var agent models.Agent
	if err := database.DB.First(&agent, "id = ?", payload.AgentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Agent profile not found"})
		return
	}

	// Query latest scores to feed to the Gemini audit agent context
	var reputation models.ReputationScore
	database.DB.Where("agent_id = ?", agent.ID).First(&reputation)

	var credit models.CreditScore
	database.DB.Where("agent_id = ?", agent.ID).First(&credit)

	// Invoke Gemini model via the service layer
	explanation, err := services.GenerateAuditJustification(
		payload.ActionType,
		reputation.TrustScore,
		credit.CreditScore,
		payload.RiskLevel,
		payload.Detail,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Audit Agent failure: " + err.Error()})
		return
	}

	// Persist the generated audit trail to the logs
	audit := models.AuditLog{
		AgentID:             agent.ID,
		ActionType:          payload.ActionType,
		DecisionStatus:      "Audited",
		TrustScoreSnapshot:  reputation.TrustScore,
		CreditScoreSnapshot: credit.CreditScore,
		RiskLevel:           payload.RiskLevel,
		Justification:       explanation,
	}

	if err := database.DB.Create(&audit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write audit record: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":             "Decision audited and explained successfully by Audit Agent",
		"audit_id":            audit.ID,
		"risk_level":          audit.RiskLevel,
		"trust_snapshot":      audit.TrustScoreSnapshot,
		"credit_snapshot":     audit.CreditScoreSnapshot,
		"audit_explanation":   audit.Justification,
	})
}

// GetAuditLogsByAgent retrieves the audit history logs for a specific agent
func GetAuditLogsByAgent(c *gin.Context) {
	agentID := c.Param("agent_id")
	if agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent_id parameter is required"})
		return
	}

	var logs []models.AuditLog
	if err := database.DB.Where("agent_id = ?", agentID).Order("created_at desc").Find(&logs).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "No audit logs found for this agent"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database retrieval error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}