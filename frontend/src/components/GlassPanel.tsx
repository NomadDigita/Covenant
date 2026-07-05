"use client";

import React from "react";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  glowColor?: "primary" | "secondary" | "alert" | "none";
}

export function GlassPanel({
  children,
  className = "",
  interactive = false,
  glowColor = "none",
}: GlassPanelProps) {
  // Map glowing shadow presets based on props
  const glowStyles = {
    none: "shadow-glow-glass",
    primary: "shadow-glow-glass hover:shadow-glow-primary",
    secondary: "shadow-glow-glass hover:shadow-glow-secondary",
    alert: "shadow-glow-glass hover:shadow-glow-alert",
  };

  const baseClasses = `
    bg-void-surface/40 
    backdrop-blur-md 
    border border-white/10 
    rounded-xl 
    overflow-hidden 
    relative 
    transition-all 
    duration-300
    ${glowStyles[glowColor]}
  `;

  // Apply subtle interactive border changes and slight lift on hover if requested
  const interactiveClasses = interactive
    ? "hover:border-neon-secondary/40 hover:bg-void-surface/60 hover:-translate-y-0.5 cursor-pointer"
    : "";

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${className}`}>
      
      {/* Structural Glass Top Edge Shine */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Internal Content Area */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
      
    </div>
  );
}

export default GlassPanel;