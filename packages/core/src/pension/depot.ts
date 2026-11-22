import { allowanceForYear } from './allowance';
import type { AllowanceBreakdown } from './allowance';
import { IssueCollector } from '../shared/issues';
import { monthToIndex } from '../shared/months';
import { netLumpSum, netPension } from './netPension';
import type { NetPension } from './netPension';
import { validateWithdrawal, withdrawalPlan, withdrawalYears } from './payout';
import type { WithdrawalSettings, WithdrawalYear } from './payout';
import type {
  ProductProjector,
  ProjectionContext,
  ProjectionOutcome,
  ProjectionResult,
} from './projection';
import { otherIncomeOf } from './projection';
import type { ScenarioName, ValidationIssue } from '../shared/types';

export type DepotVariant = 'standard' | 'guarantee80' | 'guarantee100' | 'noGuarantee';

export type DepotInput = {
  ownContributionMonthly: number;
  /**
   * The contribution rises by this percent at every January after the start (0 or absent = constant),
   * capped at the yearly maximum.
   */
  annualContributionIncreasePercent?: number;
  /** `YYYY-MM`, 2027-01 at the earliest. */
  startMonth: string;
  variant: DepotVariant;
  costPercentPerYear: number;
  /** 65 to 70. */
  payoutStartAge: number;
  /** At least 85. */
  payoutEndAge: number;
  /** 0 to 30. */
  lumpSumSharePercent: number;
  /** Gross return of a guarantee product, replaces all scenarios (guarantee variants only). */
  returnOverridePercent?: number;
  /** Absent = annuity (constant nominal plan payment to the end age). */
  withdrawal?: WithdrawalSettings;
};

export type DepotYear = AllowanceBreakdown & {
  year: number;
  /** Capital at the end of the year, after the grant is credited. */
  valueEnd: number;
};

export type DepotDetails = {
  variant: DepotVariant;
  /** Cost rate actually used (the standard depot is capped). */
  costPercentUsed: number;
  /** Gross return used for the scenario. */
  grossReturnPercent: number;
  payoutYear: number;
  yearsToPayout: number;
  inflationFactor: number;
  ownTotal: number;
  allowanceTotal: number;
  /** Capital from the model before the guarantee floor. */
  modelCapital: number;
  /** Guarantee floor on own contributions plus grants; 0 without guarantee. */
  guaranteeFloor: number;
  guaranteeActive: boolean;
  lumpSumGross: number;
  /** Capital that goes into the payout plan. */
  planCapital: number;
  planMonths: number;
  withdrawal: WithdrawalSettings;
  /** Age at which the plan capital is used up before the end age; absent if it lasts. */
  depletionAge?: number;
  /** Plan capital left after the end age, nominal. */
  remainingCapitalAtEnd: number;
  /** Only with the percent strategy: payment and plan capital per payout year. */
  withdrawalYears?: WithdrawalYear[];
  yearly: DepotYear[];
  /** Monthly plan payment, nominal and in today's purchasing power. */
  nominal: NetPension;
  real: NetPension;
  /** Basic grant not claimed in the first full year because contributions are below the full-grant limit. */
  basicGrantMissedPerYear: number;
};

export type DepotProjection = ProjectionResult & { details: DepotDetails };

export const DEPOT_VARIANTS: readonly DepotVariant[] = [
  'standard',
  'guarantee80',
  'guarantee100',
  'noGuarantee',
];

const PRODUCT_ID = 'retirementDepot';
/**
 * Legal values the depot projection uses; only these can raise an `unverified:` warning.
 * The child age limit and the bonus age limit are reported only when they take effect (see below).
 */
const USED_KEYS = [
  'depot.basicGrantTier1Limit',
  'depot.basicGrantTier1RatePercent',
  'depot.basicGrantTier2Limit',
  'depot.basicGrantTier2RatePercent',
  'depot.childGrantRatePercent',
  'depot.childGrantContributionLimit',
  'depot.childGrantMaxPerChild',
  'depot.childGrantMaxAge',
  'depot.youthBonusAmount',
  'depot.youthBonusMaxAge',
  'depot.minOwnContributionYearly',
  'depot.standardCostCapPercent',
  'depot.guaranteeLevelLowPercent',
  'depot.guaranteeLevelHighPercent',
];

