package main

import (
	"log"

	"backend/config"
	"backend/controllers"
	"backend/database"
	"backend/mcp"
	"backend/middleware"
	"backend/services"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting Covenant Production API Gateway...")

	// 1. Load Centralized Configurations dynamically from environment
	config.LoadConfig()

	// 2. Initialize Supabase Connection pool with Simple Protocol (PgBouncer compatible)
	database.ConnectDatabase()

	// 3. Launch the Asynchronous Swarm Agent Background Workers (Rep, Credit, Risk)
	services.StartSwarmOrchestration()

	// 4. Initialize Router
	router := gin.Default()

	// 5. Setup CORS Middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-402-Payment-Proof")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 6. Global Health Check Endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":   "healthy",
			"database": "connected",
		})
	})

	// 7. Setup Casper Model Context Protocol (MCP) Server Endpoint
	router.POST("/mcp", mcp.HandleMCPEndpoint)

	// 8. Consolidated Versioned API Routes (v1)
	v1 := router.Group("/api/v1")
	{
		// --- CovenantID Identity Layer ---
		v1.POST("/agents/register", controllers.RegisterAgent)
		v1.GET("/agents/:wallet", controllers.GetAgentByWallet)

		// --- Covenant Market (Discovery & Jobs) ---
		v1.POST("/marketplace/jobs", controllers.PostJob)
		v1.POST("/marketplace/assign", controllers.AssignJob)
		v1.POST("/marketplace/complete", controllers.CompleteJob)
		v1.GET("/marketplace/search", controllers.GetMarketplaceJobs)

		// --- CovenantPay (x402 Micropayments) ---
		v1.POST("/payments/transfer", controllers.ExecutePayment)
		v1.GET("/payments/history", controllers.GetPaymentHistory)

		// --- CovenantAudit (AI Explanations & logs) ---
		// Enforce HTTP-native x402 pay-per-request verification on the premium audit explanation generator endpoint
		v1.POST("/audits/explain", middleware.X402PayPerRequest(), controllers.RequestAuditExplanation)
		v1.GET("/audits/:agent_id", controllers.GetAuditLogsByAgent)
	}

	// 9. Launch Server on Port configured in config
	port := ":" + config.GlobalConfig.Port
	log.Printf("Covenant Production Gateway listening on http://localhost%s", port)
	if err := router.Run(port); err != nil {
		log.Fatalf("Critical Gateway crash: %v", err)
	}
}