import {
  PERSON_BLOCKS,
  defaultAssumptions,
  defaultHouseholdState,
  defaultPerson,
  migrateLegacyStorage,
  parseHouseholdState,
  validateHousehold,
} from '@valiva/core';
import type {
  Household,
  HouseholdAssumptions,
  HouseholdState,
  LegacyStorage,
  Person,
} from '@valiva/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { de } from '../i18n/de';
import { socialConfig } from '../lib/legalConfig';
import { markNewStart } from './onboarding';
import { personKey } from './personStorage';
import { safeRemoveItem, safeSetItem } from './storageStatus';
import { useDebounced, useFlushOnHide } from './useDebounced';
import { HOUSEHOLD_KEY } from './workspaceStore';
import { STORAGE_PREFIX } from '../app/appConfig';

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
 * Loads the household. Without a `valiva.household.v2` the old single-person keys are copied into
 * "Person 1" once; the old keys stay untouched as a backup, and existing per-person keys are not overwritten.
 */
function boot(): HouseholdState {
  const stored = parseHouseholdState(read(HOUSEHOLD_KEY), CURRENT_YEAR);
  if (stored) return stored;
  const legacy: LegacyStorage = { profile: read(`${STORAGE_PREFIX}profile.v1`) };
  for (const block of PERSON_BLOCKS) legacy[block] = read(`${STORAGE_PREFIX}${block}.v1`);
  if (legacy.profile === null && PERSON_BLOCKS.every((block) => legacy[block] === null)) {
    markNewStart();
  }
  const { state, personData } = migrateLegacyStorage(
    legacy,
    CURRENT_YEAR,
    defaultGlobalAssumptions(),
    de.household.firstPersonName,
  );
  // A failed write is reported by `safeSetItem`; the state still works for this session.
  const id = state.activePersonId;
  for (const block of PERSON_BLOCKS) {
    const raw = personData[block];
    if (raw !== undefined && read(personKey(id, block)) === null) {
      safeSetItem(personKey(id, block), raw);
    }
  }
  safeSetItem(HOUSEHOLD_KEY, JSON.stringify(state));
  return state;
}

/**
 * The joint assessment answer belongs to one couple: it is reset whenever the number of persons changes
 * (two to one, and also one to two or two to three), so a stale answer never applies to a different pair.
 */
function withoutJointAssessment(h: Household): Household {
  const next = { ...h };
  delete next.jointAssessment;
  return next;
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
    safeSetItem(HOUSEHOLD_KEY, JSON.stringify(committed));
  }, [committed, valid]);

  // Also save the live state when the tab is hidden or closed within the 250 ms debounce (B-6).
  const liveRef = useRef(state);
  useEffect(() => {
    liveRef.current = state;
  });
  useFlushOnHide(() => {
    const live = liveRef.current;
    if (validateHousehold(live.household, CURRENT_YEAR).length === 0) {
      safeSetItem(HOUSEHOLD_KEY, JSON.stringify(live));
    }
  });

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
  /** The answer to the joint assessment question; `undefined` clears it (not answered). */
  const setJointAssessment = useCallback(
    (value: boolean | undefined) =>
      setHousehold((h) => {
        const next = { ...h };
        if (value === undefined) delete next.jointAssessment;
        else next.jointAssessment = value;
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
        household: withoutJointAssessment({
          ...s.household,
          persons: [...s.household.persons, person],
        }),
        activePersonId: newId,
      };
    });
    return newId;
  }, []);
  const removePerson = useCallback((id: string) => {
    // The updater stays pure (no storage access); the keys go after the state change was accepted.
    // `liveRef` is the latest rendered state; a person that is not the last one is removed.
    const current = liveRef.current;
    if (current.household.persons.length <= 1) return;
    if (!current.household.persons.some((p) => p.id === id)) return;
    setState((s) => {
      if (s.household.persons.length <= 1) return s;
      const persons = s.household.persons.filter((p) => p.id !== id);
      return {
        ...s,
        household: withoutJointAssessment({ ...s.household, persons }),
        activePersonId: s.activePersonId === id ? persons[0]!.id : s.activePersonId,
      };
    });
    for (const block of PERSON_BLOCKS) safeRemoveItem(personKey(id, block));
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
    setJointAssessment,
    setActivePerson,
    addPerson,
    removePerson,
    resetAll,
  };
}

export type HouseholdApi = ReturnType<typeof useHousehold>;
