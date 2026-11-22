import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  overview,
  projectEtfWithPayout,
  projectStatutory,
  solveGapContribution,
} from '../src';
import type {
  EtfPlanInput,
  EtfProjectorInput,
  OverviewProductInput,
  ProjectionResult,
  ScenarioName,
} from '../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE, STATUTORY } from './pensionFixtures';

const PLAN: EtfPlanInput = {
  initialCapital: 0,
  monthlyContribution: 100,
  annualContributionIncreasePercent: 0,
  durationYears: 26,
  lumpSums: [],
  ter: 0.2,
  entryFeePercent: 0,
  custodyFeeEurPerYear: 0,
  custodyFeePercentPerYear: 0,
  returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
  inflationPercent: 2,
  taxEnabled: true,
};
const TAX = { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 };

function etf(monthly: number, withdrawal?: EtfProjectorInput['withdrawal']): OverviewProductInput {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = projectEtfWithPayout(
      {
        plan: { ...PLAN, monthlyContribution: monthly },
        tax: TAX,
        payoutStartAge: PROFILE.targetRetirementAge,
        payoutEndAge: PROFILE.lifeExpectancyAge,
        useGlobalAssumptions: true,
        withdrawal,
      },
      CTX,
      s,
    );
    if (!r.ok) return { productId: 'etf', enabled: true, payoutStartAge: 67, outcome: r };
    results[s] = r.result;
  }
  return {
    productId: 'etf',
    enabled: true,
    payoutStartAge: PROFILE.targetRetirementAge,
    payoutEndAge: PROFILE.lifeExpectancyAge,
    outcome: { ok: true, results },
  };
}

function statutory(): OverviewProductInput {
  const r = projectStatutory(STATUTORY, CTX);
  if (!r.ok) throw new Error('fixture');
  return {
    productId: 'statutory',
    enabled: true,
    payoutStartAge: STATUTORY.retirementAge,
    outcome: {
      ok: true,
      results: { pessimistic: r.result, neutral: r.result, optimistic: r.result },
    },
  };
}

const profile = (desired?: number) => ({ ...PROFILE, desiredMonthlyIncomeToday: desired });

function netWith(monthly: number, s: ScenarioName, p = profile(3000)) {
  const out = overview(
    [etf(monthly), statutory()],
    p,
    ASSUMPTIONS,
    CTX.currentYear,
    LEGAL.incomeTax,
  );
  if (!out.ok) throw new Error('overview');
  return out.result.scenarios[s].snapshot.netMonthlyPensionReal;
}

describe('solveGapContribution', () => {
  const solve = (desired: number | undefined, monthly = 100) =>
    solveGapContribution(
      [statutory()],
      etf,
      monthly,
      profile(desired),
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );

  it('reaches the desired income, one cent less does not', () => {
    const r = solve(3000);
    if (!r.ok) throw new Error('not ok');
    for (const s of SCENARIO_NAMES) {
      const x = r.scenarios[s];
      expect(x.status).toBe('ok');
      expect(netWith(100 + x.monthly, s)).toBeGreaterThanOrEqual(3000 - 1e-9);
      expect(netWith(100 + x.monthly - 0.01, s)).toBeLessThan(3000);
      expect(x.newMonthly).toBeCloseTo(100 + x.monthly, 9);
    }
  });

  it('needs more in the pessimistic than in the optimistic scenario', () => {
    const r = solve(3000);
    if (!r.ok) throw new Error('not ok');
    expect(r.scenarios.pessimistic.monthly).toBeGreaterThan(r.scenarios.optimistic.monthly);
  });

  it('reports already_reached when the desired income is met', () => {
    const r = solve(100);
    if (!r.ok) throw new Error('not ok');
    expect(r.scenarios.neutral).toMatchObject({ status: 'already_reached', monthly: 0 });
  });

  it('reports unreachable for an absurd desired income', () => {
    const r = solve(10_000_000);
    if (!r.ok) throw new Error('not ok');
    expect(r.scenarios.neutral.status).toBe('unreachable');
  });

  it('counts the ETF product even if it is disabled', () => {
    const r = solveGapContribution(
      [statutory()],
      (m) => ({ ...etf(m), enabled: false }),
      100,
      profile(3000),
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    expect(r.ok && r.scenarios.neutral.status).toBe('ok');
  });

  it('returns issues without a desired income or with an invalid ETF plan', () => {
    const none = solve(undefined);
    expect(none.ok).toBe(false);
    const bad = solveGapContribution(
      [],
      (m) => etf(m < 0 ? 0 : -1),
      100,
      profile(3000),
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    expect(bad.ok).toBe(false);
  });
});

describe('solveGapContribution with the percent withdrawal', () => {
  const percent = { strategy: 'percent', percent: 4 } as const;
  const netPercent = (monthly: number, s: ScenarioName) => {
    const out = overview(
      [etf(monthly, percent), statutory()],
      profile(3000),
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    if (!out.ok) throw new Error('overview');
    return out.result.scenarios[s].snapshot.netMonthlyPensionReal;
  };

  it('finds the smallest whole-cent rate that closes the gap', () => {
    const r = solveGapContribution(
      [statutory()],
      (m) => etf(m, percent),
      100,
      profile(3000),
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    if (!r.ok) throw new Error('solve');
    for (const s of SCENARIO_NAMES) {
      const x = r.scenarios[s];
      expect(x.status).not.toBe('unreachable');
      expect(netPercent(x.newMonthly, s)).toBeGreaterThanOrEqual(3000);
      expect(netPercent(x.newMonthly - 0.01, s)).toBeLessThan(3000);
    }
  });
});
