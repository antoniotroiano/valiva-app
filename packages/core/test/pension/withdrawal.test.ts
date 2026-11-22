import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { overview, payoutPlan, projectEtfWithPayout, withdrawalPlan } from '../../src';
import type { EtfPlanInput, EtfProjectorInput, WithdrawalPlan } from '../../src';
import { ASSUMPTIONS, CTX, LEGAL } from '../pensionFixtures';

const near = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

function plan(
  capital: number,
  r: number,
  settings: Parameters<typeof withdrawalPlan>[4],
  infl = 0,
  years = 25,
): WithdrawalPlan {
  const out = withdrawalPlan(capital, 67, 67 + years, r, settings, infl);
  if (!out.ok) throw new Error(JSON.stringify(out.issues));
  return out.plan;
}

describe('withdrawalPlan', () => {
  it('annuity equals payoutPlan', () => {
    const a = plan(100000, 2, undefined);
    const b = plan(100000, 2, { strategy: 'annuity' });
    const ref = payoutPlan(100000, 67, 92, 2);
    if (!ref.ok) throw new Error('ref');
    expect(a.monthly).toBe(ref.plan.monthly);
    expect(a.remaining).toEqual(ref.plan.remaining);
    expect(b.payments.every((p) => p === ref.plan.monthly)).toBe(true);
    expect(a.depletionMonth).toBeUndefined();
  });

  it('percent: first year is percent of the capital, then rises with the indexation', () => {
    const p = plan(120000, 0, { strategy: 'percent', percent: 4 }, 2);
    near(p.monthly, 400);
    near(p.payments[11] as number, 400);
    near(p.payments[12] as number, 408);
    near(p.payments[24] as number, 416.16);
  });

  it('percent without return and indexation is a constant payment that leaves a rest', () => {
    const p = plan(120000, 0, { strategy: 'percent', percent: 2 });
    near(p.remainingAtEnd, 120000 * 0.5);
    expect(p.depletionMonth).toBeUndefined();
  });

  it('cuts the last payment and reports the month when the capital runs out', () => {
    const p = plan(120000, 0, { strategy: 'percent', percent: 8 });
    expect(p.depletionMonth).toBe(150);
    near(
      p.payments.reduce((a, b) => a + b, 0),
      120000,
    );
    expect(p.remainingAtEnd).toBe(0);
    expect(p.payments[150]).toBe(0);
  });

  it('handles zero capital', () => {
    const p = plan(0, 3, { strategy: 'percent', percent: 4 });
    expect(p.monthly).toBe(0);
    expect(p.depletionMonth).toBeUndefined();
  });

  it('returns errors as data', () => {
    for (const percent of [0, -1, 100.5, NaN]) {
      const r = withdrawalPlan(1000, 67, 90, 2, { strategy: 'percent', percent }, 2);
      expect(r.ok).toBe(false);
    }
    const bad = withdrawalPlan(1000, 67, 90, 2, { strategy: 'percent', percent: 4 }, -100);
    expect(bad.ok).toBe(false);
  });

  it('property: capital never negative, payment never above the capital left, annuity unchanged', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2_000_000, noNaN: true }),
        fc.double({ min: -5, max: 10, noNaN: true }),
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        fc.double({ min: -2, max: 8, noNaN: true }),
        fc.integer({ min: 1, max: 40 }),
        (capital, r, percent, infl, years) => {
          const p = plan(capital, r, { strategy: 'percent', percent }, infl, years);
          const i = Math.pow(1 + r / 100, 1 / 12) - 1;
          for (let m = 1; m <= p.months; m++) {
            const before = p.remaining[m - 1] as number;
            const pay = p.payments[m - 1] as number;
            expect(p.remaining[m]).toBeGreaterThanOrEqual(0);
            expect(pay).toBeGreaterThanOrEqual(0);
            expect(pay).toBeLessThanOrEqual(before * (1 + i) + 1e-6);
          }
          const a = plan(capital, r, { strategy: 'annuity' }, infl, years);
          const ref = payoutPlan(capital, 67, 67 + years, r);
          if (!ref.ok) throw new Error('ref');
          expect(a.monthly).toBe(ref.plan.monthly);
        },
      ),
    );
  });
});

