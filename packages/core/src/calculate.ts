import { activeAdvanceLumpSum, validateAdvanceLumpSum } from './advanceLumpSum';
import { projectEtfScenario } from './etf';
import { computeCapitalGainsTax } from './tax';
import { SCENARIO_NAMES } from './types';
import type {
  EtfPlanInput,
  EtfPlanResult,
  EtfScenarioResult,
  ScenarioName,
  TaxAssumptions,
} from './types';
import { validateEtfPlanInput } from './validation';

/** Projects one scenario including tax and real value. Assumes validated input. */
export function calculateEtfScenario(
  input: EtfPlanInput,
  name: ScenarioName,
  tax: TaxAssumptions,
): EtfScenarioResult {
  const inflation = 1 + input.inflationPercent / 100;
  const parameters = activeAdvanceLumpSum(input, tax);
  const base = projectEtfScenario(
    input,
    name,
    undefined,
    parameters ? { parameters, tax } : undefined,
  );
  const t = input.taxEnabled
    ? computeCapitalGainsTax(
        base.grossFinalValue,
        base.totalContributions,
        tax,
        parameters
          ? { lumpSumTotal: base.advanceLumpSumTotal ?? 0, taxPaid: base.advanceTaxPaid ?? 0 }
          : undefined,
      )
    : { gain: base.grossFinalValue - base.totalContributions, taxableGain: 0, tax: 0 };
  const finalValueAfterTax = base.grossFinalValue - t.tax;
  return {
    ...base,
    gainBeforeTax: t.gain,
    tax: t.tax,
    finalValueAfterTax,
    finalValueReal: finalValueAfterTax / Math.pow(inflation, input.durationYears),
  };
}

/** Validates, then projects all three scenarios. Returns issues as data on invalid input. */
export function calculateEtfPlan(input: EtfPlanInput, tax: TaxAssumptions): EtfPlanResult {
  const issues = [...validateEtfPlanInput(input), ...validateAdvanceLumpSum(input, tax)];
  if (issues.length > 0) return { ok: false, issues };

  const scenarios = {} as Record<ScenarioName, EtfScenarioResult>;
  for (const name of SCENARIO_NAMES) scenarios[name] = calculateEtfScenario(input, name, tax);
  return { ok: true, scenarios };
}