export function validateDepot(input: DepotInput, ctx: ProjectionContext): ValidationIssue[] {
  const c = new IssueCollector();
  const d = ctx.legal.depot;
  const wide = { min: -50, max: 100 };
  if (c.finite('ownContributionMonthly', input.ownContributionMonthly)) {
    if (input.ownContributionMonthly < 0) {
      c.issues.push({ field: 'ownContributionMonthly', code: 'negative', min: 0 });
    } else if (input.ownContributionMonthly * 12 > d.maxContributionYearly) {
      c.issues.push({
        field: 'ownContributionMonthly',
        code: 'out_of_range',
        max: d.maxContributionYearly / 12,
      });
    }
  }
  if (input.annualContributionIncreasePercent !== undefined) {
    c.number('annualContributionIncreasePercent', input.annualContributionIncreasePercent, {
      min: 0,
      max: 50,
    });
  }
  const start = monthToIndex(input.startMonth);
  if (start === null) c.issues.push({ field: 'startMonth', code: 'invalid_month' });
  else if (start < d.firstContributionYear * 12) {
    c.issues.push({
      field: 'startMonth',
      code: 'before_first_contribution_year',
      min: d.firstContributionYear,
    });
  }
  c.number('costPercentPerYear', input.costPercentPerYear, { min: 0, max: 100 });
  c.integer('payoutStartAge', input.payoutStartAge, {
    min: d.payoutStartAgeMin,
    max: d.payoutStartAgeMax,
  });
  c.number('payoutEndAge', input.payoutEndAge, { min: d.payoutEndAgeMin, max: 120 });
  if (
    Number.isFinite(input.payoutEndAge) &&
    Number.isFinite(input.payoutStartAge) &&
    input.payoutEndAge <= input.payoutStartAge
  ) {
    c.issues.push({ field: 'payoutEndAge', code: 'out_of_range', min: input.payoutStartAge + 1 });
  }
  c.issues.push(...validateWithdrawal(input.withdrawal));
  c.number('lumpSumSharePercent', input.lumpSumSharePercent, {
    min: 0,
    max: d.lumpSumMaxPercent,
  });
  if (input.returnOverridePercent !== undefined) {
    c.number('returnOverridePercent', input.returnOverridePercent, wide);
  }
  // Net return of -100 % or less makes the monthly growth factor non-positive (NaN).
  if (Number.isFinite(input.costPercentPerYear)) {
    const rates = Object.values(ctx.assumptions.returnScenarios);
    if (input.returnOverridePercent !== undefined) rates.push(input.returnOverridePercent);
    if (rates.every(Number.isFinite)) {
      const lowest = Math.min(...rates);
      const cost =
        input.variant === 'standard'
          ? Math.min(input.costPercentPerYear, d.standardCostCapPercent)
          : input.costPercentPerYear;
      if (lowest - cost <= -100) {
        c.issues.push({
          field: 'costPercentPerYear',
          code: 'out_of_range',
          min: 0,
          max: lowest + 100,
        });
      }
    }
  }
  if (
    start !== null &&
    Number.isInteger(input.payoutStartAge) &&
    Number.isFinite(ctx.profile.birthYear) &&
    start >= (ctx.profile.birthYear + input.payoutStartAge) * 12
  ) {
    c.issues.push({ field: 'startMonth', code: 'not_after_start' });
  }
  return c.issues;
}

function guaranteeShare(variant: DepotVariant, ctx: ProjectionContext): number {
  if (variant === 'guarantee80') return ctx.legal.depot.guaranteeLevelLowPercent / 100;
  if (variant === 'guarantee100') return ctx.legal.depot.guaranteeLevelHighPercent / 100;
  return 0;
}

