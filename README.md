# Valiva

**Use the app: <https://antoniotroiano.github.io/valiva-app/>** (the interface is in German)

Valiva is a private planner for retirement and savings. It shows what you can expect in retirement, how big the gap to your wish income is, and which extra ETF rate would close it. It works for one person or a whole household.

> **Disclaimer:** This app gives no investment or tax advice. Projections are not a guarantee. Legal values may be marked `unverified`; check them against official sources before relying on them.

## What it can do

- **ETF savings plan:** projection with costs, taxes and inflation, in three scenarios (pessimistic, neutral, optimistic), plus the withdrawal phase in retirement
- **Statutory pension:** estimate from your pension statement, including early or late retirement, taxes and health and care insurance
- **Retirement depot (Altersvorsorgedepot) and company pension (bAV):** grants, costs, guarantees and payout
- **Other income in retirement:** existing Riester or private annuities, basic pension, civil service pension, rent
- **Savings goals:** how long it takes and how much to save per month, with interest tax
- **Overall view:** net income in retirement against your wish income, gap or surplus, and the extra ETF rate that closes the gap
- **Households:** several persons, survivor pensions and joint tax assessment for couples

Where a legal value is not confirmed, the app says so.

## Privacy

Everything runs in your browser. Your inputs are kept in the browser's local storage; nothing is sent to any server. Use the page "Daten" to export a backup file and to move your data to another computer. The file is not encrypted and holds personal financial data, so keep it safe.

- **Export:** "Daten exportieren" downloads a `valiva-YYYY-MM-DD.workspace.json` file with all persons and income sources
- **Import:** choose a file, check the preview, confirm. This replaces all current data; a backup of the current data is downloaded first
- **Backup hint:** clearing the browser data deletes your inputs. Export a file from time to time. The app shows when you last exported
- Example data (invented) can be loaded on the page "Daten" to try the app

## Known limitations

- Persons who already draw their pension are not supported yet; entering a retirement start in the past gives an error message instead of a result.
- Of the legal values, 5 are still marked `unverified` (church tax rates, base interest from 2027, child age limit of the retirement depot, Riester simplification); the app shows this wherever such a value is used. The review against the law texts is in `docs/legal-values-review.md`.

## License

MIT, see [`LICENSE`](LICENSE). Copyright (c) 2026 antoniotroiano.
