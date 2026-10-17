import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://sale.somonsavdo.com';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(process.env.LOCAL_DEV ? {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30000,
    },
  } : {}),
});
