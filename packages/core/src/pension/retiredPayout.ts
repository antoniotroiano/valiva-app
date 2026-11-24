import { netPension } from './netPension';
import type { NetPension } from './netPension';
import { payoutPlan } from './payout';
import { ageToday, validateDepotRetired, validateOccupationalRetired } from './retired';
import type { DepotRetiredFields, OccupationalRetiredFields } from './retired';
import type { ProjectionContext, ProjectionOutcome, ProjectionResult } from './projection';
import { otherIncomeOf } from './projection';
import type { ScenarioName } from '../shared/types';

export type RetiredPayoutDetails = {
  ageToday: number;
  /** `annuity`: a running pension; `capital`: a rest capital with a payout plan. */
  form: 'annuity' | 'capital';
  /** Capital today (`capital` form and the depot); absent for a running pension. */
  capitalToday?: number;
  /** Months of the payout plan; absent for a running pension. */
  planMonths?: number;
  /** Yearly adjustment of a running pension in percent; absent for a rest capital. */
  adjustmentPercent?: number;
  /** Net amounts of this year (nominal equals real today). */
  nominal: NetPension;
};

export type RetiredPayoutProjection = ProjectionResult & { details: RetiredPayoutDetails };

/** Social-insurance values a company pension uses; only these can raise an `unverified:` warning. */
const OCCUPATIONAL_KEYS = [
  'social.healthGeneralRatePercent',
  'social.careRatePercent',
  'social.careRateChildlessPercent',
  'social.careChildlessExemptBeforeBirthYear',
];
const OCCUPATIONAL_COMPULSORY_KEYS = [
  'social.occupationalHealthAllowanceMonthly',
  'social.occupationalCareThresholdMonthly',
];

function result(
  kind: 'occupational' | 'retirementDepot',
  productId: string,
  scenario: ScenarioName,
  monthly: number,
  capital: number | undefined,
  ctx: ProjectionContext,
  details: Omit<RetiredPayoutDetails, 'nominal' | 'ageToday'>,
  extra: Partial<ProjectionResult>,
  warnings: string[],
): RetiredPayoutProjection {
  const nominal = netPension(
    monthly,
    kind,
    {
      retirementYear: ctx.currentYear,
      realFactor: 1,
      thresholdScale: 1,
      other: otherIncomeOf(ctx, scenario),
      birthYear: ctx.profile.birthYear,
    },
    ctx.assumptions,
    ctx.legal,
  );
  return {
    productId,
    scenario,
    series: [],
    ...(capital === undefined ? {} : { capitalAtRetirement: capital }),
    monthlyPensionNominal: nominal.gross,
    monthlyPensionReal: nominal.gross,
    taxAndContributions: nominal.tax + nominal.contributions,
    taxableMonthlyReal: nominal.taxable,
    contributionsMonthlyReal: nominal.contributions,
    fixedTaxMonthlyReal: 0,
    netMonthlyPensionReal: nominal.net,
    ...extra,
    warnings,
    details: { ageToday: ageToday(ctx), ...details, nominal },
  };
}

/**
 * Company pension of a person who already draws it (`16` §5.3). Form `annuity`: a running pension with the
 * entered amount today, adjusted fixed or like the statutory pension, until the end age or for life; taxed in
 * full, contributions with the allowance and the threshold of the company pension. Form `capital`: a rest
 * capital paid out as a payout plan with a constant nominal rate from today's age to the end age. The product
 * id is `occupational`; the caller gives the end age to the overview (`annuityEndAge` or `capitalEndAge`).
 */
export function projectOccupationalRetired(
  input: OccupationalRetiredFields,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<RetiredPayoutProjection> {
  const issues = validateOccupationalRetired(input, ctx);
  if (issues.length > 0) return { ok: false, issues };

  const compulsory = ctx.assumptions.health.mode === 'statutoryCompulsory';
  const used = compulsory
    ? [...OCCUPATIONAL_KEYS, ...OCCUPATIONAL_COMPULSORY_KEYS]
    : OCCUPATIONAL_KEYS;
  const warnings = ctx.legal.unverified
    .filter((k) => used.includes(k))
    .map((k) => `unverified:${k}`);

  if (input.retiredForm === 'capital') {
    const capital = input.capitalToday as number;
    const plan = payoutPlan(
      capital,
      ageToday(ctx),
      input.capitalEndAge as number,
      ctx.assumptions.payoutPhaseReturnPercent,
    );
    if (!plan.ok) return { ok: false, issues: plan.issues };
    return {
      ok: true,
      result: result(
        'occupational',
        'occupational',
        scenario,
        plan.plan.monthly,
        capital,
        ctx,
        { form: 'capital', capitalToday: capital, planMonths: plan.plan.months },
        {},
        warnings,
      ),
    };
  }

  const adjustment = input.annuityAdjustment ?? { mode: 'fixed' as const, percent: 0 };
  const percent =
    adjustment.mode === 'pension' ? ctx.assumptions.pensionAdjustmentPercent : adjustment.percent;
  return {
    ok: true,
    result: result(
      'occupational',
      'occupational',
      scenario,
      input.annuityMonthlyGross as number,
      undefined,
      ctx,
      { form: 'annuity', adjustmentPercent: percent },
      { indexationPercent: percent },
      warnings,
    ),
  };
}

/**
 * Retirement depot of a person who already draws it (`16` §5.3): a rest capital paid out as a payout plan, no
 * lump sum, no grants. Fully taxable, no health contributions for compulsory members (both `unverified`, as in
 * the planning mode). The hint `depot_before_first_contribution_year` marks a calculation before the year in
 * which the contract is possible at all (`16` §15 point 8); it is not an error.
 */
export function projectDepotRetired(
  input: DepotRetiredFields,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<RetiredPayoutProjection> {
  const issues = validateDepotRetired(input, ctx);
  if (issues.length > 0) return { ok: false, issues };

  const capital = input.retiredCapitalToday as number;
  const plan = payoutPlan(
    capital,
    ageToday(ctx),
    input.retiredEndAge as number,
    ctx.assumptions.payoutPhaseReturnPercent,
  );
  if (!plan.ok) return { ok: false, issues: plan.issues };

  const warnings: string[] = [];
  if (ctx.currentYear < ctx.legal.depot.firstContributionYear) {
    warnings.push('depot_before_first_contribution_year');
  }
  warnings.push('unverified:depot.payoutTaxation');
  if (ctx.assumptions.health.mode === 'statutoryCompulsory') {
    warnings.push('unverified:depot.noHealthContributions');
  }
  return {
    ok: true,
    result: result(
      'retirementDepot',
      'retirementDepot',
      scenario,
      plan.plan.monthly,
      capital,
      ctx,
      { form: 'capital', capitalToday: capital, planMonths: plan.plan.months },
      {},
      warnings,
    ),
  };
}
