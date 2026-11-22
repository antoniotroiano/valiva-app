import type { AdvanceLumpSumParameters, TaxAssumptions, ValidationIssue } from '../shared/types';

/** Base interest in percent that applies to the advance lump sum of `year`. */
export function baseInterestFor(parameters: AdvanceLumpSumParameters, year: number): number {
  return parameters.baseInterestByYear[year] ?? parameters.assumedBaseInterestPercent;
}

/** True if any year from `firstYear` to `lastYear` has no published base interest. */
export function usesAssumedBaseInterest(
  parameters: AdvanceLumpSumParameters,
  firstYear: number,
  lastYear: number,
): boolean {
  for (let y = firstYear; y <= lastYear; y++) {
    if (parameters.baseInterestByYear[y] === undefined) return true;
  }
  return false;
}

/**
 * Advance lump sum of one year (§18 InvStG): the base earnings `held * base interest * 70 %`, limited to the
 * gain of the year, never negative. `held` is the value at the start of the year, with purchases of the
 * year weighted by the months they were held (`(13 - purchase month) / 12`).
 */
export function advanceLumpSum(
  parameters: AdvanceLumpSumParameters,
  year: number,
  held: number,
  gain: number,
): number {
  const interest = baseInterestFor(parameters, year);
  if (!(interest > 0) || !(held > 0) || !(gain > 0)) return 0;
  const baseEarnings = (held * interest * parameters.baseEarningsFactorPercent) / 10000;
  return Math.min(baseEarnings, gain);
}

/** Tax on an advance lump sum alone: partial exemption, then the allowance, then the rate. */
export function advanceLumpSumTax(lumpSum: number, tax: TaxAssumptions): number {
  const taxable = Math.max(
    0,
    lumpSum * (1 - tax.partialExemptionRate / 100) - tax.taxFreeAllowance,
  );
  return (taxable * tax.capitalGainsTaxRate) / 100;
}

/** The parameters if the plan uses the advance lump sum and tax applies; otherwise `undefined`. */
export function activeAdvanceLumpSum(
  plan: { taxEnabled: boolean; advanceLumpSum?: boolean },
  tax: TaxAssumptions,
): AdvanceLumpSumParameters | undefined {
  return plan.taxEnabled && plan.advanceLumpSum === true ? tax.advanceLumpSum : undefined;
}

/** Issues if the plan asks for the advance lump sum but the parameters are missing or unusable. */
export function validateAdvanceLumpSum(
  plan: { taxEnabled: boolean; advanceLumpSum?: boolean },
  tax: TaxAssumptions,
): ValidationIssue[] {
  if (!plan.taxEnabled || plan.advanceLumpSum !== true) return [];
  const p = tax.advanceLumpSum;
  if (p === undefined) return [{ field: 'tax.advanceLumpSum', code: 'required' }];
  const issues: ValidationIssue[] = [];
  const range = (field: string, v: number, min: number, max: number): void => {
    if (!Number.isFinite(v)) issues.push({ field, code: 'not_finite' });
    else if (v < min || v > max) issues.push({ field, code: 'out_of_range', min, max });
  };
  range('tax.advanceLumpSum.baseEarningsFactorPercent', p.baseEarningsFactorPercent, 0, 100);
  range('tax.advanceLumpSum.assumedBaseInterestPercent', p.assumedBaseInterestPercent, -100, 100);
  for (const [year, rate] of Object.entries(p.baseInterestByYear)) {
    range(`tax.advanceLumpSum.baseInterestByYear.${year}`, rate, -100, 100);
  }
  if (!Number.isInteger(p.startYear)) {
    issues.push({ field: 'tax.advanceLumpSum.startYear', code: 'not_integer' });
  }
  if (!Number.isInteger(p.startMonth) || p.startMonth < 1 || p.startMonth > 12) {
    issues.push({ field: 'tax.advanceLumpSum.startMonth', code: 'out_of_range', min: 1, max: 12 });
  }
  return issues;
}
