import type { Config } from "tailwindcss"
import lrPreset from "./lib/lr-preset"

export default {
  presets: [lrPreset],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-space-grotesk)", "Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
} satisfies Config
