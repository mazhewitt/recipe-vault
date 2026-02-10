import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ipad',
      use: { ...devices['iPad (gen 7) portrait'] },
    },
  ],

  webServer: {
    command: 'cd ../.. && cargo run --bin recipe-vault > /tmp/rv-server.log 2>&1',
    url: 'http://127.0.0.1:3001/static/app.js',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    ignoreHTTPSErrors: true,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      MOCK_LLM: 'true',
      DATABASE_URL: 'sqlite::memory:',
      ANTHROPIC_API_KEY: 'mock-key',
      DEV_USER_EMAIL: 'test@example.com',
      FAMILIES_CONFIG_PATH: 'tests/e2e/families.ci.yaml',
      BIND_ADDRESS: '127.0.0.1:3001',
      API_KEY: 'test-api-key-for-playwright',
      RUST_LOG: 'debug',
    },
  },
});
