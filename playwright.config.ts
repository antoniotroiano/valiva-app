import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Locally the installed Google Chrome is used to avoid a browser download.
  // Without Chrome (CI): `npx playwright install chromium` and `PW_CHANNEL=chromium`.
  use: { baseURL: 'http://localhost:5173', channel: process.env.PW_CHANNEL ?? 'chrome' },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  webServer: {
    command: 'npm run dev -w @pathwise/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
