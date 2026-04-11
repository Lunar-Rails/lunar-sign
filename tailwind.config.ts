import type { Config } from "tailwindcss"
import lrPreset from "./lib/lr-preset"

export default {
  presets: [lrPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
} satisfies Config
