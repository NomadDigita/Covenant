"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, ChevronLeft, ChevronRight, Play, Cpu } from "lucide-react";

interface TerminalHUDProps {
  activeWallet?: string;
  onchainLogs?: string[];
}

export function TerminalHUD({ activeWallet, onchainLogs = [] }: TerminalHUDProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "System initialized.",
    "Covenant Protocol Core - Online.",
    "Connecting to Casper Testnet node...",
  ]);
  
  // Custom Typewriter Animation States
  const [displayedLogs, setTypedLogs] = useState<string[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Queue and typing indexes trackers
  const typingQueueRef = useRef<string[]>([]);
  const isTypingRef = useRef(false);

  // Initial loads setup
  useEffect(() => {
    // Stage baseline system states to typing queue on mount
    typingQueueRef.current.push(...logs);
    processTypingQueue();
  }, []);

  // Sync wallet connections
  useEffect(() => {
    if (activeWallet) {
      typingQueueRef.current.push(`[IDENTITY] Resolved active wallet session: ${activeWallet}`);
      processTypingQueue();
    }
  }, [activeWallet]);

  // Sync new onchain transaction updates
  useEffect(() => {
    if (onchainLogs && onchainLogs.length > 0) {
      typingQueueRef.current.push(...onchainLogs);
      processTypingQueue();
    }
  }, [onchainLogs]);

  // Scroll to bottom on every console render update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedLogs, isOpen]);

  // Typewriter Engine: Sequentially renders characters from queue to simulate active thinking
  const processTypingQueue = () => {
    if (isTypingRef.current || typingQueueRef.current.length === 0) return;

    isTypingRef.current = true;
    const nextLine = typingQueueRef.current.shift()!;
    let currentIdx = 0;
    
    // Inject clean blank placeholder string array element to print characters into
    setTypedLogs((prev) => [...prev, ""]);

    const interval = setInterval(() => {
      setTypedLogs((prev) => {
        const nextLogs = [...prev];
        nextLogs[nextLogs.length - 1] = nextLine.substring(0, currentIdx + 1);
        return nextLogs;
      });

      currentIdx++;
      if (currentIdx >= nextLine.length) {
        clearInterval(interval);
        isTypingRef.current = false;
        // Recursive call to handle next lines in queue
        processTypingQueue();
      }
    }, 15); // Highly tuned 15ms interval for low-CPU performance
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    // Immediately record command prompt directly on screen
    setTypedLogs((prev) => [...prev, `> ${commandInput}`]);

    let response = "";
    if (cmd === "help") {
      response = "Available commands:\n- help : Displays CLI commands\n- stats : Pulls active gateway metrics\n- status : Checks swarm intervals\n- contracts : Lists deployed contract hashes\n- clear : Resets console logs";
    } else if (cmd === "status") {
      response = "Swarm Status: SECURE\nActive Goroutines: 3\nInterval loops:\n- Rep Agent: 15s Ticker\n- Cred Agent: 20s Ticker\n- Risk Agent: 30s Ticker";
    } else if (cmd === "stats") {
      response = "Metrics Stream:\n- Target Database: Connected\n- Simple Protocol: Enabled\n- API Port: 8080\n- Response Latency: 42ms";
    } else if (cmd === "contracts") {
      response = "Deployed Casper Testnet Hashes:\n- Registry : hash-AgentRegistry\n- Reputation: hash-ReputationContract\n- Credit   : hash-CreditContract\n- Payment  : hash-PaymentContract";
    } else if (cmd === "clear") {
      setTypedLogs([]);
      setCommandInput("");
      return;
    } else {
      response = `Command unrecognized: '${cmd}'. Type 'help' for guidance.`;
    }

    // Queue response to type character-by-character
    typingQueueRef.current.push(response);
    setCommandInput("");
    processTypingQueue();
  };

  return (
    <div 
      className={`
        fixed top-0 bottom-0 right-0 z-30 
        flex flex-col 
        border-l border-white/5 
        bg-[#030305]/95 backdrop-blur-md 
        transition-all duration-300
        ${isOpen ? "w-[320px]" : "w-0"}
      `}
    >
      
      {/* 1. COLLAPSIBLE TOGGLE TAB ON LEFT BORDER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          absolute top-1/2 -left-6 -translate-y-1/2 
          w-6 h-12 
          bg-[#030305]/95 border-l border-t border-b border-white/5 rounded-l-md 
          flex items-center justify-center 
          text-neon-secondary hover:text-white
          transition-colors duration-200
        "
        title={isOpen ? "Collapse Console HUD" : "Expand Console HUD"}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* 2. CONSOLE HUD HEADER */}
      {isOpen && (
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between text-xs font-mono font-bold text-neon-secondary bg-void-surface/50">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-neon-primary animate-pulse" />
            <span className="text-white uppercase tracking-wider">SWARM_CONSOLE_LOGS</span>
          </div>
          <span className="text-[9px] font-black text-[#00FF66] tracking-widest px-2 py-0.5 rounded bg-status-success/5 border border-status-success/20">LIVE</span>
        </div>
      )}

      {/* 3. SCROLLING CONSOLE TEXT WINDOW */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-[11px] text-[#39ff14] space-y-2 select-text pb-20">
          {displayedLogs.map((log, index) => (
            <div key={index} className="whitespace-pre-line leading-relaxed border-b border-white/2 py-1">
              <span className="text-gray-600 block text-[9px] mb-0.5">
                [{new Date().toLocaleTimeString()}]
              </span>
              {log}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>
      )}

      {/* 4. CONSOLE CLI INPUT WRAPPER */}
      {isOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-[#030305]/95">
          <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 bg-void-base border border-white/5 rounded-md px-3 py-2 text-xs font-mono">
            <Play className="w-2.5 h-2.5 text-neon-secondary shrink-0" />
            <input 
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Query console (e.g. help, status)..."
              className="flex-1 bg-transparent text-[#39ff14] border-none outline-none focus:ring-0 placeholder:text-gray-700"
            />
          </form>
        </div>
      )}

    </div>
  );
}

export default TerminalHUD;