import { useCallback, useState } from 'react';
import { loadBlock } from '@pathwise/core';
import type { StatutoryState } from '@pathwise/core';
import { CURRENT_YEAR } from './useProfile';
import { useDebounced, usePersist } from './useDebounced';
import { personKey, readBlock } from './personStorage';

export type { StatutoryState };

export function load(personId: string): StatutoryState {
  return loadBlock('statutory', readBlock(personId, 'statutory'), CURRENT_YEAR);
}

export function useStatutory(personId: string) {
  const [state, setState] = useState<StatutoryState>(() => load(personId));
  const committed = useDebounced(state, 250);

  usePersist(state, committed, (committed) => {
    // Skip half-typed (NaN) values so they never overwrite good data.
    if (
      !Number.isFinite(committed.projectedMonthlyPensionToday) ||
      !Number.isFinite(committed.statementYear) ||
      Number.isNaN(committed.projectedMonthlyPensionAtRetirementAgeToday)
    ) {
      return;
    }
    try {
      localStorage.setItem(personKey(personId, 'statutory'), JSON.stringify(committed));
    } catch {
      /* ignore */
    }
  });

  const update = useCallback((patch: Partial<StatutoryState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  return { state, committed, update };
}

export type StatutoryApi = ReturnType<typeof useStatutory>;
