import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  householdOverview,
  projectStatutory,
  splitAssumptions,
  validateHousehold,
} from '../../src';
import type { Household, OverviewProductInput, Person } from '../../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE, STATUTORY } from '../pensionFixtures';

const split = splitAssumptions(ASSUMPTIONS);
const YEAR = CTX.currentYear;
const PENSION = LEGAL.pension;

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

const household = (persons: Person[], extra: Partial<Household> = {}): Household => ({
  id: 'h',
  desiredMonthlyIncomeToday: 3000,
  assumptions: split.household,
  persons,
  ...extra,
});

function statutory(amount: number): OverviewProductInput {
  const r = projectStatutory(
    { ...STATUTORY, projectedMonthlyPensionToday: amount, retirementAge: 67 },
    CTX,
  );
  if (!r.ok) throw new Error('fixture');
  return {
    productId: 'statutory',
    enabled: true,
    payoutStartAge: 67,
    outcome: {
      ok: true,
      results: { pessimistic: r.result, neutral: r.result, optimistic: r.result },
    },
  };
}

const a = person('a', { lifeExpectancyAge: 80 });
const b = person('b', { lifeExpectancyAge: 90 });
const products = (pa: number, pb: number) => ({ a: [statutory(pa)], b: [statutory(pb)] });

function run(h: Household, p: Record<string, OverviewProductInput[]>, withLaw = true) {
  const r = householdOverview(h, p, YEAR, LEGAL.incomeTax, withLaw ? PENSION : undefined);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.result;
}

describe('survivor pension', () => {
  it('is off by default: the survivor keeps only the own income', () => {
    const res = run(household([a, b]), products(2000, 500));
    expect(res.survivor).toBeUndefined();
    const last = res.scenarios.neutral.path.at(-1)!;
    expect(last.survivorPension).toBeUndefined();
  });

  it('adds 55 % of the deceased net pension from the year after the death', () => {
    const res = run(household([a, b], { survivorPension: 'new' }), products(2000, 500));
    expect(res.survivor).toEqual({
      deceasedId: 'a',
      survivorId: 'b',
      deathYear: a.birthYear + 80,
    });
    const path = res.scenarios.neutral.path;
    const atDeath = path.find((p) => p.year === a.birthYear + 80)!;
    const after = path.find((p) => p.year === a.birthYear + 81)!;
    expect(atDeath.survivorPension).toBeUndefined();
    const own = after.byPersonProduct.b?.statutory ?? 0;
    const free = PENSION.survivorIncomeFreeFactor * PENSION.pensionValue;
    const raw = 0.55 * (atDeath.byPersonProduct.a?.statutory ?? 0);
    const expected = Math.max(0, raw - 0.4 * Math.max(0, own - free));
    expect(after.survivorPension?.b).toBeCloseTo(expected, 9);
    expect(after.byPerson.b).toBeCloseTo(own + expected, 9);
    expect(after.total).toBeCloseTo(own + expected, 9);
    expect(raw).toBeGreaterThan(0);
  });

  it('uses 60 % under old law and more than under new law', () => {
    const p = products(2000, 100);
    const n = run(household([a, b], { survivorPension: 'new' }), p);
    const o = run(household([a, b], { survivorPension: 'old' }), p);
    const year = a.birthYear + 81;
    const get = (r: typeof n) => r.scenarios.neutral.path.find((x) => x.year === year)!;
    expect(get(o).survivorPension!.b!).toBeGreaterThan(get(n).survivorPension!.b!);
  });

  it('is fully credited away when the own income is far above the free amount', () => {
    const res = run(household([a, b], { survivorPension: 'new' }), products(300, 4000));
    const after = res.scenarios.neutral.path.find((x) => x.year === a.birthYear + 81)!;
    expect(after.survivorPension).toBeUndefined();
  });

  it('is ignored without a second person, with equal death years or without legal values', () => {
    const single = run(household([a], { survivorPension: 'new' }), { a: [statutory(2000)] });
    expect(single.survivor).toBeUndefined();
    const equal = run(
      household([a, person('b', { lifeExpectancyAge: 80 })], { survivorPension: 'new' }),
      products(2000, 500),
    );
    expect(equal.survivor).toBeUndefined();
    const noLaw = run(household([a, b], { survivorPension: 'new' }), products(2000, 500), false);
    expect(noLaw.survivor).toBeUndefined();
  });

  it('never makes the household result smaller and never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4000 }),
        fc.integer({ min: 0, max: 4000 }),
        fc.constantFrom<'new' | 'old'>('new', 'old'),
        (pa, pb, rule) => {
          const p = products(pa, pb);
          const off = run(household([a, b]), p).scenarios.neutral.path;
          const on = run(household([a, b], { survivorPension: rule }), p).scenarios.neutral.path;
          on.forEach((point, i) => {
            expect(point.survivorPension?.b ?? 0).toBeGreaterThanOrEqual(0);
            expect(point.total).toBeGreaterThanOrEqual(off[i]!.total - 1e-9);
            expect(Number.isFinite(point.total)).toBe(true);
          });
        },
      ),
      { numRuns: 40 },
    );
  });
});

describe('wish after the first death', () => {
  it('reduces the wish and the gap from the year after the first death', () => {
    const res = run(household([a, b], { survivorWishPercent: 70 }), products(2000, 500));
    const path = res.scenarios.neutral.path;
    const before = path.find((p) => p.year === a.birthYear + 80)!;
    const after = path.find((p) => p.year === a.birthYear + 81)!;
    expect(before.desired).toBe(3000);
    expect(after.desired).toBeCloseTo(2100, 9);
    expect(after.gap).toBeCloseTo(Math.max(0, 2100 - after.total), 9);
  });

  it('does not change anything without the setting', () => {
    const base = run(household([a, b]), products(2000, 500));
    const same = run(household([a, b], { survivorWishPercent: 100 }), products(2000, 500));
    expect(same.scenarios.neutral.totalGapReal).toBeCloseTo(
      base.scenarios.neutral.totalGapReal!,
      9,
    );
  });

  it('is ignored for other household sizes', () => {
    const res = run(household([a], { survivorWishPercent: 50 }), { a: [statutory(2000)] });
    expect(res.scenarios.neutral.path.every((p) => p.desired === 3000)).toBe(true);
  });
});

describe('household validation of the survivor settings', () => {
  it('accepts valid values and rejects out-of-range ones', () => {
    expect(validateHousehold(household([a, b], { survivorWishPercent: 70 }), YEAR)).toEqual([]);
    expect(validateHousehold(household([a, b], { survivorWishPercent: 5 }), YEAR)).toHaveLength(1);
    expect(validateHousehold(household([a, b], { survivorWishPercent: 101 }), YEAR)).toHaveLength(
      1,
    );
    expect(
      validateHousehold(household([a, b], { survivorPension: 'x' as unknown as 'new' }), YEAR),
    ).toHaveLength(1);
  });
});
