import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Same define as apps/web/vite.config.ts, so web code that reads the app version also runs in unit tests.
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __IS_BETA__: false,
    __STORAGE_PREFIX__: JSON.stringify('valiva.'),
  },
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      'tools/test/**/*.test.ts',
    ],
  },
});
