"use client";

import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal, ShieldCheck, DollarSign, Activity } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import { NeonButton } from "./NeonButton";

// Interfaces aligned with backend models.go structure
export interface MarketAgent {
  id: string;
  name: string;
  wallet_address: string;
  owner_address: string;
  capabilities: string[];
  version: string;
  description: string;
  trust_score: number;
  credit_score: number;
  success_rate: number;
  jobs_completed: number;
}

interface MercenaryGridProps {
  agents: MarketAgent[];
  onInspect: (wallet: string) => void;
  onHire: (agent: MarketAgent) => void;
}

export function MercenaryGrid({ agents, onInspect, onHire }: MercenaryGridProps) {
  // ─── Filter States ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [minTrust, setMinTrust] = useState(500);
  const [minCredit, setMinCredit] = useState(500);
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);

  // Collect all unique capability tags available across the system dynamically
  const allCapabilities = useMemo(() => {
    const caps = new Set<string>();
    agents.forEach((agent) => {
      agent.capabilities.forEach((c) => caps.add(c.toLowerCase().trim()));
    });
    return Array.from(caps);
  }, [agents]);

  const toggleCapability = (cap: string) => {
    setSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  // ─── Precision Filter Engine ────────────────────────────────────────────────
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      // 1. Text Query Filter (Name, Wallet, Description, or Capabilities)
      const matchesText =
        searchQuery === "" ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.wallet_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Score Bounds Filter
      const matchesTrust = agent.trust_score >= minTrust;
      const matchesCredit = agent.credit_score >= minCredit;

      // 3. Capabilities Checklist Filter
      const matchesCaps =
        selectedCaps.length === 0 ||
        selectedCaps.every((c) =>
          agent.capabilities.map((ac) => ac.toLowerCase().trim()).includes(c)
        );

      return matchesText && matchesTrust && matchesCredit && matchesCaps;
    });
  }, [agents, searchQuery, minTrust, minCredit, selectedCaps]);

  return (
    <div className="space-y-6 font-mono text-xs">
      
      {/* A. MASSIVE FULL-WIDTH GLASS SEARCH INPUT */}
      <GlassPanel className="p-4" glowColor="secondary">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-neon-secondary shrink-0" />
          <input
            type="text"
            placeholder="> SEARCH MERCENARY AGENTS BY ID, WALLET, DESCRIPTION, OR VECTOR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-neon-secondary font-mono text-xs uppercase tracking-wider outline-none border-none focus:ring-0 placeholder:text-gray-800"
          />
        </div>
      </GlassPanel>

      {/* B. DUAL-GRID LAYOUT (FILTERS LEFT, MERCENARIES RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: TACTICAL CONTROL PANEL (FILTERS) */}
        <div className="lg:col-span-4">
          <GlassPanel className="p-6 space-y-6">
            
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <SlidersHorizontal className="w-4 h-4 text-neon-primary" />
              <h3 className="font-display font-bold uppercase tracking-wider text-white">HUD_FILTERS</h3>
            </div>

            {/* TRUST THRESHOLD SLIDER */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-gray-500 uppercase tracking-widest text-[10px]">
                <span>Min Trust Score</span>
                <span className="text-neon-primary font-black">{minTrust}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={minTrust}
                onChange={(e) => setMinTrust(parseInt(e.target.value, 10))}
                className="w-full accent-neon-primary bg-void-base h-1 rounded"
              />
            </div>

            {/* CREDIT THRESHOLD SLIDER */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-gray-500 uppercase tracking-widest text-[10px]">
                <span>Min Credit Score</span>
                <span className="text-neon-secondary font-black">{minCredit}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={minCredit}
                onChange={(e) => setMinCredit(parseInt(e.target.value, 10))}
                className="w-full accent-neon-secondary bg-void-base h-1 rounded"
              />
            </div>

            {/* CAPABILITY CHECKBOX LIST */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                Capabilities Checklist
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {allCapabilities.map((cap) => {
                  const isChecked = selectedCaps.includes(cap);
                  return (
                    <button
                      key={cap}
                      onClick={() => toggleCapability(cap)}
                      className="w-full flex items-center gap-3 text-left py-1 text-[11px] text-gray-400 hover:text-white uppercase transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors ${
                        isChecked 
                          ? "border-neon-secondary bg-neon-secondary/15 text-neon-secondary" 
                          : "border-gray-700 bg-void-base text-transparent"
                      }`}>
                        {isChecked && <span className="w-1.5 h-1.5 bg-neon-secondary rounded-sm" />}
                      </div>
                      <span>{cap}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </GlassPanel>
        </div>

        {/* RIGHT COLUMN: DISCOVERABLE MERCENARIES ROSTER */}
        <div className="lg:col-span-8 space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
            MERCENARY_ROSTER ({filteredAgents.length} Active Nodes)
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <GlassPanel
                  key={agent.id}
                  className="p-5 flex flex-col justify-between group hover:shadow-glow-primary hover:scale-[1.01] hover:-translate-y-0.5 cursor-pointer transition-all duration-300"
                  glowColor="primary"
                >
                  <div className="space-y-4">
                    {/* Header: Orbitron Title & Orange Score */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-display uppercase tracking-wider text-white text-sm font-bold">
                          {agent.name}
                        </h5>
                        <span className="text-[9px] text-gray-600 font-mono tracking-widest block mt-0.5">
                          {agent.wallet_address.substring(0, 16)}...
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-2xl font-black text-neon-primary tracking-tight block">
                          {agent.trust_score}
                        </span>
                        <span className="text-[8px] uppercase tracking-widest text-gray-600 block">Trust Rating</span>
                      </div>
                    </div>

                    {/* Monospace Description */}
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3">
                      {agent.description}
                    </p>

                    {/* Render Capability Tags */}
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-void-base border border-white/5 text-[9px] text-neon-secondary uppercase font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer & CTA Actions */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600">
                      <span className="flex items-center gap-1 font-bold">
                        <Activity className="w-3 h-3 text-[#00FF66]" /> SR: {agent.success_rate}%
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 font-bold">
                        <DollarSign className="w-3 h-3 text-neon-secondary" /> Cred: {agent.credit_score}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspect(agent.wallet_address);
                        }}
                        className="py-1 px-3 rounded border border-neon-secondary/25 text-[10px] text-neon-secondary uppercase font-bold hover:bg-neon-secondary/10 transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onHire(agent);
                        }}
                        className="py-1 px-3 rounded bg-neon-primary text-white text-[10px] font-bold uppercase hover:shadow-glow-primary transition-all duration-200"
                      >
                        Hire
                      </button>
                    </div>
                  </div>

                </GlassPanel>
              ))
            ) : (
              <div className="col-span-2 text-center py-16 bg-[#05050c]/40 border border-white/5 rounded-xl font-mono text-gray-600 shadow-glow-glass">
                <p className="text-xs">No active mercenary nodes matched selected filters in this cycle.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default MercenaryGrid;