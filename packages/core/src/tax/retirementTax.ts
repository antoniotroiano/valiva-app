import { incomeTax } from './incomeTax';
import type { IncomeTaxParameters } from './incomeTax';

/** One income of a person in one year: monthly amounts in one consistent unit (for example today's purchasing power). */
export type TaxableIncome = {
  id: string;
  /** Part of the monthly pension that is subject to income tax. */
  taxableMonthly: number;
  /** Health and care contributions paid on it per month; deductible as special expenses (approximation). */
  contributionsMonthly: number;
};

/** Income of a person's other products that runs in the same year, in today's purchasing power. */
export type OtherIncome = {
  taxableMonthlyReal: number;
  contributionsMonthlyReal: number;
};

export const NO_OTHER_INCOME: OtherIncome = { taxableMonthlyReal: 0, contributionsMonthlyReal: 0 };

export type RetirementTax = {
  /** Taxable income after lump sums and deductions, per year, rounded as the tax code requires. */
  taxableIncomeYearly: number;
  taxYearly: number;
  taxMonthly: number;
  /** Monthly tax share per income id; shares are proportional to the taxable amount and sum to `taxMonthly`. */
  byId: Record<string, number>;
};

/**
 * Income tax on the sum of all pension incomes of one person in one year (single assessment).
 * Taxable income = sum of the taxable parts, minus the lump sum for income-related expenses (capped at the
 * income), minus the paid health and care contributions, minus the special expenses lump sum, never below 0.
 * The tax of the sum is split across the incomes in proportion to their taxable amount, so the result does not
 * depend on how the same total is divided. Solidarity surcharge and church tax are not modelled.
 */
export function retirementIncomeTax(
  incomes: TaxableIncome[],
  t: IncomeTaxParameters,
): RetirementTax {
  const sum = (pick: (i: TaxableIncome) => number) =>
    incomes.reduce((s, i) => s + (Number.isFinite(pick(i)) ? Math.max(0, pick(i)) : 0), 0);
  const taxable = 12 * sum((i) => i.taxableMonthly);
  const contributions = 12 * sum((i) => i.contributionsMonthly);

  const afterLumpSum = taxable - Math.min(t.pensionIncomeLumpSumDeductionYearly, taxable);
  const taxableIncomeYearly = Math.max(
    0,
    afterLumpSum - contributions - t.specialExpensesLumpSumYearly,
  );
  const taxYearly = incomeTax(taxableIncomeYearly, t);
  const taxMonthly = taxYearly / 12;

  const byId: Record<string, number> = {};
  for (const i of incomes) byId[i.id] = 0;
  if (taxable > 0) {
    for (const i of incomes) {
      byId[i.id] = (taxMonthly * Math.max(0, i.taxableMonthly)) / (taxable / 12);
    }
  }
  return { taxableIncomeYearly, taxYearly, taxMonthly, byId };
}

/**
 * Extra tax caused by a one-off taxable payout in a year in which the monthly incomes run on:
 * tax with the payout minus tax without it. Fully taxable (no five-year rule, a simplification).
 */
export function lumpSumTax(
  incomes: TaxableIncome[],
  lumpSumTaxable: number,
  t: IncomeTaxParameters,
): number {
  if (!(lumpSumTaxable > 0)) return 0;
  const without = retirementIncomeTax(incomes, t);
  const withIt = incomeTax(without.taxableIncomeYearly + lumpSumTaxable, t);
  return withIt - without.taxYearly;
}
