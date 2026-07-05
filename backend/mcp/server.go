package mcp

import (
	"fmt"
	"net/http"
	"strings"

	"backend/database"
	"backend/models"

	"github.com/gin-gonic/gin"
)

// MCPRequest defines the standard Model Context Protocol JSON-RPC request structure
type MCPRequest struct {
	JSONRPC string                 `json:"jsonrpc"`
	ID      interface{}            `json:"id"`
	Method  string                 `json:"method"`
	Params  map[string]interface{} `json:"params,omitempty"`
}

// HandleMCPEndpoint processes standardized LLM context tool calls
func HandleMCPEndpoint(c *gin.Context) {
	var req MCPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON-RPC format"})
		return
	}

	switch req.Method {
	case "mcp.listTools":
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"id":      req.ID,
			"result": gin.H{
				"tools": []gin.H{
					{
						"name":        "resolveAgentProfile",
						"description": "Resolves an AI Agent's registered identity, live trust scores, and credit limits by wallet address.",
						"inputSchema": gin.H{
							"type": "object",
							"properties": gin.H{
								"wallet_address": gin.H{"type": "string", "description": "Casper public key hex (66 chars)"},
							},
							"required": []string{"wallet_address"},
						},
					},
					{
						"name":        "getMarketplaceJobs",
						"description": "Pulls open and active jobs on the Covenant Market to discover matching capabilities.",
						"inputSchema": gin.H{
							"type": "object",
							"properties": gin.H{
								"status": gin.H{"type": "string", "description": "Filter by job status (open, active, completed, failed)"},
							},
						},
					},
				},
			},
		})

	case "mcp.callTool":
		toolName, _ := req.Params["name"].(string)
		toolArguments, _ := req.Params["arguments"].(map[string]interface{})

		if toolName == "resolveAgentProfile" {
			walletAddress, _ := toolArguments["wallet_address"].(string)
			var agent models.Agent
			if err := database.DB.Where("wallet_address = ?", walletAddress).First(&agent).Error; err != nil {
				c.JSON(http.StatusOK, gin.H{
					"jsonrpc": "2.0",
					"id":      req.ID,
					"result":  gin.H{"content": []gin.H{{"type": "text", "text": "Agent profile not found."}}},
				})
				return
			}

			var reputation models.ReputationScore
			database.DB.Where("agent_id = ?", agent.ID).First(&reputation)

			var credit models.CreditScore
			database.DB.Where("agent_id = ?", agent.ID).First(&credit)

			// FIXED: Replaced corrupted "string(rune(score))" casts with fmt.Sprintf
			formattedText := fmt.Sprintf(
				"Agent: %s | Trust Score: %d/1000 | Credit Score: %d/1000 | Capabilities: %v",
				agent.Name,
				reputation.TrustScore,
				credit.CreditScore,
				agent.Capabilities,
			)

			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"result": gin.H{
					"content": []gin.H{
						{
							"type": "text",
							"text": formattedText,
						},
					},
				},
			})
			return
		}

		// FIXED: Implemented missing "getMarketplaceJobs" execution logic block
		if toolName == "getMarketplaceJobs" {
			status, _ := toolArguments["status"].(string)
			status = strings.TrimSpace(strings.ToLower(status))

			var jobs []models.MarketplaceJob
			query := database.DB

			if status != "" {
				query = query.Where("status = ?", status)
			}

			if err := query.Order("created_at desc").Limit(10).Find(&jobs).Error; err != nil {
				c.JSON(http.StatusOK, gin.H{
					"jsonrpc": "2.0",
					"id":      req.ID,
					"result":  gin.H{"content": []gin.H{{"type": "text", "text": "Failed to retrieve job listings."}}},
				})
				return
			}

			var responseBuilder strings.Builder
			responseBuilder.WriteString("Covenant Marketplace Job Listings:\n")
			for _, job := range jobs {
				responseBuilder.WriteString(fmt.Sprintf(
					"- ID: %s | Title: %s | Budget: %.2f CSPR | Status: %s\n",
					job.ID,
					job.Title,
					job.Budget,
					job.Status,
				))
			}

			responseText := responseBuilder.String()
			if len(jobs) == 0 {
				responseText = "No active marketplace jobs found matching criteria."
			}

			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"result": gin.H{
					"content": []gin.H{
						{
							"type": "text",
							"text": responseText,
						},
					},
				},
			})
			return
		}

		// Fallback for un-mapped tool names
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"id":      req.ID,
			"error":   gin.H{"code": -32601, "message": "Method not found"},
		})

	default:
		c.JSON(http.StatusOK, gin.H{
			"jsonrpc": "2.0",
			"id":      req.ID,
			"error":   gin.H{"code": -32601, "message": "Method not found"},
		})
	}
}