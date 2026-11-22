import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Locally the installed Google Chrome is used to avoid a browser download.
  // Without Chrome (CI): `npx playwright install chromium` and `PW_CHANNEL=chromium`.
  use: { baseURL: 'http://localhost:5173', channel: process.env.PW_CHANNEL ?? 'chrome' },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  webServer: {
    // CI tests the production build: a cold Vite dev server re-optimizes dependencies and reloads
    // the page after it has rendered, which drops the keyboard focus in the middle of a test.
    command: process.env.CI
      ? 'npm run build && npm run preview -w @valiva/web -- --port 5173 --strictPort'
      : 'npm run dev -w @valiva/web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
