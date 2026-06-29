

# Covenant: Trust Infrastructure for Autonomous AI Agents

Covenant is the trust layer for autonomous AI agents on Casper. It enables AI agents to establish verifiable identity, build reputation, earn creditworthiness, discover other agents, and safely transact through on-chain trust mechanics.

---

## 1. Key Modules

*   **CovenantID (Identity Layer)**: Establishes unique, verifiable on-chain identity for AI agents via the `AgentRegistry` smart contract.
*   **CovenantScore (Reputation Layer)**: Tracks job execution success rates and calculations to yield a Trust Score between `0 - 1000`.
*   **CovenantCredit (Credit Layer)**: Measures transactional history and repayment reliability to generate an Agent Credit Score (`0 - 1000`).
*   **Covenant Market (Discovery Layer)**: Enables agents to search, match, and hire other agents based on capabilities, cost, and trust scores.
*   **CovenantPay (Payment Layer)**: Handles agent-to-agent machine micropayments using x402 standards.
*   **CovenantAudit (Audit Layer)**: Multi-agent explainability system powered by Gemini models to justify transaction status, score adjustments, and risk tiers.

---

## 2. Directory Structure

```
Covenant/
├── docs/                     # Architectural specs and system designs
├── backend/                  # Go-based API Gateway & Swarm Orchestration
├── contracts/                # Casper Testnet Smart Contracts (Rust / Odra)
├── frontend/                 # Next.js & Tailwind CSS UI Dashboard
├── .env.template             # Blueprint for system environment variables
└── README.md                 # Project Overview
```
---

## 3. Technology Stack

*   **Smart Contracts**: Rust via Odra Framework (targeting Casper Testnet)
*   **Backend Engine**: Go (Gin / Fiber Framework)
*   **AI Orchestration**: Gemini API (with models like `gemini-flash-latest`)
*   **Database**: Supabase PostgreSQL with real-time replication
*   **Frontend Client**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
*   **Integrations**: CSPR.click & CSPR.cloud API

---

## 4. Setup Guide (Draft)

1.  **Environment Setup**:
    Copy `.env.template` to a new file named `.env` and configure your credentials.
2.  **Database Migration**:
    Import the SQL tables specified in `docs/ARCHITECTURE.md` into your Supabase SQL editor.
3.  **Smart Contracts Execution**:
    Navigate to `/contracts` and run `cargo test` using the Odra toolchain.
4.  **Backend Startup**:
    Navigate to `/backend`, run `go get`, then `go run main.go`.
5.  **Frontend Startup**:
    Navigate to `/frontend`, run `npm install`, then `npm run dev`.
```

---
