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
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	WalletAddress string    `gorm:"type:varchar(66);unique;not null;index" json:"wallet_address"`
	Name         string    `gorm:"type:varchar(100);not null" json:"name"`
	OwnerAddress string    `gorm:"type:varchar(66);not null" json:"owner_address"`
	Capabilities TextArray `gorm:"type:text[]" json:"capabilities"`
	Version      string    `gorm:"type:varchar(20);default:'1.0.0'" json:"version"`
	Description  string    `gorm:"type:text" json:"description"`
	CreatedAt    time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// ReputationScore represents the cached Trust Score metrics for an agent (CovenantScore)
type ReputationScore struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID         string    `gorm:"type:uuid;not null;unique;index" json:"agent_id"`
	Agent           Agent     `gorm:"foreignKey:AgentID;constraint:OnDelete:CASCADE" json:"-"`
	TrustScore      int       `gorm:"type:int;default:500" json:"trust_score"`
	JobsCompleted   int       `gorm:"type:int;default:0" json:"jobs_completed"`
	SuccessRate     float64   `gorm:"type:numeric(5,2);default:100.00" json:"success_rate"`
	FailureRate     float64   `gorm:"type:numeric(5,2);default:0.00" json:"failure_rate"`
	CommunityRating float64   `gorm:"type:numeric(3,2);default:5.00" json:"community_rating"`
	UpdatedAt       time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
}

// CreditScore represents the credit worthiness details (CovenantCredit)
type CreditScore struct {
	ID                 string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	AgentID            string    `gorm:"type:uuid;not null;unique;index" json:"agent_id"`
	Agent              Agent     `gorm:"foreignKey:AgentID;constraint:OnDelete:CASCADE" json:"-"`
	CreditScore        int       `gorm:"type:int;default:500" json:"credit_score"`
	TransactionVolume  float64   `gorm:"type:numeric(20,9);default:0.000000000" json:"transaction_volume"`
	PaymentReliability float64   `gorm:"type:numeric(5,2);default:100.00" json:"payment_reliability"`
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
	Description string     `gorm:"type:text" json:"description"`
	Budget      float64    `gorm:"type:numeric(20,9);not null" json:"budget"`
	Status      JobStatus  `gorm:"type:job_status;default:'open';index" json:"status"`
	TxHash      string     `gorm:"type:varchar(66)" json:"tx_hash,omitempty"`
	CreatedAt   time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// Transaction represents real-time payments of agent-to-agent activity (CovenantPay)
type Transaction struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SenderWallet   string    `gorm:"type:varchar(66);not null" json:"sender_wallet"`
	ReceiverWallet string    `gorm:"type:varchar(66);not null" json:"receiver_wallet"`
	Amount         float64   `gorm:"type:numeric(20,9);not null" json:"amount"`
	Memo           string    `gorm:"type:varchar(255)" json:"memo"`
	TxHash         string    `gorm:"type:varchar(66);unique;index" json:"tx_hash"`
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
	TrustScoreSnapshot  int       `gorm:"type:int;not null" json:"trust_score_snapshot"`
	CreditScoreSnapshot int       `gorm:"type:int;not null" json:"credit_score_snapshot"`
	RiskLevel           string    `gorm:"type:varchar(20);not null" json:"risk_level"`
	Justification       string    `gorm:"type:text;not null" json:"justification"`
	CreatedAt           time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
}