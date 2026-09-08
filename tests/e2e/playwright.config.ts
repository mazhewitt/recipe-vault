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
      // iPad (gen 7) portrait: 810x1080, inside the app's tablet band (601-1024px).
      // viewport/isMobile/hasTouch are pinned rather than left to the descriptor
      // alone: a renamed or removed device name spreads to nothing and silently
      // drops this project back to the 1280x720 default, which is what
      // .scratch/archive/e2e-ipad-project-not-tablet reports. viewport-contract.spec.ts
      // fails loudly if that ever happens again.
      // Deliberately run in Chromium: `make e2e-setup` and CI install chromium
      // only, so the WebKit descriptor this project used to carry could not run
      // here. Safari-specific rendering is not covered by this suite.
      name: 'ipad',
      use: {
        ...devices['iPad (gen 7)'],
        viewport: { width: 810, height: 1080 },
        isMobile: true,
        hasTouch: true,
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
      },
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
