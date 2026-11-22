import type { EtfPlanInput, TaxAssumptions } from '../src';

export const baseInput: EtfPlanInput = {
  initialCapital: 0,
  monthlyContribution: 100,
  annualContributionIncreasePercent: 0,
  durationYears: 10,
  lumpSums: [],
  ter: 0,
  entryFeePercent: 0,
  custodyFeeEurPerYear: 0,
  custodyFeePercentPerYear: 0,
  returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
  inflationPercent: 2,
  taxEnabled: false,
};

export const taxAssumptions: TaxAssumptions = {
  capitalGainsTaxRate: 26.375,
  partialExemptionRate: 30,
  taxFreeAllowance: 1000,
};
