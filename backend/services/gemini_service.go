package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// GeminiRequest represents the JSON request structure for Google Gemini
type GeminiRequest struct {
	Contents []ContentPart `json:"contents"`
}

type ContentPart struct {
	Parts []PartText `json:"parts"`
}

type PartText struct {
	Text string `json:"text"`
}

// GeminiResponse represents the JSON response returned by the API
type GeminiResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content ContentResponse `json:"content"`
}

type ContentResponse struct {
	Parts []PartText `json:"parts"`
}

// GenerateAuditJustification cascades through multiple Gemini models to handle transient overloads
func GenerateAuditJustification(action string, trust int, credit int, risk string, detail string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY is not configured in system environment variables")
	}

	// Priority list of redundant models for failover
	models := []string{
		"gemini-1.5-flash",
		"gemini-1.5-pro",
		"gemini-flash-latest",
		"gemini-pro",
	}

	// Build the unified prompt context
	prompt := fmt.Sprintf(
		"You are the Covenant Audit Agent for an on-chain AI Agent economy on Casper. "+
			"Explain the reasoning behind this decision concisely in 3-4 bullet points maximum: "+
			"Action: %s. "+
			"Current Trust Score: %d/1000. "+
			"Current Credit Score: %d/1000. "+
			"Risk Level: %s. "+
			"Context Details: %s. "+
			"Your output must be structured, clean, highly professional, and ready for displaying on a dashboard.",
		action, trust, credit, risk, detail,
	)

	reqPayload := GeminiRequest{
		Contents: []ContentPart{
			{
				Parts: []PartText{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqPayload)
	if err != nil {
		return "", err
	}

	var lastErr error

	// Cascade through available models until one successfully resolves the query
	for _, modelName := range models {
		log.Printf("[Audit Agent] Attempting execution with model: %s", modelName)
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[Audit Agent Warning] Model %s failed due to transport error: %v", modelName, err)
			lastErr = err
			continue
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode != http.StatusOK {
			log.Printf("[Audit Agent Warning] Model %s returned status %d. Content: %s", modelName, resp.StatusCode, string(bodyBytes))
			lastErr = fmt.Errorf("model %s returned non-200 code: %d", modelName, resp.StatusCode)
			continue
		}

		var geminiResp GeminiResponse
		if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
			lastErr = err
			continue
		}

		if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
			log.Printf("[Audit Agent Success] Explanation generated successfully using model: %s", modelName)
			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}
	}

	// If all models in the cascade failed, propagate the combined error back
	return "", fmt.Errorf("all available Gemini models exhausted. Last error: %v", lastErr)
}