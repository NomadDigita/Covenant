import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const CovenantLogo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="covenantGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Outer Shield Representation of Secure On-Chain Trust */}
        <path
          d="M50 12 L85 24 V55 C85 73.5 70 90 50 94 C30 90 15 73.5 15 55 V24 L50 12 Z"
          stroke="url(#covenantGlow)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(6, 182, 212, 0.03)"
        />

        {/* Inner Network Diamond Node */}
        <path
          d="M50 28 L72 50 L50 72 L28 50 Z"
          fill="none"
          stroke="url(#covenantGlow)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Center Glowing Core */}
        <circle
          cx="50"
          cy="50"
          r="9"
          fill="url(#covenantGlow)"
          className="animate-pulse"
        />

        {/* Interconnected Ledger Pins */}
        <circle cx="50" cy="28" r="3" fill="#06b6d4" />
        <circle cx="50" cy="72" r="3" fill="#6366f1" />
        <circle cx="28" cy="50" r="3" fill="#06b6d4" />
        <circle cx="72" cy="50" r="3" fill="#6366f1" />
      </svg>
      <span className="text-xl font-bold tracking-wider text-white">
        COVENANT<span className="text-accent">ID</span>
      </span>
    </div>
  );
};