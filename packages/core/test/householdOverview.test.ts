import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  householdOverview,
  overview,
  projectStatutory,
  splitAssumptions,
} from '../src';
import type { Household, OverviewProductInput, Person } from '../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE, STATUTORY } from './pensionFixtures';

const split = splitAssumptions(ASSUMPTIONS);
const YEAR = CTX.currentYear;

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  name: id,
  birthYear: PROFILE.birthYear,
  targetRetirementAge: PROFILE.targetRetirementAge,
  lifeExpectancyAge: 90,
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

function statutory(retirementAge = 67): OverviewProductInput {
  const r = projectStatutory({ ...STATUTORY, retirementAge }, CTX);
  if (!r.ok) throw new Error('fixture');
  return {
    productId: 'statutory',
    enabled: true,
    payoutStartAge: retirementAge,
    outcome: {
      ok: true,
      results: { pessimistic: r.result, neutral: r.result, optimistic: r.result },
    },
  };
}

function run(h: Household, products: Record<string, OverviewProductInput[]>) {
  const r = householdOverview(h, products, YEAR, LEGAL.incomeTax);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.result;
}

describe('householdOverview: one person equals the single-person overview', () => {
  it('matches snapshot, gap and path', () => {
    const h = household([person('a')], 3000);
    const products = { a: [statutory()] };
    const single = overview(
      products.a,
      { ...PROFILE, lifeExpectancyAge: 90, desiredMonthlyIncomeToday: 3000 },
      ASSUMPTIONS,
      YEAR,
      LEGAL.incomeTax,
    );
    if (!single.ok) throw new Error('single');
    const res = run(h, products);
    for (const s of SCENARIO_NAMES) {
      const a = single.result.scenarios[s];
      const b = res.scenarios[s];
      expect(b.snapshot.netMonthlyPensionReal).toBeCloseTo(a.snapshot.netMonthlyPensionReal, 9);
      expect(b.snapshot.gap).toBeCloseTo(a.snapshot.gap ?? 0, 9);
      expect(b.totalGapReal).toBeCloseTo(a.totalGapReal ?? 0, 6);
      expect(b.path).toHaveLength(a.path.length);
      b.path.forEach((p, i) => expect(p.total).toBeCloseTo(a.path[i]!.total, 9));
    }
  });
});

describe('householdOverview: two persons', () => {
  const a = person('a');
  const b = person('b', { birthYear: PROFILE.birthYear + 3, lifeExpectancyAge: 85 });
  const products = { a: [statutory()], b: [statutory()] };

  it('spans the calendar years from the first start to the last death', () => {
    const res = run(household([a, b], 3000), products);
    expect(res.firstYear).toBe(a.birthYear + 67);
    expect(res.snapshotYear).toBe(b.birthYear + 67);
    expect(res.lastYear).toBe(Math.max(a.birthYear + 90, b.birthYear + 85));
  });

  it('shows partial income before the second person retires', () => {
    const res = run(household([a, b], 3000), products);
    const first = res.scenarios.neutral.path[0]!;
    expect(first.byPerson.a).toBeGreaterThan(0);
    expect(first.byPerson.b).toBe(0);
    const snap = res.scenarios.neutral.snapshot;
    expect(snap.netMonthlyPensionReal).toBeCloseTo(
      (snap.byPerson.a ?? 0) + (snap.byPerson.b ?? 0),
      9,
    );
  });

  it('keeps the gap at 0 on a surplus', () => {
    const res = run(household([a, b], 100), products);
    expect(res.scenarios.neutral.snapshot.gap).toBe(0);
    expect(res.scenarios.neutral.snapshot.surplus).toBeGreaterThan(0);
  });

  it('works with a person without products', () => {
    const res = run(household([a, b], 3000), { a: [statutory()] });
    expect(res.scenarios.neutral.snapshot.byPerson.b).toBe(0);
  });

  it('returns issues as data', () => {
    const r = householdOverview(household([]), {}, YEAR, LEGAL.incomeTax);
    expect(r.ok).toBe(false);
  });
});

describe('householdOverview: properties', () => {
  it('adding a person never enlarges the gap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 6000 }),
        fc.integer({ min: 0, max: 8 }),
        (wish, delta) => {
          const a = person('a');
          const b = person('b', { birthYear: a.birthYear + delta });
          const one = run(household([a], wish), { a: [statutory()] });
          const two = run(household([a, b], wish), { a: [statutory()], b: [statutory()] });
          // Compare at the same calendar year (snapshot of the single person).
          const at = two.scenarios.neutral.path.find((p) => p.year === one.snapshotYear)!;
          expect(at.gap ?? 0).toBeLessThanOrEqual((one.scenarios.neutral.snapshot.gap ?? 0) + 1e-9);
        },
      ),
    );
  });

  it('a higher wish never shrinks the gap; person order is irrelevant', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }),
        fc.integer({ min: 0, max: 2000 }),
        (wish, extra) => {
          const a = person('a');
          const b = person('b', { birthYear: a.birthYear + 2 });
          const p = { a: [statutory()], b: [statutory()] };
          const low = run(household([a, b], wish), p).scenarios.neutral;
          const high = run(household([a, b], wish + extra), p).scenarios.neutral;
          expect(high.snapshot.gap ?? 0).toBeGreaterThanOrEqual((low.snapshot.gap ?? 0) - 1e-9);
          const swapped = run(household([b, a], wish), p).scenarios.neutral;
          expect(swapped.snapshot.gap ?? 0).toBeCloseTo(low.snapshot.gap ?? 0, 9);
          expect(swapped.totalGapReal ?? 0).toBeCloseTo(low.totalGapReal ?? 0, 6);
        },
      ),
    );
  });
});
