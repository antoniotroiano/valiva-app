import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  buildOtherIncomeProducts,
  buildRetiredProducts,
  householdOverview,
  overview,
  splitAssumptions,
} from '../../src';
import type { Household, OverviewProductInput, Person, Profile, RetiredBlocks } from '../../src';
import {
  ASSUMPTIONS,
  JOINT,
  LEGAL,
  LEGAL_R,
  RET_CTX,
  RET_PROFILE,
  oiEntry,
  retCtx,
} from '../pensionFixtures';

const YEAR = 2026;
const TAX = { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 };
const near = (a: number, b: number, eps = 0.005) => expect(Math.abs(a - b)).toBeLessThan(eps);
const vector = (name: string) =>
  JSON.parse(
    readFileSync(join(__dirname, '..', 'golden-vectors', 'retired', `${name}.json`), 'utf8'),
  ) as { cases: { expected: { path: { t: number; netReal: number; taxableReal: number }[] } }[] };

const BLOCKS: RetiredBlocks = {
  statutory: { mode: 'actual', actualMonthlyGross: 1650 },
  occupational: { retiredForm: 'annuity', annuityMonthlyGross: 250 },
  depot: { retiredCapitalToday: 30000, retiredEndAge: 90 },
  etfPayout: { holdingValue: 80000, holdingContributions: 50000 },
  enabled: { etf: true, statutory: true, retirementDepot: true, occupational: true },
  etf: { tax: TAX },
};
const only = (kind: keyof RetiredBlocks['enabled']): RetiredBlocks => ({
  ...BLOCKS,
  enabled: {
    etf: false,
    statutory: false,
    retirementDepot: false,
    occupational: false,
    [kind]: true,
  },
});

const profileOf = (over: Partial<Profile> = {}): Profile => ({
  ...RET_PROFILE,
  desiredMonthlyIncomeToday: 2500,
  ...over,
});

function run(products: OverviewProductInput[], profile: Profile = profileOf(), a = ASSUMPTIONS) {
  const out = overview(products, profile, a, YEAR, LEGAL.incomeTax);
  if (!out.ok) throw new Error(JSON.stringify(out.issues));
  return out.result;
}

describe('buildRetiredProducts', () => {
  const products = buildRetiredProducts(BLOCKS, RET_CTX);
  const byId = (id: string) => products.find((p) => p.productId === id)!;

  it('returns the four products in the order of the planning mode, all paying from today (age 71)', () => {
    expect(products.map((p) => p.productId)).toEqual([
      'etf',
      'statutory',
      'retirementDepot',
      'occupational',
    ]);
    expect(products.map((p) => p.payoutStartAge)).toEqual([71, 71, 71, 71]);
    expect(products.every((p) => p.outcome.ok)).toBe(true);
  });

  it('gives the end ages of the blocks: ETF to the life expectancy, depot to its end age, a running pension for life', () => {
    expect(byId('etf').payoutEndAge).toBe(90);
    expect(byId('retirementDepot').payoutEndAge).toBe(90);
    expect(byId('statutory').payoutEndAge).toBeUndefined();
    expect(byId('occupational').payoutEndAge).toBeUndefined();
    const withEnd = buildRetiredProducts(
      {
        ...BLOCKS,
        etfPayout: { ...BLOCKS.etfPayout, payoutEndAge: 85 },
        occupational: { retiredForm: 'annuity', annuityMonthlyGross: 250, annuityEndAge: 80 },
      },
      RET_CTX,
    );
    expect(withEnd.find((p) => p.productId === 'etf')!.payoutEndAge).toBe(85);
    expect(withEnd.find((p) => p.productId === 'occupational')!.payoutEndAge).toBe(80);
    const capital = buildRetiredProducts(
      {
        ...BLOCKS,
        occupational: { retiredForm: 'capital', capitalToday: 20000, capitalEndAge: 85 },
      },
      RET_CTX,
    );
    expect(capital.find((p) => p.productId === 'occupational')!.payoutEndAge).toBe(85);
    const lifelong = buildRetiredProducts(
      {
        ...BLOCKS,
        occupational: {
          retiredForm: 'annuity',
          annuityMonthlyGross: 250,
          annuityEndAge: 'lifelong',
        },
      },
      RET_CTX,
    );
    expect(lifelong.find((p) => p.productId === 'occupational')!.payoutEndAge).toBeUndefined();
  });

  it('marks a block that fails validation as invalid, with the reasons, and keeps the others', () => {
    const broken = buildRetiredProducts(
      { ...BLOCKS, etfPayout: { holdingValue: 80000 }, statutory: {} },
      RET_CTX,
    );
    const etf = broken.find((p) => p.productId === 'etf')!;
    expect(
      etf.outcome.ok === false && etf.outcome.issues.map((i) => `${i.field}:${i.code}`),
    ).toEqual(['holdingContributions:required']);
    const stat = broken.find((p) => p.productId === 'statutory')!;
    expect(stat.outcome.ok === false && stat.outcome.issues[0]?.field).toBe('actualMonthlyGross');
    expect(broken.find((p) => p.productId === 'occupational')!.outcome.ok).toBe(true);
  });

  it('carries the switches of the overview block', () => {
    const off = buildRetiredProducts(
      { ...BLOCKS, enabled: { ...BLOCKS.enabled, etf: false } },
      RET_CTX,
    );
    expect(off.map((p) => p.enabled)).toEqual([false, true, true, true]);
  });
});

