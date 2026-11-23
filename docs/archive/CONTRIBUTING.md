# Contributing

Thanks for your interest. This is a private planner in an early stage; small, focused changes are easiest to review.

## Rules

- **Language:** code, comments, file names, test names, commit messages, config keys and JSON fields in English. UI texts in German, only in `apps/web/src/i18n/de/` (no strings in components). German → English terms: `docs/glossary.md`
- **Calculation core (`packages/core`):** pure, deterministic functions; no dependency on UI, DB or HTTP; fully unit-tested. Validation errors are returned as data, not thrown
- **Legal values** only in `config/`, each with `value`, `validFrom`, `validTo`, `source`, `status` (`confirmed` or `unverified`). Never in code. Unsure values must not appear as confirmed
- **No real user data** in the repo. Sample data is invented and lives in `examples/` (`meta.synthetic: true`). Never commit your own `*.workspace.json` files
- **Tests:** golden vectors against an independent Excel calculation, property tests, a few Playwright smoke tests
- **Dependencies:** no new dependencies without a concrete benefit
- **Disclaimer:** the app gives no investment or tax advice; projections are not a guarantee

## Sessions and commits

- One work package (AP) per session; the plan is `concept/14-review-report-2026-11-22.md`.
- **The author makes one commit per session** (GitHub Desktop). Sessions do not commit, push, tag or switch branches.
- Before the commit, `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test` must pass (plus `npm run e2e` after UI changes).
- The proposed commit message (one English line) is part of the session log in section 10 of the review report.

## Before a pull request

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
npm run e2e
```

Concept and progress are in `concept/` (`README.md` is the index, `PROGRESS.md` the status). Deviations from the concept go into `PROGRESS.md` under "Notizen und Abweichungen".
