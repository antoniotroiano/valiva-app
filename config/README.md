# config/

Legal parameters live here, never in code. Every value has `value`, `validFrom`, `validTo`, `source`, `status` (`confirmed` | `unverified`).

`source` is the English reference for developers, `sourceDe` the German text shown in the UI.

Files: `tax-de.json` (ETF and interest tax), `pension-de.json` (statutory pension), `social-de.json` (health and care insurance, occupational pension limits), `altersvorsorge-de.json` (retirement depot: grants, limits, payout phase), `income-tax-de.json` (income tariff §32a EStG and lump sums for pension income). `unit` is one of `number`, `percent`, `percent_per_month`, `percentage_points_per_year`, `EUR`, `EUR_per_month`, `years`, `year`. Review all values once a year.
