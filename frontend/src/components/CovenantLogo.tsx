import React from "react";

// Explicitly declare the accepted component props interface
interface CovenantLogoProps {
  className?: string;
  size?: number;
}

// Named Export: Satisfies { CovenantLogo } layout imports with dynamic size scales
export function CovenantLogo({ className = "", size = 32 }: CovenantLogoProps) {
  return (
    <svg 
      className={`${className} text-accent animate-pulse`} 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="50,5 95,30 95,80 50,95 5,80 5,30" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <polygon points="50,20 80,38 80,72 50,80 20,72 20,38" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="10" fill="currentColor" className="animate-ping opacity-75" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
    </svg>
  );
}

// Default Export: Satisfies default fallback imports
export default CovenantLogo;