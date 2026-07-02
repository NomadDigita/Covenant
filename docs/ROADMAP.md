# Covenant MVP Development Roadmap

This roadmap structures the development, verification, and deployment phases for the Casper Agentic Buildathon.

---

## Phase 1: Database Setup & Migration (Supabase)
* **Goal**: Establish the PostgreSQL relational layout to store profiles, logs, scores, and transaction history.
* **Tasks**:
  1. Create tables (`agents`, `reputation_scores`, `credit_scores`, `marketplace_jobs`, `transactions`, `audit_logs`).
  2. Implement database constraints, foreign keys, and indexes.
  3. Validate connection strings inside backend setup.

---

## Phase 2: Core Smart Contracts (Casper Odra Framework)
* **Goal**: Develop the verifiable on-chain trust contracts.
* **Tasks**:
  1. Build `AgentRegistry` (CovenantID registration and querying).
  2. Build `ReputationContract` (handling success/failure updates and scoring).
  3. Build `CreditContract` (implementing algorithmic scoring updates based on payment volumes).
  4. Build `MarketplaceContract` and `PaymentContract` (x402-style execution logic).
  5. Deploy contracts to Casper Testnet.

---

## Phase 3: Go Backend API Gateway & Orchestration
* **Goal**: Build the secure API hub interfacing with Supabase, Casper RPC, and Gemini AI.
* **Tasks**:
  1. Configure Go Fiber/Gin service with middleware (CORS, error handling).
  2. Write database controllers (CRUD for agent state, job tracking, and scores).
  3. Integrate the Gemini API via the generative SDK for the Audit Agent decision descriptions.
  4. Set up live mock transactions and event-driven updates.

---

## Phase 4: Multi-Agent Swarm Logic (AI Services)
* **Goal**: Implement specialized autonomous agent roles.
* **Tasks**:
  1. **Reputation Agent**: Compute performance rates and feed values to the Reputation Contract.
  2. **Credit Agent**: Recalculate credit score matrices based on transaction history.
  3. **Risk Agent**: Monitor telemetry for abnormal transactional frequencies.
  4. **Audit Agent**: Use Gemini models to construct human-readable, auditable summaries of score adjustments or loan verdicts.

---

## Phase 5: Next.js Frontend Client (Dashboard & Marketplace)
* **Goal**: Provide a clean, real-time visual client.
* **Tasks**:
  1. Integrate CSPR.click / CSPR.cloud for wallet authorization and transaction querying.
  2. Construct the Agent Profile Dashboard (displaying CovenantID, scores, risk matrix, earnings).
  3. Build the Covenant Market search and filtering module.
  4. Develop the Live Transaction Activity Feed.

---

## Phase 6: End-to-End Verification & Launch
* **Goal**: Execute the complete user journey (Identity -> Scoring -> Job Posting -> Match -> Settlement -> Audit explanation).
* **Tasks**:
  1. Perform full integration tests across all modules.
  2. Package documentation and deployment guidelines.