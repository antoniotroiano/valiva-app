import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  concurrentIncome,
  overview,
  projectDepot,
  projectOccupational,
  projectStatutory,
} from '../src';
import type {
  DepotInput,
  OccupationalInput,
  OverviewProductInput,
  OverviewResult,
  ProjectionOutcome,
  ProjectionResult,
  ScenarioName,
} from '../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE, STATUTORY } from './pensionFixtures';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

const DEPOT: DepotInput = {
  ownContributionMonthly: 150,
  startMonth: '2027-01',
  variant: 'standard',
  costPercentPerYear: 1,
  payoutStartAge: 67,
  payoutEndAge: 85,
  lumpSumSharePercent: 10,
};
const OCCUPATIONAL: OccupationalInput = {
  employeeContributionMonthlyGross: 200,
  employerSubsidyMode: 'auto15',
  employerContributionMonthly: 0,
  costPercentPerYear: 1,
  startMonth: '2027-01',
  payoutStartAge: 67,
  payoutEndAge: 80,
};

function perScenario(
  f: (s: ScenarioName) => ProjectionOutcome<ProjectionResult>,
): OverviewProductInput['outcome'] {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = f(s);
    if (!r.ok) return { ok: false, issues: r.issues };
    results[s] = r.result;
  }
  return { ok: true, results };
}

function statutory(over = {}, enabled = true): OverviewProductInput {
  const r = projectStatutory({ ...STATUTORY, ...over }, CTX);
  const outcome: OverviewProductInput['outcome'] = r.ok
    ? { ok: true, results: { pessimistic: r.result, neutral: r.result, optimistic: r.result } }
    : { ok: false, issues: r.issues };
  return {
    productId: 'statutory',
    enabled,
    payoutStartAge:
      over && 'retirementAge' in over ? (over as { retirementAge: number }).retirementAge : 67,
    outcome,
  };
}
function depot(over: Partial<DepotInput> = {}, enabled = true): OverviewProductInput {
  const input = { ...DEPOT, ...over };
  return {
    productId: 'retirementDepot',
    enabled,
    payoutStartAge: input.payoutStartAge,
    payoutEndAge: input.payoutEndAge,
    outcome: perScenario((s) => projectDepot(input, CTX, s)),
  };
}
function occupational(over: Partial<OccupationalInput> = {}, enabled = true): OverviewProductInput {
  const input = { ...OCCUPATIONAL, ...over };
  return {
    productId: 'occupational',
    enabled,
    payoutStartAge: input.payoutStartAge,
    payoutEndAge: input.payoutEndAge,
    outcome: perScenario((s) => projectOccupational(input, CTX, s)),
  };
}

function run(products: OverviewProductInput[], desired?: number, life = 90): OverviewResult {
  const r = overview(
    products,
    { ...PROFILE, lifeExpectancyAge: life, desiredMonthlyIncomeToday: desired },
    ASSUMPTIONS,
    CTX.currentYear,
    LEGAL.incomeTax,
  );
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
  return r.result;
}

