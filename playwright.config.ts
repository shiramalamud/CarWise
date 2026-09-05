import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'

// This sandbox can't run `playwright install` to fetch a browser at test
// time, but a matching Chromium revision for this @playwright/test version
// is already cached locally — point launches at it explicitly. Override
// with PLAYWRIGHT_CHROME_PATH on a machine where a normal install works.
const cachedChromePath = 'C:\\Users\\User\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe'
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH || (fs.existsSync(cachedChromePath) ? cachedChromePath : undefined)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  // Each test signs up a fresh throwaway account against a single local dev
  // server (with on-demand route compilation) — running several at once was
  // enough contention to cause spurious timeouts. Run them one at a time.
  workers: 1,
  retries: 0,
  reporter: 'list',
  // These tests hit a real Supabase project and create real throwaway
  // accounts/cars — run against a `npm run dev` already running locally.
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
