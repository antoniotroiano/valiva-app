import { IssueCollector } from '../shared/issues';
import { monthToIndex } from '../shared/months';
import { netPension } from './netPension';
import type { NetPension } from './netPension';
import { payoutPlan } from './payout';
import type {
  ProductProjector,
  ProjectionContext,
  ProjectionOutcome,
  ProjectionResult,
} from './projection';
import { otherIncomeOf } from './projection';
import type { GlobalAssumptions } from '../shared/profile';
import type { LegalParameters } from '../tax/legalConfig';
import type { ScenarioName, ValidationIssue } from '../shared/types';

export type EmployerSubsidyMode = 'auto15' | 'custom';

export type OccupationalInput = {
  /** Gross salary conversion per month. */
  employeeContributionMonthlyGross: number;
  /** `auto15`: statutory subsidy on the social-insurance-free part; `custom`: the amount below. */
  employerSubsidyMode: EmployerSubsidyMode;
  /** Monthly subsidy, only used with `custom`. */
  employerSubsidyCustomMonthly?: number;
  /** Additional voluntary employer contribution per month. */
  employerContributionMonthly: number;
  costPercentPerYear: number;
  /**
   * The conversion rises by this percent at every January after the start (0 or absent = constant). It is
   * capped at the tax-free limit; a custom subsidy and the employer contribution stay constant.
   */
  annualContributionIncreasePercent?: number;
  /** `YYYY-MM`. */
  startMonth: string;
  /** 62 to 70. */
  payoutStartAge: number;
  /** After the start, at most 120. */
  payoutEndAge: number;
  /** Floor for the return after costs, percent per year (not a capital guarantee). */
  guaranteedRatePercent?: number;
};

export const OCCUPATIONAL_LIMITS = {
  payoutStartAge: { min: 62, max: 70 },
  payoutEndAgeMax: 120,
} as const;

export type NetEffort = {
  gross: number;
  taxSaving: number;
  socialSaving: number;
  net: number;
};

export type OccupationalYear = {
  year: number;
  /** Conversion plus subsidy plus employer contribution paid in up to the end of the year. */
  contributed: number;
  valueEnd: number;
};

export type OccupationalDetails = {
  subsidyMonthly: number;
  employerExtraMonthly: number;
  /** Conversion plus subsidy plus employer contribution, per month. */
  intoContractMonthly: number;
  netEffort: NetEffort;
  grossReturnPercent: number;
  /** Return after costs actually used (raised to the guaranteed rate if lower). */
  netReturnPercentUsed: number;
  guaranteeActive: boolean;
  payoutYear: number;
  yearsToPayout: number;
  inflationFactor: number;
  employeeTotal: number;
  /**
   * Approximate monthly loss of the statutory pension in today's values: the converted pay is free of
   * pension contributions up to the social-insurance-free limit, so those years earn fewer entitlement points.
   */
  statutoryLossMonthlyToday: number;
  subsidyTotal: number;
  employerExtraTotal: number;
  planMonths: number;
  yearly: OccupationalYear[];
  /** Monthly plan payment, nominal and in today's purchasing power. */
  nominal: NetPension;
  real: NetPension;
  /** Allowance and threshold in today's purchasing power (the config values, which are today's). */
  healthAllowanceReal: number;
  careThresholdReal: number;
};

export type OccupationalProjection = ProjectionResult & { details: OccupationalDetails };

const PRODUCT_ID = 'occupational';
const COMMON_KEYS = [
  'social.employerSubsidyPercent',
  'social.occupationalSocialInsuranceFreeMonthly',
  'social.occupationalTaxFreeMonthly',
];
/** Only with compulsory health insurance do allowance and threshold take effect. */
const COMPULSORY_KEYS = [
  'social.occupationalHealthAllowanceMonthly',
  'social.occupationalCareThresholdMonthly',
];

/** Employer subsidy per month: 15 % on the social-insurance-free part (`auto15`) or the entered amount. */
export function employerSubsidy(input: OccupationalInput, legal: LegalParameters): number {
  if (input.employerSubsidyMode === 'custom') return input.employerSubsidyCustomMonthly ?? 0;
  return (
    (legal.social.employerSubsidyPercent / 100) *
    Math.min(
      input.employeeContributionMonthlyGross,
      legal.social.occupationalSocialInsuranceFreeMonthly,
    )
  );
}

/**
 * Net monthly cost of the conversion today (estimate): conversion minus tax saving (up to the tax-free
 * limit, at the marginal rate) minus social insurance saving (up to the SV-free limit, at the employee rate).
 */