const PLAN: EtfPlanInput = {
  initialCapital: 5000,
  monthlyContribution: 250,
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
const INPUT: EtfProjectorInput = {
  plan: PLAN,
  tax: { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 },
  payoutStartAge: 67,
  payoutEndAge: 90,
  useGlobalAssumptions: true,
};

describe('ETF projector with a withdrawal strategy', () => {
  it('annuity setting gives the same result as no setting', () => {
    const a = projectEtfWithPayout(INPUT, CTX);
    const b = projectEtfWithPayout({ ...INPUT, withdrawal: { strategy: 'annuity' } }, CTX);
    if (!a.ok || !b.ok) throw new Error('project');
    expect(b.result.monthlyPensionNominal).toBe(a.result.monthlyPensionNominal);
    expect(b.result.netMonthlyPensionReal).toBe(a.result.netMonthlyPensionReal);
    expect(b.result.warnings).toEqual(a.result.warnings);
    expect(a.result.indexationPercent).toBeUndefined();
    near(a.result.details.remainingCapitalAtEnd, 0);
  });

  it('percent: start payment is the percentage of the capital, indexed with the inflation', () => {
    const r = projectEtfWithPayout(
      { ...INPUT, withdrawal: { strategy: 'percent', percent: 4 } },
      CTX,
    );
    if (!r.ok) throw new Error('project');
    const cap = r.result.capitalAtRetirement as number;
    near(r.result.monthlyPensionNominal, (cap * 0.04) / 12);
    expect(r.result.indexationPercent).toBe(ASSUMPTIONS.inflationPercent);
    expect(r.result.details.remainingCapitalAtEnd).toBeGreaterThan(0);
    const years = r.result.details.withdrawalYears ?? [];
    expect(years).toHaveLength(23);
    expect(years[0]?.age).toBe(68);
    near(years.at(-1)?.remaining ?? NaN, r.result.details.remainingCapitalAtEnd);
    expect(r.result.payoutEndAge).toBeUndefined();
    expect(r.result.warnings).not.toContain('etf_withdrawal_depleted');
  });

  it('percent: a high rate warns and sets the end age', () => {
    const r = projectEtfWithPayout(
      { ...INPUT, withdrawal: { strategy: 'percent', percent: 8 } },
      CTX,
    );
    if (!r.ok) throw new Error('project');
    expect(r.result.warnings).toContain('etf_withdrawal_depleted');
    const age = r.result.details.depletionAge as number;
    expect(age).toBeGreaterThan(67);
    expect(age).toBeLessThan(90);
    expect(r.result.payoutEndAge).toBe(age);
    expect(r.result.details.remainingCapitalAtEnd).toBe(0);
  });

  it('percent out of range is an error as data', () => {
    const r = projectEtfWithPayout(
      { ...INPUT, withdrawal: { strategy: 'percent', percent: 0 } },
      CTX,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.field).toBe('withdrawal.percent');
  });

  it('property: the monthly rate rises with the contribution (needed for the gap solver)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 1, max: 500 }),
        fc.double({ min: 0.5, max: 10, noNaN: true }),
        (c, extra, percent) => {
          const net = (monthlyContribution: number) => {
            const r = projectEtfWithPayout(
              {
                ...INPUT,
                plan: { ...PLAN, monthlyContribution },
                withdrawal: { strategy: 'percent', percent },
              },
              CTX,
            );
            if (!r.ok) throw new Error('project');
            return r.result.netMonthlyPensionReal;
          };
          expect(net(c + extra)).toBeGreaterThan(net(c));
        },
      ),
    );
  });

  it('overview: an indexed payment keeps its value and stops when the capital is used up', () => {
    const r = projectEtfWithPayout(
      { ...INPUT, withdrawal: { strategy: 'percent', percent: 8 } },
      CTX,
    );
    if (!r.ok) throw new Error('project');
    const result = { pessimistic: r.result, neutral: r.result, optimistic: r.result };
    const out = overview(
      [
        {
          productId: 'etf',
          enabled: true,
          payoutStartAge: 67,
          payoutEndAge: 90,
          outcome: { ok: true, results: result },
        },
      ],
      CTX.profile,
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    if (!out.ok) throw new Error(JSON.stringify(out.issues));
    const path = out.result.scenarios.neutral.path;
    const at = (age: number) => path.find((p) => p.age === age)?.byProduct.etf ?? NaN;
    near(at(70), at(67), 1e-9);
    const end = Math.ceil(r.result.details.depletionAge as number);
    expect(at(end)).toBe(0);
  });
});
