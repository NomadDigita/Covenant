"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Scale, Cpu, AlertTriangle, Coins, CheckCircle, ArrowRight } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import { NeonButton } from "./NeonButton";

interface SwarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignTransaction: (txHash: string) => void;
  targetAgentName: string;
  budgetCSPR: number;
}

type StepType = "compliance" | "credit" | "risk" | "treasury" | "ready";

export function SwarmModal({
  isOpen,
  onClose,
  onSignTransaction,
  targetAgentName,
  budgetCSPR,
}: SwarmModalProps) {
  const [activeStep, setActiveStep] = useState<StepType>("compliance");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Simulation Timeline Sequences
  useEffect(() => {
    if (!isOpen) {
      setActiveStep("compliance");
      setConsoleLogs([]);
      return;
    }

    // Step 1: Compliance Analysis
    setConsoleLogs(["[Compliance] Querying off-chain KYC proofs...", "[Compliance] Validating zero-knowledge proof tokens..."]);
    
    const t1 = setTimeout(() => {
      setActiveStep("credit");
      setConsoleLogs((prev) => [
        ...prev,
        "[Compliance] SUCCESS: KYC Verification validated.",
        "[Credit] Querying on-chain CreditContract...",
        "[Credit] Aggregating historical payment volumes..."
      ]);
    }, 2500);

    // Step 2: Credit Evaluation
    const t2 = setTimeout(() => {
      setActiveStep("risk");
      setConsoleLogs((prev) => [
        ...prev,
        "[Credit] SUCCESS: Client Credit Score is 754 (Low Default Risk).",
        "[Risk] Scrape behavior history...",
        "[Risk] Auditing anomaly patterns..."
      ]);
    }, 5000);

    // Step 3: Risk Audit
    const t3 = setTimeout(() => {
      setActiveStep("treasury");
      setConsoleLogs((prev) => [
        ...prev,
        "[Risk] SUCCESS: Anomaly threat score is 0.02% (Below Threshold Limit).",
        "[Treasury] Checking payment purse liquidity...",
        "[Treasury] Constructing x402 invoice transfer payload..."
      ]);
    }, 7500);

    // Step 4: Treasury Clearance
    const t4 = setTimeout(() => {
      setActiveStep("ready");
      setConsoleLogs((prev) => [
        ...prev,
        "[Treasury] READY: Purse validated.",
        "[SYSTEM] Multi-Agent Swarm decision established: LOAN_APPROVED.",
        "> Awaiting operator cryptographic signature..."
      ]);
    }, 10000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to generate coordinates for orbiting elements
  const agentMetadata = {
    compliance: { label: "Compliance Agent", icon: ShieldCheck, color: "text-[#00f0ff]" },
    credit: { label: "Credit Agent", icon: Scale, color: "text-[#39ff14]" },
    risk: { label: "Risk Agent", icon: AlertTriangle, color: "text-[#B500FF]" },
    treasury: { label: "Treasury Agent", icon: Coins, color: "text-[#ff7a00]" },
  };

  const executeSigning = () => {
    // Generate simulated deploy hash
    const simulatedDeployHash = "0x" + Array.from({ length: 64 }, () => 
      "0123456789abcdef"[Math.floor(Math.random() * 16)]
    ).join("");
    
    onSignTransaction(simulatedDeployHash);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-base/90 backdrop-blur-md font-mono text-xs">
      
      {/* GLOW OVERLAYS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <GlassPanel className="w-full max-w-3xl p-6 sm:p-8" glowColor="primary">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-neon-primary animate-spin" style={{ animationDuration: "3s" }} />
            <div>
              <h2 className="text-sm font-display font-black text-white tracking-widest uppercase">SWARM_COMMAND_CENTER</h2>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider block mt-0.5">M2M_CONTRACT_DECISION_STREAM</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            [Abort]
          </button>
        </div>

        {/* DOUBLE COLUMN PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[300px]">
          
          {/* COLUMN 1: VISUAL SWARM CONNECTIONS DIAL (Orbit Layout) */}
          <div className="md:col-span-5 flex justify-center py-6">
            <div className="relative w-64 h-64 flex items-center justify-center">
              
              {/* Radial Orbit Lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <circle cx="128" cy="128" r="80" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" fill="none" />
                <circle cx="128" cy="128" r="80" stroke="rgba(255, 85, 0, 0.05)" strokeWidth="1" strokeDasharray="4 4" fill="none" />
              </svg>

              {/* Central User Request Node */}
              <div className="w-16 h-16 rounded-full bg-white text-void-base font-display font-black text-[9px] uppercase tracking-wider flex items-center justify-center text-center shadow-[0_0_20px_rgba(255,255,255,0.8)] z-10">
                User<br />Req
              </div>

              {/* Orbiting Satellite Node: Compliance Agent (Top) */}
              <div 
                className={`absolute top-4 left-1/2 -translate-x-1/2 p-3 rounded-full border transition-all duration-300 ${
                  activeStep === "compliance" 
                    ? "border-neon-secondary bg-neon-secondary/10 shadow-glow-secondary status-active-pulse" 
                    : "border-white/10 bg-void-surface"
                }`}
                title="Compliance Agent"
              >
                <ShieldCheck className="w-5 h-5 text-neon-secondary" />
              </div>

              {/* Orbiting Satellite Node: Credit Agent (Right) */}
              <div 
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full border transition-all duration-300 ${
                  activeStep === "credit" 
                    ? "border-status-success bg-status-success/10 shadow-[0_0_15px_rgba(0,255,102,0.3)] status-active-pulse" 
                    : "border-white/10 bg-void-surface"
                }`}
                title="Credit Agent"
              >
                <Scale className="w-5 h-5 text-status-success" />
              </div>

              {/* Orbiting Satellite Node: Risk Agent (Bottom) */}
              <div 
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-full border transition-all duration-300 ${
                  activeStep === "risk" 
                    ? "border-neon-accent bg-neon-accent/10 shadow-[0_0_15px_rgba(181,0,255,0.3)] status-active-pulse" 
                    : "border-white/10 bg-void-surface"
                }`}
                title="Risk Agent"
              >
                <AlertTriangle className="w-5 h-5 text-neon-accent" />
              </div>

              {/* Orbiting Satellite Node: Treasury Agent (Left) */}
              <div 
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full border transition-all duration-300 ${
                  activeStep === "treasury" 
                    ? "border-neon-primary bg-neon-primary/10 shadow-glow-primary status-active-pulse" 
                    : "border-white/10 bg-void-surface"
                }`}
                title="Treasury Agent"
              >
                <Coins className="w-5 h-5 text-neon-primary" />
              </div>

            </div>
          </div>

          {/* COLUMN 2: REAL-TIME SWARM THINKING LOGS & SIGN PANEL */}
          <div className="md:col-span-7 space-y-4">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">
              Active Deliberation Logs
            </span>
            
            {/* Terminal Window container */}
            <div className="h-44 bg-void-base border border-white/5 p-4 rounded-md overflow-y-auto space-y-1.5 text-[10px] text-[#39ff14] select-text">
              {consoleLogs.map((log, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-line font-mono">
                  {log}
                </div>
              ))}
            </div>

            {/* ACTION PANEL */}
            <div className="pt-2">
              {activeStep === "ready" ? (
                <div className="space-y-4">
                  <div className="p-3 bg-status-success/5 border border-status-success/20 rounded-md flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-status-success uppercase tracking-wider block">Decision Result</span>
                      <span className="text-white font-extrabold uppercase mt-0.5 block">Approved & Cleared</span>
                    </div>
                    <CheckCircle className="w-6 h-6 text-status-success shrink-0" />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="py-3 px-4 rounded border border-white/10 text-gray-400 hover:text-white hover:bg-void-elevated transition-all flex-1"
                    >
                      Dismiss
                    </button>
                    <NeonButton
                      variant="primary"
                      onClick={executeSigning}
                      className="flex-1 flex items-center justify-center gap-2 group"
                    >
                      <span>Sign x402 Pay</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </NeonButton>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-void-surface border border-white/5 rounded-md flex items-center justify-center gap-3 text-gray-500 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-status-processing animate-ping" />
                  <span className="uppercase tracking-widest font-bold">Swarm deliberating contract details...</span>
                </div>
              )}
            </div>

          </div>

        </div>

      </GlassPanel>

    </div>
  );
}

export default SwarmModal;