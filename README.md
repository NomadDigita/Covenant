<div align="center">


<!-- Auto-playing typing text effect -->
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=20&duration=3000&pause=1000&color=FF5500&center=true&vCenter=true&width=600&lines=INITIALIZING+COVENANT+PROTOCOL...;LOADING+CASPER+TESTNET+WASM...;SPAWNING+ASYNC+SWARM+WORKERS...;SYSTEM+STATUS:+SECURE+AND+ACTIVE." alt="Typing SVG" />
</a>

<!-- Main Visual Header Banner -->
<img width="600" height="206" alt="covenant_casper_explainer" src="https://github.com/user-attachments/assets/026c40d5-e2b0-4eef-bdda-74b07dad574b" />

<br><br>

# 🏛️ COVENANT PROTOCOL
### *Technical Specification, System Architecture & Operational Guide*

<br>

![Casper Testnet](https://img.shields.io/badge/Casper_Network-Testnet-FF5500?style=for-the-badge&logo=blockchain&logoColor=white)
![Odra Framework](https://img.shields.io/badge/Odra_Framework-0.8.0-red?style=for-the-badge&logo=rust&logoColor=white)
![Go REST API](https://img.shields.io/badge/Go_Gateway-Gin_Engine-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Supabase PostgreSQL](https://img.shields.io/badge/Database-Supabase_PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Next.js 14 HUD](https://img.shields.io/badge/Next.js_14-HUD_Dashboard-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)

</div>

---

<br>

## 📋 <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=5000&color=00E5FF&vCenter=true&width=800&lines=1.+Executive+Summary+%26+Vision" alt="Executive Summary" />

Covenant is a trust, identity, and financial coordination infrastructure layer built on the Casper Network, enabling autonomous AI agents to operate as sovereign economic entities. 

By combining on-chain Casper smart contracts, a high-performance Go API gateway, background multi-agent swarms, and a highly responsive Next.js dark HUD dashboard, Covenant resolves the critical friction points of the emerging machine-to-machine (M2M) economy: identity spoofing, cold-start trust obstacles, rigid Web2 payment rails, and black-box operational opacity.

As artificial intelligence transitions from static conversational assistants to autonomous agents capable of independent decision-making, asset management, and transaction signing, they require a decentralized framework to prove their identity, earn trust, discover compatible partners, and settle micro-transactions. Covenant provides this trust layer, conceptually combining decentralized identity (OAuth/DID), rating bureaus (Experian), payment processing (Stripe/Visa), and interoperability schemas (MCP) into a unified, secure protocol.

### Core Problems Solved:
* **Identity Anonymity:** Prevents sybil attacks by linking Casper public keys to on-chain verified metadata profiles (CovenantID).
* **Cold-Start Trust Friction:** Establishes algorithmic baseline trust ratings (0-1000) that update dynamically based on actual task executions (CovenantScore & CovenantCredit).
* **Payment Rail Friction:** Bypasses credit card settlement loops and high fees by using native CSPR micropayments verified through a machine-friendly billing middleware (CovenantPay / x402).
* **Operation Opacity:** Translates complex on-chain score adjustments and risk flags into structured, natural-language markdown audits using cascading AI models (CovenantAudit).

---

<br>

## 🏛️ <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=5000&color=00FF66&vCenter=true&width=800&lines=2.+Decoupled+System+Architecture" alt="Decoupled System Architecture" />

Covenant employs a decoupled, three-tier architecture designed for high availability, low-latency off-chain reads, and secure, permissioned on-chain writes.

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                    NEXT.JS FRONTEND                    │
                               │                                                        │
                               │  ┌──────────────────┐  ┌─────────────┐  ┌───────────┐  │
                               │  │   CovenantID     │  │  Score/Cred │  │  Console  │  │
                               │  │  Onboard / Search│  │ Radar Dials │  │ Terminal  │  │
                               │  └────────┬─────────┘  └──────▲──────┘  └─────▲─────┘  │
                               └───────────┼───────────────────┼───────────────┼────────┘
                                           │ HTTPS (CORS)      │               │
                                           ▼                   │               │
 ┌─────────────────────────────────────────┼───────────────────┼───────────────┼────────┐
 │                              GO ROUTING GATEWAY / API                        │
 │                                                                                      │
 │  ┌────────────────────────────────────────────────────────────────────────────────┐  │
 │  │                                Gin Router                                      │  │
 │  │  /api/v1/agents/register, /api/v1/marketplace/complete, /api/v1/audits/explain │  │
 │  └──────────────────────────────────────┬─────────────────────────────────────────┘  │
 └─────────────────────────────────────────┼────────────────────────────────────────────┘
                                           │ SQL Pool (PreferSimpleProtocol: true)
                                           ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │                                 DATABASE LAYER                                       │
 │                                                                                      │
 │  ┌────────────────────────────────────────────────────────────────────────────────┐  │
 │  │                           Supabase PostgreSQL (v15)                            │  │
 │  │          Tables: agents, reputation_scores, credit_scores, audit_logs          │  │
 │  └────────────────────────────────────────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Frontend Client Layer (Next.js 14)
* **Single-Page Cockpit:** Built using the React App Router, presenting telemetry cards, range sliders, SVG radial gauges, and a collapsible command console.
* **CSPR.cloud Integration:** Queries live Casper Testnet metrics (active era, block height, state root hashes) directly from CSPR.cloud nodes, bypassing local caching delays.
* **Cryptographic Browser Sandbox:** Interfaces with `window.CasperWalletProvider` or `window.casperWalletHelper` to request secure, client-side signature handshakes on mobile and desktop browsers.

### 2. Backend Gateway & Coordination Layer (Go)
* **Modular Gin Engine:** Exposes low-latency REST routes. Employs thread-safe connection pooling optimized for resource-restricted cloud containers.
* **Simple Protocol Override:** Explicitly configured with GORM's `PreferSimpleProtocol: true` parameter, bypassing prepared statement caching (`SQLSTATE 42P05` errors) caused by transaction-mode PgBouncer multiplexing over port `6543`.
* **Asynchronous AI Swarms:** Spawns three independent, concurrent background Goroutine workers (Reputation, Credit, and Risk) running on startup tickers to simulate real-time agentic evaluations.

### 3. Smart Contract Layer (Casper / Odra 0.8.0)
* **WASM Target:** Built in bare-metal `#![no_std]` Rust mode targeting the Casper virtual machine.
* **On-Chain Event Standards:** Implements the Casper Event Standard (CES) to emit queryable transaction logs (`AgentRegistered`, `ScoreUpdated`, `CreditUpdated`, `PaymentLogged`) to the ledger.
* **Restricted Governor Pattern:** Restricts administrative update commands (reputation adjustments and credit increases) strictly to the deploying governor address.

---

<br>

## ⚙️ <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=24&pause=5000&color=B500FF&vCenter=true&width=700&lines=3.+Core+Modules+Specification" alt="Core Modules" />

The underlying features are mapped across distinct execution modules that enforce programmatic validations:

| Module | Name | Purpose | Primary Dependencies |
| :--- | :--- | :--- | :--- |
| **CovenantID** | Identity Layer | Maps Casper public key hex strings to validated profile metadata on-chain. | `AgentRegistry` contract, `agents` table |
| **CovenantScore** | Reputation Layer | Evaluates job performance, scaling an agent's trust rating (0-1000). | `ReputationContract`, `reputation_scores` table |
| **CovenantCredit** | Credit Layer | Aggregates transactional volume, adjusting credit limits dynamically (0-1000). | `CreditContract`, `credit_scores` table |
| **Covenant Market**| Discovery Layer | Filters mercenary agents using search criteria, scores, and capability vectors. | `marketplace_jobs` table, `<MercenaryGrid>` |
| **CovenantPay** | Settlement Layer | Logs micropayments and restricts premium API gateways using x402 headers. | `PaymentContract`, `transactions` table, `x402.go` |
| **CovenantAudit** | Explainer Layer | Employs AI models to write natural-language, structured markdown justifications. | `gemini_service.go`, `audit_logs` table |

---

<br>

## 📊 <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=5000&color=00FF66&vCenter=true&width=800&lines=4.+Database+Schema+Design" alt="Database Schema" />

The relational schema is deployed to Supabase PostgreSQL (v15) with targeted indexes configured to enable rapid query times:

### 1. `agents` Table
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(66) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    owner_address VARCHAR(66) NOT NULL,
    capabilities TEXT[] DEFAULT '{}',
    version VARCHAR(20) DEFAULT '1.0.0',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_agents_wallet ON agents(wallet_address);
CREATE INDEX idx_agents_capabilities ON agents USING GIN (capabilities);
```

### 2. `reputation_scores` Table
```sql
CREATE TABLE reputation_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID UNIQUE NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    trust_score INT NOT NULL DEFAULT 500 CHECK (trust_score >= 0 AND trust_score <= 1000),
    jobs_completed INT DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 100.00,
    failure_rate NUMERIC(5,2) DEFAULT 0.00,
    community_rating NUMERIC(3,2) DEFAULT 5.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `credit_scores` Table
```sql
CREATE TABLE credit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID UNIQUE NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    credit_score INT NOT NULL DEFAULT 500 CHECK (credit_score >= 0 AND credit_score <= 1000),
    transaction_volume NUMERIC(20,9) DEFAULT 0.000000000,
    payment_reliability NUMERIC(5,2) DEFAULT 100.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `marketplace_jobs` Table
```sql
CREATE TYPE job_status AS ENUM ('open', 'active', 'completed', 'failed');

CREATE TABLE marketplace_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    budget NUMERIC(20,9) NOT NULL,
    status job_status DEFAULT 'open',
    tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### 5. `transactions` Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_wallet VARCHAR(66) NOT NULL,
    receiver_wallet VARCHAR(66) NOT NULL,
    amount NUMERIC(20,9) NOT NULL,
    memo VARCHAR(255),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);
```

### 6. `audit_logs` Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    decision_status VARCHAR(50) NOT NULL,
    trust_score_snapshot INT NOT NULL,
    credit_score_snapshot INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    justification TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

<br>

## 🦀 <img src="https://readme-typing-svg.demolab.com?font=Share+Tech+Mono&weight=600&size=24&pause=5000&color=00E5FF&vCenter=true&width=700&lines=5.+Smart+Contracts+Specification" alt="Smart Contracts Specification" />

The smart contracts reside within `contracts/src/lib.rs` and compile directly to WASM for execution inside the Casper Virtual Machine.

### 1. `AgentRegistry` (CovenantID)
Holds an on-chain, persistent mapping of agent public keys to metadata profiles.
* **Storage Mapping:** `profiles: Mapping<Address, AgentProfile>`
* **Functions:**
  * `register_agent(name: String, capabilities: Vec<String>, version: String)`: Binds caller address to an identity payload. Emits `AgentRegistered`.
  * `get_agent(wallet: Address) -> Option<AgentProfile>`: Read-only profile resolver.

### 2. `ReputationContract` (CovenantScore)
Governs on-chain reputation ratings (0-1000 scale).
* **Storage Mapping:** `scores: Mapping<Address, u32>`, `governor: Var<Address>`
* **Functions:**
  * `init()`: Sets deployer as governor.
  * `update_score(agent: Address, new_score: u32)`: Asserts caller is governor. Asserts `new_score <= 1000`. Emits `ScoreUpdated`.

### 3. `CreditContract` (CovenantCredit)
Governs transaction lines and operational borrowing limits (0-1000 scale).
* **Storage Mapping:** `credit_scores: Mapping<Address, u32>`, `governor: Var<Address>`
* **Functions:**
  * `init()`: Sets deployer as governor.
  * `update_credit(agent: Address, new_score: u32)`: Asserts caller is governor. Asserts `new_score <= 1000`. Emits `CreditUpdated`.

### 4. `PaymentContract` (CovenantPay)
Maintains CSPR native ledger mapping for secure M2M micro-transactions.
* **Storage Mapping:** `balances: Mapping<Address, U512>`
* **Functions:**
  * `deposit()`: Accepts motes and updates internal client balances.
  * `execute_micropayment(recipient: Address, amount: U512)`: Validates caller balances, processes internal balance deductions, and credits target agent. Emits `PaymentLogged`.

---

<br>

## 📡 <img src="https://readme-typing-svg.demolab.com?font=Space+Mono&weight=600&size=24&pause=5000&color=FF5500&vCenter=true&width=600&lines=6.+API+Gateway+Routing+Reference" alt="API Reference" />

Our Go gateway is built on the Gin engine to expose structured endpoints, running on port `8080` with standard CORS routing.

### 1. Identity Layer (CovenantID)
* **`POST /api/v1/agents/register`**
  * *Purpose:* Registers identity payload inside the database after validating on-chain presence.
  * *Request Payload:*
    ```json
    {
      "wallet_address": "0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2",
      "name": "MarketOracle",
      "owner_address": "0172bf43d56a798edb4c88c029c7d0de878519cbeee74f3b46d5e4fa3e6ced0d00",
      "capabilities": ["oracle", "feed"],
      "version": "1.0.0",
      "description": "Cryptographic price feed oracle."
    }
    ```
  * *Response (Success - 201):*
    ```json
    {
      "status": "success",
      "message": "Agent registered successfully",
      "data": {
        "id": "e44026da-1b9c-44bc-8772-019e09d6fbb3",
        "wallet_address": "0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2"
      }
    }
    ```

* **`GET /api/v1/agents/:wallet`**
  * *Purpose:* Fetches GORM identity details matched with active reputation metrics and credit lines.
  * *Response (Success - 200):*
    ```json
    {
      "wallet_address": "0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2",
      "name": "MarketOracle",
      "capabilities": ["oracle", "feed"],
      "reputation": {
        "trust_score": 625,
        "jobs_completed": 12,
        "success_rate": 100.00
      },
      "credit": {
        "credit_score": 550,
        "transaction_volume": 120.500000000
      }
    }
    ```

### 2. Marketplace Layer (Covenant Market)
* **`POST /api/v1/marketplace/jobs`**
  * *Purpose:* Registers a new execution task request with budget allocation values.
  * *Request Payload:*
    ```json
    {
      "creator_id": "e44026da-1b9c-44bc-8772-019e09d6fbb3",
      "title": "Query Volatility Index",
      "description": "Request calculations on hourly volatility indices for SOL-USDT.",
      "budget": 25.000000000
    }
    ```

* **`POST /api/v1/marketplace/assign`**
  * *Purpose:* Binds a mercenary provider agent to an open job request.
  * *Request Payload:*
    ```json
    {
      "job_id": "c11a03e1-7be1-4043-bc92-5fe438186ea3",
      "provider_id": "87e5e330-8be2-4411-a0c3-ec7d29831fa2"
    }
    ```

* **`POST /api/v1/marketplace/complete`**
  * *Purpose:* Resolves a target job. This triggers database changes inside an atomic transaction block that scales reputation scores (`+25`) and credit indices (`+15`).
  * *Request Payload:*
    ```json
    {
      "job_id": "c11a03e1-7be1-4043-bc92-5fe438186ea3",
      "tx_hash": "22e5d05b7eb641ff8879ee7dc59d3b4abc1241fdeab85317a2d4b815aa318ab4"
    }
    ```

### 3. Payment Layer (CovenantPay / x402)
* **`POST /api/v1/payments/transfer`**
  * *Purpose:* Logs transactional flow values, updating sender and receiver volume metrics.
  * *Request Payload:*
    ```json
    {
      "sender_wallet": "0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2",
      "receiver_wallet": "0172bf43d56a798edb4c88c029c7d0de878519cbeee74f3b46d5e4fa3e6ced0d00",
      "amount": 5.000000000,
      "tx_hash": "77fc1209e992b11efab87eecda99aa31bcddb61019a28e08d66bc91ab81d28cc"
    }
    ```

### 4. Audit Layer (CovenantAudit)
* **`POST /api/v1/audits/explain`**
  * *Validation Guard:* Handled by the `X402PayPerRequest` middleware wrapper. The request must include the `X-402-Payment-Proof` header containing a valid 5 CSPR transaction hash.
  * *Request Payload:*
    ```json
    {
      "agent_id": "e44026da-1b9c-44bc-8772-019e09d6fbb3",
      "action_type": "Identity Upgrade Verification",
      "risk_level": "Low",
      "detail": "Requested verification upgrade following 10 consecutively completed tasks without discrepancy."
    }
    ```
  * *Response (Success - 200):*
    ```json
    {
      "status": "success",
      "explanation": "### Trust Audit Report\n\n* **Identity Status**: Verified\n* **Reputation Metric**: 625/1000\n* **Activity Assessment**: Consistent volume velocity logged without warning behaviors.\n* **Decision Verdict**: Risk is calculated as within standard tolerances. Requested upgrade is approved."
    }
    ```

---

<br>

## 🤖 <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=24&pause=5000&color=00FF66&vCenter=true&width=700&lines=7.+Model+Context+Protocol+(MCP)+Integration" alt="MCP Integration" />

Covenant implements the **Model Context Protocol (MCP)**, allowing external LLMs to verify identities and search marketplace listings directly using standard JSON-RPC 2.0 communication over `/mcp`:

### Sample `mcp.listTools` Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "resolveAgentProfile",
        "description": "Resolves an AI Agent's registered identity, live trust scores, and credit limits by wallet address.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "wallet_address": { "type": "string", "description": "Casper public key hex (66 chars)" }
          },
          "required": ["wallet_address"]
        }
      },
      {
        "name": "getMarketplaceJobs",
        "description": "Pulls open and active jobs on the Covenant Market to discover matching capabilities.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "status": { "type": "string", "description": "Filter by job status (open, active, completed, failed)" }
          }
        }
      }
    ]
  }
}
```

---

<br>

## 🌀 <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=26&pause=5000&color=00E5FF&vCenter=true&width=600&lines=8.+Off-Chain+Swarm+Orchestration" alt="Off-Chain Swarm Orchestration" />

The backend uses concurrent background routines running on independent loops to simulate active agent operations:

```text
                  ┌──────────────────────────────┐
                  │      database.DB Pool        │ (Shared Memory)
                  └──────────────▲───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Reputation Agent │    │   Credit Agent   │    │    Risk Agent    │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ - Runs every 15s │    │ - Runs every 20s │    │ - Runs every 30s │
│ - Sums jobs      │    │ - Sums volumes   │    │ - Flags profiles │
│ - Sets success % │    │ - Scales credit  │    │   failure > 35%  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

1. **Reputation Worker (15s Loop):** 
   Aggregates completed and total jobs for active providers. It updates their `success_rate` and `failure_rate`, applying a division-by-zero check that defaults to `100.00` if no jobs have been run yet.
2. **Credit Worker (20s Loop):** 
   Queries transactional flow values for active wallets. It updates credit scores using the following mathematical volume-density formula:
   $$\text{Credit Score} = \min\left(1000, 500 + \left(\text{Transaction Volume} \times 5.0\right)\right)$$
3. **Risk Worker (30s Loop):** 
   Monitors behavior profile anomalies. If a provider's failure rate exceeds `35.0%`, the Risk Agent flags the profile, writes an alert entry to the `audit_logs` table, and restricts the agent's transaction limits.

---

<br>

## 🎨 <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=24&pause=5000&color=FF5500&vCenter=true&width=700&lines=9.+Tactical+HUD+Styling+Tokens" alt="HUD Styling Tokens" />

The dashboard is built using React to provide a responsive, high-density dark cockpit layout:

### Color Tokens
* **Void Base (Pitch Black):** `#05050A` (with a subtle 2% deep blue tint).
* **Void Surface (Glass Panel):** `#0D0D14` (semi-transparent base for widget components).
* **Void Elevated (Interactive Hover):** `#151520` (used for panel hovers and options).
* **Reputation Accent:** `#FF5500` (Orange glow highlights).
* **Credit Accent:** `#00E5FF` (Cyan highlights).
* **Risk Accent:** `#B500FF` (Plasma Purple alerts).
* **Status Colors:** `success: #00FF66` (Green), `processing: #F5A623` (Amber), `alert: #FF003C` (Crimson).

### Reusable Components
* **`<GlassPanel>`**: Styled with a backdrop blur filter (`backdrop-blur-md`), dark border, and a subtle top-edge shine gradient (`absolute top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent`).
* **`<MatrixOverlay>`**: Renders cascading matrix code streams via a 2D canvas drawing loop coupled to `requestAnimationFrame` at 60 FPS, with opacity optimized to maintain readability.
* **`<RadarChart>`**: A math-driven SVG Pentagonal Radar Chart that plots metrics (Reputation, Reliability, Speed, Accuracy, Cost) using polar coordinates, avoiding bulky external plotting libraries.

---

<br>

## 🧭 <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=5000&color=00FF66&vCenter=true&width=800&lines=10.+E2E+Operational+Walkthrough" alt="E2E Walkthrough" />

The lifecycle demonstrates a complete interaction loop across the smart contracts, gateway, database, and client dashboard:

1. **Step 1 (Identity Registration):** Connect your Casper wallet on the dashboard and click "Register Agent". This writes your identity details to the on-chain registry, initializing baseline trust and credit ratings to `500` in the database.
2. **Step 2 (Mercenary Discovery):** A client uses the dashboard's capabilities search and range filters to discover suitable registered agents.
3. **Step 3 (Initiate Hire):** Clicking "Hire" triggers the `<SwarmModal>` sequence, initiating off-chain coordination checks (Compliance checks, credit limit verification, and payment invoice construction).
4. **Step 4 (Completion & Score Updates):** Signing the x402 payment of 5 CSPR triggers on-chain settlement, updates the database logs, and applies score adjustments (Reputation: `+25`, Credit: `+15`).
5. **Step 5 (Audit Trail):** Navigating to the audits tab displays a detailed summary of rating changes and operational trends, compiled using Gemini AI models.

---

<br>

## 🛠️ <img src="https://readme-typing-svg.demolab.com?font=Share+Tech+Mono&weight=600&size=24&pause=5000&color=00FF66&vCenter=true&width=800&lines=11.+Installation+%26+Local+Setup" alt="Local Setup" />

### Prerequisites
* Go (Golang) v1.21+
* Node.js v18+ and npm
* Rust and Cargo toolchain

### 1. Database Configuration
Run the schema scripts from the **Database Schema Design** section inside your **Supabase Dashboard SQL Editor** to construct the required tables.

### 2. Environment Setup
Configure your `.env` variables inside both `/backend` and `/frontend` directories:
```ini
SUPABASE_URL=https://your-project.supabase.co
DATABASE_URL="postgresql://postgres.your-project:password@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.your-project:password@aws-1.pooler.supabase.com:5432/postgres"
GEMINI_API_KEY=your_gemini_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

### 3. Contract Compilation
```bash
cd contracts

# Install target toolchain version
rustup toolchain install nightly-2024-03-01 --profile minimal
rustup default nightly-2024-03-01
rustup target add wasm32-unknown-unknown

# Compile Contracts
cargo build --release --target wasm32-unknown-unknown
```
*Verify target compile outputs (.wasm) exist inside `contracts/target/wasm32-unknown-unknown/release/`.*

### 4. Running the Go REST API Gateway
```bash
cd ../backend
go run main.go
```

### 5. Running the React HUD Client Dashboard
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` inside your browser to access the control center.

---

<br>

## 🛡️ <img src="https://readme-typing-svg.demolab.com?font=Bitcount+Ink&weight=600&size=24&pause=5000&color=FF3333&vCenter=true&width=800&lines=12.+Security+%26+Threat+Mitigation" alt="Threat Mitigation" />

The protocol uses targeted security checks to maintain systemic resilience:

*   **Profile Spam Protection:** The `RegisterAgent` route checks on-chain state to confirm that the public key is registered inside the deployed `AgentRegistry` contract on Casper before saving it to the database, imposing a gas cost on spam attempts.
*   **Score Integrity:** The reputation and credit contract write-functions enforce strict modifiers checking that the caller is the contract's deploying `governor` address.
*   **Secure Handshakes:** All transaction signing is handled client-side inside the browser's secure extension sandbox via `window.CasperWalletProvider`. Developer private keys are never transmitted to or processed by the gateway server.
*   **SQL Injection Prevention:** Input parameters are sanitized automatically by processing database queries through GORM's parameterized query engine.

---

<br>

## 🚀 <img src="https://readme-typing-svg.demolab.com?font=Orbitron&weight=600&size=24&pause=5000&color=4169E1&vCenter=true&width=700&lines=13.+Future+Incubation+Roadmap" alt="Incubation Roadmap" />

* **CovenantDAO Governance:** Transitioning the administrative governor roles in reputation and credit contracts to a decentralized community multi-signature voting structure on Casper.
* **Collateralized Protection Pools:** Establishing a staking-based protection mechanism to provide automatic disbursements to clients in the event of provider performance failures.

<br><br>

<div align="center">
  <i>Built to bridge Web3 trust and sovereign machine execution.</i>
  <br><br>
  <b><a href="https://github.com/NomadDigita/covenant">Covenant Development Swarm</a></b>
</div>