describe('overview: snapshot', () => {
  it('sums the net pension of the products', () => {
    const o = run([statutory(), depot(), occupational()]);
    for (const s of SCENARIO_NAMES) {
      const snap = o.scenarios[s].snapshot;
      const each = snap.byProduct.reduce((a, p) => a + p.netReal, 0);
      near(snap.netMonthlyPensionReal, each);
      expect(snap.byProduct).toHaveLength(3);
    }
    const stat = statutory();
    const alone = (stat.outcome as { ok: true; results: Record<ScenarioName, ProjectionResult> })
      .results.neutral.netMonthlyPensionReal;
    // Alone the pension is taxed as in its own projection; next to other incomes it pays more tax.
    near(run([statutory()]).scenarios.neutral.snapshot.byProduct[0]!.netReal, alone);
    expect(o.scenarios.neutral.snapshot.byProduct[0]!.netReal).toBeLessThan(alone);
  });
  it('does not count a disabled product', () => {
    const o = run([statutory(), depot({}, false)]);
    expect(o.scenarios.neutral.snapshot.byProduct.map((p) => p.productId)).toEqual(['statutory']);
    expect(o.products.find((p) => p.productId === 'retirementDepot')?.status).toBe('disabled');
  });
  it('lists an invalid product with its issues and leaves it out', () => {
    const o = run([statutory(), depot({ ownContributionMonthly: -5 })]);
    const status = o.products.find((p) => p.productId === 'retirementDepot');
    expect(status?.status).toBe('invalid');
    expect(status?.issues?.[0]?.field).toBe('ownContributionMonthly');
    expect(o.scenarios.neutral.snapshot.byProduct).toHaveLength(1);
  });
  it('carries a product that starts later with 0 and marks it', () => {
    const o = run([statutory(), depot({ payoutStartAge: 70 })]);
    expect(o.products.find((p) => p.productId === 'retirementDepot')?.status).toBe('later');
    const d = o.scenarios.neutral.snapshot.byProduct.find((p) => p.productId === 'retirementDepot');
    expect(d?.netReal).toBe(0);
    const at70 = o.scenarios.neutral.path.find((p) => p.age === 70)!;
    expect(at70.byProduct.retirementDepot).toBeGreaterThan(0);
  });
  it('keeps the lump sum apart from the monthly pension', () => {
    const o = run([depot()]);
    const snap = o.scenarios.neutral.snapshot;
    expect(snap.lumpSumNetReal).toBeGreaterThan(0);
    expect(snap.lumpSumNetReal).toBeLessThanOrEqual(snap.lumpSumGrossReal);
    const big = run([statutory(), depot({ ownContributionMonthly: 500, lumpSumSharePercent: 30 })]);
    const bigSnap = big.scenarios.neutral.snapshot;
    expect(bigSnap.lumpSumNetReal).toBeLessThan(bigSnap.lumpSumGrossReal);
    const none = run([depot({ lumpSumSharePercent: 0 })]);
    expect(none.scenarios.neutral.snapshot.lumpSumNetReal).toBe(0);
  });
  it('collects warnings without duplicates', () => {
    const o = run([depot(), occupational(), statutory()]);
    const w = o.scenarios.neutral.snapshot.warnings;
    expect(new Set(w).size).toBe(w.length);
    expect(w).toContain('thresholds_indexed');
  });
});

describe('overview: gap', () => {
  it('gap is desired minus net, surplus is 0', () => {
    const o = run([statutory()], 3000);
    const s = o.scenarios.neutral.snapshot;
    near(s.gap!, 3000 - s.netMonthlyPensionReal);
    expect(s.surplus).toBe(0);
  });
  it('gap is 0 and surplus positive when the pension exceeds the wish', () => {
    const o = run([statutory()], 100);
    const s = o.scenarios.neutral.snapshot;
    expect(s.gap).toBe(0);
    near(s.surplus!, s.netMonthlyPensionReal - 100);
    expect(o.scenarios.neutral.totalGapReal).toBe(0);
  });
  it('has no gap without a desired income', () => {
    const o = run([statutory()]);
    expect(o.scenarios.neutral.snapshot.gap).toBeUndefined();
    expect(o.scenarios.neutral.totalGapReal).toBeUndefined();
    expect(o.scenarios.neutral.path[0]!.gap).toBeUndefined();
  });
  it('treats a desired income of 0 as a wish, not as missing', () => {
    const o = run([statutory()], 0);
    expect(o.scenarios.neutral.snapshot.gap).toBe(0);
  });
});

