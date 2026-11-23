import { incomeTax } from './incomeTax';
import type { IncomeTaxParameters } from './incomeTax';
import type { JointAssessmentKey } from './legalConfig';
import type { TaxableIncome } from './retirementTax';
import type { ValidationIssue } from '../shared/types';

export type JointAssessmentParameters = Record<JointAssessmentKey, number>;

/**
 * What the household and overview functions take: the splitting values plus the keys of `LegalParameters.unverified`,
 * so an unverified value that shapes the result shows up as a warning (`unverified:jointAssessment.<key>`).
 */
export type JointAssessmentInput = JointAssessmentParameters & {
  unverified?: readonly string[];
};

/** Checks the resolved splitting values; the divisor must be a finite number of at least 1. */
export function validateJointAssessmentParameters(j: JointAssessmentParameters): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!Number.isFinite(j.splittingDivisor)) {
    issues.push({ field: 'jointAssessment.splittingDivisor', code: 'not_finite' });
  } else if (j.splittingDivisor < 1) {
    issues.push({ field: 'jointAssessment.splittingDivisor', code: 'out_of_range', min: 1 });
  }
  if (!Number.isFinite(j.specialExpensesLumpSumJointYearly)) {
    issues.push({ field: 'jointAssessment.specialExpensesLumpSumJointYearly', code: 'not_finite' });
  } else if (j.specialExpensesLumpSumJointYearly < 0) {
    issues.push({ field: 'jointAssessment.specialExpensesLumpSumJointYearly', code: 'negative' });
  }
  return issues;
}

export type JointRetirementTax = {
  /** Joint taxable income per year after lump sums and deductions (not yet halved). */
  taxableIncomeYearly: number;
  taxYearly: number;
  taxMonthly: number;
  /** Monthly share of each person; the two sum to `taxMonthly`. */
  shareA: number;
  shareB: number;
  /** Monthly tax share per income id; proportional to the taxable amount of both persons, sums to `taxMonthly`. */
  byIdA: Record<string, number>;
  byIdB: Record<string, number>;
};

const sum = (incomes: TaxableIncome[], pick: (i: TaxableIncome) => number): number =>
  incomes.reduce((s, i) => s + (Number.isFinite(pick(i)) ? Math.max(0, pick(i)) : 0), 0);

/**
 * Joint taxable income of two persons per year (`12` months of the monthly amounts). `b` is `null` in the year
 * after the death of the partner: the survivor is assessed alone with the splitting tariff (§32a Abs. 6 EStG),
 * so only the single special expenses lump sum applies (reading of §10c, not stated for this case).
 */
function jointTaxableIncome(
  a: TaxableIncome[],
  b: TaxableIncome[] | null,
  t: IncomeTaxParameters,
  j: JointAssessmentParameters,
): number {
  // The pension lump sum applies to each person's own income, up to that income.
  const afterLumpSum = (incomes: TaxableIncome[]) => {
    const taxable = 12 * sum(incomes, (i) => i.taxableMonthly);
    return taxable - Math.min(t.pensionIncomeLumpSumDeductionYearly, taxable);
  };
  const partner = b ?? [];
  const contributions =
    12 * (sum(a, (i) => i.contributionsMonthly) + sum(partner, (i) => i.contributionsMonthly));
  const special = b === null ? t.specialExpensesLumpSumYearly : j.specialExpensesLumpSumJointYearly;
  return Math.max(0, afterLumpSum(a) + afterLumpSum(partner) - contributions - special);
}

/** Tariff on the divided income, multiplied by the divisor (§32a Abs. 5 EStG). */
function splittingTax(
  jointTaxable: number,
  t: IncomeTaxParameters,
  j: JointAssessmentParameters,
): number {
  return j.splittingDivisor * incomeTax(jointTaxable / j.splittingDivisor, t);
}

/**
 * Income tax of two jointly assessed persons in one year (splitting, §32a Abs. 5 EStG): the taxable incomes of
 * both (after each person's pension lump sum, minus the paid contributions of both and the joint special
 * expenses lump sum) are added, divided by the divisor, taxed with the tariff and multiplied by the divisor.
 * The tax is split across all incomes of both persons in proportion to their taxable amount, so the shares sum
 * to the total and do not depend on how the same amounts are divided. Solidarity surcharge and church tax are
 * not modelled. Pure.
 */
export function jointRetirementIncomeTax(
  a: TaxableIncome[],
  b: TaxableIncome[] | null,
  t: IncomeTaxParameters,
  j: JointAssessmentParameters,
): JointRetirementTax {
  const taxableIncomeYearly = jointTaxableIncome(a, b, t, j);
  const taxYearly = splittingTax(taxableIncomeYearly, t, j);
  const taxMonthly = taxYearly / 12;
  const partner = b ?? [];
  const taxableMonthly = sum(a, (i) => i.taxableMonthly) + sum(partner, (i) => i.taxableMonthly);

  const byIdA: Record<string, number> = {};
  const byIdB: Record<string, number> = {};
  for (const i of a) byIdA[i.id] = 0;
  for (const i of partner) byIdB[i.id] = 0;
  let shareA = 0;
  let shareB = 0;
  if (taxableMonthly > 0) {
    const part = (i: TaxableIncome) =>
      (taxMonthly * Math.max(0, i.taxableMonthly)) / taxableMonthly;
    for (const i of a) {
      byIdA[i.id] = part(i);
      shareA += byIdA[i.id] as number;
    }
    for (const i of partner) {
      byIdB[i.id] = part(i);
      shareB += byIdB[i.id] as number;
    }
  }
  return { taxableIncomeYearly, taxYearly, taxMonthly, shareA, shareB, byIdA, byIdB };
}

/**
 * Extra tax of a one-off taxable payout in a year in which two jointly assessed persons have monthly incomes:
 * joint tax with the payout minus without it. Fully taxable (no five-year rule, a simplification as in
 * `lumpSumTax`).
 */
export function jointLumpSumTax(
  a: TaxableIncome[],
  b: TaxableIncome[] | null,
  lumpSumTaxable: number,
  t: IncomeTaxParameters,
  j: JointAssessmentParameters,
): number {
  if (!(lumpSumTaxable > 0)) return 0;
  const base = jointTaxableIncome(a, b, t, j);
  return splittingTax(base + lumpSumTaxable, t, j) - splittingTax(base, t, j);
}
