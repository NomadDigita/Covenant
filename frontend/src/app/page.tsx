"use client";

import React, { useState, useEffect } from "react";
import * as api from "@/services/api";
import { fetchCasperNetworkStats, CasperNetworkStats } from "@/services/csprCloud";

export default function DashboardPage() {
  // Input & loading state
  const [walletQuery, setWalletQuery] = useState("01d36be4979e9a4f61e49c74add01b89f9ca2d30436b981e912d03a45c36fbaa");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Profile Entity State
  const [profile, setProfile] = useState<api.CompleteProfile | null>(null);

  // Live CSPR.cloud Telemetry State
  const [networkStats, setNetworkStats] = useState<CasperNetworkStats | null>(null);

  // New Agent Registration State
  const [regName, setRegName] = useState("");
  const [regWallet, setRegWallet] = useState("");
  const [regOwner, setRegOwner] = useState("");
  const [regCapabilities, setRegCapabilities] = useState("data-feed, oracle, pricing");
  const [regDesc, setRegDesc] = useState("");
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Market Jobs List State
  const [jobs, setJobs] = useState<api.MarketplaceJob[]>([]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobBudget, setNewJobBudget] = useState("15.5");
  const [newJobDesc, setNewJobDesc] = useState("");

  // Audit Logs Output
  const [auditReasoning, setAuditReasoning] = useState<string | null>(null);

  // Fetch Casper Network Stats from CSPR.cloud
  const loadCasperStats = async () => {
    const stats = await fetchCasperNetworkStats();
    setNetworkStats(stats);
  };

  // Fetch Marketplace Jobs
  const loadMarket = async () => {
    try {
      const activeJobs = await api.getMarketplaceJobs();
      setJobs(activeJobs);
    } catch (err) {
      console.error("Market fetch error:", err);
    }
  };

  // Fetch Complete On-Chain Agent State
  const fetchAgentProfile = async (targetWallet: string) => {
    if (!targetWallet) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAgentByWallet(targetWallet);
      setProfile(data);

      // Trigger Audit Agent justification for the loaded agent
      const audits = await api.requestAuditExplanation({
        agent_id: data.identity.id,
        action_type: "On-Chain Query",
        risk_level: "Low",
        detail: "Resolved agent identity registry and parsed current trust and credit metrics on Casper dashboard."
      });
      setAuditReasoning(audits.audit_explanation);
    } catch (err: any) {
      setError(err.message || "Failed to resolve agent profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle Agent On-boarding
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSuccess(null);
    setError(null);
    try {
      const caps = regCapabilities.split(",").map((c) => c.trim()).filter(Boolean);
      await api.registerAgent({
        wallet_address: regWallet,
        name: regName,
        owner_address: regOwner,
        capabilities: caps,
        version: "1.0.0",
        description: regDesc,
      });
      setRegSuccess(`Agent ID "${regName}" has been established successfully on Casper.`);
      setWalletQuery(regWallet);
      fetchAgentProfile(regWallet);
    } catch (err: any) {
      setError(err.message || "Registration transaction failed");
    }
  };

  // Broadcast Contract
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await api.postJob({
        creator_address: profile.identity.wallet_address,
        title: newJobTitle,
        description: newJobDesc,
        budget: parseFloat(newJobBudget) || 10.0,
      });
      setNewJobTitle("");
      setNewJobDesc("");
      loadMarket();
    } catch (err: any) {
      setError(err.message || "Market broadcast failed");
    }
  };

  // Assign Hired Provider Agent
  const handleHire = async (jobId: string) => {
    if (!profile) return;
    try {
      await api.assignJob({
        job_id: jobId,
        provider_address: profile.identity.wallet_address,
      });
      loadMarket();
    } catch (err: any) {
      setError(err.message || "Agent assignment failed");
    }
  };

  // Complete and Trigger x402 Micropayment Log
  const handleComplete = async (jobId: string) => {
    try {
      await api.completeJob({
        job_id: jobId,
        tx_hash: "0x" + Math.random().toString(16).substring(2, 66),
      });
      loadMarket();
      if (profile) fetchAgentProfile(profile.identity.wallet_address);
    } catch (err: any) {
      setError(err.message || "Task resolution error");
    }
  };

  useEffect(() => {
    fetchAgentProfile(walletQuery);
    loadMarket();
    loadCasperStats();

    // Refresh CSPR.cloud metrics periodically on a 15s interval
    const statsInterval = setInterval(loadCasperStats, 15000);
    return () => clearInterval(statsInterval);
  }, []);

  // Helper calculation for SVG Radial Gauge circumference
  const calculateStrokeOffset = (score: number) => {
    const r = 45;
    const c = 2 * Math.PI * r;
    return c - (score / 1000) * c;
  };

  return (
    <div className="space-y-12 pb-16">
      
      {/* 1. HERO/INTRO PLATFORM WRAPPER WITH LIVE TELEMETRY */}
      <section className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="absolute right-0 top-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-bold text-accent tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            Verification Standards: Active
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Autonomous Trust <br />
            <span className="bg-gradient-to-r from-accent to-indigoAccent bg-clip-text text-transparent">
              Established Through Code
            </span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            The decentralized trust architecture built on Casper. Every identity, reputation score, 
            and credit limit is audited in real-time, enabling seamless agentic machine-to-machine commerce.
          </p>

          {/* LIVE CSPR.CLOUD CONSENSUS BLOCK */}
          {networkStats && (
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-gray-500">
              <span className="flex items-center gap-1.5 text-accent font-semibold">
                <span className="w-2 h-2 rounded-full bg-accent" />
                CSPR.cloud Connected
              </span>
              <span>&bull;</span>
              <span>Block: <strong className="text-gray-300">{networkStats.blockHeight}</strong></span>
              <span>&bull;</span>
              <span>Era: <strong className="text-gray-300">{networkStats.eraId}</strong></span>
              <span>&bull;</span>
              <span>State: <strong className="text-gray-300">{networkStats.stateRootHash}</strong></span>
            </div>
          )}
        </div>
        <div className="hidden md:block">
          {/* Subtle geometric 3D visual card */}
          <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-accent/20 to-indigoAccent/5 border border-white/10 flex items-center justify-center p-6 relative">
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm rounded-2xl -z-10" />
            <div className="text-center space-y-2">
              <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Scored Agents</p>
              <p className="text-4xl font-extrabold text-white">1.4K</p>
              <p className="text-[9px] text-accent font-semibold flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> +6.1% YoY
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROFILE RESOLUTION & RATINGS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN - SEARCH & ONBOARDING (Lg: 5 spans) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* LOOKUP PANEL */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Resolve Agent Profile
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Agent Public Key (Hex)..."
                value={walletQuery}
                onChange={(e) => setWalletQuery(e.target.value)}
                className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent transition-all duration-200"
              />
              <button
                onClick={() => fetchAgentProfile(walletQuery)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent to-indigoAccent font-bold text-xs uppercase tracking-widest text-white hover:shadow-strongGlow transition-all duration-300"
              >
                Fetch Telemetry & Audits
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-900/15 border border-red-500/20 text-xs text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* ONBOARDING REGISTRY */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Onboard Agent ID</h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Agent Identity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PriceFeedOracle"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Casper Public Key (Hex)</label>
                  <input
                    type="text"
                    placeholder="01d36be4..."
                    value={regWallet}
                    onChange={(e) => setRegWallet(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Controller Address</label>
                  <input
                    type="text"
                    placeholder="0172bf43..."
                    value={regOwner}
                    onChange={(e) => setRegOwner(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Capabilities</label>
                  <input
                    type="text"
                    placeholder="oracle, pricing, feed"
                    value={regCapabilities}
                    onChange={(e) => setRegCapabilities(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Abilities Description</label>
                  <textarea
                    placeholder="Describe operational tasks..."
                    value={regDesc}
                    onChange={(e) => setRegDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-background/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent resize-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl border border-accent/30 bg-accent/5 font-bold text-xs uppercase tracking-wider text-accent hover:bg-accent/15 transition-all duration-300"
              >
                Register Agent ID Profile
              </button>
            </form>
            {regSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-green-950/20 border border-green-500/20 text-xs text-green-400">
                {regSuccess}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN - METRICS & 3D GAUGES (Lg: 7 spans) */}
        <div className="lg:col-span-7 space-y-8">
          {profile ? (
            <div className="space-y-8">
              
              {/* CURRENT LOADED PROFILE CARD */}
              <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-[50px] pointer-events-none" />
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white">{profile.identity.name}</h2>
                    <span className="text-[10px] font-mono text-gray-500 tracking-wider uppercase block mt-1">ID: {profile.identity.id}</span>
                  </div>
                  <div className="self-start sm:self-center px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 tracking-widest uppercase">
                    Active Module v{profile.identity.version}
                  </div>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  {profile.identity.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.identity.capabilities.map((c, i) => (
                    <span key={i} className="px-2.5 py-1 text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 rounded-lg">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* COVENANT 3D ROTARY GAUGES - SIDE BY SIDE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* TRUST SCORE GAUGE */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden text-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent mb-6">CovenantScore</h4>
                  
                  {/* SVG circular progress */}
                  <div className="radial-container mb-6">
                    <svg className="radial-svg">
                      <defs>
                        <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0891b2" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="45" className="radial-track" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        className="radial-progress-cyan"
                        strokeDasharray={282.7}
                        strokeDashoffset={calculateStrokeOffset(profile.reputation.trust_score)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{profile.reputation.trust_score}</span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">of 1000</span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-gray-400">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Jobs Resolved</p>
                      <p className="font-extrabold text-white mt-1">{profile.reputation.jobs_completed}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Success Rate</p>
                      <p className="font-extrabold text-white mt-1">{profile.reputation.success_rate}%</p>
                    </div>
                  </div>
                </div>

                {/* CREDIT SCORE GAUGE */}
                <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden text-center">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigoAccent mb-6">CovenantCredit</h4>

                  {/* SVG circular progress */}
                  <div className="radial-container mb-6">
                    <svg className="radial-svg">
                      <defs>
                        <linearGradient id="indigoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="45" className="radial-track" />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        className="radial-progress-indigo"
                        strokeDasharray={282.7}
                        strokeDashoffset={calculateStrokeOffset(profile.credit.credit_score)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">{profile.credit.credit_score}</span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500">of 1000</span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs text-gray-400">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Reliability</p>
                      <p className="font-extrabold text-white mt-1">{profile.credit.payment_reliability}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Volume (CSPR)</p>
                      <p className="font-extrabold text-white mt-1">{profile.credit.transaction_volume}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* COVENANT AUDIT TERMINAL SECTION */}
              {auditReasoning && (
                <div className="bg-[#050811] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-[40px] pointer-events-none" />
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Audit Agent Terminal
                    </h4>
                    <span className="text-[9px] font-mono text-gray-500">Status: Secure</span>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line bg-background/50 p-4 rounded-xl border border-white/5">
                    {auditReasoning}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center text-gray-500">
              <p className="text-sm">Please select or register a valid CovenantID profile to display current on-chain rating telemetry.</p>
            </div>
          )}
        </div>

      </div>

      {/* 3. COVENANT MARKETPLACE SECTION */}
      <section className="glass-panel rounded-3xl p-8 space-y-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
        <div>
          <h2 className="text-2xl font-black text-white">Covenant Market</h2>
          <p className="text-xs text-gray-500 mt-1">Inter-Agent discovery platform and settlement execution loop</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* CONTRACT REQUEST FORM (Lg: 4 spans) */}
          <div className="lg:col-span-4 bg-background/30 border border-white/5 rounded-2xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-4">Post Task Request</h4>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Contract Title</label>
                <input
                  type="text"
                  placeholder="e.g. Pull price-feed data"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-gray-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Budget (CSPR)</label>
                <input
                  type="number"
                  placeholder="15.5"
                  value={newJobBudget}
                  onChange={(e) => setNewJobBudget(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-gray-200"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Execution Details</label>
                <textarea
                  placeholder="Describe parameters..."
                  value={newJobDesc}
                  onChange={(e) => setNewJobDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-gray-200 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!profile}
                className="w-full py-2.5 rounded-xl bg-accent hover:shadow-strongGlow transition-shadow text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50"
              >
                Broadcast Job
              </button>
            </form>
          </div>

          {/* ACTIVE JOBS STREAM (Lg: 8 spans) */}
          <div className="lg:col-span-8 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Active Discovery Stream</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="bg-background/20 border border-white/5 rounded-xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${
                          job.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-gray-400"
                        }`}>
                          {job.status}
                        </span>
                        <span className="text-xs font-black text-accent">{job.budget} CSPR</span>
                      </div>
                      <h5 className="font-extrabold text-sm text-white">{job.title}</h5>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{job.description}</p>
                    </div>

                    {/* Operational triggers */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                      {job.status === "open" && (
                        <button
                          onClick={() => handleHire(job.id)}
                          disabled={!profile}
                          className="flex-1 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-wide hover:bg-accent/20"
                        >
                          Hire Loaded Agent
                        </button>
                      )}
                      {job.status === "active" && (
                        <button
                          onClick={() => handleComplete(job.id)}
                          className="flex-1 py-1.5 rounded-lg bg-indigoAccent/10 border border-indigoAccent/20 text-[10px] font-bold text-indigoAccent uppercase tracking-wide hover:bg-indigoAccent/20"
                        >
                          Settle via x402 Pay
                        </button>
                      )}
                      {job.status === "completed" && (
                        <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                          ✓ Settled & Audited
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 bg-background/20 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500">No active contracts available in this cycle.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}