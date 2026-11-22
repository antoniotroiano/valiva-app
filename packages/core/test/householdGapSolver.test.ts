import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  projectEtfWithPayout,
  projectStatutory,
  solveGapContribution,
  solveHouseholdGapContribution,
  splitAssumptions,
} from '../src';
import type {
  EtfPlanInput,
  Household,
  Person,
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

function etf(monthly: number): OverviewProductInput {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = projectEtfWithPayout(
      {
        plan: { ...PLAN, monthlyContribution: monthly },
        tax: TAX,
        payoutStartAge: PROFILE.targetRetirementAge,
        payoutEndAge: PROFILE.lifeExpectancyAge,
        useGlobalAssumptions: true,
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

const split = splitAssumptions(ASSUMPTIONS);
const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  name: id,
  birthYear: PROFILE.birthYear,
  targetRetirementAge: PROFILE.targetRetirementAge,
  lifeExpectancyAge: PROFILE.lifeExpectancyAge,
  childrenBirthYears: [],
  personalAssumptions: split.personal,
  ...over,
});
const household = (persons: Person[], desired?: number): Household => ({
  id: 'h',
  desiredMonthlyIncomeToday: desired,
  assumptions: split.household,
  persons,
});

describe('solveHouseholdGapContribution', () => {
  it('matches the single-person solver for one person', () => {
    const single = solveGapContribution(
      [statutory()],
      etf,
      100,
      { ...PROFILE, desiredMonthlyIncomeToday: 3000 },
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    const hh = solveHouseholdGapContribution(
      household([person('a')], 3000),
      'a',
      { a: [statutory()] },
      etf,
      100,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    expect(hh).toEqual(single);
  });

  it('needs less when the partner brings income', () => {
    const h = household([person('a'), person('b')], 3000);
    const alone = solveHouseholdGapContribution(
      h,
      'a',
      { a: [statutory()] },
      etf,
      100,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    const withPartner = solveHouseholdGapContribution(
      h,
      'a',
      { a: [statutory()], b: [statutory()] },
      etf,
      100,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    if (!alone.ok || !withPartner.ok) throw new Error('expected ok');
    expect(withPartner.scenarios.neutral.monthly).toBeLessThan(alone.scenarios.neutral.monthly);
  });

  it('returns issues as data without a wish or for an unknown person', () => {
    const noWish = solveHouseholdGapContribution(
      household([person('a')]),
      'a',
      {},
      etf,
      100,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    expect(noWish).toEqual({
      ok: false,
      issues: [{ field: 'desiredMonthlyIncomeToday', code: 'required' }],
    });
    const unknown = solveHouseholdGapContribution(
      household([person('a')], 3000),
      'x',
      {},
      etf,
      100,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    expect(unknown.ok).toBe(false);
  });
});
