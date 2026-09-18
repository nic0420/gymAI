import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          900: "#090d16",
          800: "#0f172a",
          700: "#1e293b",
          600: "#334155",
          brand: "#10b981",
          "brand-dark": "#059669",
          accent: "#38bdf8",
          warning: "#f59e0b",
          danger: "#ef4444",
          success: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
