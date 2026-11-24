import { DEFAULT_ETF_PLAN, calculateEtfPlan, loadBlock } from '@valiva/core';
import type { EtfPlanInput, LegalResolution } from '@valiva/core';
import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAYOUT, effectiveEtfPlan, etfRetirement } from '../lib/etfRetirement';
import type { EtfPayoutState } from '../lib/etfRetirement';
import { currentTaxAssumptions } from '../lib/taxConfig';
import type { ProfileApi } from './useProfile';
import { personKey, readBlock } from './personStorage';
import { CURRENT_YEAR } from './useProfile';
import { useDebounced, usePersist } from './useDebounced';
import { safeSetItem } from './storageStatus';

export const DEFAULT_INPUT: EtfPlanInput = DEFAULT_ETF_PLAN;

export function load(personId: string): EtfPlanInput {
  return loadBlock('etfPlan', readBlock(personId, 'etfPlan'), CURRENT_YEAR);
}

/** Without a stored payout state (data from before Phase 4) the global assumptions apply. */
export function loadPayout(personId: string): EtfPayoutState {
  return loadBlock('etfPayout', readBlock(personId, 'etfPayout'), CURRENT_YEAR);
}

export function useEtfPlan(personId: string, profile: ProfileApi, legal: LegalResolution) {
  const [input, setInput] = useState<EtfPlanInput>(() => load(personId));
  const [payout, setPayoutState] = useState<EtfPayoutState>(() => loadPayout(personId));
  const debounced = useDebounced(input, 250);
  const debouncedPayout = useDebounced(payout, 250);

  usePersist(input, debounced, (debounced) => {
    // NaN is serialised as null; load() falls back per field only via the spread, so skip invalid.
    if (Number.isFinite(debounced.durationYears)) {
      safeSetItem(personKey(personId, 'etfPlan'), JSON.stringify(debounced));
    }
  });

  usePersist(payout, debouncedPayout, (debouncedPayout) => {
    // Skip half-typed (NaN) ages so they never overwrite good data.
    const ages = [debouncedPayout.payoutStartAge, debouncedPayout.payoutEndAge];
    if (ages.some((a) => a !== undefined && !Number.isFinite(a))) return;
    if (Number.isNaN(debouncedPayout.withdrawalPercent)) return;
    if (
      Number.isNaN(debouncedPayout.holdingValue) ||
      Number.isNaN(debouncedPayout.holdingContributions)
    ) {
      return;
    }
    safeSetItem(personKey(personId, 'etfPayout'), JSON.stringify(debouncedPayout));
  });

  const setPayout = useCallback((patch: Partial<EtfPayoutState>) => {
    setPayoutState((s) => ({ ...s, ...patch }));
  }, []);

  /** What the ETF page and the overview calculate with: global returns and inflation applied. */
  const { committed: profileCommitted, committedValid } = profile;
  const churchTax = profileCommitted.assumptions.churchTax;
  const effective = useMemo(
    () =>
      effectiveEtfPlan(debounced, debouncedPayout, { committed: profileCommitted, committedValid }),
    [debounced, debouncedPayout, profileCommitted, committedValid],
  );

  const result = useMemo(
    () => calculateEtfPlan(effective, currentTaxAssumptions(churchTax).assumptions),
    [effective, churchTax],
  );

  const retirement = useMemo(
    () =>
      etfRetirement(
        debounced,
        debouncedPayout,
        { committed: profileCommitted, committedValid },
        legal,
      ),
    [debounced, debouncedPayout, profileCommitted, committedValid, legal],
  );

  return {
    personId,
    input,
    /** Own values as typed, without the global assumptions. */
    own: debounced,
    committed: effective,
    setInput,
    payout,
    /** Debounced, what the calculations use. */
    committedPayout: debouncedPayout,
    setPayout,
    result,
    retirement,
    reset: () => {
      setInput(DEFAULT_INPUT);
      setPayoutState(DEFAULT_PAYOUT);
    },
  };
}

export type EtfPlanApi = ReturnType<typeof useEtfPlan>;
