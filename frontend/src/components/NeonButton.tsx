"use client";

import React from "react";

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  variant?: "primary" | "ghost";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function NeonButton({
  children,
  onClick,
  className = "",
  variant = "primary",
  type = "button",
  disabled = false,
}: NeonButtonProps) {
  
  // Style configurations mapping exactly to V2 Spec Section 3B
  const styles = {
    primary: `
      bg-neon-primary 
      text-white 
      font-display 
      text-sm 
      uppercase 
      tracking-[0.1em] 
      py-2.5 
      px-5 
      rounded-md 
      hover:shadow-glow-primary 
      hover:-translate-y-0.5 
      active:translate-y-0 
      transition-all 
      duration-250
    `,
    ghost: `
      bg-transparent 
      border border-neon-secondary 
      text-neon-secondary 
      font-mono 
      text-xs 
      tracking-tight 
      py-2 
      px-4 
      rounded-md 
      hover:bg-neon-secondary/10 
      transition-all 
      duration-200
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        focus:outline-none 
        focus:ring-1 
        focus:ring-neon-secondary/50 
        disabled:opacity-40 
        disabled:pointer-events-none 
        ${styles[variant]} 
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default NeonButton;