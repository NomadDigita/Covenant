"use client";

import React, { useEffect, useRef } from "react";

export function MatrixOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard high-performance viewport resizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Cryptographic and system thematic streams character set
    const chars = "01CSPRCOVENANTX402GEMINIAZ";
    const charArray = chars.split("");

    const fontSize = 10;
    const columns = Math.floor(canvas.width / fontSize) + 1;
    const drops: number[] = Array(columns).fill(1);

    let animationId: number;

    // Draw frame updates loop
    const draw = () => {
      // Fade out preceding characters gradually to create trail effect
      ctx.fillStyle = "rgba(5, 5, 10, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // System Cyber Cyan theme color
      ctx.fillStyle = "rgba(0, 229, 255, 0.35)";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Randomly select target character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillText(char, x, y);

        // Reset drop loop back to top once boundary is crossed or via random decay
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
      animationId = requestAnimationFrame(draw);
    };

    // Begin render loops
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-10] w-full h-full pointer-events-none opacity-[0.025]"
    />
  );
}

export default MatrixOverlay;