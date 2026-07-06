import React from "react";
import { Orbitron, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import MatrixOverlay from "@/components/MatrixOverlay";

// Initialize and bind standard Google Fonts for high-fidelity rendering
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html 
      lang="en" 
      className={`dark ${orbitron.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-void-base text-gray-300 min-h-screen flex flex-col font-sans selection:bg-neon-primary selection:text-void-base relative antialiased overflow-x-hidden">
        
        {/* CRT Scanline Phosphor Overlay */}
        <div className="crt-scanlines" />

        {/* Matrix Canvas Rain Streams */}
        <MatrixOverlay />

        {/* Unified Application Viewport Shell */}
        <div className="min-h-screen flex relative z-10">
          
          {/* Main Content Area Grid (Collapses sidebar on tiny viewports) */}
          <div className="flex-1 flex flex-col min-h-screen w-full relative">
            
            {/* Scrollable Viewport Canvas */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
              {children}
            </main>

            {/* Persistent Tactical Footer */}
            {/* FIXED: Removed raw underscores from footer labels */}
            <footer className="w-full border-t border-white/5 py-4 px-8 bg-void-base/80 backdrop-blur-md">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-gray-600 gap-2">
                <span>System Protocol: Covenant Core v1.1.0</span>
                <span>Anchored By: Casper Testnet</span>
                <span>Status: Operational Grid</span>
              </div>
            </footer>

          </div>

        </div>

      </body>
    </html>
  );
}