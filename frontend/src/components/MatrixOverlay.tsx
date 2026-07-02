import React from "react";

export default function MatrixOverlay() {
  return (
    <div className="fixed inset-0 z-[-20] overflow-hidden pointer-events-none opacity-[0.03]">
      {/* CRT scanlines effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/20 to-transparent bg-[length:100%_4px]" />
      
      {/* Matrix falling code streams */}
      <div className="absolute inset-0 flex justify-between font-mono text-[8px] text-accent select-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex flex-col animate-[pulse_3s_infinite]" style={{ animationDelay: `${i * 150}ms` }}>
            <span>01011001</span>
            <span>CSPR</span>
            <span>TESTNET</span>
            <span>ACTIVE</span>
            <span>X402</span>
            <span>GEMINI</span>
            <span>00110101</span>
          </div>
        ))}
      </div>
    </div>
  );
}