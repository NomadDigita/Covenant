package mcp

import (
	"net/http"

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

			c.JSON(http.StatusOK, gin.H{
				"jsonrpc": "2.0",
				"id":      req.ID,
				"result": gin.H{
					"content": []gin.H{
						{
							"type": "text",
							"text": "Agent: " + agent.Name + " | Trust Score: " + string(rune(reputation.TrustScore)) + " | Credit: " + string(rune(credit.CreditScore)),
						},
					},
				},
			})
			return
		}

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