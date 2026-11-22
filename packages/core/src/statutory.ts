import { IssueCollector } from './issues';
import { netPension } from './netPension';
import type { NetPension } from './netPension';
import type { LegalParameters } from './legalConfig';
import type {
  ProductProjector,
  ProjectionContext,
  ProjectionOutcome,
  ProjectionResult,
} from './projection';
import { otherIncomeOf } from './projection';
import type { ValidationIssue } from './types';

export type StatutoryInput = {
  /** "Regelaltersrente bei Beitragszahlung bis zur Altersgrenze" from the pension statement, today's values. */
  projectedMonthlyPensionToday: number;
  statementYear: number;
  /**
   * Optional: the monthly pension for exactly this retirement age from the pension statement (today's values).
   * It already contains the deduction or supplement and the changed number of contribution years, so no
   * factor is applied to it. 0 or absent = not entered, the amount above is adjusted by the factor.
   */
  projectedMonthlyPensionAtRetirementAgeToday?: number;
  /** Whole years, 63 to 70. */
  retirementAge: number;
  /**
   * Optional override for birth years before the config threshold (1964), for special cases such as part-time
   * work for older employees. Without it the age follows from the birth year (§235 SGB VI, from the config).
   */
  regularRetirementAge?: number;
};

export const STATUTORY_LIMITS = {
  retirementAge: { min: 63, max: 70 },
  regularAge: { min: 65, max: 67 },
  statementYear: { min: 2000, max: 2100 },
} as const;

export type PensionPathPoint = {
  year: number;
  age: number;
  nominal: number;
  real: number;
};

export type StatutoryDetails = {
  retirementYear: number;
  retirementAge: number;
  regularRetirementAge: number;
  yearsToRetirement: number;
  /** Months before (negative) or after (positive) the regular retirement age. */
  monthsFromRegularAge: number;
  /** Signed percent applied to the pension: negative = deduction, positive = supplement. */
  adjustmentPercent: number;
  factor: number;
  inflationFactor: number;
  /** Pension at the start in nominal euros before deduction or supplement. */
  nominalBeforeFactor: number;
  /** True if the amount entered for the retirement age was used instead of statement amount x factor. */
  usedAmountAtRetirementAge: boolean;
  nominal: NetPension;
  real: NetPension;
  /** Hochrechnung until retirement; the last point includes the deduction or supplement. */
  path: PensionPathPoint[];
};

export type StatutoryProjection = ProjectionResult & { details: StatutoryDetails };

const PRODUCT_ID = 'statutory';
/** Legal values the statutory projection uses; only these can raise an `unverified:` warning. */
const USED_KEYS = [
  'pension.regularRetirementAge',
  'pension.regularAgeFromBirthYear',
  'pension.regularAgeBeforeRaise',
  'pension.regularAgeRaiseFirstBirthYear',
  'pension.regularAgeRaisePhase1LastBirthYear',
  'pension.regularAgeRaisePhase1MonthsPerYear',
  'pension.regularAgeRaisePhase2MonthsPerYear',
  'pension.earlyReductionPercentPerMonth',
  'pension.maxEarlyReductionPercent',
  'pension.lateIncreasePercentPerMonth',
  'pension.taxableShareBasePercent',
  'pension.taxableShareBaseYear',
  'pension.taxableShareIncreasePerYear',
  'pension.taxableShareMaxPercent',
  'social.healthGeneralRatePercent',
  'social.careRatePercent',
  'social.careRateChildlessPercent',
];

/**
 * Regular retirement age in years (fractions are months) for a birth year, per §235 SGB VI: 65 before 1947, then
 * +1 month per birth year up to 1958 (66 years), +2 months per birth year up to 1963 (66 years 10 months),
 * and the config value from the first birth year with the final age (1964: 67).
 */
export function regularRetirementAgeFor(birthYear: number, p: LegalParameters['pension']): number {
  if (birthYear >= p.regularAgeFromBirthYear) return p.regularRetirementAge;
  if (birthYear < p.regularAgeRaiseFirstBirthYear) return p.regularAgeBeforeRaise;
  const phase1Years =
    Math.min(birthYear, p.regularAgeRaisePhase1LastBirthYear) - p.regularAgeRaiseFirstBirthYear + 1;
  const phase2Years = Math.max(0, birthYear - p.regularAgeRaisePhase1LastBirthYear);
  const months =
    phase1Years * p.regularAgeRaisePhase1MonthsPerYear +
    phase2Years * p.regularAgeRaisePhase2MonthsPerYear;
  return p.regularAgeBeforeRaise + months / 12;
}

function regularAge(input: StatutoryInput, ctx: ProjectionContext): number {
  const own = input.regularRetirementAge;
  if (ctx.profile.birthYear < ctx.legal.pension.regularAgeFromBirthYear && own !== undefined) {
    return own;
  }
  return regularRetirementAgeFor(ctx.profile.birthYear, ctx.legal.pension);
}

