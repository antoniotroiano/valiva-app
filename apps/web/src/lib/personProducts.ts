import {
  SCENARIO_NAMES,
  buildOtherIncomeProducts,
  buildRetiredProducts,
  projectDepot,
  projectOccupational,
  projectStatutory,
  withdrawalOf,
} from '@valiva/core';
import type {
  EtfPlanInput,
  GlobalAssumptions,
  LegalResolution,
  OverviewProductInput,
  Profile,
  ProjectionResult,
  ScenarioName,
  ValidationIssue,
} from '@valiva/core';
import { etfRetirement } from './etfRetirement';
import { currentTaxAssumptions } from './taxConfig';
import type { EtfPayoutState } from './etfRetirement';
import { CURRENT_YEAR } from '../state/useHousehold';
import { load as loadDepot } from '../state/useDepot';
import type { DepotState } from '../state/useDepot';
import { load as loadEtfPlan, loadPayout as loadEtfPayout } from '../state/useEtfPlan';
import { load as loadGoals } from '../state/useGoals';
import type { GoalsState } from '../state/useGoals';
import { load as loadOccupational } from '../state/useOccupational';
import type { OccupationalState } from '../state/useOccupational';
import { load as loadOtherIncome } from '../state/useOtherIncome';
import type { OtherIncomeState } from '../state/useOtherIncome';
import { load as loadOverview } from '../state/useOverview';
import type { OverviewState } from '../state/useOverview';
import { load as loadStatutory } from '../state/useStatutory';
import type { StatutoryState } from '../state/useStatutory';

/** Everything one person has entered, as the calculations need it. */
export type PersonBlocks = {
  etfPlan: EtfPlanInput;
  etfPayout: EtfPayoutState;
  statutory: StatutoryState;
  depot: DepotState;
  occupational: OccupationalState;
  otherIncome: OtherIncomeState;
  overview: OverviewState;
  goals: GoalsState;
};

