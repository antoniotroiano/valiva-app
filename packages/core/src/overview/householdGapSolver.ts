import type { IncomeTaxParameters } from '../tax/incomeTax';
import type { GapScenarioResult, GapSolveResult } from './gapSolver';
import type { Household } from '../household/household';
import type { JointAssessmentInput } from '../tax/jointTax';
import { householdOverview } from './householdOverview';
import type { SurvivorParameters } from './householdOverview';
import type { OverviewProductInput } from './overview';
import { solveRequiredContribution } from '../goals/solver';
import { SCENARIO_NAMES } from '../shared/types';
import type { ScenarioName, ValidationIssue } from '../shared/types';

/**
 * Smallest whole-cent additional monthly ETF rate of one person per scenario so that the household's
 * net pension in the snapshot year (the last person's retirement start) reaches the common wish (`11` §4.2).
 * `buildEtf(monthly)` returns that person's ETF product; all other products (also those of the other
 * persons) are taken as given. The ETF product is always counted. Pure; invalid input is returned as data.
 */
export function solveHouseholdGapContribution(
  household: Household,
  personId: string,
  productsByPerson: Record<string, OverviewProductInput[]>,
  buildEtf: (monthly: number) => OverviewProductInput,
  currentMonthly: number,
  currentYear: number,
  incomeTaxParameters: IncomeTaxParameters,
  survivorParameters?: SurvivorParameters,
  jointParameters?: JointAssessmentInput,
): GapSolveResult {
  const desired = household.desiredMonthlyIncomeToday;
  if (desired === undefined) {
    return { ok: false, issues: [{ field: 'desiredMonthlyIncomeToday', code: 'required' }] };
  }
  if (!household.persons.some((p) => p.id === personId)) {
    return { ok: false, issues: [{ field: 'personId', code: 'required' }] };
  }
  const others = (productsByPerson[personId] ?? []).filter((p) => p.productId !== 'etf');

  const netAt = (monthly: number, scenario: ScenarioName): number | ValidationIssue[] => {
    const etf = { ...buildEtf(monthly), enabled: true };
    const out = householdOverview(
      household,
      { ...productsByPerson, [personId]: [etf, ...others] },
      currentYear,
      incomeTaxParameters,
      survivorParameters,
      jointParameters,
    );
    if (!out.ok) return out.issues;
    const entry = out.result.persons.find((e) => e.personId === personId);
    const status = entry?.overview.products.find((p) => p.productId === 'etf');
    if (status?.status === 'invalid') return status.issues ?? [];
    return out.result.scenarios[scenario].snapshot.netMonthlyPensionReal;
  };

  const base = netAt(currentMonthly, 'neutral');
  if (typeof base !== 'number') return { ok: false, issues: base };

  const scenarios = {} as Record<ScenarioName, GapScenarioResult>;
  for (const name of SCENARIO_NAMES) {
    const solved = solveRequiredContribution((extra) => {
      const v = netAt(currentMonthly + extra, name);
      return typeof v === 'number' ? v : -Infinity;
    }, desired);
    scenarios[name] = { ...solved, newMonthly: currentMonthly + solved.monthly };
  }
  return { ok: true, desiredMonthlyIncomeToday: desired, currentMonthly, scenarios };
}
