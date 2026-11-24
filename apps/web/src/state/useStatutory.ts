import { useCallback, useState } from 'react';
import { loadBlock } from '@valiva/core';
import type { StatutoryState } from '@valiva/core';
import { CURRENT_YEAR } from './useProfile';
import { useDebounced, usePersist } from './useDebounced';
import { personKey, readBlock } from './personStorage';
import { safeSetItem } from './storageStatus';

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
      Number.isNaN(committed.projectedMonthlyPensionAtRetirementAgeToday) ||
      Number.isNaN(committed.actualMonthlyGross) ||
      Number.isNaN(committed.firstFullYearAnnual)
    ) {
      return;
    }
    safeSetItem(personKey(personId, 'statutory'), JSON.stringify(committed));
  });

  const update = useCallback((patch: Partial<StatutoryState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  return { state, committed, update };
}

export type StatutoryApi = ReturnType<typeof useStatutory>;
