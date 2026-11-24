# Testing

```bash
npm run typecheck && npm run lint && npm run format:check && npm test   # fast checks
npm run e2e                                                             # Playwright smoke tests
```

- **Release check:** `npm run check:release` (also in CI) verifies that the root `package.json` version is a plain `x.y.z`, that `CHANGELOG.md` has an `Unreleased` section and a non-empty section for that version, and that no changelog section is newer than the version. Its unit tests are in `tools/test/`. See `releasing.md`.

## End-to-end tests (Playwright)

- **Port:** `playwright.config.ts` starts its own server on port **5273** (override with `PW_PORT`). It never reuses a running server and uses `--strictPort`, so a clash with another project's dev server (5173 is the Vite default) fails loudly instead of testing a foreign app.
- **Dev or build:** `PW_MODE=dev` (default locally) runs the Vite dev server, `PW_MODE=build` (default in CI) builds the app and tests `vite preview`. The two behave differently (StrictMode runs effects twice in dev; a cold dev server may reload the page mid-test), so run `PW_MODE=build npm run e2e` before a release.
- **Browser:** locally the installed Google Chrome is used. Without Chrome (CI): `npx playwright install chromium` and `PW_CHANNEL=chromium`.
- **Output:** Playwright deletes `test-results/` on every run, also for single tests. Keep screenshots you want to look at in `playwright-report/`.
- **Height guards** in `e2e/overview.spec.ts` have more room than local measurements because Linux fonts in CI render taller.

## Cross-browser smoke (WebKit and Firefox)

`PW_CROSS=1 npm run e2e` additionally runs `e2e/crossbrowser.spec.ts` in WebKit (engine of Safari) and Firefox: Rentenplan, Daten and Annahmen render without console errors, no horizontal overflow at 375 px, `light-dark()` tokens resolve per colour scheme, inputs survive a reload, export downloads a file. Needs `npx playwright install webkit firefox` once (about 200 MB, cached in `~/Library/Caches/ms-playwright/`). CI does not run it (it installs Chromium only); first checked on 2026-11-23: all pass in dev and in the production build.

Not covered by Playwright: Safari clears `localStorage` of a site that was not visited for a while (the app reminds the user to export, see `state/exportReminder.ts`) and installed-app behaviour.

## Print view (checked 2026-11-23, Chrome PDF output, Rentenplan, Haushalt, Annahmen)

Result: light and dark (system or manual switch) print the same; the print block sets every token to light. Unverified values and their status badges are visible in print. Findings, not fixed (listed in the backlog of `concept/14-review-report-2026-11-22.md`):

- Annahmen prints 18 pages (all rows open); Rentenplan 4 pages, Haushalt 3 pages.
- The heading that holds the focus after a page change keeps its focus ring in print.
- An empty bordered card stays under the hero figure (the scenario switch is hidden in print, its card is not).
- Without "background graphics" (the Chrome default in the print dialog) the progress bar of the hero card is invisible.
- A chart row may break across pages; the last page of Haushalt holds only the disclaimer line.
- The "next step" card is printed.
