package database

import (
	"log"
	"time"

	"backend/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the globally shared, thread-safe GORM database instance
var DB *gorm.DB

// ConnectDatabase initializes the database connection pool using centralized configs
func ConnectDatabase() {
	// Ensure config engine has loaded variables first
	if config.GlobalConfig == nil {
		log.Fatal("[Database Error] Configuration engine has not been initialized. Call config.LoadConfig() first.")
	}

	dsn := config.GlobalConfig.DatabaseURL

	// Configure GORM dialing properties
	dialector := postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // CRITICAL: Required for Supabase transaction-mode PgBouncer (Port 6543)
	})

	var err error
	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // Enables active query debugging
	})

	if err != nil {
		log.Fatalf("[Database Error] Connection handshake failed: %v", err)
	}

	// Extract standard SQL connection object to adjust pool parameters
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("[Database Error] SQL adapter extraction failed: %v", err)
	}

	// Safe resource bounds for Supabase Free/Pro Tier limitations
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	log.Println("[Database] Connection pool established safely over PgBouncer.")
}