import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  indexToMonth,
  monthToIndex,
  projectGoal,
  solveRequiredContribution,
  validateSavingsGoal,
} from '../../src';
import type { GoalProjection, SavingsGoal } from '../../src';
import { baseGoal, goalTax } from './goalFixtures';

function ok(goal: SavingsGoal): GoalProjection {
  const r = projectGoal(goal, goalTax);
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.issues)}`);
  return r;
}

/** Closed form without tax and with constant interest: B*g^n + R*g*(g^n-1)/(g-1). */
function closedForm(start: number, rate: number, annualPercent: number, n: number): number {
  const g = Math.pow(1 + annualPercent / 100, 1 / 12);
  return start * Math.pow(g, n) + (rate * g * (Math.pow(g, n) - 1)) / (g - 1);
}

describe('months', () => {
  it('round-trips and rejects bad formats', () => {
    expect(indexToMonth(monthToIndex('2026-12') as number)).toBe('2026-12');
    expect(monthToIndex('2026-13')).toBeNull();
    expect(monthToIndex('2026-1')).toBeNull();
    expect(monthToIndex('26-01')).toBeNull();
    expect((monthToIndex('2027-01') as number) - (monthToIndex('2026-12') as number)).toBe(1);
  });
});

describe('validateSavingsGoal', () => {
  const fields = (g: SavingsGoal) => validateSavingsGoal(g).map((i) => `${i.field}:${i.code}`);

  it('accepts a valid goal', () => {
    expect(validateSavingsGoal(baseGoal)).toEqual([]);
  });

  it('reports invalid values as data', () => {
    expect(fields({ ...baseGoal, targetAmount: 0 })).toContain('targetAmount:not_positive');
    expect(fields({ ...baseGoal, currentAmount: -1 })).toContain('currentAmount:negative');
    expect(fields({ ...baseGoal, monthlyContribution: -1 })).toContain(
      'monthlyContribution:negative',
    );
    expect(fields({ ...baseGoal, accountInterestPercent: 21 })).toContain(
      'accountInterestPercent:out_of_range',
    );
    expect(fields({ ...baseGoal, taxFreeAllowancePerYear: -5 })).toContain(
      'taxFreeAllowancePerYear:negative',
    );
    expect(fields({ ...baseGoal, startMonth: '2026/01' })).toContain('startMonth:invalid_month');
    expect(fields({ ...baseGoal, targetAmount: Number.NaN })).toContain('targetAmount:not_finite');
  });

  it('checks target month and interest changes', () => {
    expect(fields({ ...baseGoal, targetMonth: '2026-01' })).toContain(
      'targetMonth:not_after_start',
    );
    expect(fields({ ...baseGoal, targetMonth: '2090-01' })).toContain('targetMonth:out_of_range');
    const changes = (list: { fromMonth: string; percent: number }[]) =>
      fields({ ...baseGoal, interestChanges: list });
    expect(changes([{ fromMonth: '2026-01', percent: 1 }])).toContain(
      'interestChanges.0.fromMonth:not_after_start',
    );
    expect(
      changes([
        { fromMonth: '2027-03', percent: 1 },
        { fromMonth: '2027-02', percent: 1 },
      ]),
    ).toContain('interestChanges.1.fromMonth:not_chronological');
    expect(changes([{ fromMonth: 'x', percent: 1 }])).toContain(
      'interestChanges.0.fromMonth:invalid_month',
    );
  });

  it('projectGoal returns issues instead of throwing', () => {
    const r = projectGoal({ ...baseGoal, targetAmount: -1 }, goalTax);
    expect(r.ok).toBe(false);
  });
});

describe('projectGoal', () => {
  it('matches the closed form without tax (balance after n months)', () => {
    const goal = { ...baseGoal, targetAmount: 1_000_000, targetMonth: '2036-01' };
    const r = ok(goal);
    expect(r.series[120]?.balance).toBeCloseTo(closedForm(500, 150, 2.5, 120), 6);
  });

  it('finds the target month via logarithm of the closed form', () => {
    const goal = { ...baseGoal, targetAmount: 20000, currentAmount: 1000 };
    const r = ok(goal);
    const g = Math.pow(1.025, 1 / 12);
    const n = Math.ceil(
      Math.log((20000 * (g - 1) + 150 * g) / (1000 * (g - 1) + 150 * g)) / Math.log(g),
    );
    expect(r.status).toBe('reached');
    expect(r.monthsToReach).toBe(n);
    expect(r.reachedMonth).toBe(indexToMonth((monthToIndex('2026-01') as number) + n));
  });

  it('with zero interest the duration is ceil((target - current) / rate)', () => {
    const r = ok({ ...baseGoal, accountInterestPercent: 0, targetAmount: 1000 });
    expect(r.monthsToReach).toBe(Math.ceil(500 / 150));
    expect(r.interestGross).toBe(0);
  });

  it('reports reached_at_start when the current amount is enough', () => {
    const r = ok({ ...baseGoal, currentAmount: 3000 });
    expect(r.status).toBe('reached_at_start');
    expect(r.monthsToReach).toBe(0);
    expect(r.reachedMonth).toBe('2026-01');
    expect(r.series).toHaveLength(1);
  });

  it('keeps the series until the desired month when the goal is reached earlier', () => {
    const r = ok({ ...baseGoal, currentAmount: 3000, targetMonth: '2026-07' });
    expect(r.series).toHaveLength(7);
    expect(r.warnings).toEqual([]);
  });

  it('reports not_reached after 600 months (no contribution, no interest)', () => {
    const r = ok({ ...baseGoal, monthlyContribution: 0, accountInterestPercent: 0 });
    expect(r.status).toBe('not_reached');
    expect(r.series).toHaveLength(601);
    expect(r.reachedMonth).toBeUndefined();
  });

  it('warns when the desired month is missed', () => {
    const r = ok({ ...baseGoal, targetAmount: 20000, targetMonth: '2027-01' });
    expect(r.warnings).toEqual(['target_month_missed']);
    expect(r.requiredMonthlyForTargetMonth?.status).toBe('ok');
  });

  it('switches the interest rate at fromMonth', () => {
    const goal: SavingsGoal = {
      ...baseGoal,
      currentAmount: 1000,
      monthlyContribution: 0,
      targetAmount: 1_000_000,
      targetMonth: '2026-07',
      interestChanges: [{ fromMonth: '2026-04', percent: 0 }],
    };
    const r = ok(goal);
    const i = Math.pow(1.025, 1 / 12) - 1;
    // month 3 is April: months 1 and 2 earn 2.5 %, from month 3 on 0 %
    expect(r.series[6]?.balance).toBeCloseTo(1000 * (1 + i) ** 2, 8);
  });

  describe('interest tax', () => {
    it('is zero with a large allowance', () => {
      const r = ok({ ...baseGoal, taxEnabled: true, taxFreeAllowancePerYear: 1_000_000 });
      expect(r.tax).toBe(0);
      expect(r.interestNet).toBeCloseTo(r.interestGross, 9);
    });

    it('taxes interest above the allowance and equals the untaxed run if the allowance is not hit', () => {
      // target below the start amount: reached_at_start, series still runs to the desired month
      const goal = { ...baseGoal, targetAmount: 100, targetMonth: '2026-12' };
      const off = ok(goal);
      const on = ok({ ...goal, taxEnabled: true });
      expect(on.tax).toBe(0);
      expect(on.finalBalance).toBeCloseTo(off.finalBalance, 9);
    });

    it('taxes everything above the allowance at the configured rate', () => {
      const goal: SavingsGoal = {
        ...baseGoal,
        currentAmount: 100_000,
        monthlyContribution: 0,
        accountInterestPercent: 3,
        targetAmount: 1000,
        targetMonth: '2026-12',
        taxEnabled: true,
        taxFreeAllowancePerYear: 1000,
      };
      const r = ok(goal);
      // 11 months of 2026 (Feb..Dec), allowance 1000 per calendar year
      expect(r.tax).toBeCloseTo(((r.interestGross - 1000) * 26.375) / 100, 6);
      expect(r.interestNet).toBeCloseTo(r.interestGross - r.tax, 9);
    });

    it('resets the allowance in January', () => {
      const goal: SavingsGoal = {
        ...baseGoal,
        currentAmount: 100_000,
        monthlyContribution: 0,
        accountInterestPercent: 3,
        targetAmount: 1000,
        startMonth: '2026-12',
        targetMonth: '2028-12',
        taxEnabled: true,
        taxFreeAllowancePerYear: 1000,
      };
      const r = ok(goal);
      const byYear = Object.fromEntries(r.yearly.map((y) => [y.calendarYear, y]));
      for (const year of [2027, 2028]) {
        const y = byYear[year];
        expect(y?.tax).toBeCloseTo((((y?.interestGross ?? 0) - 1000) * 26.375) / 100, 6);
      }
      // Without a reset the second year would be taxed in full; with it, each year gets 1000
      expect(byYear[2026]?.tax).toBe(0);
    });
  });

  describe('properties', () => {
    const goalArb = fc.record({
      currentAmount: fc.integer({ min: 0, max: 5000 }),
      monthlyContribution: fc.integer({ min: 0, max: 800 }),
      accountInterestPercent: fc.double({ min: 0, max: 8, noNaN: true }),
      taxEnabled: fc.boolean(),
      taxFreeAllowancePerYear: fc.integer({ min: 0, max: 1500 }),
    });
    const make = (p: Partial<SavingsGoal>): SavingsGoal => ({
      ...baseGoal,
      targetAmount: 10000,
      targetMonth: '2029-06',
      ...p,
    });
    // balance at the desired month (2029-06 is month 41 after 2026-01)
    const balanceAtTarget = (g: SavingsGoal) => ok(g).series[41]?.balance ?? 0;

    it('is monotone in contribution and interest rate (balance at the desired month)', () => {
      fc.assert(
        fc.property(goalArb, fc.integer({ min: 1, max: 300 }), (p, extra) => {
          const base = balanceAtTarget(make({ ...p, targetAmount: 1e9 }));
          const moreRate = balanceAtTarget(
            make({
              ...p,
              targetAmount: 1e9,
              monthlyContribution: p.monthlyContribution + extra,
            }),
          );
          const moreInterest = balanceAtTarget(
            make({
              ...p,
              targetAmount: 1e9,
              accountInterestPercent: p.accountInterestPercent + 1,
            }),
          );
          expect(moreRate).toBeGreaterThan(base);
          expect(moreInterest).toBeGreaterThanOrEqual(base);
        }),
        { numRuns: 60 },
      );
    });

    it('solver round trip: solved rate reaches the target, one cent less does not', () => {
      fc.assert(
        fc.property(goalArb, (p) => {
          const goal = make({
            ...p,
            targetAmount: 10000,
            currentAmount: Math.min(p.currentAmount, 3000),
          });
          const solved = ok(goal).requiredMonthlyForTargetMonth;
          if (!solved) throw new Error('missing');
          if (solved.status === 'already_reached') {
            expect(balanceAtTarget({ ...goal, monthlyContribution: 0 })).toBeGreaterThanOrEqual(
              10000 - 1e-6,
            );
            return;
          }
          expect(solved.status).toBe('ok');
          expect(
            balanceAtTarget({ ...goal, monthlyContribution: solved.monthly }),
          ).toBeGreaterThanOrEqual(10000 - 1e-6);
          expect(
            balanceAtTarget({ ...goal, monthlyContribution: solved.monthly - 0.01 }),
          ).toBeLessThan(10000 - 1e-9);
        }),
        { numRuns: 40 },
      );
    });
  });
});

describe('solveRequiredContribution', () => {
  it('solves a linear function to the cent (rounded up)', () => {
    // forward(R) = 10 * R; target 1234.55 -> R >= 123.455 -> 123.46
    const r = solveRequiredContribution((m) => 10 * m, 1234.55);
    expect(r).toEqual({ status: 'ok', monthly: 123.46 });
  });

  it('returns already_reached when zero is enough', () => {
    expect(solveRequiredContribution((m) => 500 + m, 400)).toEqual({
      status: 'already_reached',
      monthly: 0,
    });
  });

  it('returns unreachable above the cap of 1,000,000 per month', () => {
    expect(solveRequiredContribution((m) => m, 5_000_000)).toEqual({
      status: 'unreachable',
      monthly: 0,
    });
  });

  it('handles targets that need exactly the cap', () => {
    expect(solveRequiredContribution((m) => m, 1_000_000).status).toBe('ok');
  });
});
