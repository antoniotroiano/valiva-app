import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  buildOtherIncomeProducts,
  householdOverview,
  personContext,
  projectStatutory,
  retirementIncomeTax,
  splitAssumptions,
} from '../../src';
import type { Household, OtherIncomeEntry, OverviewProductInput, Person } from '../../src';
import { ASSUMPTIONS, CTX, LEGAL_OI, PROFILE, STATUTORY, oiEntry } from '../pensionFixtures';

const near = (a: number, b: number, eps = 0.005) => expect(Math.abs(a - b)).toBeLessThan(eps);
/** The tariff rounds the yearly tax down to full euros: monotone comparisons hold up to 1/12 EUR a month. */
const STEP = 1 / 12 + 1e-6;

const split = splitAssumptions(ASSUMPTIONS);
const YEAR = CTX.currentYear;
const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  name: id,
  birthYear: PROFILE.birthYear,
  targetRetirementAge: 67,
  lifeExpectancyAge: 90,
  childrenBirthYears: [],
  personalAssumptions: split.personal,
  ...over,
});
const household = (persons: Person[], extra: Partial<Household> = {}): Household => ({
  id: 'h',
  desiredMonthlyIncomeToday: 3500,
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

/** Products of a person from entries (with the person's own context). */
function entryProducts(
  h: Household,
  p: Person,
  entries: OtherIncomeEntry[],
): OverviewProductInput[] {
  const c = personContext(h, p);
  return buildOtherIncomeProducts(entries, { ...c, legal: LEGAL_OI, currentYear: YEAR });
}

const a = person('a', { lifeExpectancyAge: 80 }); // dies first, in 2065
const b = person('b', { lifeExpectancyAge: 90, birthYear: 1985 }); // lives to 2075
const DEATH = a.birthYear + 80;

const pension = (share: number, over: Partial<OtherIncomeEntry> = {}) =>
  oiEntry({
    id: 'pension',
    kind: 'civilServicePension',
    amountMonthly: 1500,
    survivorPercent: share,
    ...over,
  });

function run(
  h: Household,
  entriesA: OtherIncomeEntry[],
  entriesB: OtherIncomeEntry[] = [],
  extraB: OverviewProductInput[] = [],
  law = true,
) {
  const products = {
    a: entryProducts(h, a, entriesA),
    b: [...extraB, ...entryProducts(h, b, entriesB)],
  };
  const out = householdOverview(
    h,
    products,
    YEAR,
    LEGAL_OI.incomeTax,
    law ? LEGAL_OI.pension : undefined,
  );
  if (!out.ok) throw new Error(JSON.stringify(out.issues));
  return out.result;
}
const at = (r: ReturnType<typeof run>, year: number) =>
  r.scenarios.neutral.path.find((p) => p.year === year)!;

const withPair = (extra: Partial<Household> = {}) =>
  household([a, b], { survivorPension: 'new', ...extra });

describe('household: entries that go on to the partner (15 section 4.2)', () => {
  it('example 7: 55 % of 1,500 EUR real goes to the partner from the year after the death', () => {
    const r = run(withPair(), [pension(55)]);
    expect(r.survivor).toEqual({ deceasedId: 'a', survivorId: 'b', deathYear: DEATH });
    near(at(r, DEATH + 1).survivorOtherIncome!.b!, 825, 1e-6); // 0.55 x 1,500, below the basic allowance: no tax
    near(at(r, DEATH + 10).survivorOtherIncome!.b!, 825, 1e-6); // like inflation: real constant
    expect(at(r, DEATH).survivorOtherIncome).toBeUndefined();
    // It is part of the survivor's income and of the total.
    const point = at(r, DEATH + 1);
    expect(point.byPerson.b).toBeGreaterThanOrEqual(825);
    near(point.total, point.byPerson.a! + point.byPerson.b!, 1e-9);
    expect(point.byPersonProduct.b![`otherIncome:survivor:a:pension`]).toBeCloseTo(825, 6);
  });

  it('ends with the survivor life expectancy and does not exist before the death', () => {
    const r = run(withPair(), [pension(55)]);
    const last = b.birthYear + 90;
    expect(at(r, last).survivorOtherIncome).toBeDefined();
    expect(at(r, DEATH - 1).survivorOtherIncome).toBeUndefined();
    expect(r.lastYear).toBe(last);
  });

  it('0 % gives nothing, 100 % the whole gross, 55 % lies in between', () => {
    const net = (share: number) => run(withPair(), [pension(share)]);
    expect(at(net(0), DEATH + 1).survivorOtherIncome).toBeUndefined();
    const whole = retirementIncomeTax(
      [{ id: 'x', taxableMonthly: 1500, contributionsMonthly: 0 }],
      LEGAL_OI.incomeTax,
    ).taxMonthly;
    near(at(net(100), DEATH + 1).survivorOtherIncome!.b!, 1500 - whole, 1e-9);
    expect(at(net(55), DEATH + 1).survivorOtherIncome!.b!).toBeLessThan(
      at(net(100), DEATH + 1).survivorOtherIncome!.b!,
    );
  });

  it('is taxed in the survivor sum, not as a net of the deceased', () => {
    // b has a pension of 1,500 EUR of its own: the sum of own and continued income is taxed together.
    const own = oiEntry({ id: 'own', amountMonthly: 1500 });
    const r = run(withPair(), [pension(55)], [own]);
    const point = at(r, DEATH + 1);
    const total = retirementIncomeTax(
      [{ id: 'sum', taxableMonthly: 1500 + 825, contributionsMonthly: 0 }],
      LEGAL_OI.incomeTax,
    ).taxMonthly;
    near(point.survivorOtherIncome!.b!, 825 - (total * 825) / 2325, 1e-9);
    const ownNet = point.byPersonProduct.b!['otherIncome:own']!;
    near(ownNet, 1500 - (total * 1500) / 2325, 1e-9);
  });

  it('a tax-free amount fixed in euros goes on in proportion (basic pension with pensionShare)', () => {
    const basis = oiEntry({
      id: 'basis',
      kind: 'basisPension',
      amountMonthly: 400,
      amountBasis: 'nominalAtStart',
      adjustment: { mode: 'fixed', percent: 1 },
      start: { mode: 'age', age: 67 },
      taxMode: 'pensionShare',
      survivorPercent: 100,
    });
    const r = run(withPair(), [basis]);
    const year = DEATH + 1;
    const ageD = year - a.birthYear; // 81
    const nominal = 400 * Math.pow(1.01, ageD - 67);
    const f = Math.pow(1.02, year - YEAR);
    // Share of the taxable part: 84 + 0.5 * (2052 - 2026) = 97 %, tax-free amount 3 % of 400 nominal, fixed.
    const taxableNominal = nominal - 400 * 0.03;
    const tax = retirementIncomeTax(
      [{ id: 'x', taxableMonthly: taxableNominal / f, contributionsMonthly: 0 }],
      LEGAL_OI.incomeTax,
    ).taxMonthly;
    near(at(r, year).survivorOtherIncome!.b!, nominal / f - tax, 1e-9);
  });

  it('stops at the end of the entry, also when that is after the death', () => {
    // Entry ends at age 85 of a: payments to b run through 2069 (age 84), not through 2070.
    const r = run(withPair(), [pension(55, { end: { mode: 'age', age: 85 } })]);
    const endYear = a.birthYear + 85;
    expect(at(r, endYear - 1).survivorOtherIncome).toBeDefined();
    expect(at(r, endYear).survivorOtherIncome).toBeUndefined();
  });

  it('gives nothing if the entry ended before the death or had not started', () => {
    const ended = run(withPair(), [pension(55, { end: { mode: 'age', age: 75 } })]);
    expect(at(ended, DEATH + 1).survivorOtherIncome).toBeUndefined();
    const endsAtDeath = run(withPair(), [pension(55, { end: { mode: 'age', age: 81 } })]); // last payment year = death year + 0
    expect(at(endsAtDeath, DEATH + 1).survivorOtherIncome).toBeUndefined();
    const notStarted = run(withPair(), [pension(55, { start: { mode: 'age', age: 85 } })]);
    expect(at(notStarted, DEATH + 1).survivorOtherIncome).toBeUndefined();
  });

  it('a disabled or invalid entry does not go on', () => {
    expect(
      at(run(withPair(), [pension(55, { enabled: false })]), DEATH + 1).survivorOtherIncome,
    ).toBeUndefined();
    expect(
      at(run(withPair(), [pension(55, { amountMonthly: -1 })]), DEATH + 1).survivorOtherIncome,
    ).toBeUndefined();
  });

  it('only works with the survivor pension switched on and exactly two persons', () => {
    const base = run(household([a, b]), [pension(55)]);
    expect(base.survivor).toBeUndefined();
    expect(at(base, DEATH + 1).survivorOtherIncome).toBeUndefined();
    // Same result as without the share
    const zero = run(household([a, b]), [pension(0)]);
    expect(at(base, DEATH + 1).byPerson).toEqual(at(zero, DEATH + 1).byPerson);
    // Law values missing: survivor modelling is off
    const noLaw = run(withPair(), [pension(55)], [], [], false);
    expect(noLaw.survivor).toBeUndefined();
    // A single person: nothing happens
    const solo = householdOverview(
      household([b], { survivorPension: 'new' }),
      { b: entryProducts(household([b]), b, [pension(55)]) },
      YEAR,
      LEGAL_OI.incomeTax,
      LEGAL_OI.pension,
    );
    expect(solo.ok && solo.result.survivor).toBeFalsy();
    // Two persons with the same death year: no survivor
    const same = person('c', { lifeExpectancyAge: 80 });
    const twin = householdOverview(
      household([a, same], { survivorPension: 'new' }),
      { a: entryProducts(household([a]), a, [pension(55)]), c: [] },
      YEAR,
      LEGAL_OI.incomeTax,
      LEGAL_OI.pension,
    );
    expect(twin.ok && twin.result.survivor).toBeFalsy();
  });

  it('counts as credited income for the widow pension, own entries too', () => {
    const free = LEGAL_OI.pension.survivorIncomeFreeFactor * LEGAL_OI.pension.pensionValue;
    const credited = LEGAL_OI.pension.survivorIncomeCreditedPercent / 100;
    const rate = LEGAL_OI.pension.survivorPensionRateNewPercent / 100;
    const years = (r: ReturnType<typeof run>) => at(r, DEATH + 1);
    const aStat = [statutory(2400)];
    void aStat;
    const prodsA = (h: Household, entries: OtherIncomeEntry[]) => [
      statutory(2400),
      ...entryProducts(h, a, entries),
    ];
    const h = withPair();
    const calc = (entriesA: OtherIncomeEntry[], entriesB: OtherIncomeEntry[]) => {
      const out = householdOverview(
        h,
        { a: prodsA(h, entriesA), b: [statutory(600), ...entryProducts(h, b, entriesB)] },
        YEAR,
        LEGAL_OI.incomeTax,
        LEGAL_OI.pension,
      );
      if (!out.ok) throw new Error('x');
      return out.result;
    };
    const without = calc([], []);
    const withEntries = calc([pension(55)], [oiEntry({ id: 'rent', amountMonthly: 900 })]);
    const point = years(withEntries);
    const mine = point.byPersonProduct.b!;
    const income =
      (mine.statutory ?? 0) +
      Object.entries(mine)
        .filter(([id]) => id.startsWith('otherIncome:'))
        .reduce((s, [, v]) => s + (v ?? 0), 0);
    const baseNet = at(withEntries, DEATH).byPersonProduct.a!.statutory!;
    near(
      point.survivorPension!.b!,
      Math.max(0, rate * baseNet - credited * Math.max(0, income - free)),
      1e-9,
    );
    // The entries lower the widow pension against the same household without entries.
    expect(point.survivorPension!.b!).toBeLessThan(years(without).survivorPension!.b!);
  });

  it('a household without entries is unchanged by the code path (no survivor field)', () => {
    const h = withPair();
    const out = householdOverview(
      h,
      { a: [statutory(2400)], b: [statutory(600)] },
      YEAR,
      LEGAL_OI.incomeTax,
      LEGAL_OI.pension,
    );
    if (!out.ok) throw new Error('x');
    for (const p of out.result.scenarios.neutral.path)
      expect(p.survivorOtherIncome).toBeUndefined();
  });
});

describe('property tests: continued entries', () => {
  it('a higher share never lowers the survivor income (up to the rounding of the tax)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 90 }),
        fc.integer({ min: 0, max: 10 }),
        fc.double({ min: 0, max: 6000, noNaN: true }),
        (low, extra, amount) => {
          const net = (share: number) =>
            at(run(withPair(), [pension(share, { amountMonthly: amount })]), DEATH + 1).byPerson.b!;
          return net(low + extra) >= net(low) - STEP;
        },
      ),
      { numRuns: 80 },
    );
  });

  it('an additional entry never enlarges the household gap', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 5000, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        fc.integer({ min: 0, max: 100 }),
        (base, extra, share) => {
          const gap = (list: OtherIncomeEntry[]) =>
            run(withPair(), list).scenarios.neutral.totalGapReal!;
          const first = pension(share, { amountMonthly: base });
          const second = oiEntry({ id: 'more', amountMonthly: extra, survivorPercent: share });
          // totalGapReal sums 12 x gap over all years, so allow the rounding step for each month
          const months = 12 * (b.birthYear + 90 - (a.birthYear + 67));
          return gap([first, second]) <= gap([first]) + STEP * months;
        },
      ),
      { numRuns: 60 },
    );
  });

  it('all values are finite for extreme entries', () => {
    const r = run(
      withPair(),
      [
        pension(100, {
          amountMonthly: 100_000,
          adjustment: { mode: 'fixed', percent: 100 },
          start: { mode: 'age', age: 67 },
        }),
      ],
      [oiEntry({ amountMonthly: 100_000, adjustment: { mode: 'fixed', percent: -50 } })],
    );
    for (const p of r.scenarios.neutral.path) {
      expect(Number.isFinite(p.total)).toBe(true);
      expect(Number.isFinite(p.survivorOtherIncome?.b ?? 0)).toBe(true);
    }
  });
});
