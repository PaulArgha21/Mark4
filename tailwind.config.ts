import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          rose:           "var(--clay-rose)",
          "rose-light":   "var(--clay-rose-light)",
          "rose-dark":    "var(--clay-rose-dark)",
          blush:          "var(--clay-blush)",
          cream:          "var(--clay-cream)",
          butter:         "var(--clay-butter)",
          sage:           "var(--clay-sage)",
          sky:            "var(--clay-sky)",
          midnight:       "var(--clay-midnight)",
          bg: {
            base:         "var(--clay-bg-base)",
            surface:      "var(--clay-bg-surface)",
            elevated:     "var(--clay-bg-elevated)",
            sunken:       "var(--clay-bg-sunken)",
          },
          text: {
            DEFAULT:      "var(--clay-text)",
            secondary:    "var(--clay-text-secondary)",
            muted:        "var(--clay-text-muted)",
            "on-dark":    "var(--clay-text-on-dark)",
          },
          border: {
            DEFAULT:      "var(--clay-border)",
            light:        "var(--clay-border-light)",
          },
          divider:        "var(--clay-divider)",
          success:        "var(--clay-success)",
          error:          "var(--clay-error)",
          warning:        "var(--clay-warning)",
          info:           "var(--clay-info)",
        },
        portal: {
          bg:             "var(--portal-bg)",
          surface:        "var(--portal-surface)",
          elevated:       "var(--portal-elevated)",
          border:         "var(--portal-border)",
          text:           "var(--portal-text)",
          muted:          "var(--portal-muted)",
          accent:         "var(--portal-accent)",
        },
      },
      fontFamily: {
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        body:    ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        "clay-sm":   "var(--clay-radius-sm)",
        "clay-md":   "var(--clay-radius-md)",
        "clay-lg":   "var(--clay-radius-lg)",
        "clay-xl":   "var(--clay-radius-xl)",
        "clay-full": "var(--clay-radius-full)",
      },
      boxShadow: {
        "clay-sm":    "var(--clay-shadow-sm)",
        "clay-md":    "var(--clay-shadow-md)",
        "clay-lg":    "var(--clay-shadow-lg)",
        "clay-xl":    "var(--clay-shadow-xl)",
        "clay-inner": "var(--clay-shadow-inner)",
        "clay-glow":  "var(--clay-shadow-glow)",
      },
      animation: {
        shimmer:        "shimmer 2s infinite linear",
        float:          "float 3s ease-in-out infinite",
        "pulse-glow":   "pulse-glow 2s ease-in-out infinite",
        "slide-up-fade":"slide-up-fade 0.4s ease-out",
        "scale-in":     "scale-in 0.2s ease-out",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(214, 51, 108, 0)" },
          "50%":      { boxShadow: "0 0 20px 4px rgba(214, 51, 108, 0.15)" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
