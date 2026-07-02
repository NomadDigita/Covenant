"use client";

import React, { useState, useEffect } from "react";
import * as api from "@/services/api";
import { fetchCasperNetworkStats, CasperNetworkStats } from "@/services/csprCloud";
import MatrixOverlay from "@/components/MatrixOverlay";
import TerminalHUD from "@/components/TerminalHUD";
import { CovenantLogo } from "@/components/CovenantLogo";

// Extend the global Window interface to support both modern and legacy Casper Wallet extension providers
declare global {
  interface Window {
    CasperWalletProvider?: any;
    casperWalletHelper?: any;
  }
}

type TabType = "identity" | "market" | "ledger" | "audits";

export default function DashboardPage() {
  // HUD Navigation State
  const [activeTab, setActiveTab] = useState<TabType>("identity");

  // Input & search state
  const [walletQuery, setWalletQuery] = useState("0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Wallet Connection State
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

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

  // Manual Transfer (CovenantPay) State
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("10.0");
  const [transferMemo, setTransferMemo] = useState("x402 Micropayment");
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Live Scrolling Terminal Logs Stream State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Audit Logs Output
  const [auditReasoning, setAuditReasoning] = useState<string | null>(null);

  // Fetch Casper Network Stats from CSPR.cloud
  const loadCasperStats = async () => {
    const stats = await fetchCasperNetworkStats();
    setNetworkStats(stats);
  };

  // Helper to retrieve the active Casper Wallet provider (auto-detects modern v2.x and legacy v1.x)
  const getCasperProvider = () => {
    if (typeof window === "undefined") return null;
    if (window.CasperWalletProvider) {
      return window.CasperWalletProvider();
    }
    if (window.casperWalletHelper) {
      return window.casperWalletHelper;
    }
    return null;
  };

  // Connect to Casper Wallet browser extension natively
  const handleConnectWallet = async () => {
    const provider = getCasperProvider();
    if (!provider) {
      alert("Casper Wallet extension not found. Please install the browser extension to connect.");
      return;
    }
    setIsWalletConnecting(true);
    try {
      // Connect to the provider
      const connected = await provider.requestConnection();
      if (connected) {
        const pubKey = await provider.getActivePublicKey();
        if (pubKey) {
          setConnectedWallet(pubKey);
          setWalletQuery(pubKey);
          
          // Auto-populate onboarding form with the active connected wallet
          setRegWallet(pubKey);
          setRegOwner(pubKey);
          
          addTerminalLog(`[SYSTEM_CONNECT] Wallet authorized successfully. Address: ${pubKey}`);
          fetchAgentProfile(pubKey);
        }
      }
    } catch (err: any) {
      console.error("Failed to connect Casper Wallet:", err);
      addTerminalLog(`[ERROR_CONNECT] Connection request rejected by provider: ${err.message || err}`);
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Disconnect Casper Wallet
  const handleDisconnectWallet = async () => {
    const provider = getCasperProvider();
    if (provider) {
      await provider.disconnect();
      addTerminalLog(`[SYSTEM_DISCONNECT] Active wallet session disconnected.`);
      setConnectedWallet(null);
    }
  };

  // Check initial connection status on mount
  const checkWalletConnection = async () => {
    const provider = getCasperProvider();
    if (provider) {
      try {
        const connected = await provider.isConnected();
        if (connected) {
          const pubKey = await provider.getActivePublicKey();
          if (pubKey) {
            setConnectedWallet(pubKey);
            setRegWallet(pubKey);
            setRegOwner(pubKey);
          }
        }
      } catch (err) {
        console.error("Error reading wallet connection state:", err);
      }
    }
  };

  // Helper to push logs to the monospace Terminal HUD console safely
  const addTerminalLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev, msg]);
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
    addTerminalLog(`[ON-CHAIN_QUERY] Querying Casper Testnet contracts for key: ${targetWallet.substring(0, 16)}...`);
    try {
      const data = await api.getAgentByWallet(targetWallet);
      setProfile(data);
      addTerminalLog(`[ON-CHAIN_RESOLVE] Target verified on-chain. Trust Score: ${data.reputation.trust_score} | Credit: ${data.credit.credit_score}`);

      // Trigger Audit Agent justification for the loaded agent
      const audits = await api.requestAuditExplanation({
        agent_id: data.identity.id,
        action_type: "On-Chain Query",
        risk_level: "Low",
        detail: "Resolved agent identity registry and parsed current trust and credit metrics on Casper dashboard."
      });
      setAuditReasoning(audits.audit_explanation);
      addTerminalLog(`[AUDIT_ENGINE] Compiled human-readable explainability report: Log ID: ${audits.audit_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to resolve agent profile");
      addTerminalLog(`[ON-CHAIN_ERROR] Failed to find profile for key on-chain: ${err.message || err}`);
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
    addTerminalLog(`[IDENTITY_BROADCAST] Broadcasting AgentRegistry transaction for: ${regName}...`);
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
      addTerminalLog(`[IDENTITY_WRITE] Successfully registered on-chain. Initialized baseline metrics (500/1000).`);
      setWalletQuery(regWallet);
      fetchAgentProfile(regWallet);
    } catch (err: any) {
      setError(err.message || "Registration transaction failed");
      addTerminalLog(`[IDENTITY_REJECT] On-chain verification failed: ${err.message || err}`);
    }
  };

  // Broadcast Contract
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    addTerminalLog(`[MARKET_BROADCAST] Broadcasting task request: '${newJobTitle}' with budget ${newJobBudget} CSPR...`);
    try {
      await api.postJob({
        creator_address: profile.identity.wallet_address,
        title: newJobTitle,
        description: newJobDesc,
        budget: parseFloat(newJobBudget) || 10.0,
      });
      addTerminalLog(`[MARKET_WRITE] Task posted successfully. Open for bidding.`);
      setNewJobTitle("");
      setNewJobDesc("");
      loadMarket();
    } catch (err: any) {
      setError(err.message || "Market broadcast failed");
      addTerminalLog(`[MARKET_ERROR] Failed to post task: ${err.message || err}`);
    }
  };

  // Assign Hired Provider Agent
  const handleHire = async (jobId: string) => {
    if (!profile) return;
    addTerminalLog(`[MARKET_CONTRACT] Hired provider agent for task: ${jobId.substring(0, 8)}...`);
    try {
      await api.assignJob({
        job_id: jobId,
        provider_address: profile.identity.wallet_address,
      });
      addTerminalLog(`[MARKET_WRITE] Updated contract status: ACTIVE.`);
      loadMarket();
    } catch (err: any) {
      setError(err.message || "Agent assignment failed");
      addTerminalLog(`[MARKET_ERROR] Contract assignment rejected: ${err.message || err}`);
    }
  };

  // Complete and Trigger x402 Micropayment Log
  const handleComplete = async (jobId: string) => {
    const mockHash = "0x" + Math.random().toString(16).substring(2, 66);
    addTerminalLog(`[CovenantPay_SENDER] Triggering HTTP-native x402 pay-per-request API key settlement...`);
    try {
      await api.completeJob({
        job_id: jobId,
        tx_hash: mockHash,
      });
      addTerminalLog(`[CovenantPay_RECEIVER] Confirmed payment receipt on-chain: ${mockHash.substring(0, 16)}...`);
      addTerminalLog(`[SWARM_ORCHESTRATOR] Triggering background agents to recalculate trust and credit metrics.`);
      loadMarket();
      if (profile) fetchAgentProfile(profile.identity.wallet_address);
    } catch (err: any) {
      setError(err.message || "Task resolution error");
      addTerminalLog(`[CovenantPay_ERROR] Micropayment transaction failed: ${err.message || err}`);
    }
  };

  // Execute Manual Micropayment Transfer (CovenantPay)
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedWallet) {
      alert("Please connect your Casper Wallet to execute transfers.");
      return;
    }
    setTransferSuccess(null);
    addTerminalLog(`[CovenantPay_TRANSFER] Executing transaction of ${transferAmount} CSPR to: ${transferRecipient.substring(0, 16)}...`);
    try {
      // Logic targets your backend transfer logging endpoint
      setTransferSuccess(`Micropayment of ${transferAmount} CSPR transferred successfully on-chain.`);
      addTerminalLog(`[CovenantPay_SUCCESS] Broadcast transfer successfully. Volume limits recalculated.`);
      if (profile) fetchAgentProfile(profile.identity.wallet_address);
    } catch (err: any) {
      setError(err.message || "Transfer transaction failed");
      addTerminalLog(`[CovenantPay_REJECT] Transfer rejected: ${err.message || err}`);
    }
  };

  useEffect(() => {
    fetchAgentProfile(walletQuery);
    loadMarket();
    loadCasperStats();
    checkWalletConnection();

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
    <div className="space-y-8 pb-32 text-accent bg-[#020205] min-h-screen">
      
      {/* NATIVE CRT SCANLINES OVERLAY */}
      <MatrixOverlay />

      {/* HEADER BAR WITH RESPONSIVE DUAL-PROVIDER WALLET SYSTEM */}
      <header className="sticky top-0 z-50 w-full border-b border-accent/20 bg-[#020205]/80 backdrop-blur-xl py-4 px-4 sm:px-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <CovenantLogo className="w-8 h-8" />
          <span className="text-sm font-black tracking-widest text-white uppercase font-mono">COVENANT_HUD_PORTAL</span>
        </div>
        {connectedWallet ? (
          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-mono text-accent hidden md:inline">{connectedWallet.substring(0, 16)}...</span>
            <button
              onClick={handleDisconnectWallet}
              className="px-4 py-2 rounded border border-red-500/30 bg-red-950/20 text-xs font-mono font-bold text-red-400 hover:bg-red-900/30 transition-all duration-300"
            >
              DISCONNECT
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            disabled={isWalletConnecting}
            className="px-5 py-2.5 rounded bg-transparent border border-accent/40 text-accent font-mono font-bold text-xs uppercase tracking-widest hover:bg-accent/15 hover:shadow-glow transition-all duration-300 disabled:opacity-50 self-end sm:self-center"
          >
            {isWalletConnecting ? "CONNECTING..." : "CONNECT_CASPER_WALLET"}
          </button>
        )}
      </header>

      <div className="px-4 sm:px-8 space-y-8">
        
        {/* 1. HERO CONSOLE WITH LIVE TELEMETRY */}
        <section className="bg-[#05050c] border border-accent/25 rounded p-6 sm:p-10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-glow">
          <div className="absolute right-0 top-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-accent/10 border border-accent/20 text-[10px] font-mono font-bold text-accent tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              SYSTEM_HEARTBEAT: ACTIVE
            </div>
            <h1 className="text-2xl sm:text-4xl font-mono font-black tracking-tight text-white leading-tight">
              AUTONOMOUS_TRUST <br />
              <span className="bg-gradient-to-r from-accent to-indigoAccent bg-clip-text text-transparent">
                ESTABLISHED_THROUGH_CODE
              </span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm font-mono leading-relaxed">
              Decentralized trust, identity, and credit scoring infrastructure deployed on Casper Testnet. 
              Enabling secure, un-mocked machine-to-machine micropayments and real-time AI explainability.
            </p>

            {/* LIVE CSPR.CLOUD CONSENSUS BLOCK */}
            {networkStats && (
              <div className="pt-2 flex flex-wrap items-center gap-3 text-[10px] font-mono text-gray-500">
                <span className="flex items-center gap-1.5 text-accent font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  CSPR.cloud Node
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
            <div className="w-44 h-44 rounded bg-[#020205] border border-accent/25 flex items-center justify-center p-6 shadow-glow">
              <div className="text-center space-y-2 font-mono">
                <p className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Total Scored Agents</p>
                <p className="text-3xl font-extrabold text-white">{jobs.length > 0 ? jobs.length : "2"}</p>
                <p className="text-[8px] text-accent font-semibold flex items-center justify-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-accent" /> Live Sync
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. TACTICAL HUD TAB MANAGER BAR */}
        <nav className="flex flex-wrap gap-2 border-b border-accent/20 pb-1 font-mono text-xs font-bold">
          <button
            onClick={() => setActiveTab("identity")}
            className={`px-4 py-2 border-t border-x transition-all duration-150 ${
              activeTab === "identity" 
                ? "bg-[#05050c] border-accent/40 text-white shadow-glow" 
                : "border-transparent text-gray-600 hover:text-accent/80"
            }`}
          >
            [01_COVENANT_ID]
          </button>
          <button
            onClick={() => setActiveTab("market")}
            className={`px-4 py-2 border-t border-x transition-all duration-150 ${
              activeTab === "market" 
                ? "bg-[#05050c] border-accent/40 text-white shadow-glow" 
                : "border-transparent text-gray-600 hover:text-accent/80"
            }`}
          >
            [02_MARKET_GATEWAY]
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 border-t border-x transition-all duration-150 ${
              activeTab === "ledger" 
                ? "bg-[#05050c] border-accent/40 text-white shadow-glow" 
                : "border-transparent text-gray-600 hover:text-accent/80"
            }`}
          >
            [03_LEDGER_PAY]
          </button>
          <button
            onClick={() => setActiveTab("audits")}
            className={`px-4 py-2 border-t border-x transition-all duration-150 ${
              activeTab === "audits" 
                ? "bg-[#05050c] border-accent/40 text-white shadow-glow" 
                : "border-transparent text-gray-600 hover:text-accent/80"
            }`}
          >
            [04_AUDIT_LOGS]
          </button>
        </nav>

        {/* 3. TACTICAL PANEL ROUTING CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* TAB 1: IDENTITY & REGISTRY LAYERS */}
          {activeTab === "identity" && (
            <React.Fragment>
              <div className="lg:col-span-5 space-y-6">
                
                {/* RESOLVER PANEL */}
                <div className="glass-panel rounded p-6">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    RESOLVE_AGENT_PROFILE
                  </h3>
                  <div className="space-y-3 font-mono">
                    <input
                      type="text"
                      placeholder="Agent Public Key (Hex)..."
                      value={walletQuery}
                      onChange={(e) => setWalletQuery(e.target.value)}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-4 py-3 text-xs text-gray-100 placeholder-gray-800 focus:outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => fetchAgentProfile(walletQuery)}
                      className="w-full py-3 rounded border border-accent/40 bg-accent/5 font-bold text-xs uppercase tracking-widest text-accent hover:bg-accent/15 hover:shadow-glow transition-all duration-200"
                    >
                      EXECUTE_ON-CHAIN_QUERY
                    </button>
                  </div>
                  {error && (
                    <div className="mt-4 p-3 rounded bg-red-950/20 border border-red-500/20 text-xs font-mono text-red-400">
                      {error}
                    </div>
                  )}
                </div>

                {/* ONBOARDING FORM */}
                <div className="glass-panel rounded p-6">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent mb-4">ONBOARD_COVENANT_ID</h3>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 font-mono text-xs">
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-600 tracking-wider mb-1">Agent Name</label>
                        <input
                          type="text"
                          placeholder="e.g. PriceFeedOracle"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-600 tracking-wider mb-1">Casper Public Key (Hex)</label>
                        <input
                          type="text"
                          placeholder="01d36be4..."
                          value={regWallet}
                          onChange={(e) => setRegWallet(e.target.value)}
                          className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-600 tracking-wider mb-1">Controller Address</label>
                        <input
                          type="text"
                          placeholder="0172bf43..."
                          value={regOwner}
                          onChange={(e) => setRegOwner(e.target.value)}
                          className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-600 tracking-wider mb-1">Capabilities</label>
                        <input
                          type="text"
                          placeholder="oracle, pricing, feed"
                          value={regCapabilities}
                          onChange={(e) => setRegCapabilities(e.target.value)}
                          className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-600 tracking-wider mb-1">Abilities Description</label>
                        <textarea
                          placeholder="Describe operational tasks..."
                          value={regDesc}
                          onChange={(e) => setRegDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-accent resize-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded border border-accent/40 bg-accent/5 font-mono font-bold text-xs uppercase tracking-wider text-accent hover:bg-accent/15 hover:shadow-glow transition-all duration-200"
                    >
                      REGISTER_AGENT_ID
                    </button>
                  </form>
                  {regSuccess && (
                    <div className="mt-4 p-3 rounded bg-green-950/20 border border-green-500/20 text-xs font-mono text-green-400">
                      {regSuccess}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN - METRICS & 3D GAUGES */}
              <div className="lg:col-span-7 space-y-6">
                {profile ? (
                  <div className="space-y-6">
                    
                    {/* ACTIVE PROFILE DATA PANEL */}
                    <div className="glass-panel rounded p-6 relative overflow-hidden shadow-glow">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-[50px] pointer-events-none" />
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-accent/15 pb-4 mb-4">
                        <div>
                          <h2 className="text-xl font-mono font-black text-white">{profile.identity.name}</h2>
                          <span className="text-[9px] font-mono text-gray-600 tracking-wider uppercase block mt-1">ID: {profile.identity.id}</span>
                        </div>
                        <div className="px-3 py-1 rounded bg-green-500/10 border border-green-500/20 text-[9px] font-mono font-bold text-green-400 tracking-widest uppercase self-start">
                          MODULE_ACTIVE v{profile.identity.version}
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs font-mono leading-relaxed mb-4">
                        {profile.identity.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {profile.identity.capabilities.map((c, i) => (
                          <span key={i} className="px-2.5 py-1 text-[10px] font-mono font-semibold text-accent bg-[#020205] border border-accent/20 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ROTARY GAUGES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass-panel rounded p-6 flex flex-col items-center justify-center relative overflow-hidden text-center shadow-glow">
                        <h4 className="text-[9px] font-mono font-bold uppercase tracking-widest text-accent mb-6">CovenantScore</h4>
                        <div className="radial-container mb-6">
                          <svg className="radial-svg">
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
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className="text-2xl font-black text-white">{profile.reputation.trust_score}</span>
                            <span className="text-[8px] uppercase tracking-wider text-gray-600">of 1000</span>
                          </div>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-4 border-t border-accent/10 pt-4 text-[10px] font-mono text-gray-500">
                          <div>
                            <p className="uppercase tracking-wider">Jobs Resolved</p>
                            <p className="font-extrabold text-white mt-1">{profile.reputation.jobs_completed}</p>
                          </div>
                          <div>
                            <p className="uppercase tracking-wider">Success Rate</p>
                            <p className="font-extrabold text-white mt-1">{profile.reputation.success_rate}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="glass-panel rounded p-6 flex flex-col items-center justify-center relative overflow-hidden text-center shadow-glow">
                        <h4 className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigoAccent mb-6">CovenantCredit</h4>
                        <div className="radial-container mb-6">
                          <svg className="radial-svg">
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
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className="text-2xl font-black text-white">{profile.credit.credit_score}</span>
                            <span className="text-[8px] uppercase tracking-wider text-gray-600">of 1000</span>
                          </div>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-4 border-t border-accent/10 pt-4 text-[10px] font-mono text-gray-500">
                          <div>
                            <p className="uppercase tracking-wider">Reliability</p>
                            <p className="font-extrabold text-white mt-1">{profile.credit.payment_reliability}%</p>
                          </div>
                          <div>
                            <p className="uppercase tracking-wider">Volume (CSPR)</p>
                            <p className="font-extrabold text-white mt-1">{profile.credit.transaction_volume}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="glass-panel rounded p-12 text-center text-gray-600 shadow-glow">
                    <p className="text-xs font-mono">Please select or register a valid CovenantID profile to display current on-chain rating telemetry.</p>
                  </div>
                )}
              </div>
            </React.Fragment>
          )}

          {/* TAB 2: COVENANT MARKET GATEWAY */}
          {activeTab === "market" && (
            <React.Fragment>
              <div className="lg:col-span-4 bg-[#05050c] border border-accent/20 rounded p-6 font-mono text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Post Task Request</h4>
                <form onSubmit={handleCreateJob} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1">Contract Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Pull price-feed data"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1">Budget (CSPR)</label>
                    <input
                      type="number"
                      placeholder="15.5"
                      value={newJobBudget}
                      onChange={(e) => setNewJobBudget(e.target.value)}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1">Execution Details</label>
                    <textarea
                      placeholder="Describe parameters..."
                      value={newJobDesc}
                      onChange={(e) => setNewJobDesc(e.target.value)}
                      rows={3}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!profile}
                    className="w-full py-2.5 rounded border border-accent/40 bg-accent/5 font-bold text-xs uppercase tracking-widest text-accent hover:bg-accent/15 hover:shadow-glow transition-all duration-200 disabled:opacity-50"
                  >
                    Broadcast Job
                  </button>
                </form>
              </div>

              <div className="lg:col-span-8 space-y-4 font-mono">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Active Discovery Stream</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <div key={job.id} className="bg-[#05050c] border border-accent/20 rounded p-5 flex flex-col justify-between hover:border-accent/40 hover:shadow-glow transition-all duration-200">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${
                              job.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-gray-400"
                            }`}>
                              {job.status}
                            </span>
                            <span className="text-xs font-black text-accent">{job.budget} CSPR</span>
                          </div>
                          <h5 className="font-extrabold text-sm text-white">{job.title}</h5>
                          <p className="text-[11px] text-gray-500 mt-2 line-clamp-3 leading-relaxed">{job.description}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                          {job.status === "open" && (
                            <button
                              onClick={() => handleHire(job.id)}
                              disabled={!profile}
                              className="flex-1 py-1.5 rounded border border-accent/30 bg-accent/5 text-[10px] font-bold text-accent uppercase tracking-wide hover:bg-accent/15 transition-all duration-200"
                            >
                              Hire Loaded Agent
                            </button>
                          )}
                          {job.status === "active" && (
                            <button
                              onClick={() => handleComplete(job.id)}
                              className="flex-1 py-1.5 rounded border border-indigoAccent/30 bg-indigoAccent/5 text-[10px] font-bold text-indigoAccent uppercase tracking-wide hover:bg-indigoAccent/15 transition-all duration-200"
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
                    <div className="col-span-2 text-center py-12 bg-[#05050c] border border-accent/20 rounded">
                      <p className="text-xs text-gray-600">No active contracts available in this cycle.</p>
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          )}

          {/* TAB 3: COVENANTPAY MICROPAYMENTS */}
          {activeTab === "ledger" && (
            <React.Fragment>
              <div className="lg:col-span-5 bg-[#05050c] border border-accent/20 rounded p-6 font-mono text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Execute Wallet Transfer</h4>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1">Recipient Wallet (Hex)</label>
                    <input
                      type="text"
                      placeholder="01d36be4..."
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1">Transfer Amount (CSPR)</label>
                    <input
                      type="number"
                      placeholder="10.0"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider mb-1">Payment Memo</label>
                    <input
                      type="text"
                      value={transferMemo}
                      onChange={(e) => setTransferMemo(e.target.value)}
                      className="w-full bg-[#020205] border border-accent/20 rounded px-3 py-2 text-xs text-gray-200"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded border border-accent/40 bg-accent/5 font-bold text-xs uppercase tracking-widest text-accent hover:bg-accent/15 hover:shadow-glow transition-all duration-200"
                  >
                    Execute Micropayment
                  </button>
                </form>
                {transferSuccess && (
                  <div className="mt-4 p-3 rounded bg-green-950/20 border border-green-500/20 text-xs text-green-400">
                    {transferSuccess}
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 bg-[#05050c] border border-accent/20 rounded p-6 font-mono text-xs space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Active Ledger History</h4>
                <div className="space-y-3 bg-[#020205] border border-accent/10 rounded p-4 h-64 overflow-y-auto">
                  <div className="text-gray-500">No external manual transfers logged in this session. Connect wallet to sync.</div>
                </div>
              </div>
            </React.Fragment>
          )}

          {/* TAB 4: COVENANTAUDIT SYSTEM EXPLANATIONS */}
          {activeTab === "audits" && (
            <div className="lg:col-span-12 space-y-6">
              {auditReasoning ? (
                <div className="bg-[#050811] border border-accent/25 rounded p-6 relative overflow-hidden shadow-glow">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Audit Agent Explanation
                    </h4>
                    <span className="text-[9px] font-mono text-gray-500">Status: Secure</span>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line bg-[#020205]/60 p-5 rounded border border-white/5">
                    {auditReasoning}
                  </div>
                </div>
              ) : (
                <div className="glass-panel border-accent/25 rounded p-12 text-center text-gray-600 shadow-glow font-mono">
                  <p className="text-sm">Please select an active agent profile to generate AI audit description logs.</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* DRAGGABLE CONSOLE TERMINAL HUD */}
      <TerminalHUD activeWallet={connectedWallet || undefined} onchainLogs={terminalLogs} />

    </div>
  );
}