describe('overview of a person who already draws the pension', () => {
  it("counts from today: no retirement_in_past, the target age is today's age, the path runs to the life expectancy", () => {
    const r = run(buildRetiredProducts(BLOCKS, RET_CTX));
    expect(r.targetRetirementAge).toBe(71);
    expect(r.scenarios.neutral.path.map((p) => p.year)).toEqual(
      Array.from({ length: 20 }, (_, i) => 2026 + i),
    );
    expect(r.scenarios.neutral.path[0]!.age).toBe(71);
    expect(r.products.every((p) => p.status === 'included')).toBe(true);
  });

  it('the statutory pension follows the golden path of example 1 (share 78 %, fixed tax-free amount)', () => {
    const expected = vector('r01-statutory-2019-estimated').cases[0]!.expected.path;
    const r = run(buildRetiredProducts(only('statutory'), RET_CTX));
    for (const e of expected) {
      near(r.scenarios.neutral.path[e.t]!.byProduct.statutory!, e.netReal, 0.005);
    }
  });

  it('a pension that starts this year: share in the start year, fixed tax-free amount from the next (example 6)', () => {
    const ctx = retCtx({ birthYear: 1959, retirementStartYear: 2026 });
    const profile = profileOf({ birthYear: 1959, retirementStartYear: 2026 });
    const blocks = { ...only('statutory'), statutory: { actualMonthlyGross: 1800 } };
    const r = run(buildRetiredProducts(blocks, ctx), profile);
    const expected = vector('r03-statutory-starts-this-year').cases[0]!.expected.path;
    for (const e of expected)
      near(r.scenarios.neutral.path[e.t]!.byProduct.statutory!, e.netReal, 0.005);
  });

  it('property: every product is finite and not negative along the whole path, at the extremes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 1976 }),
        fc.integer({ min: 50, max: 75 }),
        fc.double({ min: 0, max: 20000, noNaN: true }),
        fc.double({ min: 0, max: 5e7, noNaN: true }),
        fc.double({ min: 0, max: 5e6, noNaN: true }),
        (birthYear, startAge, monthly, holding, capital) => {
          const retirementStartYear = birthYear + startAge;
          fc.pre(retirementStartYear <= YEAR && birthYear + 120 >= YEAR);
          const ctx = retCtx({ birthYear, retirementStartYear, lifeExpectancyAge: 120 });
          const profile = profileOf({ birthYear, retirementStartYear, lifeExpectancyAge: 120 });
          const age = YEAR - birthYear;
          fc.pre(age < 85);
          const products = buildRetiredProducts(
            {
              ...BLOCKS,
              statutory: { actualMonthlyGross: monthly },
              etfPayout: {
                holdingValue: holding,
                holdingContributions: holding / 2,
                payoutEndAge: 120,
              },
              depot: { retiredCapitalToday: capital, retiredEndAge: 120 },
              occupational: { retiredForm: 'capital', capitalToday: capital, capitalEndAge: 120 },
            },
            ctx,
          );
          const r = run(products, profile);
          for (const p of r.scenarios.neutral.path) {
            expect(Number.isFinite(p.total)).toBe(true);
            for (const v of Object.values(p.byProduct)) {
              expect(Number.isFinite(v)).toBe(true);
              expect(v).toBeGreaterThanOrEqual(-1e-6);
            }
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});

describe('timing issues of the entry points', () => {
  it('a start after today and a life expectancy in the past are issues, not results', () => {
    const products = buildRetiredProducts(BLOCKS, RET_CTX);
    const future = overview(
      products,
      profileOf({ birthYear: 1962, retirementStartYear: 2029 }),
      ASSUMPTIONS,
      YEAR,
      LEGAL.incomeTax,
    );
    expect(future.ok === false && future.issues.map((i) => i.code)).toEqual([
      'retired_start_in_future',
    ]);
    const past = overview(
      products,
      profileOf({ birthYear: 1930, retirementStartYear: 1990, lifeExpectancyAge: 90 }),
      ASSUMPTIONS,
      YEAR,
      LEGAL.incomeTax,
    );
    expect(past.ok === false && past.issues.map((i) => i.code)).toEqual([
      'life_expectancy_in_past',
    ]);
  });

  it('a person in the planning mode keeps the old message and the old numbers', () => {
    const planning: Profile = {
      birthYear: 1950,
      targetRetirementAge: 65,
      lifeExpectancyAge: 90,
      childrenBirthYears: [],
    };
    const out = overview([], planning, ASSUMPTIONS, YEAR, LEGAL.incomeTax);
    expect(out.ok === false && out.issues.map((i) => i.code)).toEqual(['retirement_in_past']);
  });

  it('retired = false (with a leftover start year) rates exactly like a profile without the fields', () => {
    const products: OverviewProductInput[] = [];
    const plain: Profile = {
      birthYear: 1985,
      targetRetirementAge: 67,
      lifeExpectancyAge: 90,
      childrenBirthYears: [],
      desiredMonthlyIncomeToday: 2500,
    };
    const a = overview(products, plain, ASSUMPTIONS, YEAR, LEGAL.incomeTax);
    const b = overview(
      products,
      { ...plain, retired: false, retirementStartYear: 2010 },
      ASSUMPTIONS,
      YEAR,
      LEGAL.incomeTax,
    );
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

describe('household with persons who already draw the pension', () => {
  const split = splitAssumptions(ASSUMPTIONS);
  const marta: Person = {
    id: 'marta',
    name: 'Marta',
    birthYear: 1955,
    targetRetirementAge: 67,
    lifeExpectancyAge: 90,
    childrenBirthYears: [1985],
    personalAssumptions: split.personal,
    retired: true,
    retirementStartYear: 2019,
  };
  const jonas: Person = {
    id: 'jonas',
    name: 'Jonas',
    birthYear: 1962,
    targetRetirementAge: 67,
    lifeExpectancyAge: 90,
    childrenBirthYears: [],
    personalAssumptions: split.personal,
  };
  const hh = (persons: Person[], over: Partial<Household> = {}): Household => ({
    id: 'h',
    desiredMonthlyIncomeToday: 3000,
    assumptions: split.household,
    persons,
    ...over,
  });
  const martaProducts = buildRetiredProducts(
    {
      ...BLOCKS,
      enabled: { etf: false, statutory: true, retirementDepot: false, occupational: false },
    },
    RET_CTX,
  );
  const jonasCtx = { profile: jonas, assumptions: ASSUMPTIONS, legal: LEGAL_R, currentYear: YEAR };
  const jonasProducts = buildOtherIncomeProducts(
    [oiEntry({ id: 'j', amountMonthly: 1500, taxMode: 'full', start: { mode: 'retirement' } })],
    jonasCtx,
  );
  const calc = (household: Household, by: Record<string, OverviewProductInput[]>) => {
    const out = householdOverview(household, by, YEAR, LEGAL.incomeTax, LEGAL.pension, JOINT);
    if (!out.ok) throw new Error(JSON.stringify(out.issues));
    return out.result;
  };

  it('transition years carry no gap and do not count in the total gap; the wish line is still there', () => {
    const r = calc(hh([marta, jonas]), { marta: martaProducts, jonas: jonasProducts });
    const path = r.scenarios.neutral.path;
    expect(r.snapshotYear).toBe(2029);
    expect(path.filter((p) => p.transition).map((p) => p.year)).toEqual([2026, 2027, 2028]);
    for (const p of path.filter((x) => x.transition)) {
      expect(p.gap).toBeUndefined();
      expect(p.desired).toBe(3000);
    }
    const counted = path
      .filter((p) => !p.transition && p.year < r.lastYear)
      .reduce((s, p) => s + 12 * (p.gap ?? 0), 0);
    near(r.scenarios.neutral.totalGapReal!, counted, 1e-6);
    expect(r.scenarios.neutral.retiredToday).toHaveLength(1);
    expect(r.scenarios.neutral.retiredToday![0]!.name).toBe('Marta');
  });

  it('without a retired person nothing new appears (no transition flag, no tile)', () => {
    const young: Person = { ...jonas, id: 'anna', name: 'Anna', birthYear: 1980 };
    const r = calc(hh([jonas, young]), { jonas: jonasProducts, anna: [] });
    for (const p of r.scenarios.neutral.path) expect(p.transition).toBeUndefined();
    expect(r.scenarios.neutral.retiredToday).toBeUndefined();
  });

  it('two persons who both draw the pension: the snapshot is today, there are no transition years', () => {
    const other: Person = {
      ...marta,
      id: 'otto',
      name: 'Otto',
      birthYear: 1953,
      retirementStartYear: 2016,
    };
    const r = calc(hh([marta, other]), { marta: martaProducts, otto: martaProducts });
    expect([r.firstYear, r.snapshotYear]).toEqual([2026, 2026]);
    for (const p of r.scenarios.neutral.path) expect(p.transition).toBeUndefined();
    expect(r.scenarios.neutral.retiredToday?.map((t) => t.personId)).toEqual(['marta', 'otto']);
  });

  it('joint assessment starts in the year in which the later pension starts, not before', () => {
    const separate = calc(hh([marta, jonas], { jointAssessment: false }), {
      marta: martaProducts,
      jonas: jonasProducts,
    });
    const joint = calc(hh([marta, jonas], { jointAssessment: true }), {
      marta: martaProducts,
      jonas: jonasProducts,
    });
    const yearOf = (r: typeof joint, y: number) =>
      r.scenarios.neutral.path.find((p) => p.year === y)!;
    for (const y of [2026, 2027, 2028]) {
      expect(yearOf(joint, y).total).toBe(yearOf(separate, y).total);
    }
    // 2029: both draw a pension; splitting changes the net of the couple
    expect(yearOf(joint, 2029).total).not.toBe(yearOf(separate, 2029).total);
  });

  it('the order of the persons does not change the result', () => {
    const a = calc(hh([marta, jonas], { jointAssessment: true, survivorPension: 'new' }), {
      marta: martaProducts,
      jonas: jonasProducts,
    });
    const b = calc(hh([jonas, marta], { jointAssessment: true, survivorPension: 'new' }), {
      marta: martaProducts,
      jonas: jonasProducts,
    });
    expect(b.firstYear).toBe(a.firstYear);
    a.scenarios.neutral.path.forEach((p, i) => {
      near(b.scenarios.neutral.path[i]!.total, p.total, 1e-9);
      expect(b.scenarios.neutral.path[i]!.transition).toBe(p.transition);
    });
    near(b.scenarios.neutral.totalGapReal!, a.scenarios.neutral.totalGapReal!, 1e-6);
  });

  it('reports the timing issue of a retired person with the person prefix', () => {
    const future: Person = { ...marta, retirementStartYear: 2030 };
    const out = householdOverview(
      hh([future, jonas]),
      { marta: martaProducts, jonas: jonasProducts },
      YEAR,
      LEGAL.incomeTax,
    );
    expect(out.ok === false && out.issues.map((i) => `${i.field}:${i.code}`)).toEqual([
      'persons.marta.retirementStartYear:retired_start_in_future',
    ]);
    const farOut = householdOverview(
      hh([{ ...marta, retirementStartYear: 2040 }, jonas]),
      { marta: martaProducts, jonas: jonasProducts },
      YEAR,
      LEGAL.incomeTax,
    );
    expect(farOut.ok === false && farOut.issues.map((i) => `${i.field}:${i.code}`)).toContain(
      'persons.marta.retirementStartYear:out_of_range',
    );
  });

  it('survivor share of an entry 0 % and 100 %: nothing and the whole amount go on to the partner', () => {
    const martaCtx = { ...RET_CTX, legal: LEGAL_R };
    const entry = (survivorPercent: number) =>
      buildOtherIncomeProducts(
        [oiEntry({ id: 'r', amountMonthly: 400, taxMode: 'full', survivorPercent })],
        martaCtx,
      );
    const calcWith = (percent: number) =>
      calc(hh([marta, jonas], { survivorPension: 'new' }), {
        marta: [...martaProducts, ...entry(percent)],
        jonas: jonasProducts,
      });
    const none = calcWith(0).scenarios.neutral.path.find((p) => p.year === 2046)!;
    const all = calcWith(100).scenarios.neutral.path.find((p) => p.year === 2046)!;
    expect(none.survivorOtherIncome).toBeUndefined();
    expect(all.survivorOtherIncome?.jonas).toBeGreaterThan(0);
    // for a 100 % entry the continued amount does not exceed the entry's own gross
    expect(all.survivorOtherIncome!.jonas!).toBeLessThanOrEqual(400);
  });

  it('an entry "with my retirement start" runs since the start of the notice: today\'s amount counts today', () => {
    const martaCtx = { ...RET_CTX, legal: LEGAL_R };
    const products = buildOtherIncomeProducts(
      [
        oiEntry({
          id: 'r',
          amountMonthly: 600,
          taxMode: 'none',
          amountBasis: 'today',
          adjustment: { mode: 'inflation' },
        }),
      ],
      martaCtx,
    );
    const r = run(products);
    near(r.scenarios.neutral.path[0]!.byProduct['otherIncome:r']!, 600, 1e-6);
    // inflation-adjusted: still 600 in today's purchasing power ten years on
    near(r.scenarios.neutral.path[10]!.byProduct['otherIncome:r']!, 600, 1e-6);
  });
});
