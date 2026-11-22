# Valiva

Private planner for retirement and savings: ETF savings plans, statutory pension, company pension (bAV), retirement depot (Altersvorsorgedepot from 2027) and short-term savings goals, for one person or a household. It shows what you can expect in retirement, how big the gap to your wish income is, and which extra ETF rate would close it.

> **Disclaimer:** This app gives no investment or tax advice. Projections are not a guarantee. Legal values in `config/` may be marked `unverified`; check them against official sources before relying on them.

## Privacy

Everything runs in your browser. Your inputs are kept in `localStorage`; nothing is sent to any server. Use the page "Daten" to export a backup file and to move your data to another computer. The file is not encrypted and holds personal financial data, so keep it safe.

## Start

```bash
npm install
npm run dev
```

Open http://localhost:5173. The UI is in German. To try the app, open "Daten" and load one of the example workspaces (invented data).

## Export, import and backup

- **Export:** page "Daten" → "Daten exportieren" downloads `valiva-YYYY-MM-DD.workspace.json` with all persons and blocks
- **Import:** choose a file, check the preview, confirm. This replaces all current data; a backup of the current data is downloaded first
- **Backup hint:** clearing the browser data deletes your inputs. Export a file from time to time. The app shows when you last exported
- Never commit your own `*.workspace.json` files; they are git-ignored except `examples/`

Format and validation rules are in [`docs/assumptions.md`](docs/assumptions.md).

## Commands

| Command                                                       | Purpose                                          |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `npm run dev`                                                 | Start the web app                                |
| `npm run build`                                               | Typecheck and build the web app                  |
| `npm test`                                                    | Unit, property and golden-vector tests (Vitest)  |
| `npm run e2e`                                                 | Playwright smoke tests (local Chrome, see below) |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | Static checks                                    |

Playwright uses the locally installed Google Chrome. Without Chrome (for example in CI) run `npx playwright install chromium` and set `PW_CHANNEL=chromium`.

## Structure

- `packages/core` – pure calculation functions (no UI, DB or HTTP), including the workspace file format; folder map and data flow in `docs/architecture.md`
- `apps/web` – React + Vite UI; all UI texts in `apps/web/src/i18n/de/` (one file per page, `index.ts` assembles `de`)
- `config/` – legal parameters with `value`, `validFrom`, `validTo`, `source`, `status`
- `examples/` – invented example workspaces
- `docs/` – assumptions, glossary (German → English), visual design (`design.md`), HTML mockups
- `tools/generate_golden.py` – generates golden vectors and `golden-check.xlsx`
- `concept/` – concept and progress (`PROGRESS.md`)

## Assumptions

The calculation rules by feature (ETF plan, savings goals, statutory pension, retirement depot, bAV, overall view, household, workspace file) are in [`docs/assumptions.md`](docs/assumptions.md). All sample data is invented.

## License

See [`LICENSE`](LICENSE). The copyright holder is still to be filled in by the author.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).
