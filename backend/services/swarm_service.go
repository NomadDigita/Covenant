package services

import (
	"log"
	"time"

	"backend/database"
	"backend/models"
)

// StartSwarmOrchestration runs background agents asynchronously
func StartSwarmOrchestration() {
	log.Println("[Swarm Orchestrator] Initializing background AI Swarm Workers...")

	// 1. Launch the Reputation Agent (Runs every 15 seconds)
	go startReputationAgent(15 * time.Second)

	// 2. Launch the Credit Agent (Runs every 20 seconds)
	go startCreditAgent(20 * time.Second)

	// 3. Launch the Risk Agent (Runs every 30 seconds)
	go startRiskAgent(30 * time.Second)
}

// startReputationAgent audits performance records and updates trust scores
func startReputationAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Reputation Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Reputation Agent] Scanning marketplace logs for score adjustments...")

		var scores []models.ReputationScore
		if err := database.DB.Find(&scores).Error; err != nil {
			log.Printf("[Reputation Agent Error] Failed to fetch reputation metrics: %v", err)
			continue
		}

		for _, score := range scores {
			// Calculate real success rate based on completed vs failed jobs
			var totalJobs int64
			var completedJobs int64
			
			database.DB.Model(&models.MarketplaceJob{}).Where("provider_id = ?", score.AgentID).Count(&totalJobs)
			database.DB.Model(&models.MarketplaceJob{}).Where("provider_id = ? AND status = ?", score.AgentID, models.JobStatusCompleted).Count(&completedJobs)

			if totalJobs > 0 {
				rate := (float64(completedJobs) / float64(totalJobs)) * 100.0
				
				// Update db record
				database.DB.Model(&score).Updates(map[string]interface{}{
					"success_rate":    rate,
					"failure_rate":    100.0 - rate,
					"jobs_completed":  int(completedJobs),
				})
				log.Printf("[Reputation Agent] Recalculated Agent %s: Success Rate = %.2f%%", score.AgentID, rate)
			}
		}
	}
}

// startCreditAgent audits transactional payments and calculates creditworthiness
func startCreditAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Credit Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Credit Agent] Evaluating transaction volumes and payment indices...")

		var credits []models.CreditScore
		if err := database.DB.Find(&credits).Error; err != nil {
			log.Printf("[Credit Agent Error] Failed to fetch credit records: %v", err)
			continue
		}

		for _, credit := range credits {
			var agent models.Agent
			if err := database.DB.First(&agent, "id = ?", credit.AgentID).Error; err != nil {
				continue
			}

			// Aggregate cumulative transaction volume for this agent
			var volume sumVolume
			database.DB.Model(&models.Transaction{}).
				Select("COALESCE(SUM(amount), 0) as total").
				Where("sender_wallet = ? OR receiver_wallet = ?", agent.WalletAddress, agent.WalletAddress).
				Scan(&volume)

			// Scale credit score dynamically based on transaction density
			scaledScore := int(500 + (volume.Total * 5.0))
			if scaledScore > 1000 {
				scaledScore = 1000
			}

			database.DB.Model(&credit).Updates(map[string]interface{}{
				"transaction_volume": volume.Total,
				"credit_score":       scaledScore,
			})
			log.Printf("[Credit Agent] Recalculated Agent %s: Transaction Volume = %.2f, Credit Score = %d", credit.AgentID, volume.Total, scaledScore)
		}
	}
}

type sumVolume struct {
	Total float64
}

// startRiskAgent monitors anomalies and triggers security warnings
func startRiskAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Risk Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Risk Agent] Analyzing behavior profiles for threat telemetry...")

		var agents []models.Agent
		if err := database.DB.Find(&agents).Error; err != nil {
			log.Printf("[Risk Agent Error] Failed to fetch agents: %v", err)
			continue
		}

		for _, agent := range agents {
			var rep models.ReputationScore
			if err := database.DB.Where("agent_id = ?", agent.ID).First(&rep).Error; err != nil {
				continue
			}

			// If failure rates spike above 35%, flag abnormal risk levels and log audit trace
			if rep.FailureRate > 35.0 {
				log.Printf("[Risk Agent Alert] High anomaly detected on Agent %s! Failure rate elevated to %.2f%%", agent.Name, rep.FailureRate)
				
				// Post alert to audits log
				audit := models.AuditLog{
					AgentID:             agent.ID,
					ActionType:          "Risk Anomaly Triggered",
					DecisionStatus:      "Flagged",
					TrustScoreSnapshot:  rep.TrustScore,
					CreditScoreSnapshot: 500,
					RiskLevel:           "High",
					Justification:       "Risk Agent detected abnormal failure rate spikes. Placed agentic account under transaction threshold limit restrictions.",
				}
				database.DB.Create(&audit)
			}
		}
	}
}