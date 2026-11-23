import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  householdOverview,
  isJointlyAssessed,
  jointContextFor,
  projectStatutory,
  solveHouseholdGapContribution,
  splitAssumptions,
  validateHousehold,
} from '../../src';
import type { Household, OverviewProductInput, Person } from '../../src';
import { ASSUMPTIONS, CTX, JOINT, LEGAL, PROFILE, STATUTORY } from '../pensionFixtures';

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

const household = (persons: Person[], over: Partial<Household> = {}): Household => ({
  id: 'h',
  desiredMonthlyIncomeToday: 3500,
  assumptions: split.household,
  persons,
  ...over,
});

function statutory(monthlyToday: number, retirementAge = 67): OverviewProductInput {
  const r = projectStatutory(
    { ...STATUTORY, projectedMonthlyPensionToday: monthlyToday, retirementAge },
    CTX,
  );
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

function run(h: Household, products: Record<string, OverviewProductInput[]>, joint = true) {
  const r = householdOverview(
    h,
    products,
    YEAR,
    LEGAL.incomeTax,
    undefined,
    joint ? JOINT : undefined,
  );
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.result;
}

const a = person('a');
const b = person('b');
const unequal = { a: [statutory(3800)], b: [statutory(900)] };
const equal = { a: [statutory(2000)], b: [statutory(2000)] };

describe('householdOverview with joint assessment', () => {
  it('unequal pensions: the net of the couple is higher with yes, in every scenario', () => {
    const no = run(household([a, b], { jointAssessment: false }), unequal);
    const yes = run(household([a, b], { jointAssessment: true }), unequal);
    for (const s of SCENARIO_NAMES) {
      expect(yes.scenarios[s].snapshot.netMonthlyPensionReal).toBeGreaterThan(
        no.scenarios[s].snapshot.netMonthlyPensionReal,
      );
    }
  });

  it('equal pensions: the same net as without joint assessment', () => {
    const no = run(household([a, b], { jointAssessment: false }), equal);
    const yes = run(household([a, b], { jointAssessment: true }), equal);
    for (const s of SCENARIO_NAMES) {
      expect(yes.scenarios[s].snapshot.netMonthlyPensionReal).toBeCloseTo(
        no.scenarios[s].snapshot.netMonthlyPensionReal,
        9,
      );
    }
  });

  it('the person with the higher pension gets the higher tax share, the sum is the joint tax', () => {
    const no = run(household([a, b], { jointAssessment: false }), unequal);
    const yes = run(household([a, b], { jointAssessment: true }), unequal);
    const gain = (id: string) =>
      yes.scenarios.neutral.snapshot.byPerson[id]! - no.scenarios.neutral.snapshot.byPerson[id]!;
    // The tax is shared in proportion to the taxable pensions: the person with 3.800 pays more tax than the
    // one with 900, but both pay less than alone (the allowance of the weak earner is used).
    expect(gain('a')).toBeGreaterThan(0);
    expect(gain('b')).toBeLessThan(0);
    const total =
      yes.scenarios.neutral.snapshot.netMonthlyPensionReal -
      no.scenarios.neutral.snapshot.netMonthlyPensionReal;
    expect(gain('a') + gain('b')).toBeCloseTo(total, 9);
  });

  it('not answered, no and a single person give exactly the result without the feature', () => {
    const base = run(household([a, b]), unequal, false);
    expect(run(household([a, b]), unequal, true)).toEqual(base);
    expect(run(household([a, b], { jointAssessment: false }), unequal, true)).toEqual(base);
    const solo = household([a], { jointAssessment: true });
    expect(run(solo, { a: unequal.a }, true)).toEqual(run(household([a]), { a: unequal.a }, false));
  });

  it('warns about the unverified splitting value only where splitting is applied', () => {
    const code = 'unverified:jointAssessment.specialExpensesLumpSumJointYearly';
    const warnings = (h: Household, unverified: string[]) => {
      const out = householdOverview(h, unequal, YEAR, LEGAL.incomeTax, undefined, {
        ...JOINT,
        unverified,
      });
      if (!out.ok) throw new Error('fixture');
      return out.result.persons.flatMap((p) => p.overview.scenarios.neutral.snapshot.warnings);
    };
    const key = 'jointAssessment.specialExpensesLumpSumJointYearly';
    expect(warnings(household([a, b], { jointAssessment: true }), [key])).toContain(code);
    expect(warnings(household([a, b], { jointAssessment: true }), ['pension.x'])).not.toContain(
      code,
    );
    expect(warnings(household([a, b], { jointAssessment: false }), [key])).not.toContain(code);
    expect(warnings(household([a, b]), [key])).not.toContain(code);
    expect(warnings(household([a]), [key])).not.toContain(code);
  });

  it('yes without the legal values does not change anything', () => {
    const base = run(household([a, b]), unequal, false);
    expect(run(household([a, b], { jointAssessment: true }), unequal, false)).toEqual(base);
  });

  it('taxes alone until both are retired', () => {
    const young = person('b', { birthYear: PROFILE.birthYear + 5 });
    const prods = { a: [statutory(3800)], b: [statutory(900)] };
    const no = run(household([a, young], { jointAssessment: false }), prods);
    const yes = run(household([a, young], { jointAssessment: true }), prods);
    const bStart = young.birthYear + 67;
    for (const s of SCENARIO_NAMES) {
      const before = (r: typeof yes) => r.scenarios[s].path.filter((p) => p.year < bStart);
      expect(before(yes).length).toBeGreaterThan(0);
      expect(before(yes)).toEqual(before(no));
      const after = yes.scenarios[s].path.find((p) => p.year === bStart)!;
      expect(after.total).toBeGreaterThan(
        no.scenarios[s].path.find((p) => p.year === bStart)!.total,
      );
    }
  });

  it('keeps splitting in the death year and the year after, then taxes the survivor alone', () => {
    const early = person('b', { lifeExpectancyAge: 80 });
    const prods = { a: [statutory(3800)], b: [statutory(900)] };
    const no = run(household([a, early], { jointAssessment: false }), prods);
    const yes = run(household([a, early], { jointAssessment: true }), prods);
    const death = early.birthYear + 80;
    const at = (r: typeof yes, year: number) =>
      r.scenarios.neutral.path.find((p) => p.year === year)!.byPerson.a!;
    expect(at(yes, death)).toBeGreaterThan(at(no, death));
    // Year after the death: the survivor keeps the splitting tariff (alone, so a smaller advantage).
    expect(at(yes, death + 1)).toBeGreaterThan(at(no, death + 1));
    expect(at(yes, death + 2)).toBeCloseTo(at(no, death + 2), 9);
  });

  it('the person with the lower pension does not lose the weaker partner after death in their own path', () => {
    const early = person('b', { lifeExpectancyAge: 80 });
    const yes = run(household([a, early], { jointAssessment: true }), {
      a: [statutory(3800)],
      b: [statutory(900)],
    });
    const death = early.birthYear + 80;
    // The deceased person has no income after the death year.
    expect(yes.scenarios.neutral.path.find((p) => p.year === death + 1)!.byPerson.b).toBe(0);
  });

  it('returns broken splitting values as data', () => {
    const out = householdOverview(
      household([a, b], { jointAssessment: true }),
      unequal,
      YEAR,
      LEGAL.incomeTax,
      undefined,
      { splittingDivisor: 0, specialExpensesLumpSumJointYearly: 72 },
    );
    expect(out.ok).toBe(false);
  });

  it('the gap solver uses the joint assessment too', () => {
    const h = household([a, b], { jointAssessment: true, desiredMonthlyIncomeToday: 6000 });
    const buildEtf = () => unequal.a[0]!;
    const run2 = (joint: boolean) =>
      solveHouseholdGapContribution(
        joint ? h : { ...h, jointAssessment: false },
        'a',
        { a: [], b: unequal.b },
        buildEtf,
        0,
        YEAR,
        LEGAL.incomeTax,
        undefined,
        JOINT,
      );
    const yes = run2(true);
    const no = run2(false);
    expect(yes.ok && no.ok).toBe(true);
    if (yes.ok && no.ok) {
      expect(yes.scenarios.neutral.monthly).toBeLessThanOrEqual(no.scenarios.neutral.monthly);
    }
  });
});

describe('isJointlyAssessed and jointContextFor', () => {
  it('needs exactly two persons and the answer yes', () => {
    expect(isJointlyAssessed(household([a, b], { jointAssessment: true }))).toBe(true);
    expect(isJointlyAssessed(household([a, b], { jointAssessment: false }))).toBe(false);
    expect(isJointlyAssessed(household([a, b]))).toBe(false);
    expect(isJointlyAssessed(household([a], { jointAssessment: true }))).toBe(false);
    expect(isJointlyAssessed(household([a, b, person('c')], { jointAssessment: true }))).toBe(
      false,
    );
  });

  it('gives no context without the answer yes', () => {
    expect(jointContextFor(household([a, b]), 'a', unequal, JOINT)).toBeUndefined();
  });

  it('knows the years: undefined before both retire, incomes while both live, null the year after a death', () => {
    const early = person('b', { lifeExpectancyAge: 80, birthYear: PROFILE.birthYear + 1 });
    const h = household([a, early], { jointAssessment: true });
    const ctx = jointContextFor(h, 'a', { a: [statutory(3000)], b: [statutory(1000)] }, JOINT)!;
    const start = early.birthYear + 67; // later start
    const death = early.birthYear + 80;
    expect(ctx.partnerIncomesIn(start - 1, 'neutral')).toBeUndefined();
    expect(ctx.partnerIncomesIn(start, 'neutral')?.[0]?.taxableMonthly).toBeGreaterThan(0);
    expect(ctx.partnerIncomesIn(death, 'neutral')?.[0]?.taxableMonthly).toBeGreaterThan(0);
    expect(ctx.partnerIncomesIn(death + 1, 'neutral')).toBeNull();
    expect(ctx.partnerIncomesIn(death + 2, 'neutral')).toBeUndefined();
  });
});

describe('validateHousehold: jointAssessment', () => {
  it('accepts true, false and absent, reports other types', () => {
    expect(validateHousehold(household([a, b]), YEAR)).toEqual([]);
    expect(validateHousehold(household([a, b], { jointAssessment: true }), YEAR)).toEqual([]);
    expect(validateHousehold(household([a, b], { jointAssessment: false }), YEAR)).toEqual([]);
    const bad = household([a, b], { jointAssessment: 'yes' as unknown as boolean });
    expect(validateHousehold(bad, YEAR)).toEqual([{ field: 'jointAssessment', code: 'required' }]);
  });
});
