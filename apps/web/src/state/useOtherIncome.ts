import { useCallback, useState } from 'react';
import { loadBlock } from '@valiva/core';
import type { OtherIncomeEntry, OtherIncomeKind, OtherIncomeState } from '@valiva/core';
import { newOtherIncomeEntry, nextEntryId } from '../lib/otherIncomeDefaults';
import { CURRENT_YEAR } from './useProfile';
import { useDebounced, usePersist } from './useDebounced';
import { personKey, readBlock } from './personStorage';
import { safeSetItem } from './storageStatus';

export type { OtherIncomeState };

export function load(personId: string): OtherIncomeState {
  return loadBlock('otherIncome', readBlock(personId, 'otherIncome'), CURRENT_YEAR);
}

/** All numbers of an entry that are typed into a field; half-typed (NaN) values are never saved. */
function numbersOf(e: OtherIncomeEntry): unknown[] {
  return [
    e.amountMonthly,
    e.survivorPercent,
    e.adjustment.mode === 'fixed' ? e.adjustment.percent : 0,
    e.start.mode === 'age' ? e.start.age : 0,
    e.end.mode === 'age' ? e.end.age : 0,
    e.taxMode === 'percent' && e.taxSharePercent !== undefined ? e.taxSharePercent : 0,
  ];
}

export function useOtherIncome(personId: string) {
  const [state, setState] = useState<OtherIncomeState>(() => load(personId));
  const committed = useDebounced(state, 250);

  usePersist(state, committed, (committed) => {
    // Skip half-typed (NaN) values so they never overwrite good data.
    if (!committed.entries.every((e) => numbersOf(e).every(Number.isFinite))) return;
    safeSetItem(personKey(personId, 'otherIncome'), JSON.stringify(committed));
  });

  /** Adds an entry of a kind with the start values of the form; returns its id. */
  const add = useCallback(
    (kind: OtherIncomeKind, name: string, targetRetirementAge: number): string => {
      let id = '';
      setState((s) => {
        id = nextEntryId(s.entries);
        const entry = newOtherIncomeEntry(kind, id, name, targetRetirementAge);
        return { ...s, entries: [...s.entries, entry] };
      });
      return id;
    },
    [],
  );

  const update = useCallback((id: string, patch: Partial<OtherIncomeEntry>) => {
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const remove = useCallback((id: string) => {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
  }, []);

  return { state, committed, add, update, remove };
}

export type OtherIncomeApi = ReturnType<typeof useOtherIncome>;
