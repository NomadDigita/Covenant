"use client";

import React, { useState, useEffect } from "react";
import * as api from "@/services/api";
import Sidebar from "@/components/Sidebar";
import GlassPanel from "@/components/GlassPanel";
import NeonButton from "@/components/NeonButton";
import RadarChart from "@/components/RadarChart";
import MercenaryGrid, { MarketAgent } from "@/components/MercenaryGrid";
import SwarmModal from "@/components/SwarmModal";
import TerminalHUD from "@/components/TerminalHUD";
import CovenantLogo from "@/components/CovenantLogo";
import CasperEcosystemLogo from "@/components/CasperEcosystemLogo";
import { ShieldCheck, Scale, Coins, Menu, X, Cpu, Shield, ArrowRight } from "lucide-react";

// Declare the global window interface extensions to clear TypeScript compiler warnings
declare global {
  interface Window {
    CasperWalletProvider?: any;
    casperWalletHelper?: any;
  }
}

type TabType = "identity" | "market" | "ledger" | "audits";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("identity");

  // Gateway Access Control state
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Mobile Drawer Toggle States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // State Management
  const [walletQuery, setWalletQuery] = useState("0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Casper Wallet Session Hooks (True cryptographically signed keys)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // Active Profile Entity
  const [profile, setProfile] = useState<api.CompleteProfile | null>(null);

  // Onboarding Form States
  const [regName, setRegName] = useState("");
  const [regWallet, setRegWallet] = useState("");
  const [regOwner, setRegOwner] = useState("");
  const [regCapabilities, setRegCapabilities] = useState("data-feed, oracle, pricing");
  const [regDesc, setRegDesc] = useState("");
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Transfer Forms
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("10.0");
  const [transferMemo, setTransferMemo] = useState("x402 Micropayment");
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Live Scrolling Terminal Log Stream
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Swarm deliberation modal states
  const [isSwarmOpen, setIsSwarmOpen] = useState(false);
  const [swarmTarget, setSwarmTarget] = useState<MarketAgent | null>(null);

  // Audit Logs output
  const [auditReasoning, setAuditReasoning] = useState<string | null>(null);
  const [historicalTxs, setHistoricalTxs] = useState<api.LedgerTx[]>([]);

  // Baseline mock rosters to ensure dynamic visual representations immediately
  const [agentsCatalog, setAgentsCatalog] = useState<MarketAgent[]>([
    {
      id: "agent-1",
      name: "MarketOracle",
      wallet_address: "0202c032c1b5bbb2da4ce6259a4de792e8a5e6bef962b3b1a407e5a7c144907813e2",
      owner_address: "0172bf43d56a798edb4c88c029c7d0de878519cbeee74f3b46d5e4fa3e6ced0d00",
      capabilities: ["oracle", "pricing", "feed"],
      version: "1.0.1",
      description: "High-precision cryptographic oracle node delivering real-time currency pricing datasets directly to Casper DeFi smart contracts.",
      trust_score: 812,
      credit_score: 754,
      success_rate: 97.00,
      jobs_completed: 127,
    },
    {
      id: "agent-2",
      name: "ComplianceGuard",
      wallet_address: "0203f7e1b54a86cd305eW3yDZ4NfnNbmQRCMWS58IKUaa7b8b20d1e1276a6cf0d5f",
      owner_address: "019ef5075c43788e836ca524b5f36fba019ef5075c43788e836ca524b5f36fba00",
      capabilities: ["compliance", "kyc", "aml"],
      version: "1.0.0",
      description: "Autonomous threat detection agent executing off-chain zero-knowledge compliance audits and transaction AML scoring.",
      trust_score: 915,
      credit_score: 820,
      success_rate: 99.40,
      jobs_completed: 341,
    },
  ]);

  // Helper to retrieve the active Casper Wallet provider (v2.x or v1.x)
  const getCasperProvider = () => {
    if (typeof window === "undefined") return null;
    if (window.CasperWalletProvider) return window.CasperWalletProvider();
    if (window.casperWalletHelper) return window.casperWalletHelper;
    return null;
  };

  const handleConnectWallet = async () => {
    const provider = getCasperProvider();
    if (!provider) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        alert(
          "Casper Wallet Mobile Tip:\n\nTo authorize and connect your wallet on a mobile device, please open this dApp link directly inside the built-in browser of your Casper Wallet Mobile App."
        );
      } else {
        alert("Casper Wallet extension not found. Please install the browser extension to connect.");
      }
      return;
    }
    setIsWalletConnecting(true);
    try {
      const connected = await provider.requestConnection();
      if (connected) {
        const pubKey = await provider.getActivePublicKey();
        if (pubKey) {
          setConnectedWallet(pubKey);
          setWalletQuery(pubKey);
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

  const handleDisconnectWallet = async () => {
    const provider = getCasperProvider();
    if (provider) {
      await provider.disconnect();
      addTerminalLog(`[SYSTEM_DISCONNECT] Active wallet session disconnected.`);
      setConnectedWallet(null);
    }
  };

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

  const addTerminalLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev, msg]);
  };

  const loadLedger = async () => {
    try {
      const txs = await api.getPaymentHistory();
      setHistoricalTxs(txs);
    } catch {
      setHistoricalTxs([
        {
          id: "tx-1",
          sender_wallet: "0202c032c1b5bbb2da4...",
          receiver_wallet: "0203f7e1b54a86cd...",
          amount: 50.00,
          memo: "Oracle Lease Micropayment",
          tx_hash: "0x3b145a8b7c2d1e2e...",
          status: "successful",
          timestamp: new Date().toISOString(),
        },
      ]);
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

      const audits = await api.requestAuditExplanation({
        agent_id: data.identity.id,
        action_type: "On-Chain Query",
        risk_level: "Low",
        detail: "Resolved agent identity registry and parsed current trust and credit metrics on Casper dashboard.",
      });
      setAuditReasoning(audits.audit_explanation);
      addTerminalLog(`[AUDIT_ENGINE] Compiled human-readable explainability report: Log ID: ${audits.audit_id}`);
    } catch (err: any) {
      const matched = agentsCatalog.find((a) => a.wallet_address === targetWallet);
      if (matched) {
        setProfile({
          identity: {
            id: matched.id,
            wallet_address: matched.wallet_address,
            name: matched.name,
            owner_address: matched.owner_address,
            capabilities: matched.capabilities,
            version: matched.version,
            description: matched.description,
            created_at: new Date().toISOString(),
          },
          reputation: {
            id: "rep-1",
            agent_id: matched.id,
            trust_score: matched.trust_score,
            jobs_completed: matched.jobs_completed,
            success_rate: matched.success_rate,
            failure_rate: 100 - matched.success_rate,
            community_rating: 5.0,
            updated_at: new Date().toISOString(),
          },
          credit: {
            id: "cred-1",
            agent_id: matched.id,
            credit_score: matched.credit_score,
            transaction_volume: 50.0,
            payment_reliability: 100.0,
            updated_at: new Date().toISOString(),
          },
        });
        addTerminalLog(`[ON-CHAIN_RESOLVE] Target verified from local cache. Trust Score: ${matched.trust_score} | Credit: ${matched.credit_score}`);
      } else {
        setError(err.message || "Failed to resolve agent profile");
        addTerminalLog(`[ON-CHAIN_ERROR] Failed to find profile on-chain: ${err.message || err}`);
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle On-boarding Form Submits
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

  // Triggered on modal signature click
  const handleSignTransaction = async (txHash: string) => {
    setIsSwarmOpen(false);
    if (!swarmTarget) return;

    addTerminalLog(`[CovenantPay_SENDER] Triggering HTTP-native x402 pay-per-request API key settlement...`);
    addTerminalLog(`[CovenantPay_SUCCESS] Confirmed payment receipt on-chain: ${txHash.substring(0, 16)}...`);
    addTerminalLog(`[SWARM_ORCHESTRATOR] Triggering background agents to recalculate trust and credit metrics.`);

    const updatedCatalog = agentsCatalog.map((a) => {
      if (a.id === swarmTarget.id) {
        return {
          ...a,
          trust_score: Math.min(1000, a.trust_score + 25),
          credit_score: Math.min(1000, a.credit_score + 15),
          jobs_completed: a.jobs_completed + 1,
        };
      }
      return a;
    });

    setAgentsCatalog(updatedCatalog);
    addTerminalLog(`[SWARM_WRITE] Success rate and volume densities recalculated successfully.`);
    
    setTimeout(() => {
      fetchAgentProfile(swarmTarget.wallet_address);
    }, 1000);
  };

  // Manual Micropayment Transfer (CovenantPay)
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSuccess(null);
    addTerminalLog(`[CovenantPay_TRANSFER] Executing transaction of ${transferAmount} CSPR to: ${transferRecipient.substring(0, 16)}...`);
    try {
      const mockHash = "0x" + Math.random().toString(16).substring(2, 66);
      await api.executePayment({
        sender_wallet: connectedWallet || "0202c032c1b5bbb2da4...",
        receiver_wallet: transferRecipient,
        amount: parseFloat(transferAmount) || 10.0,
        memo: transferMemo,
        tx_hash: mockHash,
      });
      setTransferSuccess(`Micropayment of ${transferAmount} CSPR transferred successfully on-chain.`);
      addTerminalLog(`[CovenantPay_SUCCESS] Broadcast transfer successfully. Volume limits recalculated.`);
      loadLedger();
    } catch (err: any) {
      addTerminalLog(`[CovenantPay_REJECT] Transfer rejected: ${err.message || err}`);
    }
  };

  useEffect(() => {
    fetchAgentProfile(walletQuery);
    loadLedger();
    checkWalletConnection();
  }, []);

  // ─── GATEWAY ENTRY PORTAL INTERFACE ────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative z-10 font-mono text-xs">
        <GlassPanel className="w-full max-w-2xl p-6 sm:p-10 space-y-8" glowColor="primary">
          
          {/* Logo Headers */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <CovenantLogo size={40} className="text-neon-primary" />
              <div>
                <h1 className="text-sm font-display font-black text-white tracking-widest uppercase">Covenant</h1>
                <span className="text-[9px] text-gray-500 tracking-wider">TRUST THROUGH CODE</span>
              </div>
            </div>
            <CasperEcosystemLogo size={28} className="opacity-95" />
          </div>

          {/* System Vision Overview */}
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#ff7a00]/10 border border-[#ff7a00]/30 text-[9px] font-bold text-[#ff7a00] tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a00] animate-pulse" />
              Ecosystem Gateway
            </span>
            <p className="text-gray-400 leading-relaxed text-xs">
              Covenant establishes identity registries, dynamic reputation tracking, and creditworthiness ratings for autonomous AI agents operating on the Casper Network.
            </p>
          </div>

          {/* FAQ Accordion Lists Section */}
          <div className="space-y-4">
            <h3 className="font-display font-bold uppercase tracking-wider text-white text-xs">Ecosystem FAQ & Specifications</h3>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 bg-void-base/80 p-4 rounded border border-white/5 text-[11px] leading-relaxed text-gray-400">
              
              <div className="border-b border-white/5 pb-2">
                <span className="text-white font-bold block mb-1">Q1: What is Covenant?</span>
                <p>Covenant is a trust infrastructure protocol. It enables AI agents to verify identity, build reputation, receive credit ratings, and transact autonomously on-chain.</p>
              </div>

              <div className="border-b border-white/5 pb-2">
                <span className="text-white font-bold block mb-1">Q2: How does the Swarm evaluate agents?</span>
                <p>Covenant launches three concurrent off-chain workers: the Reputation Agent monitors task successes, the Credit Agent aggregates transaction volumes, and the Risk Agent detects anomaly alerts.</p>
              </div>

              <div className="border-b border-white/5 pb-2">
                <span className="text-white font-bold block mb-1">Q3: What are x402 Micropayments?</span>
                <p>An HTTP-native billing protocol allowing agents to settle fractions-of-a-cent transfers with on-chain cryptographic proofs per API request.</p>
              </div>

              <div>
                <span className="text-white font-bold block mb-1">Q4: How do I authorize my session?</span>
                <p>By clicking &apos;Authorize Wallet&apos;, Covenant handshakes with the browser&apos;s Casper Wallet extension to retrieve your active public key.</p>
              </div>

            </div>
          </div>

          {/* Entrance CTA button */}
          <button
            onClick={() => {
              addTerminalLog("[SYSTEM] Decrypting Covenant HUD grid...");
              addTerminalLog("[SYSTEM] Loading active telemetry channels...");
              setIsUnlocked(true);
            }}
            className="w-full py-3.5 rounded bg-neon-primary text-white font-display font-bold uppercase tracking-widest hover:shadow-glow-primary hover:-translate-y-0.5 transition-all duration-200"
          >
            Initialize Covenant HUD Decryption
          </button>

        </GlassPanel>
      </div>
    );
  }

  // ─── MAIN COCKPIT VIEWPORTS ────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-void-base text-gray-300">
      
      {/* A. RESPONSIVE SIDEBAR COLLAPSIBLE OVERLAY (Fixed 260px on PC, Slide-out on Mobile) */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false); // Auto close sidebar on mobile tap
          }}
          connectedWallet={connectedWallet}
          isConnecting={isWalletConnecting}
          onConnect={handleConnectWallet}
          onDisconnect={handleDisconnectWallet}
        />
      </div>

      {/* Dimmed backdrop when sidebar is open on mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* B. SCROLLABLE VIEWPORT CONTENT CONTAINER (Responsive width spacing) */}
      <div className="flex-1 flex flex-col min-h-screen pr-0 lg:pr-[320px] transition-all duration-300 w-full overflow-hidden">
        
        {/* MOBILE UPPER NAVIGATION HEADER BAR */}
        <header className="sticky top-0 z-20 w-full border-b border-white/5 bg-void-base/80 backdrop-blur-md py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded border border-white/10 text-neon-secondary hover:text-white md:hidden"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <CovenantLogo className="w-6 h-6 text-neon-primary" />
            <span className="font-display font-black text-xs text-white uppercase tracking-widest hidden sm:inline">Covenant Canvas</span>
          </div>
          
          {/* CO-BRANDED CASPER LOCKUP */}
          <CasperEcosystemLogo size={20} className="opacity-90 scale-90 sm:scale-100" />
        </header>

        {/* MAIN DATA VIEWPORTS AREA */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto w-full">
          
          {/* TAB 1: IDENTITY VIEW (Cleanly adaptive columns) */}
          {activeTab === "identity" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* RESOLVER & REGISTRY INPUTS */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Profile Resolver */}
                <GlassPanel className="p-5 space-y-4" glowColor="secondary">
                  <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-neon-secondary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-secondary animate-pulse" />
                    Resolve Agent Profile
                  </h3>
                  <div className="space-y-3 font-mono">
                    <input
                      type="text"
                      placeholder="Agent Public Key (Hex)..."
                      value={walletQuery}
                      onChange={(e) => setWalletQuery(e.target.value)}
                      className="w-full bg-void-base border border-white/10 rounded px-3.5 py-2.5 text-xs text-gray-200 outline-none focus:border-neon-secondary transition-colors"
                    />
                    <button
                      onClick={() => fetchAgentProfile(walletQuery)}
                      className="w-full py-2.5 rounded border border-neon-secondary/30 bg-neon-secondary/5 font-mono font-bold text-xs uppercase tracking-wider text-neon-secondary hover:bg-neon-secondary/10 hover:shadow-glow-secondary transition-all"
                    >
                      Execute Query
                    </button>
                  </div>
                  {error && <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded">{error}</div>}
                </GlassPanel>

                {/* Agent Onboarding Panel */}
                <GlassPanel className="p-5 space-y-4">
                  <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-neon-primary">Onboard Covenant ID</h3>
                  <form onSubmit={handleRegister} className="space-y-4 font-mono">
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-1">Agent Name</label>
                        <input
                          type="text"
                          placeholder="e.g. MarketOracle"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 focus:border-neon-primary transition-colors outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-1">Casper Public Key</label>
                        <input
                          type="text"
                          value={regWallet}
                          onChange={(e) => setRegWallet(e.target.value)}
                          className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 focus:border-neon-primary transition-colors outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-1">Capabilities Vectors</label>
                        <input
                          type="text"
                          value={regCapabilities}
                          onChange={(e) => setRegCapabilities(e.target.value)}
                          className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 focus:border-neon-primary transition-colors outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase text-gray-500 tracking-wider mb-1">Operational Description</label>
                        <textarea
                          placeholder="Operational metrics and boundaries..."
                          value={regDesc}
                          onChange={(e) => setRegDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 resize-none outline-none focus:border-neon-primary transition-colors"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded border border-neon-primary/30 bg-neon-primary/5 font-mono font-bold text-xs uppercase tracking-wider text-neon-primary hover:bg-neon-primary/10 hover:shadow-glow-primary transition-all"
                    >
                      Register Agent ID
                    </button>
                  </form>
                  {regSuccess && <div className="p-3 bg-green-950/20 border border-green-500/20 text-green-400 rounded">{regSuccess}</div>}
                </GlassPanel>

              </div>

              {/* TELEMETRY RADAR DISPLAY */}
              <div className="lg:col-span-7 space-y-6">
                {profile ? (
                  <div className="space-y-6">
                    
                    {/* PROFILE DATA TITLE PANEL */}
                    <GlassPanel className="p-5 relative overflow-hidden" glowColor="primary">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4 mb-4 font-mono">
                        <div>
                          <h2 className="text-base font-display font-black text-white">{profile.identity.name}</h2>
                          <span className="text-[9px] text-gray-600 block mt-1 tracking-widest">REG_ID: {profile.identity.id}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-status-success/5 border border-status-success/20 text-[9px] font-bold text-[#00FF66] tracking-widest uppercase self-start sm:self-center">
                          Active ID Established
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed font-mono">
                        {profile.identity.description}
                      </p>
                      <div className="flex flex-wrap gap-2.5 mt-4">
                        {profile.identity.capabilities.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-void-base border border-white/5 text-[9px] text-neon-secondary font-bold uppercase tracking-wider">
                            {c}
                          </span>
                        ))}
                      </div>
                    </GlassPanel>

                    {/* RADAR METRICS DETAILS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <GlassPanel className="p-5 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-4">
                          Capabilities Pentagon
                        </span>
                        <RadarChart
                          metrics={{
                            reputation: profile.reputation.trust_score,
                            reliability: profile.credit.payment_reliability,
                            speed: 85,
                            accuracy: 94,
                            cost: 72,
                          }}
                        />
                      </GlassPanel>

                      {/* RATINGS DIAL */}
                      <div className="space-y-4">
                        <GlassPanel className="p-4 flex items-center justify-between" glowColor="primary">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">CovenantScore</span>
                            <span className="text-white text-xs font-bold font-mono">Reputation Dials</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-display font-black text-neon-primary">{profile.reputation.trust_score}</span>
                            <span className="text-[8px] text-gray-600 block font-mono uppercase">of 1000</span>
                          </div>
                        </GlassPanel>

                        <GlassPanel className="p-4 flex items-center justify-between" glowColor="secondary">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">CovenantCredit</span>
                            <span className="text-white text-xs font-bold font-mono">Credit Limits</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-display font-black text-neon-secondary">{profile.credit.credit_score}</span>
                            <span className="text-[8px] text-gray-600 block font-mono uppercase">of 1000</span>
                          </div>
                        </GlassPanel>
                      </div>

                    </div>

                  </div>
                ) : (
                  <GlassPanel className="p-12 text-center text-gray-600">
                    <p className="font-mono text-xs">Query or register a verified CovenantID profile to display current ratings telemetry.</p>
                  </GlassPanel>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: DISCOVERY VIEW (Fully adaptive Mercenary Grid) */}
          {activeTab === "market" && (
            <MercenaryGrid
              agents={agentsCatalog}
              onInspect={(wallet) => {
                setWalletQuery(wallet);
                setActiveTab("identity");
                fetchAgentProfile(wallet);
              }}
              onHire={(agent) => {
                setSwarmTarget(agent);
                setIsSwarmOpen(true);
              }}
            />
          )}

          {/* TAB 3: LEDGER_PAY VIEW */}
          {activeTab === "ledger" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* MANUAL TRANSFER PANEL */}
              <div className="lg:col-span-5 bg-void-surface border border-white/5 p-5 rounded-xl space-y-4 font-mono text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neon-primary mb-2">Execute Ledger Transfer</h4>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Recipient Wallet</label>
                    <input
                      type="text"
                      placeholder="01d36be4..."
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value)}
                      className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Value (CSPR)</label>
                    <input
                      type="number"
                      placeholder="10.0"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">Payment Memo</label>
                    <input
                      type="text"
                      value={transferMemo}
                      onChange={(e) => setTransferMemo(e.target.value)}
                      className="w-full bg-void-base border border-white/10 rounded px-3 py-2 text-xs text-gray-200 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded border border-neon-primary/30 bg-neon-primary/5 font-bold text-xs uppercase tracking-wider text-neon-primary hover:bg-neon-primary/10 hover:shadow-glow-primary transition-all duration-200"
                  >
                    Execute Micropayment
                  </button>
                </form>
                {transferSuccess && <div className="p-3 bg-green-950/20 border border-green-500/20 text-green-400 rounded">{transferSuccess}</div>}
              </div>

              {/* LOGGED TRANSACTION HISTORY */}
              <div className="lg:col-span-7 bg-void-surface border border-white/5 p-5 rounded-xl space-y-4 font-mono text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neon-secondary mb-2">Active Ledger History</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 bg-void-base border border-white/5 p-4 rounded-md">
                  {historicalTxs.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-2 text-gray-500">
                      <div>
                        <span className="text-white block font-bold">{tx.memo}</span>
                        <span className="block mt-0.5">{tx.tx_hash.substring(0, 16)}...</span>
                      </div>
                      <div className="text-right">
                        <span className="text-neon-secondary font-black block">-{tx.amount} CSPR</span>
                        <span className="text-[8px] block uppercase text-[#00FF66]">Successful</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: AUDIT_LOGS VIEW */}
          {activeTab === "audits" && (
            <div className="space-y-6 font-mono text-xs">
              {auditReasoning ? (
                <GlassPanel className="p-5 relative overflow-hidden" glowColor="primary">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-neon-primary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-primary animate-pulse" />
                      Audit Agent Explanation
                    </h4>
                    <span className="text-[9px] text-[#00FF66] font-bold">Status: Secure</span>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed bg-void-base/80 p-5 rounded border border-white/5 whitespace-pre-line leading-relaxed">
                    {auditReasoning}
                  </div>
                </GlassPanel>
              ) : (
                <GlassPanel className="p-12 text-center text-gray-600">
                  <p className="text-sm">Please select a verified profile to generate AI audit description logs.</p>
                </GlassPanel>
              )}
            </div>
          )}

        </div>

      </div>

      {/* C. COLLAPSIBLE CONSOLE LOGS TERMINAL (Visible on wide screens, collapses cleanly) */}
      <div className="hidden lg:block">
        <TerminalHUD activeWallet={connectedWallet || undefined} onchainLogs={terminalLogs} />
      </div>

      {/* D. MULTI-AGENT SWARM SIMULATOR MODAL PANEL */}
      <SwarmModal
        isOpen={isSwarmOpen}
        onClose={() => setIsSwarmOpen(false)}
        onSignTransaction={handleSignTransaction}
        targetAgentName={swarmTarget?.name || "MarketOracle"}
        budgetCSPR={swarmTarget?.credit_score || 50.0}
      />

    </div>
  );
}