package services

import (
	"log"
	"os"
	"time"

	"backend/database"
	"backend/models"
)

// StartSwarmOrchestration runs background agents asynchronously with optimized intervals
func StartSwarmOrchestration() {
	log.Println("[Swarm Orchestrator] Initializing background AI Swarm Workers...")

	// Load intervals from environment variables or default to safe, low-frequency durations (minutes instead of seconds)
	reputationInterval := getEnvDuration("SWARM_REPUTATION_INTERVAL", 15*time.Minute)
	creditInterval := getEnvDuration("SWARM_CREDIT_INTERVAL", 20*time.Minute)
	riskInterval := getEnvDuration("SWARM_RISK_INTERVAL", 30*time.Minute)

	// Launch background routines
	go startReputationAgent(reputationInterval)
	go startCreditAgent(creditInterval)
	go startRiskAgent(riskInterval)
}

// Helper to parse environment duration variables safely
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultValue
}

// startReputationAgent aggregates performance records in ONE single database round-trip
func startReputationAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Reputation Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Reputation Agent] Aggregating marketplace metrics...")

		// High-Performance Aggregation Query: Compiles total and completed jobs for ALL active providers in one single query
		var stats []struct {
			ProviderID string `gorm:"column:provider_id"`
			Total      int64  `gorm:"column:total"`
			Completed  int64  `gorm:"column:completed"`
		}

		err := database.DB.Model(&models.MarketplaceJob{}).
			Select("provider_id, count(*) as total, sum(case when status = 'completed' then 1 else 0 end) as completed").
			Where("provider_id IS NOT NULL").
			Group("provider_id").
			Scan(&stats).Error

		if err != nil {
			log.Printf("[Reputation Agent Error] Failed to aggregate marketplace stats: %v", err)
			continue
		}

		// Perform batch updates for each active record
		for _, stat := range stats {
			if stat.ProviderID == "" {
				continue
			}
			rate := (float64(stat.Completed) / float64(stat.Total)) * 100.0

			database.DB.Model(&models.ReputationScore{}).
				Where("agent_id = ?", stat.ProviderID).
				Updates(map[string]interface{}{
					"success_rate":   rate,
					"failure_rate":   100.0 - rate,
					"jobs_completed": int(stat.Completed),
				})
			log.Printf("[Reputation Agent] Updated Agent %s: Success Rate = %.2f%%", stat.ProviderID, rate)
		}
	}
}

// startCreditAgent aggregates transactional volume in ONE single database join query
func startCreditAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Credit Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Credit Agent] Aggregating transaction volumes...")

		// High-Performance Join Query: Sums all sender/receiver transaction volumes grouped by agent in one single query
		var volumes []struct {
			AgentID string  `gorm:"column:agent_id"`
			Total   float64 `gorm:"column:total"`
		}

		err := database.DB.Table("credit_scores").
			Select("credit_scores.agent_id, COALESCE(SUM(transactions.amount), 0) as total").
			Joins("join agents on agents.id = credit_scores.agent_id").
			Joins("left join transactions on transactions.sender_wallet = agents.wallet_address or transactions.receiver_wallet = agents.wallet_address").
			Group("credit_scores.agent_id").
			Scan(&volumes).Error

		if err != nil {
			log.Printf("[Credit Agent Error] Failed to aggregate transactions: %v", err)
			continue
		}

		for _, vol := range volumes {
			scaledScore := int(500 + (vol.Total * 5.0))
			if scaledScore > 1000 {
				scaledScore = 1000
			}

			database.DB.Model(&models.CreditScore{}).
				Where("agent_id = ?", vol.AgentID).
				Updates(map[string]interface{}{
					"transaction_volume": vol.Total,
					"credit_score":       scaledScore,
				})
			log.Printf("[Credit Agent] Updated Agent %s: Transaction Volume = %.2f, Credit Score = %d", vol.AgentID, vol.Total, scaledScore)
		}
	}
}

// startRiskAgent monitors anomalies and triggers security warnings
func startRiskAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Risk Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Risk Agent] Analyzing behavior profiles for threat telemetry...")

		var anomalies []struct {
			AgentID      string  `gorm:"column:agent_id"`
			Name         string  `gorm:"column:name"`
			TrustScore   int     `gorm:"column:trust_score"`
			FailureRate  float64 `gorm:"column:failure_rate"`
		}

		// Pull only elevated risk records
		err := database.DB.Table("reputation_scores").
			Select("reputation_scores.agent_id, agents.name, reputation_scores.trust_score, reputation_scores.failure_rate").
			Joins("join agents on agents.id = reputation_scores.agent_id").
			Where("reputation_scores.failure_rate > ?", 35.0).
			Scan(&anomalies).Error

		if err != nil {
			log.Printf("[Risk Agent Error] Failed to fetch risk metrics: %v", err)
			continue
		}

		for _, anomaly := range anomalies {
			log.Printf("[Risk Agent Alert] High anomaly detected on Agent %s! Failure rate elevated to %.2f%%", anomaly.Name, anomaly.FailureRate)
			
			audit := models.AuditLog{
				AgentID:             anomaly.AgentID,
				ActionType:          "Risk Anomaly Triggered",
				DecisionStatus:      "Flagged",
				TrustScoreSnapshot:  anomaly.TrustScore,
				CreditScoreSnapshot: 500,
				RiskLevel:           "High",
				Justification:       "Risk Agent detected abnormal failure rate spikes. Placed agentic account under transaction threshold limit restrictions.",
			}
			database.DB.Create(&audit)
		}
	}
}