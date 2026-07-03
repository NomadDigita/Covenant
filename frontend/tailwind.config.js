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
        background: "#020204", // Deep Obsidian Black
        cyberCard: "#05050c",  // Dark HUD Card
        accent: "#ff7a00",     // HACKNITE Orange (Primary CTA)
        cyberGreen: "#39ff14", // Electric Green (Reputation)
        cyberCyan: "#00f0ff",  // Electric Cyan (Credit)
        cyberViolet: "#7c3aed" // Cosmic Purple (Glow / Ambient)
      },
      boxShadow: {
        glow: "0 0 15px rgba(255, 122, 0, 0.15)",
        strongGlow: "0 0 25px rgba(255, 122, 0, 0.35)",
        greenGlow: "0 0 15px rgba(57, 255, 20, 0.15)",
        cyanGlow: "0 0 15px rgba(0, 240, 255, 0.15)",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      }
    },
  },
  plugins: [],
}