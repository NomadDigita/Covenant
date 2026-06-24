import React from "react";
import "./globals.css";
import { CovenantLogo } from "@/components/CovenantLogo";

export const metadata = {
  title: "Covenant ID | Trust Infrastructure for Autonomous AI Agents",
  description: "The decentralized identity, reputation, and credit score network for AI Agents on Casper.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-gray-100 min-h-screen flex flex-col selection:bg-accent selection:text-background">
        {/* Glowing Ambient Background Orbs for Liquid-Glass Feel */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigoAccent/5 blur-[150px]" />
        </div>

        {/* LOCKED TOP HEADER (Floating Glass Navigation) */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Coded Logo */}
            <CovenantLogo size={36} />

            {/* Network Badge and Mock Status */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-border/40 border border-border/60 text-xs font-semibold text-gray-300 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                Casper Testnet
              </div>
              <button className="relative group overflow-hidden px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-indigoAccent p-[1px] text-xs font-bold tracking-wide text-white transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <span className="absolute inset-0 bg-background/90 group-hover:bg-transparent transition-colors duration-300 rounded-[7px] -z-10" />
                Connect Wallet
              </button>
            </div>
          </div>
        </header>

        {/* Core Main Scroll Area */}
        <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="relative z-10 w-full border-t border-border/40 bg-background py-6 mt-12 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4">
            Covenant Protocol &copy; {new Date().getFullYear()} &bull; Trust Through Code &bull; Casper Buildathon
          </div>
        </footer>
      </body>
    </html>
  );
}