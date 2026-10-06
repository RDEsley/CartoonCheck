import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/pwa',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'production-chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node tests/pwa/update-server.mjs',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
