import { useCallback, useState } from 'react';
import { loadBlock } from '@pathwise/core';
import type { DepotState } from '@pathwise/core';
import { CURRENT_YEAR } from './useProfile';
import { useDebounced, usePersist } from './useDebounced';
import { personKey, readBlock } from './personStorage';
import { safeSetItem } from './storageStatus';

export type { DepotState };

export function load(personId: string): DepotState {
  return loadBlock('depot', readBlock(personId, 'depot'), CURRENT_YEAR);
}

export function useDepot(personId: string) {
  const [state, setState] = useState<DepotState>(() => load(personId));
  const committed = useDebounced(state, 250);

  usePersist(state, committed, (committed) => {
    // Skip half-typed (NaN) values so they never overwrite good data.
    const required = [
      committed.ownContributionMonthly,
      committed.costPercentPerYear,
      committed.payoutEndAge,
      committed.lumpSumSharePercent,
    ];
    if (!required.every(Number.isFinite)) return;
    if (Number.isNaN(committed.annualContributionIncreasePercent)) return;
    if (Number.isNaN(committed.withdrawalPercent)) return;
    safeSetItem(personKey(personId, 'depot'), JSON.stringify(committed));
  });

  const update = useCallback((patch: Partial<DepotState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  return { state, committed, update };
}

export type DepotApi = ReturnType<typeof useDepot>;