/**
 * Retirement depot (`09` §5.3). Savings phase monthly like the ETF core: contribution at the start of
 * the month, growth with net return (scenario minus costs), no tax. Grants per calendar year from the
 * year's own contributions, credited at the end of December and compounded afterwards. A guarantee
 * variant lifts the capital at the payout start to its share of own contributions plus grants.
 * The payout is a lump sum share plus a payout plan; payments are taxed at the flat retirement rate.
 */
export function projectDepot(
  input: DepotInput,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<DepotProjection> {
  const issues = [...validateDepot(input, ctx)];
  if (issues.length > 0) return { ok: false, issues };

  const warnings: string[] = [];
  const d = ctx.legal.depot;
  const start = monthToIndex(input.startMonth) as number;
  const payoutYear = ctx.profile.birthYear + input.payoutStartAge;
  const months = payoutYear * 12 - start;

  let cost = input.costPercentPerYear;
  if (input.variant === 'standard' && cost > d.standardCostCapPercent) {
    cost = d.standardCostCapPercent;
    warnings.push('cost_capped');
  }
  const isGuarantee = input.variant === 'guarantee80' || input.variant === 'guarantee100';
  const gross =
    isGuarantee && input.returnOverridePercent !== undefined
      ? input.returnOverridePercent
      : ctx.assumptions.returnScenarios[scenario];
  const growth = Math.pow(1 + (gross - cost) / 100, 1 / 12);

  const firstYear = Math.floor(start / 12);
  const increase = 1 + (input.annualContributionIncreasePercent ?? 0) / 100;
  const maxRate = d.maxContributionYearly / 12;
  let rate = input.ownContributionMonthly;
  let rateCapped = false;
  let lastRateYear = -1;
  let value = 0;
  let own = 0;
  let grants = 0;
  let yearContribution = 0;
  const series: ProjectionResult['series'] = [{ month: 0, contributed: 0, value: 0 }];
  const yearly: DepotYear[] = [];

  for (let m = 1; m <= months; m++) {
    const idx = start + m - 1;
    if (Math.floor(idx / 12) !== lastRateYear) {
      lastRateYear = Math.floor(idx / 12);
      const raised = input.ownContributionMonthly * Math.pow(increase, lastRateYear - firstYear);
      rate = Math.min(raised, maxRate);
      if (raised > maxRate) rateCapped = true;
    }
    value += rate;
    own += rate;
    yearContribution += rate;
    value = Math.max(0, value * growth);
    if (idx % 12 === 11) {
      const year = Math.floor(idx / 12);
      const a = allowanceForYear(
        yearContribution,
        {
          year,
          birthYear: ctx.profile.birthYear,
          childrenBirthYears: ctx.profile.childrenBirthYears,
          isFirstContributionYear: year === firstYear,
        },
        ctx.legal,
      );
      value += a.total;
      grants += a.total;
      yearly.push({ ...a, year, valueEnd: value });
      yearContribution = 0;
    }
    series.push({ month: m, contributed: own + grants, value });
  }

  const contributed = own + grants;
  const guaranteeFloor = guaranteeShare(input.variant, ctx) * contributed;
  const modelCapital = value;
  const capital = Math.max(modelCapital, guaranteeFloor);
  const guaranteeActive = guaranteeFloor > modelCapital;

  const lumpSumGross = (capital * input.lumpSumSharePercent) / 100;
  const planCapital = capital - lumpSumGross;
  const planResult = withdrawalPlan(
    planCapital,
    input.payoutStartAge,
    input.payoutEndAge,
    ctx.assumptions.payoutPhaseReturnPercent,
    input.withdrawal,
    ctx.assumptions.inflationPercent,
  );
  if (!planResult.ok) return { ok: false, issues: planResult.issues };
  const plan = planResult.plan;
  const depletionAge =
    plan.depletionMonth === undefined ? undefined : input.payoutStartAge + plan.depletionMonth / 12;
  if (depletionAge !== undefined) warnings.push('depot_withdrawal_depleted');

  const yearsToPayout = payoutYear - ctx.currentYear;
  const inflationFactor = Math.pow(1 + ctx.assumptions.inflationPercent / 100, yearsToPayout);
  const nominal = netPension(
    plan.monthly,
    'retirementDepot',
    {
      retirementYear: payoutYear,
      realFactor: inflationFactor,
      other: otherIncomeOf(ctx, scenario),
    },
    ctx.assumptions,
    ctx.legal,
  );
  const scale = (n: number) => n / inflationFactor;
  const real: NetPension = {
    ...nominal,
    gross: scale(nominal.gross),
    tax: scale(nominal.tax),
    health: scale(nominal.health),
    care: scale(nominal.care),
    contributions: scale(nominal.contributions),
    net: scale(nominal.net),
    taxable: scale(nominal.taxable),
  };
  const lumpNet = netLumpSum(
    scale(lumpSumGross),
    { taxableMonthlyReal: real.taxable, contributionsMonthlyReal: real.contributions },
    otherIncomeOf(ctx, scenario),
    ctx.assumptions,
    ctx.legal,
  );

  if (rateCapped) warnings.push('contribution_capped_at_maximum');
  if (ctx.profile.childrenBirthYears.length > 0) warnings.push('unverified:depot.childGrantMaxAge');
  if (yearly.some((y) => y.bonus > 0)) warnings.push('unverified:depot.youthBonusMaxAge');
  warnings.push('unverified:depot.payoutTaxation');
  if (ctx.assumptions.health.mode === 'statutoryCompulsory') {
    warnings.push('unverified:depot.noHealthContributions');
  }
  for (const k of ctx.legal.unverified) {
    if (USED_KEYS.includes(k) && !warnings.includes(`unverified:${k}`)) {
      warnings.push(`unverified:${k}`);
    }
  }

  const fullYear = yearly.find((y) => !y.belowMinimum) ?? yearly[0];
  return {
    ok: true,
    result: {
      productId: PRODUCT_ID,
      scenario,
      series,
      capitalAtRetirement: capital,
      monthlyPensionNominal: nominal.gross,
      monthlyPensionReal: real.gross,
      taxAndContributions: real.tax + real.contributions,
      taxableMonthlyReal: real.taxable,
      contributionsMonthlyReal: real.contributions,
      fixedTaxMonthlyReal: 0,
      netMonthlyPensionReal: real.net,
      ...(plan.strategy === 'percent'
        ? { indexationPercent: ctx.assumptions.inflationPercent }
        : {}),
      ...(depletionAge === undefined ? {} : { payoutEndAge: depletionAge }),
      lumpSum:
        lumpSumGross > 0
          ? {
              gross: lumpSumGross,
              tax: lumpNet.tax * inflationFactor,
              net: lumpNet.net * inflationFactor,
              grossReal: scale(lumpSumGross),
              netReal: lumpNet.net,
            }
          : undefined,
      warnings,
      details: {
        variant: input.variant,
        costPercentUsed: cost,
        grossReturnPercent: gross,
        payoutYear,
        yearsToPayout,
        inflationFactor,
        ownTotal: own,
        allowanceTotal: grants,
        modelCapital,
        guaranteeFloor,
        guaranteeActive,
        lumpSumGross,
        planCapital,
        planMonths: plan.months,
        withdrawal: input.withdrawal ?? { strategy: 'annuity' },
        ...(depletionAge === undefined ? {} : { depletionAge }),
        remainingCapitalAtEnd: plan.remainingAtEnd,
        ...(plan.strategy === 'percent'
          ? { withdrawalYears: withdrawalYears(plan, input.payoutStartAge) }
          : {}),
        yearly,
        nominal,
        real,
        basicGrantMissedPerYear: fullYear ? fullYear.basicGrantMissed : 0,
      },
    },
  };
}

export const depotProjector: ProductProjector<DepotInput, DepotProjection> = {
  type: PRODUCT_ID,
  validate: validateDepot,
  project: projectDepot,
};
