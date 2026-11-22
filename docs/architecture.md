# Architecture

One page: where things live, which way dependencies point, and how data flows. The calculation core has no UI, DB or HTTP dependency; everything it needs comes in as arguments.

## Folder map

```text
config/                      legal values (value, validFrom, validTo, source, status), never in code
examples/                    invented example workspaces
tools/generate_golden.py     independent calculation, writes the golden vectors
packages/core/src/           pure, deterministic functions; errors are returned as data
  shared/                    types, months, issues (IssueCollector), profile (person data, assumptions)
  tax/                       taxConfig, legalConfig (config types), tax, incomeTax, retirementTax
  etf/                       etf, advanceLumpSum, calculate, validation (ETF savings plan)
  goals/                     goal, goalTypes, goalValidation, etfTarget, solver (savings goals, reverse calculators)
  pension/                   statutory, depot, occupational, netPension, payout, projection, allowance, etfProjector
  household/                 household, householdMigration
  overview/                  overview, householdOverview, gapSolver, householdGapSolver
  workspace/                 blocks, workspace (file format: build, parse, apply)
  index.ts                   the only public interface (`@valiva/core`)
packages/core/test/          mirrors src/ per folder; fixtures.ts, pensionFixtures.ts and golden-vectors/ are shared
apps/web/                    React + Vite UI, imports only from `@valiva/core`; UI texts in src/i18n/de.ts
e2e/                         Playwright smoke, phone layout, navigation and accessibility tests
```

## Direction of dependencies

Imports inside the core only point downwards:

```text
shared  ←  tax  ←  etf  ←  goals
                      ←  pension
shared  ←  household
                         overview  →  pension, goals, tax, household
                         workspace →  pension, goals, household   (top of the stack)
```

- `shared` imports nothing from the other folders.
- `tax` imports `shared`; `etf` imports `shared` and `tax`; `goals` and `pension` import `etf`, `tax` and `shared`.
- `household` imports only `shared`.
- `overview` combines pension blocks, goals and households; `workspace` sits on top and bundles all blocks into one file.
- Nothing imports from `overview` or `workspace`, except `index.ts`. `apps/web` never reaches into a core folder, only into `@valiva/core`, so folders can move without touching the web code.

## Data flow

```text
localStorage  →  storage hooks (apps/web/src/use*.ts, workspaceStore.ts)
                   ↓ parse + validate (core: parse*, validate*)
              state per person and household (React)
                   ↓ pure calls, legal values from config/ via apps/web/src/legalConfig.ts and taxConfig.ts
              core calculations (etf, pension, goals, overview)
                   ↓ results and issues as data
              pages and charts (apps/web/src/pages, components) → texts from i18n/de.ts
```

- Writes go through one central path (`storageStatus.ts`), so a failed save is visible.
- Export and import use `workspace/`: `buildWorkspace` and `serializeWorkspace` on the way out, `parseWorkspace` and `applyWorkspace` on the way in. Imported files are untrusted text and are checked before anything is stored.
- Results are never stored, only inputs. They are recomputed on every change.
