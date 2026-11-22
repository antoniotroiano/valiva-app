import { validateAdvanceLumpSum } from '../etf/advanceLumpSum';
import { calculateEtfScenario } from '../etf/calculate';
import { solveRequiredContribution } from './solver';
import { SCENARIO_NAMES } from '../shared/types';
import type { EtfTargetResult, EtfTargetScenarioResult, TargetBasis } from './goalTypes';
import type { EtfPlanInput, ScenarioName, TaxAssumptions, ValidationIssue } from '../shared/types';
import { validateEtfPlanInput } from '../etf/validation';

/**
 * Required starting monthly rate per scenario so that the after-tax final value reaches
 * `targetValue`. The annual increase and all other inputs stay as they are; only
 * `monthlyContribution` is solved for. A `real` target is given in today's purchasing power and
 * is inflated to nominal terms with the plan's inflation and duration.
 */
export function solveEtfRequiredContribution(
  input: EtfPlanInput,
  tax: TaxAssumptions,
  targetValue: number,
  basis: TargetBasis,
): EtfTargetResult {
  const issues: ValidationIssue[] = [
    ...validateEtfPlanInput(input),
    ...validateAdvanceLumpSum(input, tax),
  ];
  if (!Number.isFinite(targetValue)) issues.push({ field: 'targetValue', code: 'not_finite' });
  else if (targetValue <= 0) issues.push({ field: 'targetValue', code: 'not_positive' });
  if (issues.length > 0) return { ok: false, issues };

  const targetNominal =
    basis === 'real'
      ? targetValue * Math.pow(1 + input.inflationPercent / 100, input.durationYears)
      : targetValue;

  const scenarios = {} as Record<ScenarioName, EtfTargetScenarioResult>;
  for (const name of SCENARIO_NAMES) {
    const solved = solveRequiredContribution(
      (monthly) =>
        calculateEtfScenario({ ...input, monthlyContribution: monthly }, name, tax)
          .finalValueAfterTax,
      targetNominal,
    );
    scenarios[name] = {
      ...solved,
      differenceToCurrent: solved.monthly - input.monthlyContribution,
    };
  }
  return { ok: true, targetNominal, currentMonthly: input.monthlyContribution, scenarios };
}
