import { readFileSync } from 'node:fs';
import { env } from 'node:process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// The dev server needs inline scripts (React refresh), so the policy is added to production builds only.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    },
  ],
});

// Beta build only: title and robots meta, so the beta page is recognisable and not indexed.
const betaHtml = (): Plugin => ({
  name: 'beta-html',
  transformIndexHtml: (html) => ({
    html: html.replace('<title>Valiva</title>', '<title>Valiva Beta</title>'),
    tags: [
      { tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' },
    ],
  }),
});

// The version comes from the root package.json (single source, see docs/releasing.md).
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

// Build channel: `VALIVA_CHANNEL=beta npm run build` makes the beta build (own storage prefix, "Beta" in the
// title, hidden from search engines). Everything else is the release build.
const beta = env.VALIVA_CHANNEL === 'beta';

// Relative base: works under any sub path (GitHub Pages) because navigation uses the hash.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __IS_BETA__: JSON.stringify(beta),
    __STORAGE_PREFIX__: JSON.stringify(beta ? 'valiva-beta.' : 'valiva.'),
  },
  plugins: [react(), contentSecurityPolicy(), ...(beta ? [betaHtml()] : [])],
  server: { port: 5173 },
});
