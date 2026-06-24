package database

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB represents the global database connection instance
var DB *gorm.DB

// InitDatabase initializes connection pooling to the Supabase instance
func InitDatabase() {
	// Load environment variables if running locally
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Note: .env file not found, reading from system environment")
	}

	// Retrieve Supabase Connection String (DATABASE_URL configured for pooling)
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set in environment variables")
	}

	var err error
	// Use postgres.New configuration with PreferSimpleProtocol enabled to bypass PgBouncer statement caching issues
	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Bypasses SQLSTATE 42P05 PgBouncer errors
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to establish connection to database: %v", err)
	}

	// Setup underlying SQL connection pooling optimizations
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to retrieve underlying database connection: %v", err)
	}

	// Parameters tuned for serverless/agent microservice scalability
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	log.Println("Database connection pool established successfully with Simple Protocol (PgBouncer compatible).")
}