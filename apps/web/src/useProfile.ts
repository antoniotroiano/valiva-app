import {
  personContext,
  splitAssumptions,
  validateAssumptions,
  validateProfile,
  validateRetirementTiming,
} from '@pathwise/core';
import type { GlobalAssumptions, Profile, ValidationIssue } from '@pathwise/core';
import { useCallback, useMemo } from 'react';
import { CURRENT_YEAR, defaultGlobalAssumptions } from './useHousehold';
import type { HouseholdApi } from './useHousehold';

export { CURRENT_YEAR };

export type ProfileState = {
  schemaVersion: 1;
  profile: Profile;
  assumptions: GlobalAssumptions;
};

/**
 * The profile view of one person: their own data merged with the shared household values (wish and
 * shared assumptions). Writes go back to the right place, so the pages keep working with `Profile` and
 * `GlobalAssumptions` as before.
 */
export function useProfile(household: HouseholdApi, personId: string) {
  const toState = useCallback(
    (h: HouseholdApi['state']): ProfileState => {
      const person = h.household.persons.find((p) => p.id === personId) ?? h.household.persons[0]!;
      return { schemaVersion: 1, ...personContext(h.household, person) };
    },
    [personId],
  );
  const state = useMemo(() => toState(household.state), [household.state, toState]);
  const committed = useMemo(() => toState(household.committed), [household.committed, toState]);

  const issues = useMemo(
    () => ({
      profile: [
        ...validateProfile(state.profile, CURRENT_YEAR),
        ...validateRetirementTiming(state.profile, CURRENT_YEAR),
      ],
      assumptions: validateAssumptions(state.assumptions),
    }),
    [state],
  );
  const committedValid = useMemo(
    () =>
      validateProfile(committed.profile, CURRENT_YEAR).length === 0 &&
      validateRetirementTiming(committed.profile, CURRENT_YEAR).length === 0 &&
      validateAssumptions(committed.assumptions).length === 0,
    [committed],
  );

  const { updatePerson, setDesiredIncome, setSharedAssumptions } = household;
  const setProfile = useCallback(
    (patch: Partial<Profile>) => {
      const { desiredMonthlyIncomeToday, ...own } = patch;
      if ('desiredMonthlyIncomeToday' in patch) setDesiredIncome(desiredMonthlyIncomeToday);
      if (Object.keys(own).length > 0) updatePerson(personId, (p) => ({ ...p, ...own }));
    },
    [personId, setDesiredIncome, updatePerson],
  );
  const setAssumptions = useCallback(
    (update: (a: GlobalAssumptions) => GlobalAssumptions) => {
      const next = update(state.assumptions);
      const { household: shared, personal } = splitAssumptions(next);
      setSharedAssumptions(shared);
      updatePerson(personId, (p) => ({ ...p, personalAssumptions: personal }));
    },
    [personId, setSharedAssumptions, state.assumptions, updatePerson],
  );
  const reset = useCallback(() => {
    const d = splitAssumptions(defaultGlobalAssumptions());
    setSharedAssumptions(d.household);
    setDesiredIncome(undefined);
    updatePerson(personId, (p) => ({
      ...p,
      birthYear: CURRENT_YEAR - 40,
      targetRetirementAge: 67,
      lifeExpectancyAge: 90,
      childrenBirthYears: [],
      personalAssumptions: d.personal,
    }));
  }, [personId, setDesiredIncome, setSharedAssumptions, updatePerson]);

  return {
    state,
    /** Debounced values for calculations; only meaningful if `committedValid`. */
    committed,
    committedValid,
    issues,
    setProfile,
    setAssumptions,
    reset,
  };
}

export type ProfileApi = ReturnType<typeof useProfile>;
export type FieldIssues = ValidationIssue[];
