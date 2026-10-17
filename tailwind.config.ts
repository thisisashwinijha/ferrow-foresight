import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        line: "var(--line)",
        critical: "var(--critical)",
        high: "var(--high)",
        medium: "var(--medium)",
        ok: "var(--ok)",
        agent: "var(--agent)",
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
        condensed: ["var(--font-ibm-plex-sans-condensed)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        panel: "6px",
        btn: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
