import { IssueCollector } from '../shared/issues';
import type { ValidationIssue } from '../shared/types';
import type { ProjectionContext } from './projection';
import { validateWithdrawal } from './payout';
import type { WithdrawalSettings } from './payout';

/**
 * Input of people who already draw their pension (retiree mode, `16`). The fields are optional parts of the
 * existing block states: older files do not have them, a person in the planning mode never uses them.
 */

/** Statutory pension from the pension notice (`16` §3.2). */
export type StatutoryActualFields = {
  /** `actual` is the mode of a retired person; kept so that a switch back loses nothing. */
  mode?: 'projection' | 'actual';
  /** Gross pension per month (before health and care contributions), value of the current year. */
  actualMonthlyGross?: number;
  /** Annual pension of the year after the pension start; absent = approximation (`16` §5.2). */
  firstFullYearAnnual?: number;
};

/** Yearly adjustment of a running company pension: a fixed percentage or like the statutory pension. */
export type AnnuityAdjustment = { mode: 'fixed'; percent: number } | { mode: 'pension' };

/** Company pension of a retired person (`16` §3.3): a running pension or a rest capital with a payout plan. */
export type OccupationalRetiredFields = {
  retiredForm?: 'annuity' | 'capital';
  annuityMonthlyGross?: number;
  annuityAdjustment?: AnnuityAdjustment;
  /** Age (at the end of the year) at which the pension ends; absent or `lifelong` = for life. */
  annuityEndAge?: number | 'lifelong';
  capitalToday?: number;
  capitalEndAge?: number;
};

/** Retirement depot of a retired person (`16` §3.4): only a rest capital with a payout plan. */
export type DepotRetiredFields = {
  retiredCapitalToday?: number;
  retiredEndAge?: number;
};

/** ETF holding of a retired person (`16` §3.5): value today and the sum paid in (the latter is required). */
export type EtfHoldingFields = {
  holdingValue?: number;
  holdingContributions?: number;
};

export const RETIRED_LIMITS = {
  actualMonthlyGross: { min: 0, max: 20_000 },
  firstFullYearAnnual: { min: 0, max: 240_000 },
  annuityMonthlyGross: { min: 0, max: 20_000 },
  annuityPercent: { min: -50, max: 100 },
  capital: { min: 0, max: 5_000_000 },
  endAgeMax: 120,
  holdingValue: { min: 0, max: 50_000_000 },
  holdingContributions: { min: 0, max: 50_000_000 },
} as const;

export const ANNUITY_END_LIFELONG = 'lifelong';

/** Age (at the end of the year) of the person today; the payout of a retired person starts there. */
export function ageToday(ctx: ProjectionContext): number {
  return ctx.currentYear - ctx.profile.birthYear;
}

/** A required amount: missing is `required`, then finite and within the range. */
function required(
  c: IssueCollector,
  field: string,
  v: number | undefined,
  range: { min: number; max: number },
): boolean {
  if (v === undefined || v === null) {
    c.issues.push({ field, code: 'required' });
    return false;
  }
  c.number(field, v, range);
  return Number.isFinite(v);
}

function optional(
  c: IssueCollector,
  field: string,
  v: number | undefined,
  range: { min: number; max: number },
): void {
  if (v !== undefined && v !== null) c.number(field, v, range);
}

/**
 * An end age: an integer after today's age and at most 120. `end_not_after_today` if it is not after today,
 * `out_of_range` above the maximum. `min` is the lowest allowed age.
 */
function endAge(
  c: IssueCollector,
  field: string,
  v: number | undefined,
  today: number,
  min = today + 1,
): void {
  if (v === undefined || v === null) {
    c.issues.push({ field, code: 'required' });
    return;
  }
  if (!Number.isFinite(v)) {
    c.issues.push({ field, code: 'not_finite' });
    return;
  }
  if (!Number.isInteger(v)) {
    c.issues.push({ field, code: 'not_integer' });
    return;
  }
  if (v <= today) c.issues.push({ field, code: 'end_not_after_today', min: today + 1 });
  else if (v < min || v > RETIRED_LIMITS.endAgeMax) {
    c.issues.push({ field, code: 'out_of_range', min, max: RETIRED_LIMITS.endAgeMax });
  }
}

