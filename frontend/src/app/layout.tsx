import React from "react";
import "./globals.css";
import MatrixOverlay from "@/components/MatrixOverlay";

export const metadata = {
  title: "Covenant ID | Cybernetic Trust Infrastructure",
  description: "The decentralized identity, reputation, and credit score network for AI Agents on Casper.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-[#39ff14] min-h-screen flex flex-col selection:bg-accent selection:text-background">
        
        {/* CRT SCANLINES & MATRIX OVERLAY */}
        <div className="crt-scanlines" />
        <MatrixOverlay />

        {/* Core Main Scroll Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          {children}
        </main>

        {/* Global Monospace Footer */}
        <footer className="relative z-10 w-full border-t border-white/5 bg-background py-6 text-center text-[10px] font-mono text-gray-600">
          <div className="max-w-7xl mx-auto px-4">
            SYSTEM_PROTOCOL: COVENANT_CORE &bull; TRUST_THROUGH_CODE &bull; CASPER_BUILDATHON_2026
          </div>
        </footer>
      </body>
    </html>
  );
}