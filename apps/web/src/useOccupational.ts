import { useCallback, useState } from 'react';
import { loadBlock } from '@pathwise/core';
import type { OccupationalState } from '@pathwise/core';
import { CURRENT_YEAR } from './useProfile';
import { useDebounced, usePersist } from './useDebounced';
import { personKey, readBlock } from './personStorage';

export type { OccupationalState };

export function load(personId: string): OccupationalState {
  return loadBlock('occupational', readBlock(personId, 'occupational'), CURRENT_YEAR);
}

export function useOccupational(personId: string) {
  const [state, setState] = useState<OccupationalState>(() => load(personId));
  const committed = useDebounced(state, 250);

  usePersist(state, committed, (committed) => {
    // Skip half-typed (NaN) values so they never overwrite good data.
    const required = [
      committed.employeeContributionMonthlyGross,
      committed.employerSubsidyCustomMonthly,
      committed.employerContributionMonthly,
      committed.costPercentPerYear,
    ];
    if (!required.every(Number.isFinite)) return;
    if (Number.isNaN(committed.annualContributionIncreasePercent)) return;
    try {
      localStorage.setItem(personKey(personId, 'occupational'), JSON.stringify(committed));
    } catch {
      /* ignore */
    }
  });

  const update = useCallback((patch: Partial<OccupationalState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  return { state, committed, update };
}

export type OccupationalApi = ReturnType<typeof useOccupational>;
