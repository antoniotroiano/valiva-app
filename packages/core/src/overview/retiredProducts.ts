import { projectDepotRetired, projectOccupationalRetired } from '../pension/retiredPayout';
import { projectEtfHolding } from '../pension/etfHolding';
import { projectStatutoryActual } from '../pension/statutoryActual';
import { ageToday, ANNUITY_END_LIFELONG } from '../pension/retired';
import type { ProjectionContext, ProjectionOutcome, ProjectionResult } from '../pension/projection';
import { DEFAULT_WITHDRAWAL_PERCENT } from '../pension/payout';
import type { WithdrawalSettings, WithdrawalStrategy } from '../pension/payout';
import type {
  DepotRetiredFields,
  EtfHoldingFields,
  OccupationalRetiredFields,
  StatutoryActualFields,
} from '../pension/retired';
import { SCENARIO_NAMES } from '../shared/types';
import type { ScenarioName, TaxAssumptions, ValidationIssue } from '../shared/types';
import type { OverviewProductInput } from './overview';

/** What the ETF holding needs besides its block: the tax values and the tax switch of the person's ETF plan. */
export type RetiredEtfSettings = {
  tax: TaxAssumptions;
  taxUnverified?: boolean;
  /** False: no tax on the withdrawals. Absent = true. */
  taxEnabled?: boolean;
  advanceLumpSum?: boolean;
};

/** The fields of the ETF payout block that the holding uses (a part of `EtfPayoutState`). */
export type RetiredEtfPayoutFields = EtfHoldingFields & {
  payoutEndAge?: number;
  withdrawalStrategy?: WithdrawalStrategy;
  withdrawalPercent?: number;
};

/** The blocks of a person in the retiree mode; the block states of the workspace fit these types. */
export type RetiredBlocks = {
  statutory: StatutoryActualFields;
  occupational: OccupationalRetiredFields;
  depot: DepotRetiredFields;
  etfPayout: RetiredEtfPayoutFields;
  /** Which of the four products count (the `overview` block). */
  enabled: Record<'etf' | 'statutory' | 'retirementDepot' | 'occupational', boolean>;
  etf: RetiredEtfSettings;
};

function withdrawalSettings(f: RetiredEtfPayoutFields): WithdrawalSettings {
  return f.withdrawalStrategy === 'percent'
    ? { strategy: 'percent', percent: f.withdrawalPercent ?? DEFAULT_WITHDRAWAL_PERCENT }
    : { strategy: 'annuity' };
}

type Outcome = OverviewProductInput['outcome'];

/** Runs a projector for all scenarios; the first issue list stops it. */
function allScenarios(
  run: (s: ScenarioName) => ProjectionOutcome<ProjectionResult & object>,
): Outcome {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = run(s);
    if (!r.ok) return { ok: false, issues: r.issues as ValidationIssue[] };
    results[s] = r.result;
  }
  return { ok: true, results };
}

/**
 * Overview products of a person in the retiree mode (`16` §4.1): the ETF holding, the statutory pension from
 * the notice, the retirement depot and the company pension, in this order (the entries of the generic block
 * follow, see `buildOtherIncomeProducts`). Every product pays from today's age; the end ages come from the blocks
 * (the ETF: `payoutEndAge` or the life expectancy; the depot and the company pension: their own end age, a running
 * company pension also `lifelong`). Pure; a block that fails validation is an `invalid` product with its reasons.
 */
export function buildRetiredProducts(
  blocks: RetiredBlocks,
  ctx: ProjectionContext,
): OverviewProductInput[] {
  const start = ageToday(ctx);
  const etfEnd = blocks.etfPayout.payoutEndAge ?? ctx.profile.lifeExpectancyAge;
  const occ = blocks.occupational;
  const occCapital = occ.retiredForm === 'capital';
  const occEnd = occCapital
    ? occ.capitalEndAge
    : occ.annuityEndAge === undefined || occ.annuityEndAge === ANNUITY_END_LIFELONG
      ? undefined
      : occ.annuityEndAge;
  return [
    {
      productId: 'etf',
      enabled: blocks.enabled.etf,
      payoutStartAge: start,
      payoutEndAge: etfEnd,
      outcome: allScenarios((s) =>
        projectEtfHolding(
          {
            holdingValue: blocks.etfPayout.holdingValue,
            holdingContributions: blocks.etfPayout.holdingContributions,
            payoutEndAge: etfEnd,
            withdrawal: withdrawalSettings(blocks.etfPayout),
            tax: blocks.etf.tax,
            ...(blocks.etf.taxUnverified === undefined
              ? {}
              : { taxUnverified: blocks.etf.taxUnverified }),
            ...(blocks.etf.taxEnabled === undefined ? {} : { taxEnabled: blocks.etf.taxEnabled }),
            ...(blocks.etf.advanceLumpSum === undefined
              ? {}
              : { advanceLumpSum: blocks.etf.advanceLumpSum }),
          },
          ctx,
          s,
        ),
      ),
    },
    {
      productId: 'statutory',
      enabled: blocks.enabled.statutory,
      payoutStartAge: start,
      outcome: allScenarios((s) => projectStatutoryActual(blocks.statutory, ctx, s)),
    },
    {
      productId: 'retirementDepot',
      enabled: blocks.enabled.retirementDepot,
      payoutStartAge: start,
      ...(blocks.depot.retiredEndAge === undefined
        ? {}
        : { payoutEndAge: blocks.depot.retiredEndAge }),
      outcome: allScenarios((s) => projectDepotRetired(blocks.depot, ctx, s)),
    },
    {
      productId: 'occupational',
      enabled: blocks.enabled.occupational,
      payoutStartAge: start,
      ...(occEnd === undefined ? {} : { payoutEndAge: occEnd }),
      outcome: allScenarios((s) => projectOccupationalRetired(occ, ctx, s)),
    },
  ];
}
