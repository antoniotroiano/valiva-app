import type { EtfPlanInput, ValidationIssue } from '../shared/types';

export const LIMITS = {
  durationYears: { min: 1, max: 60 },
  percent: { min: -50, max: 100 },
} as const;

/** Validates input. Errors are returned as data, never thrown. */
export function validateEtfPlanInput(input: EtfPlanInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const finite = (field: string, v: number): boolean => {
    if (!Number.isFinite(v)) {
      issues.push({ field, code: 'not_finite' });
      return false;
    }
    return true;
  };
  const nonNegative = (field: string, v: number) => {
    if (finite(field, v) && v < 0) issues.push({ field, code: 'negative', min: 0 });
  };
  const percent = (field: string, v: number) => {
    if (finite(field, v) && (v < LIMITS.percent.min || v > LIMITS.percent.max)) {
      issues.push({ field, code: 'out_of_range', ...LIMITS.percent });
    }
  };

  nonNegative('initialCapital', input.initialCapital);
  nonNegative('monthlyContribution', input.monthlyContribution);
  nonNegative('custodyFeeEurPerYear', input.custodyFeeEurPerYear);
  percent('annualContributionIncreasePercent', input.annualContributionIncreasePercent);
  percent('ter', input.ter);
  percent('entryFeePercent', input.entryFeePercent);
  percent('custodyFeePercentPerYear', input.custodyFeePercentPerYear);
  percent('inflationPercent', input.inflationPercent);
  if (finite('entryFeePercent', input.entryFeePercent) && input.entryFeePercent >= 100) {
    issues.push({ field: 'entryFeePercent', code: 'out_of_range', max: 99.99 });
  }
  if (finite('ter', input.ter) && input.ter < 0) {
    issues.push({ field: 'ter', code: 'negative', min: 0 });
  }

  const years = input.durationYears;
  if (finite('durationYears', years)) {
    if (!Number.isInteger(years)) issues.push({ field: 'durationYears', code: 'not_integer' });
    else if (years < LIMITS.durationYears.min || years > LIMITS.durationYears.max) {
      issues.push({ field: 'durationYears', code: 'out_of_range', ...LIMITS.durationYears });
    }
  }

  for (const [name, rate] of Object.entries(input.returnScenarios)) {
    percent(`returnScenarios.${name}`, rate);
  }
  const { pessimistic, neutral, optimistic } = input.returnScenarios;
  if (pessimistic > neutral || neutral > optimistic) {
    issues.push({ field: 'returnScenarios', code: 'scenario_order' });
  }

  const rates = Object.values(input.returnScenarios);
  if (Number.isFinite(input.ter) && rates.every(Number.isFinite)) {
    const lowest = Math.min(...rates);
    // Net return of -100 % or less makes the monthly growth factor non-positive (NaN).
    if (lowest - input.ter <= -100) {
      issues.push({ field: 'ter', code: 'out_of_range', min: 0, max: lowest + 100 });
    }
  }

  const maxMonth = Number.isFinite(years) ? years * 12 : 0;
  input.lumpSums.forEach((l, i) => {
    nonNegative(`lumpSums.${i}.amount`, l.amount);
    if (!Number.isInteger(l.month) || l.month < 1 || l.month > maxMonth) {
      issues.push({ field: `lumpSums.${i}.month`, code: 'out_of_range', min: 1, max: maxMonth });
    }
  });

  return issues;
}
