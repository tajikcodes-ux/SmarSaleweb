import { defineConfig, devices } from '@playwright/test';
import { WEB_URL } from './e2e/env';

/**
 * Browser and API tests against a local or CI stack (backend on :4000, web on :3000) with the e2e
 * company recreated by global-setup. Never point it at production: the tests change data.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'business', testMatch: /business\.spec\.ts/ },
    { name: 'web', testMatch: /web\.spec\.ts/, use: { ...devices['Desktop Chrome'] }, dependencies: ['business'] },
  ],
});
