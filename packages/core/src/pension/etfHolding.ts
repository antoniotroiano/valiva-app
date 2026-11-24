import {
  activeAdvanceLumpSum,
  usesAssumedBaseInterest,
  validateAdvanceLumpSum,
} from '../etf/advanceLumpSum';
import { paidBetween, payoutTaxWithAdvance } from './etfProjector';
import { withdrawalPlan, withdrawalYears } from './payout';
import type { WithdrawalSettings, WithdrawalYear } from './payout';
import { ageToday, validateEtfHolding } from './retired';
import type { EtfHoldingFields } from './retired';
import type { ProjectionContext, ProjectionOutcome, ProjectionResult } from './projection';
import type { ScenarioName, TaxAssumptions } from '../shared/types';

const PRODUCT_ID = 'etf';

export type EtfHoldingInput = EtfHoldingFields & {
  /** From `config/tax-de.json`; the caller resolves it. */
  tax: TaxAssumptions;
  /** True if any tax value is `unverified`. */
  taxUnverified?: boolean;
  /** False: no tax on the withdrawals (the switch of the plan). Absent = true. */
  taxEnabled?: boolean;
  /** Charge the advance lump-sum tax on the holding (needs `tax.advanceLumpSum`). Absent or false: no. */
  advanceLumpSum?: boolean;
  /** Age (at the end of the year) at which the planned payout ends. */
  payoutEndAge: number;
  /** Absent = annuity. */
  withdrawal?: WithdrawalSettings;
};

export type EtfHoldingDetails = {
  ageToday: number;
  holdingValue: number;
  holdingContributions: number;
  /** Share of each withdrawal that is gain (`max(0, K - E) / K`), assumed constant (`16` §15 point 4). */
  gainShare: number;
  planMonths: number;
  withdrawal: WithdrawalSettings;
  depletionAge?: number;
  remainingCapitalAtEnd: number;
  withdrawalYears?: WithdrawalYear[];
  /** Monthly tax on the withdrawal in the first year (the average over all months for the annuity). */
  taxMonthly: number;
  netMonthly: number;
  advanceLumpSumPayout?: number;
};

export type EtfHoldingProjection = ProjectionResult & { details: EtfHoldingDetails };

/**
 * ETF holding of a person who already draws a pension (`16` §5.4): no savings phase, the payout starts today
 * with the depot value `K` and the sum paid in `E`. The payout plan, the gain share `max(0, K - E) / K` and the tax
 * are those of `projectEtfWithPayout` (annuity or percent strategy, optional advance lump sum), the nominal
 * amount of this year equals the real one. Pure; errors are data.
 */
export function projectEtfHolding(
  input: EtfHoldingInput,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<EtfHoldingProjection> {
  const taxEnabled = input.taxEnabled !== false;
  const issues = [
    ...validateEtfHolding(input, ctx),
    ...validateAdvanceLumpSum({ taxEnabled, advanceLumpSum: input.advanceLumpSum }, input.tax),
  ];
  if (issues.length > 0) return { ok: false, issues };

  const capital = input.holdingValue as number;
  const contributions = input.holdingContributions as number;
  const start = ageToday(ctx);
  const inflationPercent = ctx.assumptions.inflationPercent;
  const withdrawal: WithdrawalSettings = input.withdrawal ?? { strategy: 'annuity' };
  const planResult = withdrawalPlan(
    capital,
    start,
    input.payoutEndAge,
    ctx.assumptions.payoutPhaseReturnPercent,
    withdrawal,
    inflationPercent,
  );
  if (!planResult.ok) return { ok: false, issues: planResult.issues };
  const payout = planResult.plan;
  const monthly = payout.monthly;
  const percent = payout.strategy === 'percent';

  const gainShare = taxEnabled && capital > 0 ? Math.max(0, capital - contributions) / capital : 0;
  const keep = 1 - input.tax.partialExemptionRate / 100;
  const yearTaxOf = (paid: number) =>
    Math.max(0, paid * gainShare * keep - input.tax.taxFreeAllowance) *
    (input.tax.capitalGainsTaxRate / 100);
  const taxYear = taxEnabled
    ? yearTaxOf(percent ? paidBetween(payout, 0, Math.min(12, payout.months)) : 12 * monthly)
    : 0;
  let taxMonthly = percent ? taxYear / Math.min(12, payout.months) : taxYear / 12;

  const advance = activeAdvanceLumpSum(
    { taxEnabled, advanceLumpSum: input.advanceLumpSum },
    input.tax,
  );
  let payoutLumpSum: number | undefined;
  const warnings: string[] = [];
  if (advance) {
    const parameters = { ...advance, startYear: ctx.currentYear, startMonth: 1 };
    const withAdvance = payoutTaxWithAdvance(
      payout,
      ctx.assumptions.payoutPhaseReturnPercent,
      gainShare,
      0,
      input.tax,
      parameters,
      ctx.currentYear,
    );
    taxMonthly = percent
      ? withAdvance.firstYearTax / Math.min(12, payout.months)
      : withAdvance.taxTotal / payout.months;
    payoutLumpSum = withAdvance.lumpSumTotal;
    warnings.push('etf_advance_lump_sum');
    const lastYear = ctx.currentYear + Math.ceil(payout.months / 12) - 1;
    if (usesAssumedBaseInterest(parameters, ctx.currentYear, lastYear)) {
      warnings.push('etf_advance_assumed_rate');
    }
  }
  const depletionAge =
    payout.depletionMonth === undefined ? undefined : start + payout.depletionMonth / 12;
  if (taxEnabled) {
    warnings.push('etf_tax_simplified');
    if (input.taxUnverified) warnings.push('unverified:tax');
  }
  if (depletionAge !== undefined) warnings.push('etf_withdrawal_depleted');

  return {
    ok: true,
    result: {
      productId: PRODUCT_ID,
      scenario,
      series: [],
      capitalAtRetirement: capital,
      monthlyPensionNominal: monthly,
      monthlyPensionReal: monthly,
      taxAndContributions: taxMonthly,
      taxableMonthlyReal: 0,
      contributionsMonthlyReal: 0,
      fixedTaxMonthlyReal: taxMonthly,
      netMonthlyPensionReal: monthly - taxMonthly,
      ...(percent ? { indexationPercent: inflationPercent } : {}),
      ...(depletionAge === undefined ? {} : { payoutEndAge: depletionAge }),
      warnings,
      details: {
        ageToday: start,
        holdingValue: capital,
        holdingContributions: contributions,
        gainShare,
        planMonths: payout.months,
        withdrawal,
        ...(depletionAge === undefined ? {} : { depletionAge }),
        remainingCapitalAtEnd: payout.remainingAtEnd,
        ...(percent ? { withdrawalYears: withdrawalYears(payout, start) } : {}),
        taxMonthly,
        netMonthly: monthly - taxMonthly,
        ...(payoutLumpSum === undefined ? {} : { advanceLumpSumPayout: payoutLumpSum }),
      },
    },
  };
}
