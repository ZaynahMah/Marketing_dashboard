import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm-neutral "paper" surfaces — barely off-white, never sterile.
        paper: "#FAF9F6",
        surface: "#FFFFFF",
        veil: "#F3F1EC",
        // Ink — a warm near-black for the maison register.
        ink: "#1A1917",
        graphite: "#4A4843",
        slate: "#6E6B64",
        mist: "#9C988E",
        line: "#E7E4DC",
        hairline: "#EFEDE7",
        // A single restrained accent: deep oxblood/claret. Editorial, not terracotta.
        claret: "#6B2333",
        claretSoft: "#8A3247",
        // Data semantics — muted, never neon.
        positive: "#3F6B4C",
        negative: "#9B4232",
        neutral: "#8A867C",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        eyebrow: ["11px", { lineHeight: "1.2", letterSpacing: "0.14em" }],
      },
      borderRadius: { card: "10px" },
      boxShadow: {
        card: "0 1px 2px rgba(26,25,23,0.04), 0 1px 1px rgba(26,25,23,0.03)",
        lift: "0 4px 16px rgba(26,25,23,0.06)",
      },
      maxWidth: { shell: "1240px" },
    },
  },
  plugins: [],
};
export default config;
