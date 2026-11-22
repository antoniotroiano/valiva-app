import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  HOUSEHOLD_SCHEMA_VERSION,
  householdOverview,
  overview,
  parseHouseholdState,
  splitAssumptions,
  validateHousehold,
  validateProfile,
  validateRetirementTiming,
} from '../src';
import type { Household, OverviewProductInput, Person } from '../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE } from './pensionFixtures';

const YEAR = CTX.currentYear;
const split = splitAssumptions(ASSUMPTIONS);

const person = (id: string, birthYear: number, targetRetirementAge = 67): Person => ({
  id,
  name: id,
  birthYear,
  targetRetirementAge,
  lifeExpectancyAge: 90,
  childrenBirthYears: [],
  personalAssumptions: split.personal,
});

const household = (persons: Person[]): Household => ({
  id: 'h',
  desiredMonthlyIncomeToday: 3000,
  assumptions: split.household,
  persons,
});

/** What the web builds for a person whose retirement lies in the past: every block is invalid. */
const invalidStatutory: OverviewProductInput = {
  productId: 'statutory',
  enabled: true,
  payoutStartAge: 67,
  outcome: {
    ok: false,
    issues: [{ field: 'retirementAge', code: 'before_current_year', min: 76 }],
  },
};

describe('validateRetirementTiming', () => {
  it('flags a retirement start before the current year and names the earliest age', () => {
    const issues = validateRetirementTiming({ ...PROFILE, birthYear: 1950 }, YEAR);
    expect(issues).toEqual([
      { field: 'targetRetirementAge', code: 'retirement_in_past', min: YEAR - 1950 },
    ]);
  });

  it('accepts a retirement start in the current year and later', () => {
    const age = 67;
    expect(validateRetirementTiming({ ...PROFILE, birthYear: YEAR - age }, YEAR)).toEqual([]);
    expect(validateRetirementTiming({ ...PROFILE, birthYear: YEAR - age + 1 }, YEAR)).toEqual([]);
    expect(validateRetirementTiming({ ...PROFILE, birthYear: YEAR - age - 1 }, YEAR)).toHaveLength(
      1,
    );
  });

  it('stays silent while the inputs are not integers (validateProfile reports those)', () => {
    expect(validateRetirementTiming({ ...PROFILE, birthYear: Number.NaN }, YEAR)).toEqual([]);
    expect(validateRetirementTiming({ ...PROFILE, targetRetirementAge: 66.5 }, YEAR)).toEqual([]);
  });

  it('property: an issue exists exactly when the start year is before the current year', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: YEAR }),
        fc.integer({ min: 55, max: 75 }),
        (b, a) => {
          const issues = validateRetirementTiming(
            { ...PROFILE, birthYear: b, targetRetirementAge: a },
            YEAR,
          );
          expect(issues.length === 1).toBe(b + a < YEAR);
          if (issues.length === 1) expect(b + (issues[0]!.min as number)).toBe(YEAR);
        },
      ),
    );
  });
});

describe('a person who retires in the past never yields a valid-looking result (B-3)', () => {
  const h = household([person('a', 1950), person('b', YEAR - 40)]);

  it('householdOverview returns the issue with the person prefix, not a gap', () => {
    const out = householdOverview(h, { a: [invalidStatutory], b: [] }, YEAR, LEGAL.incomeTax);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.issues).toContainEqual({
      field: 'persons.a.targetRetirementAge',
      code: 'retirement_in_past',
      min: YEAR - 1950,
    });
    expect(out.issues.some((i) => i.field.startsWith('persons.b.'))).toBe(false);
  });

  it('overview returns the issue as data', () => {
    const out = overview([], { ...PROFILE, birthYear: 1950 }, ASSUMPTIONS, YEAR, LEGAL.incomeTax);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.issues.map((i) => i.code)).toContain('retirement_in_past');
  });

  it('does not make the household invalid for loading: saved data is kept', () => {
    // validateProfile/validateHousehold also guard parsing and import; the calendar rule is not part of them.
    expect(validateProfile({ ...PROFILE, birthYear: 1950 }, YEAR)).toEqual([]);
    expect(validateHousehold(h, YEAR)).toEqual([]);
    const raw = JSON.stringify({
      schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
      household: h,
      activePersonId: 'a',
    });
    expect(parseHouseholdState(raw, YEAR)?.household.persons).toHaveLength(2);
  });
});
