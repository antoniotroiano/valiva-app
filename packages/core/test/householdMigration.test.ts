import { describe, expect, it } from 'vitest';
import {
  FIRST_PERSON_ID,
  defaultHouseholdState,
  migrateLegacyStorage,
  parseHouseholdState,
  personContext,
} from '../src';
import { ASSUMPTIONS } from './pensionFixtures';

const YEAR = 2026;
const legacyProfile = (over: object = {}, assumptions: object = ASSUMPTIONS) =>
  JSON.stringify({
    schemaVersion: 1,
    profile: {
      birthYear: 1985,
      targetRetirementAge: 65,
      lifeExpectancyAge: 88,
      childrenBirthYears: [2015],
      desiredMonthlyIncomeToday: 3200,
      ...over,
    },
    assumptions,
  });

describe('migrateLegacyStorage', () => {
  it('moves profile, assumptions and wish into Person 1 without loss', () => {
    const { state } = migrateLegacyStorage({ profile: legacyProfile() }, YEAR, ASSUMPTIONS);
    const person = state.household.persons[0]!;
    expect(state.household.persons).toHaveLength(1);
    expect(person.id).toBe(FIRST_PERSON_ID);
    expect(state.activePersonId).toBe(FIRST_PERSON_ID);
    const ctx = personContext(state.household, person);
    expect(ctx.assumptions).toEqual(ASSUMPTIONS);
    expect(ctx.profile).toEqual({
      birthYear: 1985,
      targetRetirementAge: 65,
      lifeExpectancyAge: 88,
      childrenBirthYears: [2015],
      desiredMonthlyIncomeToday: 3200,
    });
  });

  it('passes the other blocks through as raw strings', () => {
    const { personData } = migrateLegacyStorage(
      { profile: legacyProfile(), etfPlan: '{"a":1}', goals: '[]', depot: '', statutory: null },
      YEAR,
      ASSUMPTIONS,
    );
    expect(personData).toEqual({ etfPlan: '{"a":1}', goals: '[]' });
  });

  it('falls back to defaults for missing, broken or invalid profile data', () => {
    const defaults = defaultHouseholdState(YEAR, ASSUMPTIONS).household;
    for (const profile of [
      undefined,
      null,
      '',
      '{not json',
      '[]',
      legacyProfile({ birthYear: 3000 }),
    ]) {
      const { state } = migrateLegacyStorage({ profile }, YEAR, ASSUMPTIONS);
      expect(state.household).toEqual(defaults);
    }
  });

  it('fills missing assumption fields from the defaults', () => {
    const { state } = migrateLegacyStorage(
      { profile: legacyProfile({}, { inflationPercent: 3 }) },
      YEAR,
      ASSUMPTIONS,
    );
    expect(state.household.assumptions.inflationPercent).toBe(3);
    expect(state.household.assumptions.returnScenarios).toEqual(ASSUMPTIONS.returnScenarios);
  });
});

describe('parseHouseholdState', () => {
  const valid = defaultHouseholdState(YEAR, ASSUMPTIONS);

  it('round-trips a valid state', () => {
    expect(parseHouseholdState(JSON.stringify(valid), YEAR)).toEqual(valid);
  });

  it('is undefined for anything unusable', () => {
    const bad = [
      undefined,
      null,
      '',
      'x',
      '{}',
      JSON.stringify({ ...valid, schemaVersion: 1 }),
      JSON.stringify({ ...valid, household: { ...valid.household, persons: [] } }),
      JSON.stringify({
        ...valid,
        household: {
          ...valid.household,
          persons: [valid.household.persons[0], valid.household.persons[0]],
        },
      }),
      JSON.stringify({
        ...valid,
        household: {
          ...valid.household,
          persons: [{ ...valid.household.persons[0], birthYear: 3000 }],
        },
      }),
    ];
    for (const raw of bad) expect(parseHouseholdState(raw, YEAR)).toBeUndefined();
  });

  it('repairs an unknown active person', () => {
    const s = parseHouseholdState(JSON.stringify({ ...valid, activePersonId: 'zzz' }), YEAR);
    expect(s?.activePersonId).toBe(FIRST_PERSON_ID);
  });
});
