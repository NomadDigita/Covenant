import React, { useState, useEffect, useRef } from "react";

interface TerminalHUDProps {
  activeWallet?: string;
  onchainLogs?: string[];
}

export default function TerminalHUD({ activeWallet, onchainLogs = [] }: TerminalHUDProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "System initialized.",
    "Covenant Protocol Core - Online.",
    "Connected to Casper Testnet Node: https://rpc.testnet.casper.network",
  ]);
  const [commandInput, setCommandInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeWallet) {
      setLogs((prev) => [
        ...prev,
        `[IDENTITY] Resolved active wallet: ${activeWallet}`,
      ]);
    }
  }, [activeWallet]);

  useEffect(() => {
    if (onchainLogs && onchainLogs.length > 0) {
      setLogs((prev) => [...prev, ...onchainLogs]);
    }
  }, [onchainLogs]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    let response = "";
    if (cmd === "help") {
      response = "Available commands: help | stats | status | clear | contracts";
    } else if (cmd === "status") {
      response = "Covenant Protocol status: Secure. Active Swarms: Reputation (15m), Credit (20m), Risk (30m).";
    } else if (cmd === "contracts") {
      response = "On-Chain Deployed Contract Hashes:\n- AgentRegistry: hash-7206ce3f...\n- ReputationContract: hash-38db445e...\n- PaymentContract: hash-2e14b0b0...\n- CreditContract: hash-be32e79b...";
    } else if (cmd === "clear") {
      setLogs([]);
      setCommandInput("");
      return;
    } else {
      response = `Command not recognized: '${cmd}'. Type 'help' for options.`;
    }

    setLogs((prev) => [...prev, `> ${commandInput}`, response]);
    setCommandInput("");
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${isOpen ? "h-64" : "h-10"}`}>
      
      {/* HEADER CONTROL BAR */}
      <div className="bg-[#05050c] border-t border-accent/20 px-6 py-2 flex items-center justify-between text-xs font-mono font-bold text-accent">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>CYBER_COMMAND_CONSOL_V1.0</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 rounded border border-accent/30 hover:bg-accent/15 transition-all duration-200"
        >
          {isOpen ? "MINIMIZE_HUD" : "EXPAND_HUD"}
        </button>
      </div>

      {/* CONSOLE READING SPACE */}
      {isOpen && (
        <div className="h-full bg-[#020205]/95 backdrop-blur-md px-6 py-4 overflow-y-auto text-xs font-mono text-[#39ff14] space-y-2 select-text pb-12">
          {logs.map((log, index) => (
            <div key={index} className="whitespace-pre-line leading-relaxed">
              <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
            </div>
          ))}
          <div ref={terminalEndRef} />
          
          {/* CLI INPUT ROW */}
          <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 border-t border-accent/10 pt-2 mt-4">
            <span className="text-accent font-bold">&gt;</span>
            <input 
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter console command (e.g. help, contracts, status)..."
              className="flex-1 bg-transparent text-[#39ff14] border-none outline-none focus:ring-0 placeholder:text-gray-700"
            />
          </form>
        </div>
      )}
    </div>
  );
}