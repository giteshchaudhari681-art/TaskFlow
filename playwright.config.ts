import { defineConfig, devices } from '@playwright/test';

/**
 * TaskFlow PR 18: Playwright End-to-End Testing Configuration
 *
 * Configures real browser automation testing against the TaskFlow frontend
 * (Vite + React) and primary application backend (Node.js + Express + PostgreSQL).
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const apiURL = process.env.E2E_API_URL || 'http://localhost:5000';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker avoids database collisions and race conditions
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }], ['list']],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      url: `${apiURL}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 60000,
    },
    {
      command: 'npm run dev:web',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      stderr: 'pipe',
      timeout: 60000,
    },
  ],
});
