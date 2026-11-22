# Assumptions and calculation rules

The rules the projections use, by phase. The legal values themselves live in `config/` with source and status (`confirmed` or `unverified`); the app shows them on the page "Annahmen".

## Assumptions (Phase 1)

- Monthly steps; annual return converted geometrically; net return = gross return − TER
- Per month: contribution (after entry fee), growth, custody fee
- Initial capital pays no entry fee
- Tax only at the end (sale of everything): `(gain × (1 − partial exemption) − allowance) × rate`, at least 0. Church tax is optional per person (profile, `churchTax` `low` 8 % or `high` 9 %): it replaces the rate by `base / (1 + base × k) × (1 + solidarity + k)` (§32d Abs. 1 EStG; 27.995 % at 9 %, 27.819 % at 8 %). It applies to the ETF (plan, retirement, target) and to savings goals, not to the income tax on pensions. The church tax rates in `config/tax-de.json` are `unverified`
- Advance lump-sum tax (Vorabpauschale, §18 InvStG) is an option per ETF plan (`advanceLumpSum`, default off; needs the tax at the end). Each December: `min(base earnings, gain of the year)` with base earnings = (value at the start of the year + purchases of the year weighted by `(13 − month) / 12`) × base interest × 70 %. Tax on it = `(lump sum × (1 − partial exemption) − allowance) × rate`, paid from the depot in the same December (the law treats it as paid in January). At the sale the lump sums already taxed reduce the gain before the partial exemption; taxes paid from the depot count as sold at cost. In the payout years the lump sum of the shares still held and the realised gain share one allowance per year; `taxMonthlyNominal` is the average over the payout months. The allowance then works every year, so the net result is often higher than without the option. Not modelled: tax on the shares sold to pay the advance tax, the cap per share instead of for the whole depot, loss offsetting. Base interest 2018 to 2026 and the factor 70 % are confirmed (BMF letters, §18 InvStG); years from 2027 use the assumed 3.20 % (`unverified`, warning `etf_advance_assumed_rate`)
- "Today's purchasing power" = after-tax final value deflated by inflation
- All sample data is invented

## Assumptions (Phase 2: savings goals)

- Interest p. a. is an effective annual rate, converted geometrically to months; changes apply from a given month
- Per month: contribution at the start, then interest, then tax on that interest
- Interest tax is applied at every interest credit: interest above the remaining yearly allowance is taxed at the capital gains rate (no partial exemption; church tax only if chosen in the profile, see above). The allowance is used per calendar year, resets in January and is shared by all goals of a person (one pool, default from the tax config, editable): goals take it one after another in the order of their priority, so a later goal gets what the earlier ones left in that year. It is not shared with the ETF plan (sale and withdrawal usually fall years later) or with the other person of a household (no joint assessment)
- A goal counts as reached in the first month whose balance after tax is at least the target; the calculation stops after 50 years (`not_reached`)
- Reverse calculator (savings goal and ETF plan): smallest whole-cent monthly amount that reaches the target; for the ETF plan per scenario, with the target either nominal or in today's purchasing power
- The monthly budget only shows the sum of goal rates plus the ETF rate and warns when exceeded; nothing is distributed automatically
- Goals are kept in the browser (`localStorage`, key `pathwise.goals.v1`); results are never stored

## Assumptions (Phase 3b: retirement depot)

- Savings phase monthly like the ETF plan: contribution at the start of the month, growth with net return (scenario minus costs), no tax during saving. It ends in December before the year in which the payout age is reached (birth year plus age)
- Grants per calendar year from that year's own contributions: basic grant 50 % up to 360 € and 25 % up to 1,800 € (max. 540 €), child grant 100 % up to 1,800 € per child (max. 300 €), bonus 200 € in the first contribution year if under 25. Below 120 € per year there is no grant. Grants are credited at the end of the year and compound afterwards
- Variants only differ in costs and guarantee (no glide path). The standard depot is capped at 1.0 % costs. A guarantee variant lifts the capital at the payout start to 80 % or 100 % of own contributions plus grants; the return of a guarantee product can be entered and then replaces all three scenarios
- Payout: lump sum (0 to 30 %) at the start, the rest as a payout plan with a constant nominal monthly rate until the chosen age (at least 85) at the payout-phase return; real values deflate with inflation to today
- Payments are fully taxable at the flat retirement tax rate; health and care contributions are assumed to be 0 for compulsory members (not confirmed), "other" uses its own rate
- Not covered: special-expense deduction, spouse grant, switching from Riester, lifelong annuity, variable share
- Legal values live in `config/altersvorsorge-de.json`; the child age limit (18) and the "once" of the bonus are `unverified`
- State is kept in `localStorage` under `pathwise.depot.v1`

## Assumptions (Phase 3a: profile and statutory pension)

