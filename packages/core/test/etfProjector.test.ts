import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { etfProjector, payoutPlan, projectEtfScenario, projectEtfWithPayout } from '../src';
import type { EtfPlanInput, EtfProjectorInput, ProjectionContext } from '../src';
import { ASSUMPTIONS, CTX } from './pensionFixtures';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

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

function project(over: Partial<EtfProjectorInput> = {}, ctx: ProjectionContext = CTX) {
  const r = projectEtfWithPayout({ ...INPUT, ...over }, ctx, 'neutral');
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.result;
}

describe('etfProjector', () => {
  it('has the product type and delegates validate and project', () => {
    expect(etfProjector.type).toBe('etf');
    expect(etfProjector.validate(INPUT, CTX)).toEqual([]);
    expect(etfProjector.project(INPUT, CTX).ok).toBe(true);
  });

  it('feeds the capital before tax into a payout plan that ends at zero', () => {
    const r = project();
    const base = projectEtfScenario({ ...PLAN, durationYears: 26 }, 'neutral');
    near(r.capitalAtRetirement as number, base.grossFinalValue);
    const plan = payoutPlan(base.grossFinalValue, 67, 90, ASSUMPTIONS.payoutPhaseReturnPercent);
    if (!plan.ok) throw new Error('plan');
    near(r.monthlyPensionNominal, plan.plan.monthly);
    expect(plan.plan.remaining.at(-1)).toBe(0);
  });

  it('taxes the gain share of the withdrawals with partial exemption and allowance', () => {
    const r = project();
    const d = r.details;
    const g = (d.grossCapital - d.totalContributions) / d.grossCapital;
    near(d.gainShare, g);
    const taxable = 12 * r.monthlyPensionNominal * g * 0.7;
    const tax = (Math.max(0, taxable - 1000) * 26.375) / 100 / 12;
    near(d.taxMonthlyNominal, tax);
    near(r.netMonthlyPensionReal, (r.monthlyPensionNominal - tax) / d.inflationFactor);
    near(r.taxAndContributions, tax / d.inflationFactor);
    near(d.inflationFactor, Math.pow(1.02, 26));
  });

  it('charges no tax on a loss', () => {
    const r = project({
      useGlobalAssumptions: false,
      plan: { ...PLAN, returnScenarios: { pessimistic: -6, neutral: -5, optimistic: -4 } },
    });
    expect(r.details.gainShare).toBe(0);
    expect(r.taxAndContributions).toBe(0);
    near(r.netMonthlyPensionReal, r.monthlyPensionReal);
  });

  it('charges no tax when the yearly taxable amount stays below the allowance', () => {
    const small = project({ plan: { ...PLAN, initialCapital: 0, monthlyContribution: 20 } });
    expect(small.taxAndContributions).toBe(0);
    const big = project({ plan: { ...PLAN, monthlyContribution: 800 } });
    expect(big.taxAndContributions).toBeGreaterThan(0);
  });

  it('does not let taxEnabled change the capital', () => {
    const on = project();
    const off = project({ plan: { ...PLAN, taxEnabled: false } });
    near(on.capitalAtRetirement as number, off.capitalAtRetirement as number);
    expect(off.taxAndContributions).toBe(0);
    expect(off.netMonthlyPensionReal).toBeGreaterThan(on.netMonthlyPensionReal);
  });

  it('derives the duration from the payout year and warns when it differs', () => {
    const same = project();
    expect(same.warnings).not.toContain('etf_duration_overridden');
    const other = project({ plan: { ...PLAN, durationYears: 20 } });
    expect(other.warnings).toContain('etf_duration_overridden');
    near(other.capitalAtRetirement as number, same.capitalAtRetirement as number);
    expect(other.details.durationYears).toBe(26);
  });

  it('takes returns and inflation from the global assumptions or from the plan', () => {
    const own = {
      ...PLAN,
      returnScenarios: { pessimistic: 1, neutral: 2, optimistic: 3 },
      inflationPercent: 3,
    };
    const global = project({ plan: own });
    near(global.capitalAtRetirement as number, project().capitalAtRetirement as number);
    expect(global.details.inflationPercent).toBe(2);
    const local = project({ plan: own, useGlobalAssumptions: false });
    expect(local.capitalAtRetirement).toBeLessThan(global.capitalAtRetirement as number);
    expect(local.details.inflationPercent).toBe(3);
  });

  it('flags unverified tax values and the simplified tax only when tax is on', () => {
    const r = project({ taxUnverified: true });
    expect(r.warnings).toEqual(expect.arrayContaining(['unverified:tax', 'etf_tax_simplified']));
    expect(project({ plan: { ...PLAN, taxEnabled: false }, taxUnverified: true }).warnings).toEqual(
      [],
    );
  });

  it('returns issues as data', () => {
    const bad = (over: Partial<EtfProjectorInput>) => {
      const r = projectEtfWithPayout({ ...INPUT, ...over }, CTX);
      return r.ok ? [] : r.issues;
    };
    expect(bad({ payoutEndAge: 67 }).map((i) => i.field)).toContain('payoutEndAge');
    expect(bad({ payoutStartAge: NaN }).map((i) => i.field)).toContain('payoutStartAge');
    expect(bad({ payoutStartAge: 40 })).toEqual([
      { field: 'payoutStartAge', code: 'before_current_year', min: 42 },
    ]);
    expect(bad({ payoutEndAge: 130 }).map((i) => i.field)).toContain('payoutEndAge');
    expect(bad({ plan: { ...PLAN, monthlyContribution: -1 } }).map((i) => i.field)).toContain(
      'monthlyContribution',
    );
    expect(bad({ tax: { ...INPUT.tax, taxFreeAllowance: -1 } }).map((i) => i.field)).toContain(
      'tax.taxFreeAllowance',
    );
  });

  it('property: net is at most gross and grows with the monthly contribution', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 63, max: 70 }),
        (a, extra, start) => {
          const low = project({ plan: { ...PLAN, monthlyContribution: a }, payoutStartAge: start });
          const high = project({
            plan: { ...PLAN, monthlyContribution: a + extra },
            payoutStartAge: start,
          });
          expect(low.netMonthlyPensionReal).toBeLessThanOrEqual(low.monthlyPensionReal + 1e-9);
          expect(high.netMonthlyPensionReal).toBeGreaterThanOrEqual(
            low.netMonthlyPensionReal - 1e-9,
          );
        },
      ),
    );
  });
});

