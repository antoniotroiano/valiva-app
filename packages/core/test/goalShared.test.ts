import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { projectGoal, projectGoals } from '../src';
import type { GoalResult, SavingsGoal } from '../src';

const TAX = { capitalGainsTaxRate: 26.375 };

const goal = (id: string, over: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id,
  name: id,
  targetAmount: 90000,
  currentAmount: 40000,
  monthlyContribution: 300,
  accountInterestPercent: 3,
  priority: 1,
  taxEnabled: true,
  taxFreeAllowancePerYear: 1000,
  startMonth: '2026-03',
  ...over,
});

const ok = (r: GoalResult | undefined) => {
  if (!r || !r.ok) throw new Error('expected ok');
  return r;
};

describe('projectGoals: shared yearly allowance', () => {
  it('equals projectGoal for a single goal when the pool equals its own allowance', () => {
    const g = goal('a');
    const shared = ok(projectGoals([g], TAX, 1000).get('a'));
    const alone = ok(projectGoal(g, TAX));
    expect(shared.tax).toBeCloseTo(alone.tax, 9);
    expect(shared.finalBalance).toBeCloseTo(alone.finalBalance, 9);
  });

  it('gives later goals only what earlier goals left and keeps the sum within the pool', () => {
    const a = goal('a', { priority: 1 });
    const b = goal('b', { priority: 2 });
    const res = projectGoals([b, a], TAX, 1000);
    const ra = ok(res.get('a'));
    const rb = ok(res.get('b'));
    expect(ra.tax).toBeCloseTo(ok(projectGoal(a, TAX)).tax, 9);
    expect(rb.tax).toBeGreaterThan(ok(projectGoal(b, TAX)).tax);
    for (const y of ra.yearly) {
      const other = rb.yearly.find((x) => x.calendarYear === y.calendarYear);
      expect(y.allowanceUsed + (other?.allowanceUsed ?? 0)).toBeLessThanOrEqual(1000 + 1e-9);
    }
  });

  it('taxes all interest with a pool of 0 and uses the pool in full with a huge one', () => {
    const g = goal('a');
    const none = ok(projectGoals([g], TAX, 0).get('a'));
    expect(none.tax).toBeCloseTo((none.interestGross * TAX.capitalGainsTaxRate) / 100, 6);
    const lots = ok(projectGoals([g], TAX, 1e9).get('a'));
    expect(lots.tax).toBe(0);
  });

  it('ignores a goal without tax and an invalid goal', () => {
    const res = projectGoals(
      [
        goal('bad', { priority: 1, targetAmount: -1 }),
        goal('free', { priority: 2, taxEnabled: false }),
        goal('t', { priority: 3 }),
      ],
      TAX,
      1000,
    );
    expect(res.get('bad')?.ok).toBe(false);
    expect(ok(res.get('free')).tax).toBe(0);
    expect(ok(res.get('t')).tax).toBeCloseTo(ok(projectGoal(goal('t'), TAX)).tax, 9);
  });

  it('keeps the input order for equal priorities and is finite for any pool', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5000 }), fc.integer({ min: 1, max: 4 }), (pool, n) => {
        const goals = Array.from({ length: n }, (_, i) => goal(`g${i}`, { priority: 1 }));
        const res = projectGoals(goals, TAX, pool);
        const used = new Map<number, number>();
        goals.forEach((g, i) => {
          const r = ok(res.get(g.id));
          expect(Number.isFinite(r.finalBalance)).toBe(true);
          if (i > 0) {
            const prev = ok(res.get(goals[i - 1]!.id));
            expect(r.tax).toBeGreaterThanOrEqual(prev.tax - 1e-9);
          }
          for (const y of r.yearly) {
            used.set(y.calendarYear, (used.get(y.calendarYear) ?? 0) + y.allowanceUsed);
          }
        });
        for (const v of used.values()) expect(v).toBeLessThanOrEqual(pool + 1e-6);
      }),
      { numRuns: 30 },
    );
  });
});
