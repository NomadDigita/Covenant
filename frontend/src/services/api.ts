const BASE_URL = "http://localhost:8080/api/v1";

export interface Agent {
  id: string;
  wallet_address: string;
  name: string;
  owner_address: string;
  capabilities: string[];
  version: string;
  description: string;
  created_at: string;
}

export interface ReputationScore {
  id: string;
  agent_id: string;
  trust_score: number;
  jobs_completed: number;
  success_rate: number;
  failure_rate: number;
  community_rating: number;
  updated_at: string;
}

export interface CreditScore {
  id: string;
  agent_id: string;
  credit_score: number;
  transaction_volume: number;
  payment_reliability: number;
  updated_at: string;
}

export interface CompleteProfile {
  identity: Agent;
  reputation: ReputationScore;
  credit: CreditScore;
}

export interface MarketplaceJob {
  id: string;
  creator_id: string;
  provider_id?: string;
  title: string;
  description: string;
  budget: number;
  status: "open" | "active" | "completed" | "failed";
  tx_hash?: string;
  created_at: string;
  completed_at?: string;
}

export interface AuditResult {
  message: string;
  audit_id: string;
  risk_level: string;
  trust_snapshot: number;
  credit_snapshot: number;
  audit_explanation: string;
}

// 1. Identity Layer Calls (CovenantID)
export async function registerAgent(payload: {
  wallet_address: string;
  name: string;
  owner_address: string;
  capabilities: string[];
  version: string;
  description: string;
}): Promise<{ message: string; wallet_address: string }> {
  const res = await fetch(`${BASE_URL}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to register agent");
  }
  return res.json();
}

export async function getAgentByWallet(wallet: string): Promise<CompleteProfile> {
  const res = await fetch(`${BASE_URL}/agents/${wallet}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Agent profile not found");
  }
  return res.json();
}

// 2. Marketplace Layer Calls (Covenant Market)
export async function postJob(payload: {
  creator_address: string;
  title: string;
  description: string;
  budget: number;
}): Promise<{ message: string; job_id: string }> {
  const res = await fetch(`${BASE_URL}/marketplace/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to post job");
  }
  return res.json();
}

export async function assignJob(payload: {
  job_id: string;
  provider_address: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/marketplace/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to assign agent");
  }
  return res.json();
}

export async function completeJob(payload: {
  job_id: string;
  tx_hash: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/marketplace/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to complete job");
  }
  return res.json();
}

export async function getMarketplaceJobs(status?: string): Promise<MarketplaceJob[]> {
  const url = status ? `${BASE_URL}/marketplace/search?status=${status}` : `${BASE_URL}/marketplace/search`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load marketplace jobs");
  }
  return res.json();
}

// 3. Audit Layer Calls (CovenantAudit)
export async function requestAuditExplanation(payload: {
  agent_id: string;
  action_type: string;
  risk_level: string;
  detail: string;
}): Promise<AuditResult> {
  const res = await fetch(`${BASE_URL}/audits/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Audit generation failed");
  }
  return res.json();
}