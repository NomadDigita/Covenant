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
        background: "#030712", // Ultra-dark gray background
        card: "#0b0f19",       // Slate gray for cards
        border: "#1f2937",     // Cool gray boundaries
        accent: "#06b6d4",     // Electric Cyan (Covenant primary)
        indigoAccent: "#6366f1" // Deep Cobalt Violet (Agent swarm highlight)
      },
      boxShadow: {
        glow: "0 0 15px rgba(6, 182, 212, 0.15)",
        strongGlow: "0 0 25px rgba(6, 182, 212, 0.35)",
      }
    },
  },
  plugins: [],
}