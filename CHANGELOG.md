# Changelog

All notable changes to Valiva are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Versions below 1.0.0 are still in development: behaviour and the export file format may change. `1.0.0` will follow once the data format is declared stable and the open points listed under "Known limitations" are settled. The app version and the data format version (`schemaVersion` in the export file) are two separate numbers.

## [Unreleased]

## [0.2.0] - 2026-11-24

### Added

- Retiree mode: a person who already draws a pension switches it on in the profile ("Ich beziehe bereits Rente", with the start year from the pension notice) and enters actual values instead of a forecast: the gross statutory pension from the notice, a running company pension or a rest capital, a rest capital of the retirement depot, and an ETF holding with the sum paid in. The calculation runs from today. The taxable share follows the year the pension started (table of § 22 EStG up to 2025) and the tax-free part is fixed from the following year; childless people born before 1940 pay no care insurance surcharge.
- Household with one retired person: a tile "Heute schon in Rente", transition years until the other person retires (shown without a gap, because that person's salary is not modelled) and joint assessment from the year both pensions run.
- Valiva logo: shown next to the app name (sidebar and phone top bar) and as browser tab and home screen icon.
- Example data for a retired person and for a couple with one retired person; the assumptions page lists the new legal values (all confirmed) and a calculation-rules row "Personen in Rente".

### Changed

- The export file format is version 3 (new optional fields for the retiree mode). Files of versions 1 and 2 still load; an older app refuses a file of version 3 instead of misreading it.
- A retirement start in the past no longer ends in a dead-end message: it offers the retiree mode.

## [0.1.0] - 2026-11-24

First tagged version. Valiva is a retirement and savings planner that runs entirely in the browser (no account, no server, no tracking). The interface is in German and calculations follow German law.

### Added

- ETF savings plan with costs, taxes and inflation in three scenarios, withdrawal in retirement, and a reverse calculator for a target amount.
- Statutory pension estimate from the pension statement, with early or late retirement adjustments, income tax and health and long-term care insurance.
- Pension depot (Altersvorsorgedepot) with allowances, costs, guarantee and payout, and company pension (bAV) with employer subsidy and social contributions.
- Other income in retirement (existing Riester or private pensions, Basisrente, civil-service pension, rent).
- Savings goals for the short term, with interest tax and a calculator for the required monthly amount.
- Retirement plan overview: net income in retirement against the desired income, gap or surplus, and the extra ETF rate that closes the gap.
- Household with several persons, survivor pension, and optional joint tax assessment for couples.
- Data page: export and import as a file, example households with invented data, reset.
- Assumptions page that shows every legal value with source and status (confirmed or unverified).
- Light and dark theme, keyboard operation, layout for small screens.

### Known limitations

- Retiree mode: disability pensions, a widow's pension already drawn (enter it as other income), the age-related relief allowance, voluntarily or privately insured people with their own contribution model and the pension adjustment on 1 July are not modelled.
- Five legal values are still `unverified` and marked as such everywhere in the app: church tax rates (8 % and 9 %), base interest rate from 2027, age limit of the child allowance in the pension depot, and the simplification that Riester pensions are fully taxable. See `docs/legal-values-review.md`.
- The salary of a person who still works is not modelled. In a couple with one retired person, the years until the other person retires are shown without a gap.
- Taxes and social contributions are simplified. The assumptions are listed on the assumptions page and in `docs/assumptions.md`. Results are forecasts, not guarantees, and not tax or investment advice.
- The export file is not encrypted. Data lives in the browser's local storage and is lost if the browser data is deleted.
- German interface only.

[Unreleased]: https://github.com/antoniotroiano/valiva-app/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/antoniotroiano/valiva-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/antoniotroiano/valiva-app/releases/tag/v0.1.0
