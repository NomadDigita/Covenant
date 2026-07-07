"use client";

import React from "react";

interface BrandingLockupProps {
  className?: string;
  size?: number; // Height scale of the icons
  hideText?: boolean;
}

export function BrandingLockup({
  className = "",
  size = 32,
  hideText = false,
}: BrandingLockupProps) {
  // FIXED: Scaled down typography height to keep the lockup compact and prevent overlaps
  const typoHeight = Math.round(size / 1.5);

  return (
    // FIXED: Reduced horizontal gap from gap-6 to gap-3 for mobile viewport stability
    <div className={`flex items-center gap-3 font-display select-none ${className}`}>
      
      {/* ─── 1. COVENANT GOLD SHIELD (Gold Outer Shield & Floating Mini-Shields) ─── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <style>
            {`
              @keyframes float-shield {
                0%, 100% { transform: translateY(0px) scale(0.85); opacity: 0.3; }
                50% { transform: translateY(-5px) scale(1.15); opacity: 1; }
              }
              @keyframes rotate-ring {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              .float-s1 { animation: float-shield 3s infinite ease-in-out; transform-origin: 20px 20px; }
              .float-s2 { animation: float-shield 4s infinite ease-in-out; transform-origin: 80px 80px; }
              .spin-ring { animation: rotate-ring 25s infinite linear; transform-origin: 50px 50px; }
            `}
          </style>

          {/* Golden Outer Hexagonal Shield */}
          <polygon
            points="50,4 92,25 92,75 50,96 8,75 8,25"
            stroke="#FFD700"
            strokeWidth="5.5"
            strokeLinejoin="round"
          />

          {/* Concentric Rotating Dash Ring */}
          <polygon
            points="50,15 84,33 84,67 50,85 16,67 16,33"
            stroke="#FFD700"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            className="spin-ring"
          />

          {/* Floating Gold Mini Shields */}
          <polygon points="20,15 25,18 25,23 20,26 15,23 15,18" fill="#FFD700" className="float-s1" />
          <polygon points="80,75 85,78 85,83 80,86 75,83 75,78" fill="#FFD700" className="float-s2" />

          {/* Central Pulsing Trust Orb */}
          <circle cx="50" cy="50" r="11" fill="rgba(255, 215, 0, 0.15)" stroke="#FFD700" strokeWidth="2" />
          <circle cx="50" cy="50" r="6" fill="#FF5500" className="animate-pulse" />
        </svg>

        {!hideText && (
          <span
            className="font-bold tracking-tight text-white uppercase"
            style={{
              fontSize: `${typoHeight}px`,
              lineHeight: `${size}px`,
              animation: "covenant-color-shifter 5s infinite ease-in-out",
            } as React.CSSProperties}
          >
            Covenant
          </span>
        )}
      </div>

      {/* Spacing Bridge */}
      <span className="text-gray-800 hidden sm:inline shrink-0">|</span>

      {/* ─── 2. CASPER RED NODE CLUSTER (With Twinkling Gold Stars) ─── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <style>
            {`
              @keyframes twinkle-star {
                0%, 100% { opacity: 0.15; transform: scale(0.4); }
                50% { opacity: 1; transform: scale(1.15); }
              }
              .star-1 { animation: twinkle-star 2.5s infinite ease-in-out; transform-origin: 45px 45px; }
              .star-2 { animation: twinkle-star 3.2s infinite ease-in-out; transform-origin: 75px 28px; }
            `}
          </style>

          {/* Connective Edges (Red Lines) */}
          <line x1="60" y1="25" x2="35" y2="30" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="60" y1="25" x2="75" y2="28" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="60" y1="25" x2="45" y2="45" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="35" y1="30" x2="25" y2="50" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="35" y1="30" x2="45" y2="45" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="25" y1="50" x2="28" y2="60" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="25" y1="50" x2="45" y2="45" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="25" y1="50" x2="45" y2="55" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="28" y1="60" x2="35" y2="70" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="28" y1="60" x2="45" y2="55" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="35" y1="70" x2="60" y2="75" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="35" y1="70" x2="45" y2="55" stroke="#E3000F" strokeWidth="2.5" />
          <line x1="60" y1="75" x2="75" y2="72" stroke="#E3000F" strokeWidth="2.5" />

          {/* Red Node Clusters */}
          <circle cx="60" cy="25" r="6" fill="#E3000F" />
          <circle cx="28" cy="60" r="6" fill="#E3000F" />
          <circle cx="60" cy="75" r="6" fill="#E3000F" />
          <circle cx="35" cy="30" r="4.5" fill="#E3000F" />
          <circle cx="25" cy="50" r="4.5" fill="#E3000F" />
          <circle cx="35" cy="70" r="4.5" fill="#E3000F" />
          <circle cx="75" cy="72" r="3" fill="#E3000F" />
          <circle cx="45" cy="55" r="3" fill="#E3000F" />

          {/* Twinkling Golden Star Sparks (Adjacent to node paths) */}
          <path d="M45,41 L46,44 L49,45 L46,46 L45,49 L44,46 L41,45 L44,44 Z" fill="#FFD700" className="star-1" />
          <path d="M75,24 L76,27 L79,28 L76,29 L75,32 L74,29 L71,28 L74,27 Z" fill="#FFD700" className="star-2" />
        </svg>

        {!hideText && (
          <span
            className="font-bold tracking-tight text-white dark:text-white light:text-[#0B1B95]"
            style={{
              fontSize: `${typoHeight}px`,
              lineHeight: `${size}px`,
              animation: "casper-color-shifter 5s infinite ease-in-out",
            } as React.CSSProperties}
          >
            Casper
          </span>
        )}
      </div>

      {/* Global CSS Keyframe Injector for BOTH logo text shifts */}
      <style jsx global>{`
        @keyframes covenant-color-shifter {
          0%, 100% { color: #FF5500; text-shadow: 0 0 10px rgba(255,85,0,0.3); }
          50% { color: #FFD700; text-shadow: 0 0 15px rgba(255,215,0,0.5); }
        }
        /* FIXED: Added matching color shifting animations to Casper */
        @keyframes casper-color-shifter {
          0%, 100% { color: #FFFFFF; text-shadow: 0 0 10px rgba(255,255,255,0.2); }
          50% { color: #E3000F; text-shadow: 0 0 15px rgba(227,0,15,0.5); }
        }
      `}</style>

    </div>
  );
}

export default BrandingLockup;