describe('overview: path', () => {
  const o = run([statutory(), depot()], 3000);
  // Pensions below the allowances pay no income tax, so net values move exactly with the factors.
  const small = run(
    [statutory({ projectedMonthlyPensionToday: 500 }), depot({ ownContributionMonthly: 20 })],
    3000,
  ).scenarios.neutral.path;
  const path = o.scenarios.neutral.path;
  it('runs from the target retirement age to the life expectancy age', () => {
    expect(path[0]!.age).toBe(67);
    expect(path[path.length - 1]!.age).toBe(90);
    expect(path[0]!.year).toBe(2052);
  });
  it('the first point equals the snapshot', () => {
    near(path[0]!.total, o.scenarios.neutral.snapshot.netMonthlyPensionReal);
  });
  it('the statutory pension grows in real terms (adjustment above inflation)', () => {
    const a = small[1]!.byProduct.statutory!;
    const b = small[0]!.byProduct.statutory!;
    near(a / b, 1.025 / 1.02);
  });
  it('the depot loses purchasing power, ends at its end age and the gap rises afterwards', () => {
    near(small[1]!.byProduct.retirementDepot! / small[0]!.byProduct.retirementDepot!, 1 / 1.02);
    const at84 = path.find((p) => p.age === 84)!;
    const at85 = path.find((p) => p.age === 85)!;
    expect(at84.byProduct.retirementDepot).toBeGreaterThan(0);
    expect(at85.byProduct.retirementDepot).toBe(0);
    expect(at85.gap!).toBeGreaterThan(at84.gap!);
    expect(o.firstPayoutEndAge).toBe(85);
  });
  it('totalGapReal sums 12 x gap over the years before the life expectancy age', () => {
    const expected = path.filter((p) => p.age < 90).reduce((s, p) => s + 12 * p.gap!, 0);
    near(o.scenarios.neutral.totalGapReal!, expected, 1e-6);
  });
  it('has no end age when no product ends inside the horizon', () => {
    expect(run([statutory()], 3000).firstPayoutEndAge).toBeUndefined();
  });
  it('a product that started before the target age is counted at the target', () => {
    const early = run([depot({ payoutStartAge: 65 })]);
    const snap = early.scenarios.neutral.snapshot.byProduct[0]!;
    const own = depot({ payoutStartAge: 65 });
    const net = (own.outcome as { ok: true; results: Record<ScenarioName, ProjectionResult> })
      .results.neutral.netMonthlyPensionReal;
    near(snap.netReal, net / Math.pow(1.02, 2));
  });
});

describe('overview: errors as data', () => {
  it('returns issues for an invalid profile instead of throwing', () => {
    const r = overview(
      [],
      { ...PROFILE, lifeExpectancyAge: 60 },
      ASSUMPTIONS,
      CTX.currentYear,
      LEGAL.incomeTax,
    );
    expect(r.ok).toBe(false);
  });
  it('handles no products', () => {
    const o = run([], 2000);
    expect(o.scenarios.neutral.snapshot.netMonthlyPensionReal).toBe(0);
    near(o.scenarios.neutral.snapshot.gap!, 2000);
  });
  it('carries the person id', () => {
    const r = overview([], PROFILE, ASSUMPTIONS, CTX.currentYear, LEGAL.incomeTax, 'p1');
    expect(r.ok && r.result.personId).toBe('p1');
  });
});

describe('overview: properties', () => {
  it('net never exceeds gross, per product', () => {
    const o = run([statutory(), depot(), occupational()]);
    for (const s of SCENARIO_NAMES) {
      for (const p of o.scenarios[s].snapshot.byProduct) {
        expect(p.netReal).toBeLessThanOrEqual(p.grossReal + 1e-9);
      }
    }
  });
  it('the total is monotone in a product input', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 570 }), fc.integer({ min: 0, max: 570 }), (a, b) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const total = (v: number) =>
          run([statutory(), depot({ ownContributionMonthly: v })]).scenarios.neutral.snapshot
            .netMonthlyPensionReal;
        return total(hi) >= total(lo) - 1e-9;
      }),
      { numRuns: 40 },
    );
  });
  it('a higher desired income never shrinks the gap', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 8000 }), fc.integer({ min: 0, max: 8000 }), (a, b) => {
        const products = [statutory(), depot()];
        const g = (w: number) => run(products, w).scenarios.neutral;
        const lo = g(Math.min(a, b));
        const hi = g(Math.max(a, b));
        return (
          hi.snapshot.gap! >= lo.snapshot.gap! - 1e-9 && hi.totalGapReal! >= lo.totalGapReal! - 1e-6
        );
      }),
      { numRuns: 40 },
    );
  });
  it('the gap is never negative along the path', () => {
    const o = run([statutory(), depot()], 2500);
    for (const p of o.scenarios.optimistic.path) expect(p.gap).toBeGreaterThanOrEqual(0);
  });
});

