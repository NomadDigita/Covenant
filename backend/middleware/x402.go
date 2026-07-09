package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"

	"backend/config"

	"github.com/gin-gonic/gin"
)

// X402PayPerRequest intercepts premium routes and enforces machine-to-machine payment proofs
func X402PayPerRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		paymentContract := config.GlobalConfig.ContractPayment
		if paymentContract == "" {
			log.Println("[Warning] CONTRACT_HASH_PAYMENT is not set. Bypassing x402 payment validation.")
			c.Next()
			return
		}

		// Extract the payment proof header
		paymentProof := c.GetHeader("X-402-Payment-Proof")
		paymentProof = strings.TrimSpace(paymentProof)

		if paymentProof == "" {
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":             "HTTP 402 Payment Required",
				"details":           "This endpoint requires a valid machine-to-machine payment proof.",
				"payment_contract": paymentContract,
				"required_motes":    "5000000000", // 5 CSPR
			})
			c.Abort()
			return
		}

		// Verify on-chain payment proof against Casper Testnet
		verified, err := verifyOnChainPayment(paymentProof, paymentContract)
		if err != nil || !verified {
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":          "Invalid or unconfirmed payment proof on-chain.",
				"provided_proof": paymentProof,
				"details":        fmt.Sprintf("%v", err),
			})
			c.Abort()
			return
		}

		// Valid payment proof. Unlock route for the calling AI agent.
		log.Printf("[x402 Protocol] Verified 5 CSPR payment for transaction: %s", paymentProof)
		c.Next()
	}
}

// verifyOnChainPayment queries the Casper Testnet to verify the payment transaction
func verifyOnChainPayment(txHash string, recipientContract string) (bool, error) {
	// Clean and format target recipient hash
	targetContractHex := strings.TrimSpace(recipientContract)
	targetContractHex = strings.TrimPrefix(targetContractHex, "hash-")
	targetContractHex = strings.ToLower(targetContractHex)

	nodeURL := "https://rpc.testnet.casper.network/rpc"

	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "info_get_deploy",
		"params": map[string]interface{}{
			"deploy_hash": txHash,
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}

	req, err := http.NewRequest("POST", nodeURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return false, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("transport node network error: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	var rpcResponse map[string]interface{}
	if err := json.Unmarshal(body, &rpcResponse); err != nil {
		return false, err
	}

	result, ok := rpcResponse["result"].(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("invalid Casper RPC result payload structure")
	}

	deploy, ok := result["deploy"].(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("missing deploy parameters in result")
	}

	// 1. Verify that the session calls our exact target payment contract
	session, ok := deploy["session"].(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("missing session data inside deploy")
	}

	var calledContractHex string
	var args []interface{}

	if storedContract, ok := session["StoredContractByHash"].(map[string]interface{}); ok {
		if hashVal, ok := storedContract["hash"].(string); ok {
			calledContractHex = hashVal
		}
		if argsVal, ok := storedContract["args"].([]interface{}); ok {
			args = argsVal
		}
	} else if storedVersioned, ok := session["StoredVersionedContractByHash"].(map[string]interface{}); ok {
		if hashVal, ok := storedVersioned["hash"].(string); ok {
			calledContractHex = hashVal
		}
		if argsVal, ok := storedVersioned["args"].([]interface{}); ok {
			args = argsVal
		}
	}

	// Sanitize called hash
	calledContractHex = strings.TrimSpace(calledContractHex)
	calledContractHex = strings.TrimPrefix(calledContractHex, "hash-")
	calledContractHex = strings.ToLower(calledContractHex)

	if calledContractHex != targetContractHex {
		return false, fmt.Errorf("transaction called unexpected contract: expected %s, got %s", targetContractHex, calledContractHex)
	}

	// 2. Hardened Payment Amount Validation
	// Extract the runtime argument named "amount" or "attached_value" and verify mathematical value
	var amountValidated bool = false
	requiredMotesStr := "5000000000" // 5 CSPR = 5,000,000,000 motes
	requiredMotes := new(big.Int)
	requiredMotes.SetString(requiredMotesStr, 10)

	for _, arg := range args {
		argPair, ok := arg.([]interface{})
		if !ok || len(argPair) < 2 {
			continue
		}
		argName, ok := argPair[0].(string)
		if !ok {
			continue
		}
		if argName == "amount" || argName == "attached_value" {
			clValue, ok := argPair[1].(map[string]interface{})
			if !ok {
				continue
			}
			parsedVal, exists := clValue["parsed"]
			if !exists {
				continue
			}
			
			// Casper CLValue representation formats U512 types as JSON standard string
			if parsedStr, ok := parsedVal.(string); ok {
				val := new(big.Int)
				if _, success := val.SetString(parsedStr, 10); success {
					if val.Cmp(requiredMotes) >= 0 {
						amountValidated = true
						break
					}
				}
			} else if parsedFloat, ok := parsedVal.(float64); ok {
				// Fallback if numerical type is parsed by standard driver
				val := new(big.Float).SetFloat64(parsedFloat)
				reqFloat := new(big.Float).SetInt(requiredMotes)
				if val.Cmp(reqFloat) >= 0 {
					amountValidated = true
					break
				}
			}
		}
	}

	if !amountValidated {
		return false, fmt.Errorf("payment proof rejected: missing or insufficient attached value (required minimum: %s motes)", requiredMotesStr)
	}

	// 3. Verify that the transaction execution succeeded on-chain
	executionResults, ok := result["execution_results"].([]interface{})
	if !ok || len(executionResults) == 0 {
		return false, fmt.Errorf("transaction has no on-chain execution blocks")
	}

	firstResult, ok := executionResults[0].(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("invalid execution blocks structure")
	}

	execResultOuter, ok := firstResult["result"].(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("missing transaction execution result tag")
	}

	if _, exists := execResultOuter["Success"]; !exists {
		return false, fmt.Errorf("transaction is unconfirmed or was reverted on-chain")
	}

	return true, nil
}