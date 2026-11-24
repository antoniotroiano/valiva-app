import { netPension, taxableShareForStartYear } from './netPension';
import type { NetPension } from './netPension';
import { ageToday, validateStatutoryActual } from './retired';
import type { StatutoryActualFields } from './retired';
import type { ProjectionContext, ProjectionOutcome, ProjectionResult } from './projection';
import { otherIncomeOf } from './projection';
import type { ScenarioName } from '../shared/types';

export type StatutoryActualDetails = {
  /** Year the pension started (notice). */
  startYear: number;
  ageToday: number;
  /** Gross pension per month today (the entered amount). */
  monthlyGross: number;
  /** Taxable share of the start year in percent (table of §22 Nr. 1 Satz 3 Buchst. a aa EStG). */
  taxableSharePercent: number;
  /** Annual pension of the year after the start (`J_ref`): the entered value or the approximation. */
  referenceAnnual: number;
  /** True if `referenceAnnual` is the approximation (`firstFullYearAnnual` not entered). */
  referenceEstimated: boolean;
  /** Tax-free part per year in euros, fixed from the year after the start: `(1 - share) * J_ref`. */
  taxFreeYearly: number;
  /** True if the pension starts in the current year: the share applies this year, the fixed amount from the next. */
  startsThisYear: boolean;
  /** Net amounts of this year (nominal equals real today). */
  nominal: NetPension;
};

export type StatutoryActualProjection = ProjectionResult & { details: StatutoryActualDetails };

const PRODUCT_ID = 'statutory';
/** Legal values the actual pension uses; only these can raise an `unverified:` warning. */
const USED_KEYS = [
  'pension.taxableShareTable',
  'pension.taxFreeAmountFixedFromYearAfterStart',
  'pension.taxableShareBasePercent',
  'pension.taxableShareBaseYear',
  'pension.taxableShareIncreasePerYear',
  'pension.taxableShareMaxPercent',
  'social.healthGeneralRatePercent',
  'social.careRatePercent',
  'social.careRateChildlessPercent',
  'social.careChildlessExemptBeforeBirthYear',
];

/**
 * Statutory pension of a person who already draws it, from the pension notice (`16` §5.2). `R` is the gross
 * pension per month of the current year; it grows with the pension adjustment afterwards (the overview does
 * that). The taxable part: the table share `p(S)` of the start year `S` in the start year itself; from the
 * following year the tax-free part is the fixed euro amount `F = (1 - p(S)) * J_ref`, with `J_ref` the annual
 * pension of the year after the start (`firstFullYearAnnual`, else `12 * R * (1 + g)^(S + 1 - currentYear)`),
 * and later adjustments are fully taxable. Contributions and tax as in `netPension`. All three scenarios are
 * the same (no capital). Pure; errors are data.
 */
export function projectStatutoryActual(
  input: StatutoryActualFields,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<StatutoryActualProjection> {
  const issues = validateStatutoryActual(input, ctx);
  if (issues.length > 0) return { ok: false, issues };

  const monthly = input.actualMonthlyGross as number;
  const startYear = ctx.profile.retirementStartYear as number;
  const share = taxableShareForStartYear(startYear, ctx.legal) as number;
  const growth = 1 + ctx.assumptions.pensionAdjustmentPercent / 100;
  const entered = input.firstFullYearAnnual;
  const referenceEstimated = entered === undefined || entered === null;
  const referenceAnnual = referenceEstimated
    ? 12 * monthly * Math.pow(growth, startYear + 1 - ctx.currentYear)
    : entered;
  const taxFreeYearly = (1 - share / 100) * referenceAnnual;
  const startsThisYear = startYear === ctx.currentYear;

  const nominal = netPension(
    monthly,
    'statutory',
    {
      retirementYear: startYear,
      realFactor: 1,
      other: otherIncomeOf(ctx, scenario),
      birthYear: ctx.profile.birthYear,
      ...(startsThisYear
        ? { taxableSharePercentOverride: share }
        : { taxFreeMonthly: taxFreeYearly / 12 }),
    },
    ctx.assumptions,
    ctx.legal,
  );

  const warnings: string[] = [...nominal.warnings];
  // The approximation is exact if the year after the start is the current year (no adjustment in between).
  if (referenceEstimated && startYear + 1 !== ctx.currentYear) {
    warnings.push('first_full_year_estimated');
  }
  for (const k of ctx.legal.unverified) if (USED_KEYS.includes(k)) warnings.push(`unverified:${k}`);

  return {
    ok: true,
    result: {
      productId: PRODUCT_ID,
      scenario,
      series: [],
      monthlyPensionNominal: nominal.gross,
      monthlyPensionReal: nominal.gross,
      taxAndContributions: nominal.tax + nominal.contributions,
      taxableMonthlyReal: nominal.taxable,
      contributionsMonthlyReal: nominal.contributions,
      fixedTaxMonthlyReal: 0,
      netMonthlyPensionReal: nominal.net,
      fixedTaxFreeMonthlyReal: taxFreeYearly / 12,
      ...(startsThisYear ? { fixedTaxFreeFromNextYear: true } : {}),
      warnings,
      details: {
        startYear,
        ageToday: ageToday(ctx),
        monthlyGross: monthly,
        taxableSharePercent: share,
        referenceAnnual,
        referenceEstimated,
        taxFreeYearly,
        startsThisYear,
        nominal,
      },
    },
  };
}
