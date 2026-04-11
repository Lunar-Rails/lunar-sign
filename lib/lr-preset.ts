/**
 * LR Design System — Tailwind Preset
 *
 * Usage:
 *   1. Copy this file into your project (e.g. lib/lr-preset.ts)
 *   2. Import it in your tailwind.config.ts:
 *
 *      import lrPreset from "./lib/lr-preset"
 *      export default {
 *        presets: [lrPreset],
 *        content: ["./src/**\/*.{ts,tsx}"],
 *        darkMode: "class",
 *      } satisfies Config
 *
 *   3. Copy the globals.css block at the bottom of this file into
 *      your app/globals.css (or equivalent).
 *   4. Add `class="dark"` to your <html> element for dark mode (default).
 */

import type { Config } from "tailwindcss"

const lrPreset = {
  theme: {
    extend: {
      colors: {
        lr: {
          bg: "var(--lr-bg)",
          surface: "var(--lr-surface)",
          "surface-2": "var(--lr-surface-2)",
          glass: "var(--lr-glass)",
          "glass-2": "var(--lr-glass-2)",
          border: "var(--lr-border)",
          "border-2": "var(--lr-border-2)",
          text: "var(--lr-text)",
          "text-2": "var(--lr-text-2)",
          muted: "var(--lr-muted)",
          "muted-2": "var(--lr-muted-2)",
          dim: "var(--lr-dim)",
          accent: "var(--lr-accent)",
          "accent-hover": "var(--lr-accent-hover)",
          "accent-dim": "var(--lr-accent-dim)",
          "accent-glow": "var(--lr-accent-glow)",
          "accent-soft": "var(--lr-accent-soft)",
          gold: "var(--lr-gold)",
          "gold-dim": "var(--lr-gold-dim)",
          "gold-glow": "var(--lr-gold-glow)",
          cyan: "var(--lr-cyan)",
          "cyan-dim": "var(--lr-cyan-dim)",
          "cyan-glow": "var(--lr-cyan-glow)",
          error: "var(--lr-error)",
          "error-dim": "var(--lr-error-dim)",
          warning: "var(--lr-warning)",
          "warning-dim": "var(--lr-warning-dim)",
          success: "var(--lr-success)",
          "success-dim": "var(--lr-success-dim)",
        },
      },

      fontFamily: {
        display: ["Space Grotesk", "ui-monospace", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "lr-xs": ["0.6875rem", { lineHeight: "1.4" }],   // 11px — micro labels
        "lr-sm": ["0.8125rem", { lineHeight: "1.5" }],   // 13px — compact UI text
        "lr-base": ["0.875rem", { lineHeight: "1.6" }],   // 14px — body default
        "lr-lg": ["1rem", { lineHeight: "1.5" }],         // 16px — comfortable reading
        "lr-xl": ["1.25rem", { lineHeight: "1.4" }],      // 20px — section titles
        "lr-2xl": ["1.5rem", { lineHeight: "1.3" }],      // 24px — page titles
        "lr-3xl": ["2rem", { lineHeight: "1.2" }],        // 32px — hero headings
      },

      borderRadius: {
        lr: "10px",
        "lr-lg": "14px",
        "lr-xl": "18px",
      },

      boxShadow: {
        "lr-card": "0 4px 16px rgba(0, 0, 0, 0.25)",
        "lr-card-hover": "0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px var(--lr-accent-glow)",
        "lr-dropdown": "0 8px 24px rgba(0, 0, 0, 0.4)",
        "lr-modal": "0 16px 48px rgba(0, 0, 0, 0.5)",
        "lr-glow-accent": "0 0 20px var(--lr-accent-glow)",
        "lr-glow-gold": "0 0 20px var(--lr-gold-glow)",
        "lr-glow-cyan": "0 0 20px var(--lr-cyan-glow)",
        "lr-inset-accent": "inset 0 -2px 0 var(--lr-accent)",
      },

      backdropBlur: {
        "lr-header": "24px",
        "lr-card": "8px",
        "lr-modal": "12px",
      },

      transitionDuration: {
        "lr-fast": "150ms",
        "lr-base": "200ms",
        "lr-slow": "300ms",
      },

      transitionTimingFunction: {
        "lr-ease": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      screens: {
        "lr-xl": "980px",
        "lr-lg": "768px",
        "lr-md": "640px",
        "lr-sm": "480px",
      },

      keyframes: {
        "lr-pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "lr-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },

      animation: {
        "lr-pulse-glow": "lr-pulse-glow 3s ease-in-out infinite",
        "lr-shimmer": "lr-shimmer 2s linear infinite",
      },
    },
  },
} satisfies Partial<Config>

export default lrPreset
