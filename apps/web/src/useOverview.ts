import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OVERVIEW_BLOCKS,
  concurrentIncome,
  loadBlock,
  overview,
  solveGapContribution,
} from '@valiva/core';
import type {
  GapSolveResult,
  LegalResolution,
  OverviewOutcome,
  OverviewBlock,
  OverviewProductKind,
  OverviewState,
  OtherIncome,
  ScenarioName,
} from '@valiva/core';
import { CURRENT_YEAR } from './useProfile';
import { buildEtfProduct, buildPersonProducts } from './personProducts';
import type { ProfileApi } from './useProfile';
import type { StatutoryApi } from './useStatutory';
import type { DepotApi } from './useDepot';
import type { OccupationalApi } from './useOccupational';
import type { EtfPlanApi } from './useEtfPlan';
import { personKey, readBlock } from './personStorage';
import { safeSetItem } from './storageStatus';

export { OVERVIEW_BLOCKS };
export type { OverviewBlock, OverviewState };

export function load(personId: string): OverviewState {
  return loadBlock('overview', readBlock(personId, 'overview'), CURRENT_YEAR);
}

export function useOverview(
  personId: string,
  profile: ProfileApi,
  legal: LegalResolution,
  etf: EtfPlanApi,
  statutory: StatutoryApi,
  depot: DepotApi,
  occupational: OccupationalApi,
) {
  const [state, setState] = useState<OverviewState>(() => load(personId));

  useEffect(() => {
    safeSetItem(personKey(personId, 'overview'), JSON.stringify(state));
  }, [state]);

  const setEnabled = useCallback((block: OverviewBlock, value: boolean) => {
    setState((s) => ({ ...s, enabled: { ...s.enabled, [block]: value } }));
  }, []);

  const computed:
    | {
        outcome: OverviewOutcome;
        gap: GapSolveResult;
        otherIncome: Partial<Record<OverviewProductKind, Record<ScenarioName, OtherIncome>>>;
      }
    | undefined = useMemo(() => {
    if (!legal.ok || !profile.committedValid) return undefined;
    const pr = profile.committed.profile;
    const ctxPerson = { profile: pr, assumptions: profile.committed.assumptions };
    const blocks = {
      etfPlan: etf.own,
      etfPayout: etf.committedPayout,
      statutory: statutory.committed,
      depot: depot.committed,
      occupational: occupational.committed,
      overview: state,
    };
    const products = buildPersonProducts(blocks, ctxPerson, legal);
    const tax = legal.legal.incomeTax;
    const outcome = overview(products, pr, ctxPerson.assumptions, CURRENT_YEAR, tax);
    const buildEtf = (monthly: number) => buildEtfProduct(blocks, ctxPerson, legal, monthly, true);
    const gap = solveGapContribution(
      products.slice(1),
      buildEtf,
      etf.own.monthlyContribution,
      pr,
      ctxPerson.assumptions,
      CURRENT_YEAR,
      tax,
    );
    // Income of the other products when each pension block pays out, so its page taxes the sum.
    const otherIncome: Partial<Record<OverviewProductKind, Record<ScenarioName, OtherIncome>>> = {};
    for (const p of products) {
      otherIncome[p.productId] = concurrentIncome(
        products,
        p.productId,
        p.payoutStartAge,
        ctxPerson.assumptions,
      );
    }
    return { outcome, gap, otherIncome };
  }, [
    legal,
    etf.retirement,
    etf.own,
    etf.committedPayout,
    profile.committed,
    profile.committedValid,
    statutory.committed,
    depot.committed,
    occupational.committed,
    state.enabled,
  ]);

  /** Recomputes the overview with shifted returns and ETF rate; nothing is saved. */
  const whatIf = useMemo(() => {
    if (!legal.ok || !profile.committedValid) return undefined;
    return (returnDelta: number, monthlyDelta: number): OverviewOutcome => {
      const pr = profile.committed.profile;
      const shift = (s: { pessimistic: number; neutral: number; optimistic: number }) => ({
        pessimistic: s.pessimistic + returnDelta,
        neutral: s.neutral + returnDelta,
        optimistic: s.optimistic + returnDelta,
      });
      const assumptions = {
        ...profile.committed.assumptions,
        returnScenarios: shift(profile.committed.assumptions.returnScenarios),
      };
      const blocks = {
        etfPlan: {
          ...etf.own,
          returnScenarios: shift(etf.own.returnScenarios),
          monthlyContribution: Math.max(0, etf.own.monthlyContribution + monthlyDelta),
        },
        etfPayout: etf.committedPayout,
        statutory: statutory.committed,
        depot: depot.committed,
        occupational: occupational.committed,
        overview: state,
      };
      const products = buildPersonProducts(blocks, { profile: pr, assumptions }, legal);
      return overview(products, pr, assumptions, CURRENT_YEAR, legal.legal.incomeTax);
    };
  }, [
    legal,
    etf.own,
    etf.committedPayout,
    profile.committed,
    profile.committedValid,
    statutory.committed,
    depot.committed,
    occupational.committed,
    state.enabled,
  ]);

  return {
    state,
    setEnabled,
    whatIf,
    outcome: computed?.outcome,
    gap: computed?.gap,
    otherIncome: computed?.otherIncome,
    /** Profile errors of this person (empty when valid); shown instead of a result. */
    profileIssues: profile.issues.profile,
  };
}

export type OverviewApi = ReturnType<typeof useOverview>;
export type { OverviewProductKind };
