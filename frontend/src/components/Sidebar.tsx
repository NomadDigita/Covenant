"use client";

import React, { useState, useEffect } from "react";
import { 
  Compass, 
  Layers, 
  ShieldCheck, 
  Wallet, 
  Sun, 
  Moon, 
  Laptop,
  CheckCircle2
} from "lucide-react";
import { BrandingLockup } from "./BrandingLockup";

type TabType = "identity" | "market" | "ledger" | "audits";
type ThemeType = "dark" | "light" | "system";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  connectedWallet: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  connectedWallet,
  isConnecting,
  onConnect,
  onDisconnect,
}: SidebarProps) {
  
  const [theme, setTheme] = useState<ThemeType>("dark");

  const applyTheme = (targetTheme: ThemeType) => {
    const root = window.document.documentElement;
    root.classList.remove("dark", "light");

    if (targetTheme === "dark") {
      root.classList.add("dark");
      root.style.setProperty("--color-bg", "#05050A");
    } else if (targetTheme === "light") {
      root.classList.add("light");
      root.style.setProperty("--color-bg", "#F4F4F9");
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
        root.style.setProperty("--color-bg", "#05050A");
      } else {
        root.classList.add("light");
        root.style.setProperty("--color-bg", "#F4F4F9");
      }
    }
    setTheme(targetTheme);
  };

  useEffect(() => {
    applyTheme("dark");
  }, []);

  const navItems = [
    { id: "identity", label: "01 Covenant ID", icon: ShieldCheck },
    { id: "market", label: "02 Discovery", icon: Compass },
    { id: "ledger", label: "03 Ledger Pay", icon: Layers },
    { id: "audits", label: "04 Audit Logs", icon: CheckCircle2 },
  ] as const;

  return (
    <aside className="w-[260px] min-h-screen bg-void-surface border-r border-white/5 flex flex-col justify-between p-6 font-mono relative shrink-0">
      
      {/* 1. TOP BRANDING PANEL WITH COMPACT LOCKUP */}
      <div className="space-y-8">
        <div className="max-w-full overflow-hidden">
          {/* FIXED: Reduced scale size to 18 to ensure perfect fit inside 260px limits */}
          <BrandingLockup size={18} />
          
          {/* Dynamic heartbeat indicators depending on session authorized status */}
          {connectedWallet ? (
            <div className="flex items-center gap-1.5 mt-3 text-[9px] text-status-success font-black uppercase tracking-wider animate-[pulse_2s_infinite_ease-in-out]">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success status-active-pulse" />
              [ KEY_AUTHORIZED_OK: ! ]
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-3 text-[9px] text-status-alert font-black uppercase tracking-wider animate-[pulse_1.5s_infinite_ease-in-out]">
              <span className="w-1.5 h-1.5 rounded-full bg-status-alert status-active-pulse" />
              [ KEY_UNAUTHORIZED: ⚠️ ]
            </div>
          )}
        </div>

        {/* 2. HUD NAV LINKS */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded text-left text-xs font-bold uppercase transition-all duration-200 relative overflow-hidden group ${
                  isActive
                    ? "bg-void-elevated border-l-2 border-neon-primary text-white shadow-glow-glass"
                    : "text-gray-500 hover:text-neon-primary hover:bg-void-elevated/30"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? "text-neon-primary" : "text-gray-600"
                }`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. CORE BOTTOM CONTROLS PANEL */}
      <div className="space-y-6 pt-6 border-t border-white/5">
        
        {/* LIGHT / DARK / SYSTEM switcher panel */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block">
            Interface Theme
          </span>
          <div className="grid grid-cols-3 gap-1 bg-void-base border border-white/5 p-1 rounded-md">
            <button
              type="button"
              onClick={() => applyTheme("dark")}
              className={`py-1.5 rounded flex items-center justify-center transition-all ${
                theme === "dark" 
                  ? "bg-void-elevated text-neon-primary shadow-glow-glass" 
                  : "text-gray-600 hover:text-gray-400"
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyTheme("light")}
              className={`py-1.5 rounded flex items-center justify-center transition-all ${
                theme === "light" 
                  ? "bg-white text-void-base shadow-glow-glass" 
                  : "text-gray-600 hover:text-gray-400"
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyTheme("system")}
              className={`py-1.5 rounded flex items-center justify-center transition-all ${
                theme === "system" 
                  ? "bg-void-elevated text-neon-secondary shadow-glow-glass" 
                  : "text-gray-600 hover:text-gray-400"
              }`}
              title="System Default"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* WALLET WIDGET PANEL */}
        <div className="space-y-2">
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest block">
            Operator Keys
          </span>
          {connectedWallet ? (
            <div className="bg-void-elevated border border-white/5 p-3 rounded-md space-y-2.5">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-neon-secondary" /> Key_Active
                </span>
                <span className="text-neon-secondary font-black">
                  {connectedWallet.substring(0, 8)}...
                </span>
              </div>
              <button
                type="button"
                onClick={onDisconnect}
                className="w-full py-1.5 rounded border border-red-500/25 bg-red-950/10 text-[9px] font-bold text-red-400 hover:bg-red-950/20 transition-all duration-200"
              >
                UNAUTHORIZE_SESSION
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="w-full py-2 px-3 rounded border border-neon-primary/25 bg-neon-primary/5 text-[9px] font-bold uppercase tracking-wider text-neon-primary hover:bg-neon-primary/10 hover:shadow-glow-primary transition-all duration-300"
            >
              {isConnecting ? "AUTHORIZING..." : "AUTHORIZE_WALLET"}
            </button>
          )}
        </div>
      </div>
      
    </aside>
  );
}

export default Sidebar;