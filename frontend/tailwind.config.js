/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020205", // Pure Pitch Black (cyberBlack)
        card: "#05050c",       // Dark Tactical Terminal (cyberCard)
        border: "#111827",     // Deep Slate Border (cyberBorder)
        accent: "#39ff14",     // Electric Cyber Green (neonGreen)
        indigoAccent: "#00f0ff" // Electric Cyber Cyan (neonCyan)
      },
      boxShadow: {
        glow: "0 0 15px rgba(57, 255, 20, 0.15)",
        strongGlow: "0 0 25px rgba(57, 255, 20, 0.35)",
        cyanGlow: "0 0 15px rgba(0, 240, 255, 0.15)",
        strongCyanGlow: "0 0 25px rgba(0, 240, 255, 0.35)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
}