export function validateStatutory(
  input: StatutoryInput,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  const L = STATUTORY_LIMITS;
  if (c.finite('projectedMonthlyPensionToday', input.projectedMonthlyPensionToday)) {
    if (input.projectedMonthlyPensionToday < 0) {
      c.issues.push({ field: 'projectedMonthlyPensionToday', code: 'negative', min: 0 });
    }
  }
  const atAge = input.projectedMonthlyPensionAtRetirementAgeToday;
  if (atAge !== undefined && c.finite('projectedMonthlyPensionAtRetirementAgeToday', atAge)) {
    if (atAge < 0) {
      c.issues.push({
        field: 'projectedMonthlyPensionAtRetirementAgeToday',
        code: 'negative',
        min: 0,
      });
    }
  }
  c.integer('statementYear', input.statementYear, L.statementYear);
  c.integer('retirementAge', input.retirementAge, L.retirementAge);
  if (
    ctx.profile.birthYear < ctx.legal.pension.regularAgeFromBirthYear &&
    input.regularRetirementAge !== undefined
  ) {
    c.number('regularRetirementAge', input.regularRetirementAge, L.regularAge);
  }
  if (
    Number.isInteger(input.statementYear) &&
    Number.isInteger(input.retirementAge) &&
    Number.isFinite(ctx.profile.birthYear) &&
    ctx.profile.birthYear + input.retirementAge < input.statementYear
  ) {
    c.issues.push({
      field: 'retirementAge',
      code: 'before_statement_year',
      min: input.statementYear - ctx.profile.birthYear,
    });
  }
  if (
    Number.isInteger(input.retirementAge) &&
    Number.isFinite(ctx.profile.birthYear) &&
    ctx.profile.birthYear + input.retirementAge < ctx.currentYear
  ) {
    c.issues.push({
      field: 'retirementAge',
      code: 'before_current_year',
      min: ctx.currentYear - ctx.profile.birthYear,
    });
  }
  return c.issues;
}

/**
 * Statutory pension from the pension statement (`09` §5.2):
 * nominal = statement amount x (1 + adjustment)^years x factor, factor = 1 - 0.3 % per month before
 * the regular age (capped) or 1 + 0.5 % per month after it. That factor does not change the entitlement
 * points (known simplification). If the user enters the pension for the chosen retirement age from the
 * statement, that amount replaces `statement amount x factor` (it already has deduction and points).
 */
export function projectStatutory(
  input: StatutoryInput,
  ctx: ProjectionContext,
): ProjectionOutcome<StatutoryProjection> {
  const issues = [...validateStatutory(input, ctx)];
  if (issues.length > 0) return { ok: false, issues };

  const { pension } = ctx.legal;
  const regular = regularAge(input, ctx);
  const monthsFromRegular = Math.round((input.retirementAge - regular) * 12);
  const adjustmentPercent =
    monthsFromRegular < 0
      ? -Math.min(
          pension.earlyReductionPercentPerMonth * -monthsFromRegular,
          pension.maxEarlyReductionPercent,
        )
      : pension.lateIncreasePercentPerMonth * monthsFromRegular;
  const atAge = input.projectedMonthlyPensionAtRetirementAgeToday;
  const usedAmountAtRetirementAge = atAge !== undefined && atAge > 0;
  const factor = usedAmountAtRetirementAge ? 1 : 1 + adjustmentPercent / 100;

  const retirementYear = ctx.profile.birthYear + input.retirementAge;
  const years = retirementYear - input.statementYear;
  const growth = 1 + ctx.assumptions.pensionAdjustmentPercent / 100;
  // Real values use the purchasing power of the current year for all products (`10` §3), not the statement year.
  const inflation = 1 + ctx.assumptions.inflationPercent / 100;
  const inflationFactor = Math.pow(inflation, retirementYear - ctx.currentYear);
  const beforeFactor =
    (usedAmountAtRetirementAge ? (atAge as number) : input.projectedMonthlyPensionToday) *
    Math.pow(growth, years);
  const grossNominal = beforeFactor * factor;

  const nominal = netPension(
    grossNominal,
    'statutory',
    { retirementYear, realFactor: inflationFactor, other: otherIncomeOf(ctx, 'neutral') },
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

  const path: PensionPathPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const last = y === years;
    const n = last ? grossNominal : input.projectedMonthlyPensionToday * Math.pow(growth, y);
    path.push({
      year: input.statementYear + y,
      age: input.statementYear + y - ctx.profile.birthYear,
      nominal: n,
      real: n / Math.pow(inflation, input.statementYear + y - ctx.currentYear),
    });
  }

  const warnings = [
    ...nominal.warnings,
    ...(usedAmountAtRetirementAge ? ['statutory_amount_for_retirement_age'] : []),
    ...ctx.legal.unverified.filter((k) => USED_KEYS.includes(k)).map((k) => `unverified:${k}`),
  ];

  return {
    ok: true,
    result: {
      productId: PRODUCT_ID,
      scenario: 'neutral',
      series: [],
      monthlyPensionNominal: nominal.gross,
      monthlyPensionReal: real.gross,
      taxAndContributions: real.tax + real.contributions,
      taxableMonthlyReal: real.taxable,
      contributionsMonthlyReal: real.contributions,
      fixedTaxMonthlyReal: 0,
      netMonthlyPensionReal: real.net,
      warnings,
      details: {
        retirementYear,
        retirementAge: input.retirementAge,
        regularRetirementAge: regular,
        yearsToRetirement: years,
        monthsFromRegularAge: monthsFromRegular,
        adjustmentPercent: usedAmountAtRetirementAge ? 0 : adjustmentPercent,
        factor,
        inflationFactor,
        nominalBeforeFactor: beforeFactor,
        usedAmountAtRetirementAge,
        nominal,
        real,
        path,
      },
    },
  };
}

export const statutoryProjector: ProductProjector<StatutoryInput, StatutoryProjection> = {
  type: PRODUCT_ID,
  validate: validateStatutory,
  project: (input, ctx) => projectStatutory(input, ctx),
};