/** Reads a person's saved blocks (for persons who are not the active one). */
export function loadPersonBlocks(personId: string): PersonBlocks {
  return {
    etfPlan: loadEtfPlan(personId),
    etfPayout: loadEtfPayout(personId),
    statutory: loadStatutory(personId),
    depot: loadDepot(personId),
    occupational: loadOccupational(personId),
    otherIncome: loadOtherIncome(personId),
    overview: loadOverview(personId),
    goals: loadGoals(personId),
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

type Outcome = OverviewProductInput['outcome'];

/** Runs a projector for all scenarios; the first issue list stops it. */
function allScenarios(
  run: (
    s: ScenarioName,
  ) => { ok: true; result: ProjectionResult } | { ok: false; issues: ValidationIssue[] },
): Outcome {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = run(s);
    if (!r.ok) return { ok: false, issues: r.issues };
    results[s] = r.result;
  }
  return { ok: true, results };
}

export type PersonCtx = { profile: Profile; assumptions: GlobalAssumptions };

/** The ETF product for a given start rate; the other products do not depend on it. */
export function buildEtfProduct(
  blocks: Pick<PersonBlocks, 'etfPlan' | 'etfPayout' | 'overview'>,
  ctx: PersonCtx,
  legal: LegalResolution,
  monthly?: number,
  enabled = blocks.overview.enabled.etf,
): OverviewProductInput {
  const own =
    monthly === undefined ? blocks.etfPlan : { ...blocks.etfPlan, monthlyContribution: monthly };
  const r = etfRetirement(own, blocks.etfPayout, { committed: ctx, committedValid: true }, legal);
  return {
    productId: 'etf',
    enabled,
    payoutStartAge: r.payoutStartAge,
    payoutEndAge: r.payoutEndAge,
    outcome: r.outcome ?? { ok: false, issues: [] },
  };
}

/** Builds the overview products of one person from their blocks; the order is ETF, statutory, depot, company, then the entries of "other income". */
export function buildPersonProducts(
  blocks: Omit<PersonBlocks, 'goals'>,
  ctxPerson: PersonCtx,
  legal: LegalResolution,
): OverviewProductInput[] {
  if (!legal.ok) return [];
  const pr = ctxPerson.profile;
  const ctx = {
    profile: pr,
    assumptions: ctxPerson.assumptions,
    legal: legal.legal,
    currentYear: CURRENT_YEAR,
  };
  const target = pr.targetRetirementAge;
  const enabled = blocks.overview.enabled;

  // A person who already draws the pension: actual values from the blocks, calculated from today (`16`).
  if (pr.retired === true) {
    const tax = currentTaxAssumptions(ctxPerson.assumptions.churchTax);
    const plan = blocks.etfPlan;
    return [
      ...buildRetiredProducts(
        {
          statutory: blocks.statutory,
          occupational: blocks.occupational,
          depot: blocks.depot,
          etfPayout: blocks.etfPayout,
          enabled,
          etf: {
            tax: tax.assumptions,
            taxUnverified: tax.unverified,
            taxEnabled: plan.taxEnabled,
            ...(plan.advanceLumpSum === undefined ? {} : { advanceLumpSum: plan.advanceLumpSum }),
          },
        },
        ctx,
      ),
      ...buildOtherIncomeProducts(blocks.otherIncome.entries, ctx),
    ];
  }

  const sc = blocks.statutory;
  const statutoryStart = sc.retirementAge ?? target;
  const statutoryInput = {
    projectedMonthlyPensionToday: sc.projectedMonthlyPensionToday,
    projectedMonthlyPensionAtRetirementAgeToday: sc.projectedMonthlyPensionAtRetirementAgeToday,
    statementYear: sc.statementYear,
    retirementAge: statutoryStart,
    regularRetirementAge: sc.regularRetirementAge,
  };

  const dc = blocks.depot;
  const depotStart =
    dc.payoutStartAge ??
    clamp(target, legal.legal.depot.payoutStartAgeMin, legal.legal.depot.payoutStartAgeMax);
  const override = dc.returnOverridePercent;
  const depotGuarantee = dc.variant === 'guarantee80' || dc.variant === 'guarantee100';
  const depotInput = {
    ownContributionMonthly: dc.ownContributionMonthly,
    startMonth: dc.startMonth,
    variant: dc.variant,
    costPercentPerYear: dc.costPercentPerYear,
    annualContributionIncreasePercent: dc.annualContributionIncreasePercent,
    payoutStartAge: depotStart,
    payoutEndAge: dc.payoutEndAge,
    lumpSumSharePercent: dc.lumpSumSharePercent,
    withdrawal: withdrawalOf(dc),
    returnOverridePercent:
      depotGuarantee && override !== undefined && Number.isFinite(override) ? override : undefined,
  };

  const oc = blocks.occupational;
  const occStart = oc.payoutStartAge ?? clamp(target, 62, 70);
  const occEnd = oc.payoutEndAge ?? pr.lifeExpectancyAge;
  const g = oc.guaranteedRatePercent;
  const occInput = {
    employeeContributionMonthlyGross: oc.employeeContributionMonthlyGross,
    employerSubsidyMode: oc.employerSubsidyMode,
    employerSubsidyCustomMonthly:
      oc.employerSubsidyMode === 'custom' ? oc.employerSubsidyCustomMonthly : undefined,
    employerContributionMonthly: oc.employerContributionMonthly,
    costPercentPerYear: oc.costPercentPerYear,
    annualContributionIncreasePercent: oc.annualContributionIncreasePercent,
    startMonth: oc.startMonth,
    payoutStartAge: occStart,
    payoutEndAge: occEnd,
    guaranteedRatePercent: g !== undefined && Number.isFinite(g) ? g : undefined,
  };

  return [
    buildEtfProduct(blocks, ctxPerson, legal),
    {
      productId: 'statutory',
      enabled: enabled.statutory,
      payoutStartAge: statutoryStart,
      outcome: allScenarios(() => projectStatutory(statutoryInput, ctx)),
    },
    {
      productId: 'retirementDepot',
      enabled: enabled.retirementDepot,
      payoutStartAge: depotStart,
      payoutEndAge: dc.payoutEndAge,
      outcome: allScenarios((s) => projectDepot(depotInput, ctx, s)),
    },
    {
      productId: 'occupational',
      enabled: enabled.occupational,
      payoutStartAge: occStart,
      payoutEndAge: occEnd,
      outcome: allScenarios((s) => projectOccupational(occInput, ctx, s)),
    },
    ...buildOtherIncomeProducts(blocks.otherIncome.entries, ctx),
  ];
}