/** The legal values of the retiree mode must be resolved (`includeRetired`), else nothing can be computed. */
export function validateRetiredLegal(ctx: ProjectionContext): ValidationIssue[] {
  return ctx.legal.retired === undefined ? [{ field: 'legal', code: 'legal_values_missing' }] : [];
}

/** The person must be in the retiree mode, with a pension start that is not in the future. */
export function validateRetiredPerson(ctx: ProjectionContext): ValidationIssue[] {
  const p = ctx.profile;
  const year = p.retirementStartYear;
  if (p.retired !== true || year === undefined || !Number.isInteger(year)) {
    return [{ field: 'retirementStartYear', code: 'required' }];
  }
  if (year > ctx.currentYear) {
    return [
      { field: 'retirementStartYear', code: 'retired_start_in_future', max: ctx.currentYear },
    ];
  }
  return [];
}

export function validateStatutoryActual(
  input: StatutoryActualFields,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  c.issues.push(...validateRetiredPerson(ctx), ...validateRetiredLegal(ctx));
  const L = RETIRED_LIMITS;
  required(c, 'actualMonthlyGross', input.actualMonthlyGross, L.actualMonthlyGross);
  optional(c, 'firstFullYearAnnual', input.firstFullYearAnnual, L.firstFullYearAnnual);
  return c.issues;
}

export function validateOccupationalRetired(
  input: OccupationalRetiredFields,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  c.issues.push(...validateRetiredPerson(ctx));
  const L = RETIRED_LIMITS;
  const today = ageToday(ctx);
  if (input.retiredForm === 'capital') {
    required(c, 'capitalToday', input.capitalToday, L.capital);
    endAge(c, 'capitalEndAge', input.capitalEndAge, today);
    return c.issues;
  }
  required(c, 'annuityMonthlyGross', input.annuityMonthlyGross, L.annuityMonthlyGross);
  const adj = input.annuityAdjustment;
  if (adj !== undefined && adj !== null) {
    if (adj.mode === 'fixed') c.number('annuityAdjustment.percent', adj.percent, L.annuityPercent);
    else if (adj.mode !== 'pension')
      c.issues.push({ field: 'annuityAdjustment', code: 'required' });
  }
  const end = input.annuityEndAge;
  if (end !== undefined && end !== null && end !== ANNUITY_END_LIFELONG) {
    endAge(c, 'annuityEndAge', end, today);
  }
  return c.issues;
}

export function validateDepotRetired(
  input: DepotRetiredFields,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  c.issues.push(...validateRetiredPerson(ctx));
  const today = ageToday(ctx);
  required(c, 'retiredCapitalToday', input.retiredCapitalToday, RETIRED_LIMITS.capital);
  endAge(c, 'retiredEndAge', input.retiredEndAge, today, ctx.legal.depot.payoutEndAgeMin);
  return c.issues;
}

/** Fields of the ETF holding that the projector needs besides the entered values. */
export type EtfHoldingValidationInput = EtfHoldingFields & {
  payoutEndAge: number;
  withdrawal?: WithdrawalSettings;
  tax: { capitalGainsTaxRate: number; partialExemptionRate: number; taxFreeAllowance: number };
};

export function validateEtfHolding(
  input: EtfHoldingValidationInput,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  c.issues.push(...validateRetiredPerson(ctx));
  const L = RETIRED_LIMITS;
  required(c, 'holdingValue', input.holdingValue, L.holdingValue);
  required(c, 'holdingContributions', input.holdingContributions, L.holdingContributions);
  endAge(c, 'payoutEndAge', input.payoutEndAge, ageToday(ctx));
  c.number('tax.capitalGainsTaxRate', input.tax.capitalGainsTaxRate, { min: 0, max: 100 });
  c.number('tax.partialExemptionRate', input.tax.partialExemptionRate, { min: 0, max: 100 });
  c.number('tax.taxFreeAllowance', input.tax.taxFreeAllowance, { min: 0 });
  c.issues.push(...validateWithdrawal(input.withdrawal));
  return c.issues;
}
