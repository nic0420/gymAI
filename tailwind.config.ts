import type { Config } from "tailwindcss";

/**
 * SpotterApp — Sistema de diseño "Industrial oscuro"
 *
 * - graphite: neutro con tinte cálido (acero/hormigón), no gris puro.
 * - volt: acento amarillo ácido (señalización industrial). Texto encima SIEMPRE ink (graphite-950).
 * - Semáforo de acceso: signal-go (verde), signal-warn (ámbar), signal-stop (rojo) — se
 *   mantienen como colores funcionales separados del acento de marca.
 *
 * Las escalas zinc/slate se redirigen a graphite y blue/indigo/sky/cyan/teal a volt para que
 * toda la app herede la identidad sin reescribir cada className.
 */
const graphite = {
  50: "#f6f6f1",
  100: "#ebebe4",
  200: "#d6d6cc",
  300: "#b8b8ac",
  400: "#929287",
  500: "#6f6f65",
  600: "#50504a",
  700: "#393934",
  800: "#272723",
  850: "#1f1f1c",
  900: "#181816",
  950: "#0e0e0c",
};

const volt = {
  50: "#fbffe0",
  100: "#f6ffc2",
  200: "#f0ff8f",
  300: "#ecff64",
  400: "#e8ff3a",
  500: "#d6f00f",
  600: "#b3c900",
  700: "#869700",
  800: "#5f6b00",
  900: "#3d4500",
  950: "#232800",
};

const signalGo = {
  50: "#ecfdf3",
  100: "#d1fae1",
  200: "#a6f4c6",
  300: "#6ee7a4",
  400: "#3bd67f",
  500: "#1fbf66",
  600: "#149a52",
  700: "#137a44",
  800: "#135f38",
  900: "#114e30",
  950: "#052b18",
};

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
        graphite,
        volt,
        ink: graphite[950],
        // Remapeo global de la paleta heredada
        zinc: graphite,
        slate: graphite,
        blue: volt,
        indigo: volt,
        sky: volt,
        cyan: volt,
        teal: volt,
        emerald: signalGo,
        brand: volt,
        gym: {
          950: graphite[950],
          900: graphite[900],
          800: graphite[800],
          700: graphite[700],
          brand: volt[400],
          "brand-dark": volt[600],
          accent: volt[400],
          warning: "#f5a524",
          danger: "#f2555a",
          success: signalGo[400],
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        // Radios más secos, de chapa y no de burbuja
        lg: "0.3125rem",
        xl: "0.375rem",
        "2xl": "0.5rem",
        "3xl": "0.625rem",
      },
      letterSpacing: {
        tightest: "-0.03em",
        industrial: "0.14em",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "rise-in": "riseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
