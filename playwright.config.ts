import { defineConfig } from '@playwright/test';

// Own port for this project: 5173 is the Vite default and often taken by another project's dev server.
// `reuseExistingServer: false` plus `--strictPort` makes a clash fail loudly instead of testing a foreign app.
const port = Number(process.env.PW_PORT ?? 5273);
const baseURL = `http://localhost:${port}`;

// `PW_MODE=build` tests the production build (default in CI), `PW_MODE=dev` the Vite dev server (default
// locally). The two differ: StrictMode runs effects twice in dev, a cold dev server re-optimizes
// dependencies and reloads the page mid-test. Run `PW_MODE=build npm run e2e` before a release.
const mode = process.env.PW_MODE ?? (process.env.CI ? 'build' : 'dev');

export default defineConfig({
  testDir: 'e2e',
  // Locally the installed Google Chrome is used to avoid a browser download.
  // Without Chrome (CI): `npx playwright install chromium` and `PW_CHANNEL=chromium`.
  use: { baseURL },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  projects: [
    { name: 'chrome', use: { channel: process.env.PW_CHANNEL ?? 'chrome' } },
    // Cross-browser smoke (`PW_CROSS=1`): only `crossbrowser.spec.ts`, in the engines of Safari and Firefox.
    // Needs `npx playwright install webkit firefox` (about 200 MB, once).
    ...(process.env.PW_CROSS
      ? (['webkit', 'firefox'] as const).map((browserName) => ({
          name: browserName,
          testMatch: /crossbrowser\.spec\.ts/,
          use: { browserName },
        }))
      : []),
  ],
  webServer: {
    command:
      mode === 'build'
        ? `npm run build && npm run preview -w @valiva/web -- --port ${port} --strictPort`
        : `npm run dev -w @valiva/web -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