describe('overview: empty products', () => {
  it('ignores a product that pays nothing for the end age and the warnings', () => {
    const empty = depot({ ownContributionMonthly: 0 });
    const o = run([statutory(), empty]);
    expect(o.products.find((p) => p.productId === 'retirementDepot')?.empty).toBe(true);
    expect(o.firstPayoutEndAge).toBeUndefined();
    const withContribution = run([statutory(), depot()]);
    expect(withContribution.firstPayoutEndAge).toBe(85);
    expect(
      o.scenarios.neutral.snapshot.warnings.some((w) => w.startsWith('unverified:depot')),
    ).toBe(false);
  });
});

describe('overview: block projections with the other incomes', () => {
  it('a block taxed with `otherIncome` shows the same net as the overview', () => {
    const products = [statutory(), depot(), occupational()];
    const o = run(products);
    for (const scenario of SCENARIO_NAMES) {
      const others = (id: OverviewProductInput['productId']) => {
        const income = concurrentIncome(products, id, 67, ASSUMPTIONS);
        return income;
      };
      const d = projectDepot(DEPOT, { ...CTX, otherIncome: others('retirementDepot') }, scenario);
      const b = projectOccupational(
        OCCUPATIONAL,
        { ...CTX, otherIncome: others('occupational') },
        scenario,
      );
      const s = projectStatutory(STATUTORY, { ...CTX, otherIncome: others('statutory') });
      if (!d.ok || !b.ok || !s.ok) throw new Error('expected ok');
      const by = (id: string) =>
        o.scenarios[scenario].snapshot.byProduct.find((p) => p.productId === id)!.netReal;
      near(d.result.netMonthlyPensionReal, by('retirementDepot'), 1e-6);
      near(b.result.netMonthlyPensionReal, by('occupational'), 1e-6);
      // The statutory projection has one scenario; it uses the neutral other incomes.
      if (scenario === 'neutral') near(s.result.netMonthlyPensionReal, by('statutory'), 1e-6);
    }
  });

  it('counts only enabled and valid products and leaves the product itself out', () => {
    const products = [statutory(), depot({}, false), occupational()];
    const income = concurrentIncome(products, 'statutory', 67, ASSUMPTIONS).neutral;
    const occ = products[2]!.outcome as {
      ok: true;
      results: Record<ScenarioName, ProjectionResult>;
    };
    near(income.taxableMonthlyReal, occ.results.neutral.taxableMonthlyReal, 1e-9);
    near(income.contributionsMonthlyReal, occ.results.neutral.contributionsMonthlyReal, 1e-9);
  });
});

describe('overview: statutory pension keeps a fixed tax-free amount', () => {
  it('taxes later increases in full', () => {
    const products = [statutory()];
    const r = (
      products[0]!.outcome as { ok: true; results: Record<ScenarioName, ProjectionResult> }
    ).results.neutral;
    const taxFree = r.monthlyPensionReal - r.taxableMonthlyReal;
    const at = (age: number) =>
      concurrentIncome(products, 'etf', age, ASSUMPTIONS).neutral.taxableMonthlyReal;
    near(at(67), r.taxableMonthlyReal, 1e-9);
    const f10 = Math.pow(1.025 / 1.02, 10);
    // The pension grows in real terms; the fixed euro amount loses purchasing power.
    near(at(77), r.monthlyPensionReal * f10 - taxFree * Math.pow(1.02, -10), 1e-9);
    expect(at(77)).toBeGreaterThan(r.taxableMonthlyReal * f10);
  });

  it('never taxes more than the pension itself and never less than zero', () => {
    const products = [statutory()];
    for (let age = 67; age <= 90; age++) {
      const income = concurrentIncome(products, 'etf', age, ASSUMPTIONS).neutral;
      expect(income.taxableMonthlyReal).toBeGreaterThanOrEqual(0);
    }
  });
});
