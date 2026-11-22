import {
  PERSON_BLOCKS,
  defaultAssumptions,
  defaultHouseholdState,
  defaultPerson,
  migrateLegacyStorage,
  parseHouseholdState,
  validateHousehold,
} from '@pathwise/core';
import type {
  Household,
  HouseholdAssumptions,
  HouseholdState,
  LegacyStorage,
  Person,
} from '@pathwise/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { de } from './i18n/de';
import { socialConfig } from './legalConfig';
import { markNewStart } from './onboarding';
import { personKey } from './personStorage';
import { useDebounced } from './useDebounced';
import { HOUSEHOLD_KEY } from './workspaceStore';

export { HOUSEHOLD_KEY };
export const CURRENT_YEAR = new Date().getFullYear();
/** Local month 1 to 12; the ETF savings phase in the retirement view starts in this month. */
export const CURRENT_MONTH = new Date().getMonth() + 1;

export const defaultGlobalAssumptions = () =>
  defaultAssumptions(socialConfig.values.healthAdditionalRatePercent.value);

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Loads the household. Without a `pathwise.household.v2` the old single-person keys are copied into
 * "Person 1" once; the old keys stay untouched as a backup, and existing per-person keys are not overwritten.
 */
function boot(): HouseholdState {
  const stored = parseHouseholdState(read(HOUSEHOLD_KEY), CURRENT_YEAR);
  if (stored) return stored;
  const legacy: LegacyStorage = { profile: read('pathwise.profile.v1') };
  for (const block of PERSON_BLOCKS) legacy[block] = read(`pathwise.${block}.v1`);
  if (legacy.profile === null && PERSON_BLOCKS.every((block) => legacy[block] === null)) {
    markNewStart();
  }
  const { state, personData } = migrateLegacyStorage(
    legacy,
    CURRENT_YEAR,
    defaultGlobalAssumptions(),
    de.household.firstPersonName,
  );
  try {
    const id = state.activePersonId;
    for (const block of PERSON_BLOCKS) {
      const raw = personData[block];
      if (raw !== undefined && read(personKey(id, block)) === null) {
        localStorage.setItem(personKey(id, block), raw);
      }
    }
    localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: the state still works for this session */
  }
  return state;
}

export function useHousehold() {
  const [state, setState] = useState<HouseholdState>(boot);
  const committed = useDebounced(state, 250);

  const valid = useMemo(
    () => validateHousehold(committed.household, CURRENT_YEAR).length === 0,
    [committed],
  );

  useEffect(() => {
    // Only valid states are saved, so a half-typed field never overwrites good data.
    if (!valid) return;
    try {
      localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify(committed));
    } catch {
      /* ignore */
    }
  }, [committed, valid]);

  const setHousehold = useCallback((update: (h: Household) => Household) => {
    setState((s) => ({ ...s, household: update(s.household) }));
  }, []);
  const updatePerson = useCallback(
    (id: string, update: (p: Person) => Person) =>
      setHousehold((h) => ({ ...h, persons: h.persons.map((p) => (p.id === id ? update(p) : p)) })),
    [setHousehold],
  );
  const setSharedAssumptions = useCallback(
    (a: HouseholdAssumptions) => setHousehold((h) => ({ ...h, assumptions: a })),
    [setHousehold],
  );
  const setDesiredIncome = useCallback(
    (v: number | undefined) => setHousehold((h) => ({ ...h, desiredMonthlyIncomeToday: v })),
    [setHousehold],
  );
  const setSurvivor = useCallback(
    (patch: Pick<Household, 'survivorPension' | 'survivorWishPercent'>) =>
      setHousehold((h) => {
        const next = { ...h, ...patch };
        if (next.survivorPension === undefined) delete next.survivorPension;
        if (next.survivorWishPercent === undefined) delete next.survivorWishPercent;
        return next;
      }),
    [setHousehold],
  );
  const setActivePerson = useCallback(
    (id: string) =>
      setState((s) =>
        s.household.persons.some((p) => p.id === id) ? { ...s, activePersonId: id } : s,
      ),
    [],
  );
  const addPerson = useCallback((name: string) => {
    let newId = '';
    setState((s) => {
      let n = s.household.persons.length + 1;
      while (s.household.persons.some((p) => p.id === `p${n}`)) n++;
      newId = `p${n}`;
      const person = defaultPerson(newId, name, CURRENT_YEAR, defaultGlobalAssumptions());
      return {
        ...s,
        household: { ...s.household, persons: [...s.household.persons, person] },
        activePersonId: newId,
      };
    });
    return newId;
  }, []);
  const removePerson = useCallback((id: string) => {
    setState((s) => {
      if (s.household.persons.length <= 1) return s;
      const persons = s.household.persons.filter((p) => p.id !== id);
      for (const block of PERSON_BLOCKS) {
        try {
          localStorage.removeItem(personKey(id, block));
        } catch {
          /* ignore */
        }
      }
      return {
        ...s,
        household: { ...s.household, persons },
        activePersonId: s.activePersonId === id ? persons[0]!.id : s.activePersonId,
      };
    });
  }, []);
  const resetAll = useCallback(
    () =>
      setState(
        defaultHouseholdState(
          CURRENT_YEAR,
          defaultGlobalAssumptions(),
          de.household.firstPersonName,
        ),
      ),
    [],
  );

  return {
    state,
    committed,
    valid,
    setHousehold,
    updatePerson,
    setSharedAssumptions,
    setDesiredIncome,
    setSurvivor,
    setActivePerson,
    addPerson,
    removePerson,
    resetAll,
  };
}

export type HouseholdApi = ReturnType<typeof useHousehold>;