- The profile (birth year, target retirement age, life expectancy, children) and the global assumptions (inflation, return scenarios, pension adjustment, flat retirement tax rate, health insurance) are kept under `pathwise.profile.v1`
- Input is the projection from the pension statement ("Regelaltersrente bei Beitragszahlung bis zur Altersgrenze", today's values) plus the statement year; no entitlement points
- Nominal pension = statement amount × (1 + pension adjustment)^years × factor. Factor: −0.3 % per month before the regular age (at most −14.4 %), +0.5 % per month after it; retirement age 63 to 70 in whole years
- Known simplification: early or late retirement changes only this factor, not the entitlement points (fewer or more contribution years)
- Net pension: taxable share (84.0 % in 2026, +0.5 points per year up to 100 %) × flat retirement tax rate; compulsory health insurance members pay half the health rate plus half the additional rate and the full care rate, "other" uses its own rate
- Real values deflate with inflation; scenarios give the same value for the statutory pension
- State is kept in `localStorage` under `pathwise.statutory.v1` (only overrides of the profile)

## Assumptions (Phase 3c: company pension, bAV)

- Employer subsidy "auto": 15 % of the gross conversion, capped at the 338 € per month that is exempt from social insurance; "custom" takes an amount without a cap. Conversion is limited to 676 € per month
- Net cost today = gross conversion − tax saved (up to 676 €, at the marginal tax rate) − social insurance saved (up to 338 €, at the employee rate); an estimate based on the shown assumptions
- Savings phase like the retirement depot without grants; a guaranteed rate is a lower bound of the net return, not a capital guarantee
- Payout as a payout plan until the chosen age (start 62 to 70). Pension is fully taxable at the flat retirement tax rate
- Compulsory health insurance members pay the full health rate only on the part above the allowance, care contributions apply to the whole pension once it exceeds the threshold (hard edge). Both limits (197.75 € today) are indexed with inflation; they are `unverified`
- State is kept in `localStorage` under `pathwise.occupational.v1`

## Assumptions (Phase 4a: overall view, ETF in retirement, closing the gap)

- Overview: sums the net monthly pension of the enabled, valid products in today's purchasing power. The snapshot counts them from the target retirement age; a product that starts later counts 0 there and is flagged. A product pays from its start up to (excluding) its end age. Fixed nominal rates lose value with inflation after the start, the statutory pension grows with the pension adjustment minus inflation
- Gap = desired income (profile, today's purchasing power) minus net pension, at least 0. The total gap sums 12 × gap over the years from the target age up to (excluding) life expectancy. One-off payouts (retirement depot) are shown apart
- Invalid products are listed with the reason and a link to their page; they are not silently left out. `unverified` legal values are collected as notes
- Statutory pension: real values use the current year as the base (not the statement year)
- ETF in retirement: the savings phase ends at the chosen payout start age (duration derived from it, shown with a note if it differs from the duration field). The capital at that point is the gross final value; the Phase 1 sale-at-end tax does not apply. It is paid out as a constant nominal monthly rate until the end age. Tax per withdrawal: constant gain share of the payout × (1 − partial exemption), minus the unused allowance (nominal, fixed), × capital gains rate. No church tax, no advance lump-sum tax
- A switch on the ETF page (on by default) uses the global return scenarios and inflation instead of the plan's own values
- Closing the gap: smallest whole-cent extra monthly ETF rate per scenario so that the net pension reaches the desired income; the ETF block counts even if it is switched off in the overview. The budget note only compares the rates with the monthly budget
- State is kept in `localStorage` under `pathwise.overview.v1` (block switches) and `pathwise.etfPayout.v1` (global switch, payout ages)

## Assumptions (Phase 4b: household)

- A household has several persons, each with their own birth year, retirement age, life expectancy, children, tax rates, blocks (ETF, statutory pension, retirement depot, bAV) and savings goals. The wish income, inflation, return scenarios, pension adjustment and withdrawal return are shared
- Household view: each person's net pension is summed on a calendar-year axis. A person counts from their retirement start year up to their life expectancy year; the wish counts while at least one person lives. The snapshot is taken in the year the last person retires
- Survivor's pension is optional (two-person households, switch on the household page): 55 % (marriage from 2002) or 60 % (old law) of the deceased's net statutory pension, from the year after the death of the person with the shorter life expectancy, minus 40 % of the survivor's own income (statutory, bAV, depot; no ETF withdrawals) above 26.4 times the pension value. Not modelled: death quarter, child supplements, inheritance of ETF, depot and bAV, tax on the sum. Optionally the wish shrinks to a share after the first death. Without the switch there is no survivor's pension and the gap after the first death is rather too large. Tax is computed per person (no joint assessment)
- Closing the gap: smallest extra monthly ETF rate of one chosen person so that the household reaches the wish income; all other products are taken as given
- State: `pathwise.household.v2` (persons, shared values) and `pathwise.p.<id>.<block>.v1` per person. Old single-person data is migrated once and kept as a backup

## Workspace file (Phase 5: export and import)

- The app keeps its data in the browser (`localStorage`). The page "Daten" exports everything (household, all persons, all blocks) as one JSON file `<name>-YYYY-MM-DD.workspace.json` and imports such a file again. The file is a backup and the way to move data between computers; it holds inputs only, no results and no values from `config/`
- Import replaces all current data after a confirmation; a backup of the current data is downloaded first. There is no merging. The theme is a device setting and not part of the file
- The file is plain text and not encrypted. It contains personal financial data; keep it safe and never commit it (`*.workspace.json` is ignored except `examples/`)
- Files are not trusted: size limit 2 MB, JSON only, unknown fields are dropped, `__proto__`, `constructor` and `prototype` keys are refused, person ids must match `[A-Za-z0-9_-]{1,32}`, numbers must be finite and within sane limits, at most 20 persons. A broken household stops the import; a single broken block is replaced by its defaults and reported as a warning
- `schemaVersion` of the file starts at 1. A file from a newer version is refused; older versions go through a chain of migrations (none yet)
- `examples/` holds invented workspaces (`meta.synthetic: true`) that can be loaded from the page "Daten"

## Income tax on pensions (Phase 6a)

- Income tax is the tariff of §32a EStG (`config/income-tax-de.json`) on the **sum** of a person's statutory, occupational and retirement depot pensions. The tax is split across the products in proportion to their taxable amount. ETF withdrawals are taxed separately (capital gains tax) and are not part of the sum
- Taxable income = taxable parts of the pensions (statutory pension: taxable share; others in full) minus 102 EUR lump sum for income-related expenses, minus the paid health and care contributions (approximation: all of them count as deductible), minus 36 EUR lump sum for special expenses
- Everything is calculated in today's purchasing power with today's tariff (assumption: the tariff rises with inflation). Nominal amounts are divided by the inflation factor before and multiplied after
- Not modelled: solidarity surcharge, church tax, joint assessment (splitting), other income, five-year rule for the lump sum of the retirement depot (taxed in full on top of that year's pensions)
- Product pages tax a product together with the other enabled products at the time it pays out; the overview does the same for every age, so the pages and the overview show the same net value at the retirement start. An ETF-only person has no income tax in this sense
- The tax-free part of the statutory pension is a fixed euro amount from the retirement start (§22 EStG); increases afterwards are fully taxable. The overview applies this for every age, in today's purchasing power the fixed amount shrinks with the inflation. The product page shows the situation at the retirement start
- Occupational pension, effect on the statutory pension (approximation): converted pay up to the social-insurance-free limit is free of pension contributions, so each year earns fewer entitlement points. Loss per month in today's values = conversion x months of saving / average earnings x pension value (`config/pension-de.json`, provisional average earnings 2026). It is shown as a note and not subtracted from the result; it does not apply if the salary is above the contribution ceiling
- A warning appears if conversion, subsidy and employer contribution together exceed the tax-free limit. The part above is not modelled as taxable

## Rising contributions (retirement depot and occupational pension)

- Optional yearly rise in percent: the contribution (depot) or the conversion (occupational pension) rises at every January after the start, not by months since the start. Empty or 0 = constant. The ETF plan keeps its own rule (per 12 months since the start)
- The depot contribution is capped at the yearly maximum (570 EUR per month); the conversion is capped at the tax-free limit. Both raise a warning. The automatic subsidy follows the conversion. A custom subsidy and the employer contribution stay constant
- The wage growth that usually causes the rise is not modelled otherwise; the result stays in nominal euros, so a rise below the inflation still loses purchasing power

## ETF savings phase in the retirement view

- The savings phase of the ETF in the retirement plan starts in the **current month** (first contribution in this month) and ends in December before the payout year, so a start in November has two months in the first year. Before, it started on 1 January of the current year. `ProjectionContext.currentMonth` carries the month (absent = January); the ETF page with its own duration is not affected
- Lump sums count their month from that start. A lump sum after the last savings month is reported as an error instead of being dropped

## Regular retirement age

- The regular retirement age follows the birth year as in §235 SGB VI: 65 before 1947, +1 month per birth year up to 1958 (66), +2 months per birth year up to 1963 (66 years 10 months), 67 from 1964. The parameters are in `config/pension-de.json`; the page "Gesetzliche Rente" and the profile show the result. The field on the pension page is an optional override for special cases (for example part-time work for older employees, where the law does not raise the age); empty = law

## Care insurance rate for parents

- Parents with two to five children pay a lower care insurance rate (0.25 points per child from the second child, §55 Abs. 3 SGB XI), but only until the youngest counted child turns 25. At the usual retirement start the children are older, so pensioners pay the full rate and the model does the same: the rate for childless people or for people with children, no deduction. Someone who retires with several children under 25 pays slightly less than shown
- Withdrawal strategies (review 13 F-16): ETF and retirement depot payout plan can use the annuity (default, constant nominal payment, capital 0 at the end age) or `percent`: first-year payment `percent / 100 × capital / 12`, raised every year by the effective inflation (constant purchasing power), capital earns the payout-phase return monthly, a payment never exceeds the capital left. If the capital runs out before the end age the last payment is cut and nothing is paid afterwards (warning `etf_withdrawal_depleted` / `depot_withdrawal_depleted`, `depletionAge`); otherwise `remainingCapitalAtEnd` is left. Percent withdrawal tax (ETF): only the first year is computed and held constant in real terms, although the fixed allowance loses value; gain share stays constant. The overview uses the first-year rate; `firstPayoutEndAge` still uses the planned end age. No dynamic (return-dependent) rule and no sequence-of-returns risk (see F-10).
