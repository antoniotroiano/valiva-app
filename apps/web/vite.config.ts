import { readFileSync } from 'node:fs';
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

// The version comes from the root package.json (single source, see docs/releasing.md).
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

// Relative base: works under any sub path (GitHub Pages) because navigation uses the hash.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), contentSecurityPolicy()],
  server: { port: 5173 },
});