export function occupationalNetEffort(
  conversion: number,
  assumptions: GlobalAssumptions,
  legal: LegalParameters,
): NetEffort {
  const taxSaving =
    (Math.min(conversion, legal.social.occupationalTaxFreeMonthly) *
      assumptions.marginalTaxRateTodayPercent) /
    100;
  const socialSaving =
    (Math.min(conversion, legal.social.occupationalSocialInsuranceFreeMonthly) *
      assumptions.employeeSocialInsuranceRatePercent) /
    100;
  return { gross: conversion, taxSaving, socialSaving, net: conversion - taxSaving - socialSaving };
}

export function validateOccupational(
  input: OccupationalInput,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  const s = ctx.legal.social;
  if (c.finite('employeeContributionMonthlyGross', input.employeeContributionMonthlyGross)) {
    if (input.employeeContributionMonthlyGross < 0) {
      c.issues.push({ field: 'employeeContributionMonthlyGross', code: 'negative', min: 0 });
    } else if (input.employeeContributionMonthlyGross > s.occupationalTaxFreeMonthly) {
      c.issues.push({
        field: 'employeeContributionMonthlyGross',
        code: 'out_of_range',
        max: s.occupationalTaxFreeMonthly,
      });
    }
  }
  if (input.employerSubsidyMode === 'custom') {
    c.number('employerSubsidyCustomMonthly', input.employerSubsidyCustomMonthly ?? Number.NaN, {
      min: 0,
    });
  }
  c.number('employerContributionMonthly', input.employerContributionMonthly, { min: 0 });
  if (input.annualContributionIncreasePercent !== undefined) {
    c.number('annualContributionIncreasePercent', input.annualContributionIncreasePercent, {
      min: 0,
      max: 50,
    });
  }
  c.number('costPercentPerYear', input.costPercentPerYear, { min: 0, max: 100 });
  if (input.guaranteedRatePercent !== undefined) {
    c.number('guaranteedRatePercent', input.guaranteedRatePercent, { min: -50, max: 100 });
  }
  if (Number.isFinite(input.costPercentPerYear)) {
    const rates = Object.values(ctx.assumptions.returnScenarios);
    if (rates.every(Number.isFinite)) {
      const lowest = Math.min(...rates);
      const guarantee = input.guaranteedRatePercent;
      const guaranteed =
        guarantee !== undefined && Number.isFinite(guarantee) ? guarantee : -Infinity;
      // The guarantee lifts the net return, so only an unguarded -100 % or lower is invalid.
      if (Math.max(lowest - input.costPercentPerYear, guaranteed) <= -100) {
        c.issues.push({
          field: 'costPercentPerYear',
          code: 'out_of_range',
          min: 0,
          max: lowest + 100,
        });
      }
    }
  }
  const start = monthToIndex(input.startMonth);
  if (start === null) c.issues.push({ field: 'startMonth', code: 'invalid_month' });
  c.integer('payoutStartAge', input.payoutStartAge, OCCUPATIONAL_LIMITS.payoutStartAge);
  c.number('payoutEndAge', input.payoutEndAge, { max: OCCUPATIONAL_LIMITS.payoutEndAgeMax });
  if (
    Number.isFinite(input.payoutEndAge) &&
    Number.isFinite(input.payoutStartAge) &&
    input.payoutEndAge <= input.payoutStartAge
  ) {
    c.issues.push({ field: 'payoutEndAge', code: 'out_of_range', min: input.payoutStartAge + 1 });
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

/**
 * Occupational pension (`09` §5.4). Savings phase monthly like the depot without grants: conversion,
 * subsidy and employer contribution at the start of the month, growth with the return after costs
 * (raised to the guaranteed rate if lower), no tax. The savings phase ends in December before the year
 * `birthYear + payoutStartAge`. The payout is a payout plan; the pension is taxed at the flat rate, with
 * health and care contributions per `netPension`.
 */
export function projectOccupational(
  input: OccupationalInput,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<OccupationalProjection> {
  const issues = [...validateOccupational(input, ctx)];
  if (issues.length > 0) return { ok: false, issues };

  const start = monthToIndex(input.startMonth) as number;
  const payoutYear = ctx.profile.birthYear + input.payoutStartAge;
  const months = payoutYear * 12 - start;

  const subsidy = employerSubsidy(input, ctx.legal);
  const extra = input.employerContributionMonthly;
  const rate = input.employeeContributionMonthlyGross + subsidy + extra;
  const increase = 1 + (input.annualContributionIncreasePercent ?? 0) / 100;
  const startYear = Math.floor(start / 12);
  const taxFreeLimit = ctx.legal.social.occupationalTaxFreeMonthly;
  const svFreeLimit = ctx.legal.social.occupationalSocialInsuranceFreeMonthly;

  const gross = ctx.assumptions.returnScenarios[scenario];
  const modelNet = gross - input.costPercentPerYear;
  const guarantee = input.guaranteedRatePercent;
  const netReturn = guarantee !== undefined ? Math.max(modelNet, guarantee) : modelNet;
  const growth = Math.pow(1 + netReturn / 100, 1 / 12);

  let value = 0;
  let contributed = 0;
  const series: ProjectionResult['series'] = [{ month: 0, contributed: 0, value: 0 }];
  const yearly: OccupationalYear[] = [];
  let employeeTotal = 0;
  let subsidyTotal = 0;
  let pointsBase = 0;
  let maxRate = rate;
  let conversionCapped = false;
  let rateM = rate;
  let convM = input.employeeContributionMonthlyGross;
  let subsidyM = subsidy;
  let lastK = -1;
  for (let m = 1; m <= months; m++) {
    const k = Math.floor((start + m - 1) / 12) - startYear;
    if (k !== lastK) {
      lastK = k;
      const raised = input.employeeContributionMonthlyGross * Math.pow(increase, k);
      convM = Math.min(raised, taxFreeLimit);
      if (raised > taxFreeLimit) conversionCapped = true;
      subsidyM = employerSubsidy({ ...input, employeeContributionMonthlyGross: convM }, ctx.legal);
      rateM = convM + subsidyM + extra;
      maxRate = Math.max(maxRate, rateM);
    }
    employeeTotal += convM;
    subsidyTotal += subsidyM;
    pointsBase += Math.min(convM, svFreeLimit);
    value = Math.max(0, (value + rateM) * growth);
    contributed += rateM;
    series.push({ month: m, contributed, value });
    const idx = start + m - 1;
    if (idx % 12 === 11 || m === months) {
      yearly.push({ year: Math.floor(idx / 12), contributed, valueEnd: value });
    }
  }

  const planResult = payoutPlan(
    value,
    input.payoutStartAge,
    input.payoutEndAge,
    ctx.assumptions.payoutPhaseReturnPercent,
  );
  if (!planResult.ok) return { ok: false, issues: planResult.issues };
  const plan = planResult.plan;

  const yearsToPayout = payoutYear - ctx.currentYear;
  const inflationFactor = Math.pow(1 + ctx.assumptions.inflationPercent / 100, yearsToPayout);
  const nominal = netPension(
    plan.monthly,
    'occupational',
    {
      retirementYear: payoutYear,
      thresholdScale: inflationFactor,
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

  const warnings: string[] = ['thresholds_indexed'];
  if (maxRate > taxFreeLimit) warnings.push('contributions_above_tax_free');
  if (conversionCapped) warnings.push('conversion_capped_at_tax_free_limit');
  const compulsory = ctx.assumptions.health.mode === 'statutoryCompulsory';
  const used = compulsory ? [...COMMON_KEYS, ...COMPULSORY_KEYS] : COMMON_KEYS;
  for (const k of ctx.legal.unverified) {
    if (used.includes(k)) warnings.push(`unverified:${k}`);
  }

  return {
    ok: true,
    result: {
      productId: PRODUCT_ID,
      scenario,
      series,
      capitalAtRetirement: value,
      monthlyPensionNominal: nominal.gross,
      monthlyPensionReal: real.gross,
      taxAndContributions: real.tax + real.contributions,
      taxableMonthlyReal: real.taxable,
      contributionsMonthlyReal: real.contributions,
      fixedTaxMonthlyReal: 0,
      netMonthlyPensionReal: real.net,
      warnings,
      details: {
        subsidyMonthly: subsidy,
        employerExtraMonthly: extra,
        intoContractMonthly: rate,
        netEffort: occupationalNetEffort(
          input.employeeContributionMonthlyGross,
          ctx.assumptions,
          ctx.legal,
        ),
        grossReturnPercent: gross,
        netReturnPercentUsed: netReturn,
        guaranteeActive: guarantee !== undefined && guarantee > modelNet,
        payoutYear,
        yearsToPayout,
        inflationFactor,
        employeeTotal,
        statutoryLossMonthlyToday:
          (pointsBase * ctx.legal.pension.pensionValue) / ctx.legal.pension.averageEarningsYearly,
        subsidyTotal,
        employerExtraTotal: extra * months,
        planMonths: plan.months,
        yearly,
        nominal,
        real,
        healthAllowanceReal: ctx.legal.social.occupationalHealthAllowanceMonthly,
        careThresholdReal: ctx.legal.social.occupationalCareThresholdMonthly,
      },
    },
  };
}

export const occupationalProjector: ProductProjector<OccupationalInput, OccupationalProjection> = {
  type: PRODUCT_ID,
  validate: validateOccupational,
  project: projectOccupational,
};
