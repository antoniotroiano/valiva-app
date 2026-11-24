import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  OVERVIEW_BLOCKS,
  concurrentIncome,
  isJointlyAssessed,
  jointContextFor,
  loadBlock,
  overview,
  personContext,
  solveGapContribution,
} from '@valiva/core';
import type {
  GapSolveResult,
  LegalResolution,
  JointTaxContext,
  OverviewOutcome,
  OverviewBlock,
  OverviewProductId,
  OverviewProductKind,
  OverviewState,
  OtherIncome,
  ScenarioName,
} from '@valiva/core';
import { CURRENT_MONTH, CURRENT_YEAR } from './useHousehold';
import { defaultRetirementStartYear, noticeMayBeThere } from '../lib/retired';
import { jointInput } from '../lib/legalConfig';
import { buildEtfProduct, buildPersonProducts, loadPersonBlocks } from '../lib/personProducts';
import type { HouseholdApi } from './useHousehold';
import type { ProfileApi } from './useProfile';
import type { StatutoryApi } from './useStatutory';
import type { DepotApi } from './useDepot';
import type { OccupationalApi } from './useOccupational';
import type { OtherIncomeApi } from './useOtherIncome';
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
  entries: OtherIncomeApi,
  household: HouseholdApi,
) {
  const [state, setState] = useState<OverviewState>(() => load(personId));

  useEffect(() => {
    safeSetItem(personKey(personId, 'overview'), JSON.stringify(state));
  }, [state]);

  const setEnabled = useCallback((block: OverviewBlock, value: boolean) => {
    setState((s) => ({ ...s, enabled: { ...s.enabled, [block]: value } }));
  }, []);

  /**
   * Joint assessment with the partner (AP-16): only for a couple that answered yes. The partner's products are
   * read from the saved blocks, so the person's own view taxes like the household view does.
   */
  const jointOf = useCallback(
    (id: string, products: ReturnType<typeof buildPersonProducts>): JointTaxContext | undefined => {
      const hh = household.committed.household;
      const parameters = jointInput(legal);
      if (parameters === undefined || !isJointlyAssessed(hh)) return undefined;
      const partner = hh.persons.find((p) => p.id !== id);
      if (partner === undefined) return undefined;
      const partnerProducts = buildPersonProducts(
        loadPersonBlocks(partner.id),
        personContext(hh, partner),
        legal,
      );
      return jointContextFor(hh, id, { [id]: products, [partner.id]: partnerProducts }, parameters);
    },
    [household.committed.household, legal],
  );

  const computed:
    | {
        outcome: OverviewOutcome;
        gap: GapSolveResult | undefined;
        otherIncome: Partial<Record<OverviewProductId, Record<ScenarioName, OtherIncome>>>;
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
      otherIncome: entries.committed,
      overview: state,
    };
    const products = buildPersonProducts(blocks, ctxPerson, legal);
    const tax = legal.legal.incomeTax;
    const joint = jointOf(personId, products);
    const outcome = overview(
      products,
      pr,
      ctxPerson.assumptions,
      CURRENT_YEAR,
      tax,
      personId,
      joint,
    );
    const buildEtf = (monthly: number) => buildEtfProduct(blocks, ctxPerson, legal, monthly, true);
    // A person who already draws the pension has no savings plan: nothing to solve for (`16` §7).
    const gap =
      pr.retired === true
        ? undefined
        : solveGapContribution(
            products.slice(1),
            buildEtf,
            etf.own.monthlyContribution,
            pr,
            ctxPerson.assumptions,
            CURRENT_YEAR,
            tax,
            joint,
          );
    // Income of the other products when each pension block pays out, so its page taxes the sum.
    const otherIncome: Partial<Record<OverviewProductId, Record<ScenarioName, OtherIncome>>> = {};
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
    entries.committed,
    state.enabled,
    jointOf,
  ]);

  /** Recomputes the overview with shifted returns and ETF rate; nothing is saved. */
  const whatIf = useMemo(() => {
    if (!legal.ok || !profile.committedValid || profile.committed.profile.retired === true) {
      return undefined;
    }
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
        otherIncome: entries.committed,
        overview: state,
      };
      const products = buildPersonProducts(blocks, { profile: pr, assumptions }, legal);
      return overview(
        products,
        pr,
        assumptions,
        CURRENT_YEAR,
        legal.legal.incomeTax,
        personId,
        jointOf(personId, products),
      );
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
    entries.committed,
    state.enabled,
    jointOf,
  ]);

  const retired = profile.committed.profile.retired === true;
  /** Switches the person to the retiree mode, with the planned start year as a first guess (never calculates). */
  const startRetiredMode = useCallback(() => {
    profile.setProfile({
      retired: true,
      retirementStartYear: defaultRetirementStartYear(profile.state.profile, CURRENT_YEAR),
    });
  }, [profile]);

  return {
    state,
    setEnabled,
    /** True for a person who already draws the pension: the view counts from today. */
    retired,
    startRetiredMode,
    /** Planning mode, retirement within a year: the pension notice may be there (`RETIREMENT_NOTICE_LEAD_MONTHS`). */
    noticeMayBeThere:
      profile.committedValid &&
      noticeMayBeThere(profile.committed.profile, CURRENT_YEAR, CURRENT_MONTH),
    whatIf,
    outcome: computed?.outcome,
    gap: computed?.gap,
    otherIncome: computed?.otherIncome,
    /** Entries of "other income" (committed values) and their names by product id, for labels. */
    entries: entries.committed.entries,
    entryNames: Object.fromEntries(
      entries.committed.entries.map((e) => [`otherIncome:${e.id}`, e.name]),
    ) as Record<string, string>,
    /** Profile errors of this person (empty when valid); shown instead of a result. */
    profileIssues: profile.issues.profile,
  };
}

export type OverviewApi = ReturnType<typeof useOverview>;
export type { OverviewProductKind };
