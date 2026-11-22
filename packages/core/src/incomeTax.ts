import type { LegalParameters } from './legalConfig';

export type IncomeTaxParameters = LegalParameters['incomeTax'];

/**
 * Tariff income tax of §32a EStG for a yearly taxable income in EUR (single assessment). The taxable income
 * is rounded down to full euros and the result is rounded down to full euros, as the law prescribes.
 * Solidarity surcharge and church tax are not included. Negative or non-finite income gives 0.
 */
export function incomeTax(taxableIncomeYearly: number, t: IncomeTaxParameters): number {
  if (!Number.isFinite(taxableIncomeYearly) || taxableIncomeYearly <= t.basicAllowance) return 0;
  const x = Math.floor(taxableIncomeYearly);
  let tax: number;
  if (x <= t.zone2Limit) {
    const y = (x - t.basicAllowance) / 10000;
    tax = (t.zone2CoefficientY * y + t.zone2CoefficientBase) * y;
  } else if (x <= t.zone3Limit) {
    const z = (x - t.zone2Limit) / 10000;
    tax = (t.zone3CoefficientZ * z + t.zone3CoefficientBase) * z + t.zone3Constant;
  } else if (x <= t.zone4Limit) {
    tax = (t.zone4RatePercent / 100) * x - t.zone4Constant;
  } else {
    tax = (t.zone5RatePercent / 100) * x - t.zone5Constant;
  }
  return Math.floor(tax);
}
