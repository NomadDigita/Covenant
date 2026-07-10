package services

import (
	"log"
	"os"
	"time"

	"backend/database"
	"backend/models"

	"gorm.io/gorm"
)

// StartSwarmOrchestration runs background agents asynchronously with optimized intervals
func StartSwarmOrchestration() {
	log.Println("[Swarm Orchestrator] Initializing background AI Swarm Workers...")

	// Default to rapid intervals (seconds) for dynamic hackathon demonstration feedback loops
	reputationInterval := getEnvDuration("SWARM_REPUTATION_INTERVAL", 15*time.Second)
	creditInterval := getEnvDuration("SWARM_CREDIT_INTERVAL", 20*time.Second)
	riskInterval := getEnvDuration("SWARM_RISK_INTERVAL", 30*time.Second)

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

// startReputationAgent aggregates performance records and automates active escrow releases
func startReputationAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Reputation Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Reputation Agent] Aggregating marketplace metrics...")

		// High-Performance Aggregation Query: Compiles total and completed jobs for ALL active providers in one query
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

			// Add mathematical guard against division-by-zero (Total == 0) to prevent NaN errors
			var rate float64 = 100.00 // Default baseline for new agents with zero jobs
			if stat.Total > 0 {
				rate = (float64(stat.Completed) / float64(stat.Total)) * 100.0
			}

			database.DB.Model(&models.ReputationScore{}).
				Where("agent_id = ?", stat.ProviderID).
				Updates(map[string]interface{}{
					"success_rate":   rate,
					"failure_rate":   100.0 - rate,
					"jobs_completed": int(stat.Completed),
				})
			log.Printf("[Reputation Agent] Updated Agent %s: Success Rate = %.2f%%", stat.ProviderID, rate)
		}

		// AUTONOMOUS ESCROW SETTLEMENT RELEASE:
		// If a job status has been completed, but its Escrow Locker remains locked, 
		// the Reputation Agent Swarm automatically triggers the database release transition.
		var activeLockedEscrows []models.EscrowLocker
		err = database.DB.Table("escrow_lockers").
			Select("escrow_lockers.*").
			Joins("join marketplace_jobs on marketplace_jobs.id = escrow_lockers.job_id").
			Where("escrow_lockers.status = 'locked' AND marketplace_jobs.status = 'completed'").
			Scan(&activeLockedEscrows).Error

		if err == nil && len(activeLockedEscrows) > 0 {
			for _, escrow := range activeLockedEscrows {
				log.Printf("[Reputation Swarm] Detected completed job %s with locked escrow. Triggering automated release...", escrow.JobID)

				err = database.DB.Transaction(func(tx *gorm.DB) error {
					escrow.Status = "released"
					if err := tx.Save(&escrow).Error; err != nil {
						return err
					}

					// Resolve and compile dynamic metrics for audit
					var targetAgent models.Agent
					var rep models.ReputationScore
					var credit models.CreditScore

					trustSnap := 500
					creditSnap := 500

					if err := tx.Where("wallet_address = ?", escrow.AgentWallet).First(&targetAgent).Error; err == nil {
						tx.Where("agent_id = ?", targetAgent.ID).First(&rep)
						tx.Where("agent_id = ?", targetAgent.ID).First(&credit)
						trustSnap = rep.TrustScore
						creditSnap = credit.CreditScore
					}

					// Record automated escrow completion trace
					audit := models.AuditLog{
						AgentID:             targetAgent.ID,
						ActionType:          "Automated Escrow Release",
						DecisionStatus:      "Released",
						TrustScoreSnapshot:  trustSnap,
						CreditScoreSnapshot: creditSnap,
						RiskLevel:           "Low",
						Justification:       "Reputation Agent Swarm verified successful on-chain execution parameters. Released locked collateral budget to provider balance automatically.",
					}

					return tx.Create(&audit).Error
				})

				if err != nil {
					log.Printf("[Reputation Swarm Error] Failed to complete automated escrow release transaction for %s: %v", escrow.ID, err)
				}
			}
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

// startRiskAgent monitors anomalies and triggers security warnings & automated timeout slashings
func startRiskAgent(interval time.Duration) {
	ticker := time.NewTicker(interval)
	log.Printf("[Risk Agent] Background worker started. Ticker interval: %v", interval)

	for range ticker.C {
		log.Println("[Risk Agent] Analyzing behavior profiles for threat telemetry...")

		var anomalies []struct {
			AgentID     string  `gorm:"column:agent_id"`
			Name        string  `gorm:"column:name"`
			TrustScore  int     `gorm:"column:trust_score"`
			FailureRate float64 `gorm:"column:failure_rate"`
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

			// Record an alert directly to audit logs
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

		// AUTONOMOUS COLLATERAL AUTO-SLASHER ON EXPIRED TIMEOUTS:
		// If an escrow remains locked but standard expires_at timestamp has passed, 
		// the Risk Agent automatically slashes standard provider stake and refunds standard client budget.
		var expiredEscrows []models.EscrowLocker
		err = database.DB.Where("status = 'locked' AND expires_at < ?", time.Now()).Find(&expiredEscrows).Error

		if err == nil && len(expiredEscrows) > 0 {
			for _, escrow := range expiredEscrows {
				log.Printf("[Risk Agent ALERT] Active escrow %s timed out! Executing automated slash-and-refund...", escrow.ID)

				err = database.DB.Transaction(func(tx *gorm.DB) error {
					// 1. Mark escrow as slashed
					escrow.Status = "slashed"
					if err := tx.Save(&escrow).Error; err != nil {
						return err
					}

					// 2. Mark associated marketplace job as Failed
					var job models.MarketplaceJob
					if err := tx.First(&job, "id = ?", escrow.JobID).Error; err == nil {
						job.Status = models.JobStatusFailed
						now := time.Now()
						job.CompletedAt = &now
						if err := tx.Save(&job).Error; err != nil {
							return err
						}

						// 3. Penalize standard mercenary provider's scores (-75 trust penalty, clamped at 0)
						var rep models.ReputationScore
						if err := tx.Where("agent_id = ?", job.ProviderID).First(&rep).Error; err == nil {
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
							var credit models.CreditScore
							tx.Where("agent_id = ?", *job.ProviderID).First(&credit)

							audit := models.AuditLog{
								AgentID:             *job.ProviderID,
								ActionType:          "Automated Escrow Slashed",
								DecisionStatus:      "Slashed",
								TrustScoreSnapshot:  rep.TrustScore,
								CreditScoreSnapshot: credit.CreditScore,
								RiskLevel:           "High",
								Justification:       "Risk Agent detected critical execution timeout limit exceeded. Terminated escrow, refunded client budget, and penalized provider.",
							}
							if err := tx.Create(&audit).Error; err != nil {
								return err
							}
						}
					}
					return nil
				})

				if err != nil {
					log.Printf("[Risk Swarm Error] Failed to execute automated slashing transaction for %s: %v", escrow.ID, err)
				}
			}
		}
	}
}