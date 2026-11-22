import { describe, expect, it } from 'vitest';
import { personContext, splitAssumptions, validateAssumptions, validateHousehold } from '../src';
import type { Household, Person } from '../src';
import { ASSUMPTIONS, PROFILE } from './pensionFixtures';

const split = splitAssumptions(ASSUMPTIONS);

const person = (id: string, over: Partial<Person> = {}): Person => ({
  id,
  name: id,
  birthYear: PROFILE.birthYear,
  targetRetirementAge: PROFILE.targetRetirementAge,
  lifeExpectancyAge: PROFILE.lifeExpectancyAge,
  childrenBirthYears: [],
  personalAssumptions: split.personal,
  ...over,
});

const household = (persons: Person[], over: Partial<Household> = {}): Household => ({
  id: 'h',
  desiredMonthlyIncomeToday: 3000,
  assumptions: split.household,
  persons,
  ...over,
});

describe('personContext', () => {
  it('merges household and personal values into the single-person shape', () => {
    const ctx = personContext(household([person('a')]), person('a'));
    expect(ctx.assumptions).toEqual(ASSUMPTIONS);
    expect(ctx.profile).toEqual({ ...PROFILE, desiredMonthlyIncomeToday: 3000 });
  });

  it('uses the personal part only for the own person', () => {
    const b = person('b', {
      personalAssumptions: { ...split.personal, marginalTaxRateTodayPercent: 10 },
    });
    const h = household([person('a'), b]);
    expect(personContext(h, h.persons[0]!).assumptions.marginalTaxRateTodayPercent).toBe(35);
    expect(personContext(h, b).assumptions.marginalTaxRateTodayPercent).toBe(10);
    expect(personContext(h, b).assumptions.inflationPercent).toBe(2);
  });
});

describe('church tax choice', () => {
  it('is carried through split and merge and left out when absent', () => {
    const withChurch = splitAssumptions({ ...ASSUMPTIONS, churchTax: 'low' });
    expect(withChurch.personal.churchTax).toBe('low');
    expect('churchTax' in split.personal).toBe(false);
    const h = household([person('a', { personalAssumptions: withChurch.personal })]);
    expect(personContext(h, h.persons[0]!).assumptions.churchTax).toBe('low');
  });

  it('is validated', () => {
    expect(validateAssumptions({ ...ASSUMPTIONS, churchTax: 'high' })).toEqual([]);
    expect(
      validateAssumptions({ ...ASSUMPTIONS, churchTax: 'x' as unknown as 'low' }).map(
        (i) => i.field,
      ),
    ).toEqual(['churchTax']);
  });
});

describe('splitAssumptions', () => {
  it('round-trips', () => {
    const h = household([person('a')]);
    expect(personContext(h, h.persons[0]!).assumptions).toEqual({
      ...split.household,
      ...split.personal,
    });
  });
});

describe('validateHousehold', () => {
  it('accepts a valid couple', () => {
    expect(
      validateHousehold(household([person('a'), person('b', { birthYear: 1988 })]), 2026),
    ).toEqual([]);
  });

  it('requires at least one person', () => {
    expect(validateHousehold(household([]), 2026)).toEqual([
      { field: 'persons', code: 'required' },
    ]);
  });

  it('prefixes personal issues with the person id and reports shared ones once', () => {
    const issues = validateHousehold(
      household(
        [
          person('a', { birthYear: 2100 }),
          person('b', {
            personalAssumptions: { ...split.personal, marginalTaxRateTodayPercent: 500 },
          }),
        ],
        {
          desiredMonthlyIncomeToday: -1,
          assumptions: { ...split.household, inflationPercent: 999 },
        },
      ),
      2026,
    );
    const fields = issues.map((i) => i.field);
    expect(fields).toContain('persons.a.birthYear');
    expect(fields).toContain('persons.b.marginalTaxRateTodayPercent');
    expect(fields.filter((f) => f === 'inflationPercent')).toHaveLength(1);
    expect(fields.filter((f) => f === 'desiredMonthlyIncomeToday')).toHaveLength(1);
  });

  it('flags an invalid savings budget', () => {
    const issues = validateHousehold(household([person('a', { savingsBudgetMonthly: -5 })]), 2026);
    expect(issues).toEqual([{ field: 'persons.a.savingsBudgetMonthly', code: 'negative' }]);
  });
});