describe('etfProjector: savings phase starts in the current month', () => {
  const inMonth = (currentMonth: number): ProjectionContext => ({ ...CTX, currentMonth });

  it('defaults to January: 12 months per year', () => {
    const r = project();
    expect(r.details.savingMonths).toBe(r.details.durationYears * 12);
    expect(project({}, inMonth(1)).details.savingMonths).toBe(r.details.savingMonths);
  });

  it('counts from the current month to the December before the payout year', () => {
    const full = project().details.savingMonths;
    expect(project({}, inMonth(11)).details.savingMonths).toBe(full - 10);
    expect(project({}, inMonth(12)).details.savingMonths).toBe(full - 11);
  });

  it('pays fewer contributions and builds less capital when the year is already running', () => {
    const jan = project({}, inMonth(1));
    const nov = project({}, inMonth(11));
    near(jan.details.totalContributions - nov.details.totalContributions, 10 * 250, 1e-9);
    expect(nov.capitalAtRetirement as number).toBeLessThan(jan.capitalAtRetirement as number);
  });

  it('ignores an invalid month and treats it as January', () => {
    expect(project({}, inMonth(0)).details.savingMonths).toBe(project().details.savingMonths);
    expect(project({}, inMonth(13)).details.savingMonths).toBe(project().details.savingMonths);
  });

  it('reports a lump sum after the last savings month instead of dropping it', () => {
    const late = { ...PLAN, lumpSums: [{ month: 26 * 12, amount: 1000 }] };
    expect(etfProjector.validate({ ...INPUT, plan: late }, CTX)).toEqual([]);
    const issues = etfProjector.validate({ ...INPUT, plan: late }, inMonth(11));
    expect(issues.map((i) => i.field)).toEqual(['lumpSums.0.month']);
  });
});
