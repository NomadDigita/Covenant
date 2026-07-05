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
        // The Void (Background Tones)
        void: {
          base: "#05050A",     // Pitch black with 2% blue tint
          surface: "#0D0D14",  // Base layer of glass panels
          elevated: "#151520", // Dropdowns, modals, hover states
        },
        // Neon Emitters (Accents & Brand)
        neon: {
          primary: "#FF5500",   // Covenant Orange
          secondary: "#00E5FF", // Cyber Cyan
          accent: "#B500FF",    // Plasma Purple
        },
        // Functional Indicators (Agent States)
        status: {
          idle: "#3A3A4A",       // Dim gray
          processing: "#F5A623", // Pulsing amber
          success: "#00FF66",    // Neon green (payment pass, KYC valid)
          alert: "#FF003C",      // Crimson red (anomaly alert, failed audit)
        }
      },
      boxShadow: {
        // Ambient Glow System
        "glow-primary": "0 0 20px rgba(255, 85, 0, 0.4)",
        "glow-secondary": "0 0 20px rgba(0, 229, 255, 0.4)",
        "glow-alert": "0 0 20px rgba(255, 0, 60, 0.6)",
        "glow-glass": "inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 8px 32px 0 rgba(0, 0, 0, 0.5)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      }
    },
  },
  plugins: [],
}