import {
  DEFAULT_ETF_PAYOUT,
  projectEtfWithPayout,
  SCENARIO_NAMES,
  withdrawalOf,
} from '@valiva/core';
import type {
  EtfPayoutState,
  EtfPlanInput,
  EtfProjection,
  GlobalAssumptions,
  LegalResolution,
  Profile,
  ScenarioName,
  ValidationIssue,
} from '@valiva/core';

export type ProfileSlice = {
  committed: { profile: Profile; assumptions: GlobalAssumptions };
  committedValid: boolean;
};
import { CURRENT_YEAR } from './useProfile';
import { CURRENT_MONTH } from './useHousehold';
import { currentTaxAssumptions } from './taxConfig';

export type { EtfPayoutState };
export const DEFAULT_PAYOUT = DEFAULT_ETF_PAYOUT;

export type EtfRetirementOutcome =
  | { ok: true; results: Record<ScenarioName, EtfProjection> }
  | { ok: false; issues: ValidationIssue[] };

export type EtfRetirement = {
  payoutStartAge: number;
  payoutEndAge: number;
  /** `undefined` while the profile or the legal values are not usable. */
  outcome: EtfRetirementOutcome | undefined;
};

/** The plan as the ETF page calculates it: global returns and inflation applied if switched on. */
export function effectiveEtfPlan(
  own: EtfPlanInput,
  payout: EtfPayoutState,
  profile: ProfileSlice,
): EtfPlanInput {
  if (!payout.useGlobalAssumptions || !profile.committedValid) return own;
  const a = profile.committed.assumptions;
  return { ...own, returnScenarios: a.returnScenarios, inflationPercent: a.inflationPercent };
}

export function etfRetirement(
  own: EtfPlanInput,
  payout: EtfPayoutState,
  profile: ProfileSlice,
  legal: LegalResolution,
): EtfRetirement {
  const p = profile.committed.profile;
  const payoutStartAge = payout.payoutStartAge ?? p.targetRetirementAge;
  const payoutEndAge = payout.payoutEndAge ?? p.lifeExpectancyAge;
  if (!legal.ok || !profile.committedValid) {
    return { payoutStartAge, payoutEndAge, outcome: undefined };
  }
  const tax = currentTaxAssumptions(profile.committed.assumptions.churchTax);
  const ctx = {
    profile: p,
    assumptions: profile.committed.assumptions,
    legal: legal.legal,
    currentYear: CURRENT_YEAR,
    currentMonth: CURRENT_MONTH,
  };
  const input = {
    plan: own,
    tax: tax.assumptions,
    taxUnverified: tax.unverified,
    payoutStartAge,
    payoutEndAge,
    useGlobalAssumptions: payout.useGlobalAssumptions,
    withdrawal: withdrawalOf(payout),
  };
  const results = {} as Record<ScenarioName, EtfProjection>;
  for (const s of SCENARIO_NAMES) {
    const r = projectEtfWithPayout(input, ctx, s);
    if (!r.ok) return { payoutStartAge, payoutEndAge, outcome: { ok: false, issues: r.issues } };
    results[s] = r.result;
  }
  return { payoutStartAge, payoutEndAge, outcome: { ok: true, results } };
}
