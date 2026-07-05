"use client";

import React from "react";

interface CovenantLogoProps {
  className?: string;
  size?: number;
}

export function CovenantLogo({ className = "", size = 32 }: CovenantLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-all duration-300 hover:scale-105`}
    >
      {/* 1. OUTER SEGMENTED SECURE HEXAGONAL SHIELD (Covenant Trust Shield) */}
      <polygon
        points="50,4 92,25 92,75 50,96 8,75 8,25"
        stroke="#FF5500"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-95"
      />
      
      {/* 2. INNER CONCENTRIC RUNTIME WIREFRAME */}
      <polygon
        points="50,15 84,33 84,67 50,85 16,67 16,33"
        stroke="#FF5500"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        strokeLinejoin="round"
        className="opacity-40 animate-[spin_20s_infinite_linear]"
        style={{ transformOrigin: "50px 50px" }}
      />

      {/* 3. CENTRAL ANCHORED LEDGER KEYS */}
      {/* Top and side nodes of the core diamond key */}
      <line x1="50" y1="20" x2="50" y2="80" stroke="#FF5500" strokeWidth="2" strokeDasharray="3 3" />
      <line x1="20" y1="50" x2="80" y2="50" stroke="#FF5500" strokeWidth="2" strokeDasharray="4 4" />

      {/* 4. SOLID CRYPTOGRAPHIC NODES (Casper Topology Depiction) */}
      <circle cx="50" cy="20" r="4.5" fill="#FF5500" stroke="#05050A" strokeWidth="1" />
      <circle cx="80" cy="38" r="3.5" fill="#FF5500" stroke="#05050A" strokeWidth="1" />
      <circle cx="80" cy="62" r="3.5" fill="#FF5500" stroke="#05050A" strokeWidth="1" />
      <circle cx="50" cy="80" r="4.5" fill="#FF5500" stroke="#05050A" strokeWidth="1" />
      <circle cx="20" cy="62" r="3.5" fill="#FF5500" stroke="#05050A" strokeWidth="1" />
      <circle cx="20" cy="38" r="3.5" fill="#FF5500" stroke="#05050A" strokeWidth="1" />

      {/* 5. THE TRUST CORE ORB (Focal center) */}
      <circle
        cx="50"
        cy="50"
        r="11"
        fill="rgba(255, 85, 0, 0.15)"
        stroke="#FF5500"
        strokeWidth="2"
      />
      <circle
        cx="50"
        cy="50"
        r="6"
        fill="#FF5500"
        className="animate-pulse"
      />
    </svg>
  );
}

export default CovenantLogo;