import type { ChurchTaxParameters } from './taxConfig';
import type { ChurchTaxChoice, TaxAssumptions, TaxBreakdown } from '../shared/types';

/**
 * Simplified tax at the end of the plan (sale of everything):
 * taxable = max(0, gain * (1 - partialExemption) - allowance); tax = taxable * rate.
 * The rate may include church tax (`capitalGainsRateWithChurchTax`).
 *
 * With `advance` (advance lump-sum tax, Vorabpauschale, §19 InvStG) the taxes already paid from the depot
 * count as sold at cost: the gain is `final value - contributions + taxPaid`, and the advance lump sums
 * (before partial exemption) reduce it before the partial exemption applies.
 */
export function computeCapitalGainsTax(
  grossFinalValue: number,
  totalContributions: number,
  assumptions: TaxAssumptions,
  advance?: { lumpSumTotal: number; taxPaid: number },
): TaxBreakdown {
  const gain = grossFinalValue - totalContributions + (advance?.taxPaid ?? 0);
  const base = gain - (advance?.lumpSumTotal ?? 0);
  if (gain <= 0 || base <= 0) return { gain, taxableGain: 0, tax: 0 };
  const taxableGain = Math.max(
    0,
    base * (1 - assumptions.partialExemptionRate / 100) - assumptions.taxFreeAllowance,
  );
  return { gain, taxableGain, tax: (taxableGain * assumptions.capitalGainsTaxRate) / 100 };
}

/**
 * Total tax rate in percent on capital gains (§32d Abs. 1 EStG). Without church tax it is
 * `base * (1 + solidarity)`. With church tax rate `k` the income tax falls to `base / (1 + base * k)`
 * (the formula `(e - 4q) / (4 + k)` with base 25 %), and the solidarity surcharge and the church tax are
 * charged on that reduced amount: 9 % gives 27.995 %, 8 % gives 27.819 %.
 */
export function capitalGainsRateWithChurchTax(
  parameters: ChurchTaxParameters,
  choice: ChurchTaxChoice | undefined,
): number {
  const base = parameters.baseRate / 100;
  const solidarity = parameters.solidarityRate / 100;
  if (choice === undefined) return base * (1 + solidarity) * 100;
  const k = (choice === 'low' ? parameters.rateLow : parameters.rateHigh) / 100;
  const incomeTax = base / (1 + base * k);
  return incomeTax * (1 + solidarity + k) * 100;
}
