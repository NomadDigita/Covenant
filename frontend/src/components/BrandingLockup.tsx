"use client";

import React from "react";

interface CasperEcosystemLogoProps {
  className?: string;
  size?: number; // Visual height of the logo (approx. 1.3x taller than logotype)
}

export function BrandingLockup({
  className = "",
  size = 32,
}: CasperEcosystemLogoProps) {
  // Proportions: typography height scales relative to the icon height
  const typoHeight = Math.round(size / 1.3);

  return (
    <div className={`flex items-center select-none ${className}`}>
      
      {/* 1. LEFT GRAPHIC ICON: Decentralized Red Node Cluster "C" */}
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
              0%, 100% {
                transform: translate(0, 0);
              }
              50% {
                transform: translate(-1.5px, -2.5px);
              }
            }
            @keyframes rotation-ring {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
        
        {/* EDGES (Lines): Perfectly terminate exactly at node centers */}
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

        {/* NODES (Circles): Hand-mapped (x,y) positions forming the dense left-spine */}
        <circle cx="60" cy="25" r="6" fill="#E3000F" /> {/* Top-center inner curve */}
        <circle cx="28" cy="60" r="6" fill="#E3000F" /> {/* Middle-left spine */}
        <circle cx="60" cy="75" r="6" fill="#E3000F" /> {/* Bottom-center inner curve */}

        {/* Medium Structural Nodes */}
        <circle cx="35" cy="30" r="4.5" fill="#E3000F" /> {/* Top-left outer curve */}
        <circle cx="25" cy="50" r="4.5" fill="#E3000F" /> {/* Left-most spine */}
        <circle cx="35" cy="70" r="4.5" fill="#E3000F" /> {/* Bottom-left outer curve */}

        {/* Small Helper Nodes & Peripheral Caps */}
        <circle cx="75" cy="28" r="3" fill="#E3000F" />  {/* Top peripheral cap */}
        <circle cx="75" cy="72" r="3" fill="#E3000F" />  {/* Bottom peripheral cap */}
        <circle cx="45" cy="45" r="3" fill="#E3000F" />  {/* Inner top helper */}
        <circle cx="45" cy="55" r="3" fill="#E3000F" />  {/* Inner bottom helper */}
      </svg>

      {/* 2. SPACING GAP */}
      <div style={{ width: `${Math.round(size * 0.35)}px` }} />

      {/* 3. TYPOGRAPHY: Capital C with lowercase 'asper' styled in geometric sans */}
      {/* FIXED: Removed duplicate style attribute. Merged all elements cleanly. */}
      <span
        className="font-bold tracking-tight text-white dark:text-white light:text-[#0B1B95] select-none transition-colors duration-300"
        style={{
          fontSize: `${typoHeight}px`,
          lineHeight: `${size}px`,
          animation: "color-shifter 5s infinite ease-in-out",
        } as React.CSSProperties}
      >
        Casper
      </span>
      
      {/* Global CSS Injector matching text color changes dynamically inside layouts */}
      <style jsx global>{`
        @keyframes color-shifter {
          0%, 100% { color: #FF5500; text-shadow: 0 0 10px rgba(255,85,0,0.3); }
          50% { color: #FFD700; text-shadow: 0 0 15px rgba(255,215,0,0.5); }
        }
      `}</style>

    </div>
  );
}

export default BrandingLockup;