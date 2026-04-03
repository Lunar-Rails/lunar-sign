import path from 'path'
import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120_000,
  },
  globalSetup: path.join(__dirname, 'e2e/seed.ts'),
})
