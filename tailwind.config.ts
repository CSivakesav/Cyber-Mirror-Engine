import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        smansys: {
          bg: "#f3f5f9",
          card: "#ffffff",
          dark: "#111217",
          sidebar: "#0d0e12",
          text: "#1e293b",
          muted: "#64748b",
          border: "#e2e8f0",
          yellow: "#fef3c7",
          yellowDark: "#f59e0b",
          purple: "#ede9fe",
          purpleDark: "#6366f1",
          cyan: "#e0f2fe",
          cyanDark: "#0284c7",
          green: "#dcfce7",
          greenDark: "#10b981",
          pink: "#ffe4e6",
          pinkDark: "#f43f5e",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.04)",
        cardHover: "0 8px 24px rgba(0, 0, 0, 0.07)",
        dropdown: "0 10px 30px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Consolas", "Fira Code", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
