package models

import (
	"database/sql/driver"
	"errors"
	"strings"
	"time"
)

// TextArray is a helper type for PostgreSQL's TEXT[] type in GORM
type TextArray []string

// Scan implements the sql.Scanner interface for TextArray
func (a *TextArray) Scan(value interface{}) error {
	if value == nil {
		*a = TextArray{}
		return nil
	}
	asString, ok := value.(string)
	if !ok {
		asBytes, ok := value.([]byte)
		if !ok {
			return errors.New("scan source is not string or []byte")
		}
		asString = string(asBytes)
	}
	
	// Parse Postgres array formatting, e.g., {val1,val2}
	str := strings.Trim(asString, "{}")
	if str == "" {
		*a = TextArray{}
		return nil
	}
	*a = strings.Split(str, ",")
	return nil
}

// Value implements the driver.Valuer interface for TextArray
func (a TextArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "{}", nil
	}
	return "{" + strings.Join(a, ",") + "}", nil
}

// Agent represents the unique identity of an AI Agent (CovenantID)
type Agent struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	WalletAddress string    `gorm:"type:varchar(70);unique;not null;index" json:"wallet_address"` // Expanded to support standard compressed Secp256k1 Keys
	Name          string    `gorm:"type:varchar(100);not null" json:"name"`
	OwnerAddress  string    `gorm:"type:varchar(70);not null" json:"owner_address"` // Expanded to support standard compressed Secp256k1 Keys
	Capabilities  TextArray `gorm:"type:text[]" json:"capabilities"`
	Version       string    `gorm:"type:varchar(20);default:'1.0.0'" json:"version"`
	Description   string    `gorm:"type:varchar(1000)" json:"description"` // Strictly bounded to prevent memory depletion DoS
	CreatedAt     time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt     time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// ReputationScore represents the cached Trust Score metrics for an agent (CovenantScore)
type ReputationScore struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID         string    `gorm:"type:uuid;not null;unique;index" json:"agent_id"`
	Agent           Agent     `gorm:"foreignKey:AgentID;constraint:OnDelete:CASCADE" json:"-"`
	TrustScore      int       `gorm:"type:int;default:500;check:trust_score >= 0 AND trust_score <= 1000" json:"trust_score"`
	JobsCompleted   int       `gorm:"type:int;default:0;check:jobs_completed >= 0" json:"jobs_completed"`
	SuccessRate     float64   `gorm:"type:numeric(5,2);default:100.00;check:success_rate >= 0.00 AND success_rate <= 100.00" json:"success_rate"`
	FailureRate     float64   `gorm:"type:numeric(5,2);default:0.00;check:failure_rate >= 0.00 AND failure_rate <= 100.00" json:"failure_rate"`
	CommunityRating float64   `gorm:"type:numeric(3,2);default:5.00;check:community_rating >= 0.00 AND community_rating <= 5.00" json:"community_rating"`
	UpdatedAt       time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// CreditScore represents the credit worthiness details (CovenantCredit)
type CreditScore struct {
	ID                 string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID            string    `gorm:"type:uuid;not null;unique;index" json:"agent_id"`
	Agent              Agent     `gorm:"foreignKey:AgentID;constraint:OnDelete:CASCADE" json:"-"`
	CreditScore        int       `gorm:"type:int;default:500;check:credit_score >= 0 AND credit_score <= 1000" json:"credit_score"`
	TransactionVolume  float64   `gorm:"type:numeric(20,9);default:0.000000000;check:transaction_volume >= 0.0" json:"transaction_volume"`
	PaymentReliability float64   `gorm:"type:numeric(5,2);default:100.00;check:payment_reliability >= 0.00 AND payment_reliability <= 100.00" json:"payment_reliability"`
	UpdatedAt          time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// JobStatus matches the custom postgres ENUM type
type JobStatus string

const (
	JobStatusOpen      JobStatus = "open"
	JobStatusActive    JobStatus = "active"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
)

// MarketplaceJob represents active/completed agent assignments (Covenant Market)
type MarketplaceJob struct {
	ID          string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CreatorID   string     `gorm:"type:uuid;index" json:"creator_id"`
	ProviderID  *string    `gorm:"type:uuid;index" json:"provider_id,omitempty"`
	Title       string     `gorm:"type:varchar(255);not null" json:"title"`
	Description string     `gorm:"type:varchar(1000)" json:"description"` // Strictly bounded description
	Budget      float64    `gorm:"type:numeric(20,9);not null;check:budget >= 0.0" json:"budget"`
	Status      JobStatus  `gorm:"type:varchar(50);default:'open';index" json:"status"` // Changed to standard varchar to ensure migrations cross-compatibilities
	TxHash      string     `gorm:"type:varchar(70)" json:"tx_hash,omitempty"`          // Expanded to support standard Casper transaction hashes containing custom prefixes
	CreatedAt   time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// Transaction represents real-time payments of agent-to-agent activity (CovenantPay)
type Transaction struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SenderWallet   string    `gorm:"type:varchar(70);not null" json:"sender_wallet"`   // Expanded to support standard compressed Secp256k1 Keys
	ReceiverWallet string    `gorm:"type:varchar(70);not null" json:"receiver_wallet"` // Expanded to support standard compressed Secp256k1 Keys
	Amount         float64   `gorm:"type:numeric(20,9);not null;check:amount > 0.0" json:"amount"`
	Memo           string    `gorm:"type:varchar(255)" json:"memo"`
	TxHash         string    `gorm:"type:varchar(70);unique;index" json:"tx_hash"` // Expanded to support standard Casper transaction hashes containing custom prefixes
	Status         string    `gorm:"type:varchar(50);default:'pending'" json:"status"`
	Timestamp      time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"timestamp"`
}

// AuditLog contains details written by the Audit Agent explaining credit/risk/trust outputs
type AuditLog struct {
	ID                  string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID             string    `gorm:"type:uuid;not null;index" json:"agent_id"`
	Agent               Agent     `gorm:"foreignKey:AgentID;constraint:OnDelete:CASCADE" json:"-"`
	ActionType          string    `gorm:"type:varchar(100);not null" json:"action_type"`
	DecisionStatus      string    `gorm:"type:varchar(50);not null" json:"decision_status"`
	TrustScoreSnapshot  int       `gorm:"type:int;not null;check:trust_score_snapshot >= 0 AND trust_score_snapshot <= 1000" json:"trust_score_snapshot"`
	CreditScoreSnapshot int       `gorm:"type:int;not null;check:credit_score_snapshot >= 0 AND credit_score_snapshot <= 1000" json:"credit_score_snapshot"`
	RiskLevel           string    `gorm:"type:varchar(20);not null" json:"risk_level"`
	Justification       string    `gorm:"type:varchar(2000);not null" json:"justification"` // Bounded to protect storage
	CreatedAt           time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
}