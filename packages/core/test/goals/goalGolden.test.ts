import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectGoal, projectGoals, solveEtfRequiredContribution, SCENARIO_NAMES } from '../../src';
import type {
  EtfPlanInput,
  GoalTaxAssumptions,
  SavingsGoal,
  ScenarioName,
  SolveResult,
  TargetBasis,
  TaxAssumptions,
} from '../../src';

function load<T>(sub: string): T[] {
  const dir = join(__dirname, '..', 'golden-vectors', sub);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T);
}

type GoalVector = {
  name: string;
  input: SavingsGoal;
  tax: GoalTaxAssumptions;
  expected: {
    status: string;
    monthsToReach?: number;
    reachedMonth?: string;
    finalBalance: number;
    interestGross: number;
    tax: number;
    interestNet: number;
    seriesLength: number;
    requiredMonthlyForTargetMonth?: SolveResult;
  };
};

type TargetVector = {
  name: string;
  input: EtfPlanInput;
  tax: TaxAssumptions;
  targetValue: number;
  basis: TargetBasis;
  expected: {
    targetNominal: number;
    scenarios: Record<ScenarioName, SolveResult & { differenceToCurrent: number }>;
  };
};

type SharedGoalVector = {
  name: string;
  tax: GoalTaxAssumptions;
  pool: number;
  goals: SavingsGoal[];
  expected: Record<string, GoalVector['expected']>;
};

const goalVectors = load<GoalVector>('goals');
const sharedVectors = load<SharedGoalVector>('goals-shared');
const targetVectors = load<TargetVector>('etf-target');

describe('golden vectors: savings goals with a shared allowance', () => {
  it('has at least 3 vectors', () => {
    expect(sharedVectors.length).toBeGreaterThanOrEqual(3);
  });

  for (const v of sharedVectors) {
    it(v.name, () => {
      const results = projectGoals(v.goals, v.tax, v.pool);
      for (const [id, e] of Object.entries(v.expected)) {
        const r = results.get(id);
        if (!r || !r.ok) throw new Error('expected ok');
        expect(r.status).toBe(e.status);
        expect(r.monthsToReach).toBe(e.monthsToReach);
        expect(r.series).toHaveLength(e.seriesLength);
        expect(Math.abs(r.finalBalance - e.finalBalance)).toBeLessThan(0.01);
        expect(Math.abs(r.interestGross - e.interestGross)).toBeLessThan(0.01);
        expect(Math.abs(r.tax - e.tax)).toBeLessThan(0.01);
      }
    });
  }
});

describe('golden vectors: savings goals', () => {
  it('has at least 6 vectors', () => {
    expect(goalVectors.length).toBeGreaterThanOrEqual(6);
  });

  for (const v of goalVectors) {
    it(v.name, () => {
      const r = projectGoal(v.input, v.tax);
      if (!r.ok) throw new Error('expected ok');
      const e = v.expected;
      expect(r.status).toBe(e.status);
      expect(r.monthsToReach).toBe(e.monthsToReach);
      expect(r.reachedMonth).toBe(e.reachedMonth);
      expect(r.series).toHaveLength(e.seriesLength);
      expect(Math.abs(r.finalBalance - e.finalBalance)).toBeLessThan(0.01);
      expect(Math.abs(r.interestGross - e.interestGross)).toBeLessThan(0.01);
      expect(Math.abs(r.tax - e.tax)).toBeLessThan(0.01);
      expect(Math.abs(r.interestNet - e.interestNet)).toBeLessThan(0.01);
      expect(r.requiredMonthlyForTargetMonth?.status).toBe(e.requiredMonthlyForTargetMonth?.status);
      if (e.requiredMonthlyForTargetMonth) {
        expect(r.requiredMonthlyForTargetMonth?.monthly).toBeCloseTo(
          e.requiredMonthlyForTargetMonth.monthly,
          2,
        );
      }
    });
  }
});

describe('golden vectors: ETF reverse calculator', () => {
  it('has at least 3 vectors', () => {
    expect(targetVectors.length).toBeGreaterThanOrEqual(3);
  });

  for (const v of targetVectors) {
    it(v.name, () => {
      const r = solveEtfRequiredContribution(v.input, v.tax, v.targetValue, v.basis);
      if (!r.ok) throw new Error('expected ok');
      expect(r.targetNominal).toBeCloseTo(v.expected.targetNominal, 6);
      for (const sc of SCENARIO_NAMES) {
        expect(r.scenarios[sc].status, sc).toBe(v.expected.scenarios[sc].status);
        expect(r.scenarios[sc].monthly, sc).toBeCloseTo(v.expected.scenarios[sc].monthly, 2);
      }
    });
  }
});
