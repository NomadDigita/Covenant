package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// Config holds all validated environment variables for the gateway
type Config struct {
	DatabaseURL          string
	DirectURL            string
	GeminiAPIKey         string
	ContractRegistry     string
	ContractReputation   string
	ContractCredit       string
	ContractPayment      string
	Port                 string
	TelegramToken        string
}

// GlobalConfig is the shared read-only configuration instance
var GlobalConfig *Config

// LoadConfig traverses directory structures to locate .env files and parses parameters safely
func LoadConfig() {
	// Try loading from active working directory, parent directory, or grandparent directory
	envFiles := []string{
		".env",
		"../.env",
		"../../.env",
	}

	for _, file := range envFiles {
		if absPath, err := filepath.Abs(file); err == nil {
			if _, err := os.Stat(absPath); err == nil {
				if err := godotenv.Load(absPath); err == nil {
					log.Printf("[Config] Loaded environment variables from: %s", absPath)
					break
				}
			}
		}
	}

	// Initialize Configuration parameters
	GlobalConfig = &Config{
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		DirectURL:          os.Getenv("DIRECT_URL"),
		GeminiAPIKey:       os.Getenv("GEMINI_API_KEY"),
		ContractRegistry:   os.Getenv("CONTRACT_HASH_AGENT_REGISTRY"),
		ContractReputation: os.Getenv("CONTRACT_HASH_REPUTATION"),
		ContractCredit:     os.Getenv("CONTRACT_HASH_CREDIT"),
		ContractPayment:    os.Getenv("CONTRACT_HASH_PAYMENT"),
		Port:               os.Getenv("PORT"),
		TelegramToken:      os.Getenv("TELEGRAM_BOT_TOKEN"),
	}

	// Fallback to default port if not declared
	if GlobalConfig.Port == "" {
		GlobalConfig.Port = "8080"
	}

	// Validate critical parameters
	if GlobalConfig.DatabaseURL == "" {
		log.Fatal("[Critical Config Error] DATABASE_URL is not configured in the system environment.")
	}
	if GlobalConfig.GeminiAPIKey == "" {
		log.Println("[Config Warning] GEMINI_API_KEY is missing. AI Auditing features will be inactive.")
	}
}