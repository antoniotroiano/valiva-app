import type { IncomeTaxParameters } from './incomeTax';
import { overview } from './overview';
import type { OverviewProductInput } from './overview';
import type { GlobalAssumptions, Profile } from './profile';
import { solveRequiredContribution } from './solver';
import type { SolveResult } from './goalTypes';
import { SCENARIO_NAMES } from './types';
import type { ScenarioName, ValidationIssue } from './types';

export type GapScenarioResult = SolveResult & {
  /** Current ETF start rate plus the additional rate (only meaningful unless `unreachable`). */
  newMonthly: number;
};

export type GapSolveResult =
  | { ok: false; issues: ValidationIssue[] }
  | {
      ok: true;
      desiredMonthlyIncomeToday: number;
      currentMonthly: number;
      scenarios: Record<ScenarioName, GapScenarioResult>;
    };

/**
 * Smallest whole-cent additional monthly ETF rate per scenario so that the overview's net pension at the
 * target retirement age reaches the desired income (`10` §5.3). `buildEtf(monthly)` returns the ETF product
 * for a start rate; the other products are taken as given. The ETF product is always counted, whatever its
 * `enabled` flag says. Pure; invalid inputs are returned as data.
 */
export function solveGapContribution(
  otherProducts: OverviewProductInput[],
  buildEtf: (monthly: number) => OverviewProductInput,
  currentMonthly: number,
  profile: Profile,
  assumptions: GlobalAssumptions,
  currentYear: number,
  incomeTaxParameters: IncomeTaxParameters,
): GapSolveResult {
  const desired = profile.desiredMonthlyIncomeToday;
  if (desired === undefined) {
    return { ok: false, issues: [{ field: 'desiredMonthlyIncomeToday', code: 'required' }] };
  }
  const netAt = (monthly: number, scenario: ScenarioName): number | ValidationIssue[] => {
    const etf = { ...buildEtf(monthly), enabled: true };
    const out = overview(
      [etf, ...otherProducts],
      profile,
      assumptions,
      currentYear,
      incomeTaxParameters,
    );
    if (!out.ok) return out.issues;
    const status = out.result.products.find((p) => p.productId === 'etf');
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
