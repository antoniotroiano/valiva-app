import {
  activeAdvanceLumpSum,
  advanceLumpSum,
  usesAssumedBaseInterest,
  validateAdvanceLumpSum,
} from './advanceLumpSum';
import { IssueCollector } from './issues';
import { validateWithdrawal, withdrawalPlan, withdrawalYears } from './payout';
import type { WithdrawalPlan, WithdrawalSettings, WithdrawalYear } from './payout';
import type {
  ProductProjector,
  ProjectionContext,
  ProjectionOutcome,
  ProjectionResult,
} from './projection';
import { projectEtfScenario } from './etf';
import type {
  AdvanceLumpSumParameters,
  EtfPlanInput,
  ScenarioName,
  TaxAssumptions,
  ValidationIssue,
} from './types';
import { validateEtfPlanInput } from './validation';

const PRODUCT_ID = 'etf';

export type EtfProjectorInput = {
  /**
   * `durationYears` is ignored: the savings phase runs from the current month (`ctx.currentMonth`, default
   * January) to the December before the payout year. Lump sum months count from that start.
   */
  plan: EtfPlanInput;
  /** From `config/tax-de.json`; the caller resolves it. */
  tax: TaxAssumptions;
  /** True if any tax value is `unverified`. */
  taxUnverified?: boolean;
  payoutStartAge: number;
  payoutEndAge: number;
  /** True: return scenarios and inflation come from the global assumptions, not from `plan`. */
  useGlobalAssumptions: boolean;
  /** Absent = annuity (constant nominal payment to the end age). */
  withdrawal?: WithdrawalSettings;
};

export type EtfProjectorDetails = {
  payoutYear: number;
  /** Savings phase in years, rounded up; may differ from `plan.durationYears`. */
  durationYears: number;
  /** Savings phase in months, from the current month to the December before the payout year. */
  savingMonths: number;
  inflationPercent: number;
  inflationFactor: number;
  /** Capital at the payout start before tax. */
  grossCapital: number;
  totalContributions: number;
  /** Share of each withdrawal that is gain (`max(0, K - E) / K`), assumed constant. */
  gainShare: number;
  planMonths: number;
  withdrawal: WithdrawalSettings;
  /** Age at which the capital is used up before the end age; absent if it lasts (or without percent withdrawal). */
  depletionAge?: number;
  /** Capital left after the end age (0 for the annuity, up to rounding), nominal. */
  remainingCapitalAtEnd: number;
  /** Only with the percent strategy: payment and capital per payout year. */
  withdrawalYears?: WithdrawalYear[];
  /** Monthly tax on the withdrawal in the first payout year (the average over all months for the annuity), nominal. */
  taxMonthlyNominal: number;
  netMonthlyNominal: number;
  /**
   * Only with the advance lump-sum tax. Savings phase: sum of the advance lump sums and the tax on them,
   * paid from the depot. Payout phase: sum of the advance lump sums (the tax is part of `taxMonthlyNominal`,
   * the average over all payout months).
   */
  advanceLumpSumSaving?: number;
  advanceTaxSaving?: number;
  advanceLumpSumPayout?: number;
};

export type EtfProjection = ProjectionResult & { details: EtfProjectorDetails };

const LIMITS = { payoutStartAge: { min: 40, max: 100 }, payoutEndAge: { max: 120 } } as const;

function payoutYearOf(input: EtfProjectorInput, ctx: ProjectionContext): number {
  return ctx.profile.birthYear + input.payoutStartAge;
}

function startMonthOf(ctx: ProjectionContext): number {
  return ctx.currentMonth !== undefined && ctx.currentMonth >= 1 && ctx.currentMonth <= 12
    ? Math.floor(ctx.currentMonth)
    : 1;
}

/** Months from the current month (included) to the December before the payout year. */
function savingMonthsOf(input: EtfProjectorInput, ctx: ProjectionContext): number {
  const month = startMonthOf(ctx);
  return payoutYearOf(input, ctx) * 12 - (ctx.currentYear * 12 + month - 1);
}

/** The plan as the projector runs it: global assumptions applied, duration derived from the payout year. */
function effectivePlan(input: EtfProjectorInput, ctx: ProjectionContext): EtfPlanInput {
  return {
    ...input.plan,
    ...(input.useGlobalAssumptions
      ? {
          returnScenarios: ctx.assumptions.returnScenarios,
          inflationPercent: ctx.assumptions.inflationPercent,
        }
      : {}),
    durationYears: payoutYearOf(input, ctx) - ctx.currentYear,
  };
}

export function validateEtfProjector(
  input: EtfProjectorInput,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  c.integer('payoutStartAge', input.payoutStartAge, LIMITS.payoutStartAge);
  c.number('payoutEndAge', input.payoutEndAge, { max: LIMITS.payoutEndAge.max });
  if (Number.isFinite(input.payoutStartAge) && Number.isFinite(input.payoutEndAge)) {
    if (input.payoutEndAge <= input.payoutStartAge) {
      c.issues.push({
        field: 'payoutEndAge',
        code: 'out_of_range',
        min: input.payoutStartAge + 1,
        max: LIMITS.payoutEndAge.max,
      });
    }
  }
  c.number('tax.capitalGainsTaxRate', input.tax.capitalGainsTaxRate, { min: 0, max: 100 });
  c.number('tax.partialExemptionRate', input.tax.partialExemptionRate, { min: 0, max: 100 });
  c.number('tax.taxFreeAllowance', input.tax.taxFreeAllowance, { min: 0 });
  c.issues.push(...validateWithdrawal(input.withdrawal));
  if (c.issues.length > 0) return c.issues;
  return validateEtfPlanInput(effectivePlan(input, ctx))
    .filter(
      // The duration follows from the payout age, so report it there.
      (i) => i.field !== 'durationYears',
    )
    .concat(
      durationIssues(input, ctx),
      lumpSumIssues(input, ctx),
      validateAdvanceLumpSum(input.plan, input.tax),
    );
}

/** Payments of the months `from` (excluded) to `to` (included); the annuity keeps its exact product. */
function paidBetween(plan: WithdrawalPlan, from: number, to: number): number {
  if (plan.strategy === 'annuity') return plan.monthly * (to - from);
  let sum = 0;
  for (let m = from; m < to; m++) sum += plan.payments[m] ?? 0;
  return sum;
}

/**
 * Tax on the payout years with the advance lump-sum tax, as the total over all months. The advance lump sum
 * of a year is `held * min(base earnings rate, growth of the year)` with `held = value at the end of the year /
 * growth`: the value at the start of the year of the shares still held at its end (sold shares carry none).
 * It is taxed in the year it arises, together with the realised gain, under one allowance per year; the
 * lump sums paid so far (`credit`, also those of the savings phase) reduce the realised gains.
 */
function payoutTaxWithAdvance(
  plan: WithdrawalPlan,
  payoutReturnPercent: number,
  gainShare: number,
  credit: number,
  tax: TaxAssumptions,
  parameters: AdvanceLumpSumParameters,
  firstYear: number,
): { taxTotal: number; lumpSumTotal: number; firstYearTax: number } {
  let taxTotal = 0;
  let firstYearTax = 0;
  let lumpSumTotal = 0;
  let pool = credit;
  for (let from = 0, year = firstYear; from < plan.months; from += 12, year++) {
    const to = Math.min(from + 12, plan.months);
    const growth = Math.pow(1 + payoutReturnPercent / 100, (to - from) / 12);
    const end = plan.remaining[to] ?? 0;
    const lumpSum = advanceLumpSum(parameters, year, end / growth, end - end / growth);
    const realised = gainShare * paidBetween(plan, from, to);
    const used = Math.min(pool, realised);
    const taxable = Math.max(
      0,
      (lumpSum + realised - used) * (1 - tax.partialExemptionRate / 100) - tax.taxFreeAllowance,
    );
    const yearTax = (taxable * tax.capitalGainsTaxRate) / 100;
    if (from === 0) firstYearTax = yearTax;
    taxTotal += yearTax;
    lumpSumTotal += lumpSum;
    pool += lumpSum - used;
  }
  return { taxTotal, lumpSumTotal, firstYearTax };
}

/** A lump sum after the last savings month would be dropped silently, so it is an error. */
function lumpSumIssues(input: EtfProjectorInput, ctx: ProjectionContext): ValidationIssue[] {
  const max = savingMonthsOf(input, ctx);
  const issues: ValidationIssue[] = [];
  input.plan.lumpSums.forEach((l, i) => {
    if (Number.isInteger(l.month) && l.month > max && max >= 1) {
      issues.push({ field: `lumpSums.${i}.month`, code: 'out_of_range', min: 1, max });
    }
  });
  return issues;
}

function durationIssues(input: EtfProjectorInput, ctx: ProjectionContext): ValidationIssue[] {
  const years = payoutYearOf(input, ctx) - ctx.currentYear;
  if (years < 1) {
    return [
      {
        field: 'payoutStartAge',
        code: 'before_current_year',
        min: ctx.currentYear + 1 - ctx.profile.birthYear,
      },
    ];
  }
  if (years > 60) {
    return [
      {
        field: 'payoutStartAge',
        code: 'out_of_range',
        max: ctx.currentYear + 60 - ctx.profile.birthYear,
      },
    ];
  }
  return [];
}

/**
 * ETF savings plan with a payout phase (`10` §5.1). The savings phase uses the existing ETF core up to the
 * payout year; the capital before tax feeds a payout plan (constant nominal monthly rate). Tax applies
 * to the withdrawals: gain share `g = max(0, K - E) / K`, taxable per year `12 W g (1 - partial exemption)`,
 * minus the allowance, times the tax rate. Church tax only through the rate in `tax`, allowance fixed and unused
 * elsewhere. With the advance lump-sum tax (`plan.advanceLumpSum`) the savings phase charges it every year from
 * the depot (the tax counts as sold at cost, the lump sums are credited at the sale) and the payout years pay it
 * on top of the realised gain; `taxMonthlyNominal` is then the average over the payout months.
 */
export function projectEtfWithPayout(
  input: EtfProjectorInput,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<EtfProjection> {
  const issues = validateEtfProjector(input, ctx);
  if (issues.length > 0) return { ok: false, issues };

  const plan = effectivePlan(input, ctx);
  const savingMonths = savingMonthsOf(input, ctx);
  const advance = activeAdvanceLumpSum(plan, input.tax);
  const run = advance
    ? {
        parameters: { ...advance, startYear: ctx.currentYear, startMonth: startMonthOf(ctx) },
        tax: input.tax,
      }
    : undefined;
  const base = projectEtfScenario(plan, scenario, savingMonths, run);
  const capital = base.grossFinalValue;
  // Taxes paid from the depot count as sold at cost, so they lower the cost basis.
  const contributions = base.totalContributions;
  const costBasis = contributions - (base.advanceTaxPaid ?? 0);

  const withdrawal: WithdrawalSettings = input.withdrawal ?? { strategy: 'annuity' };
  const planResult = withdrawalPlan(
    capital,
    input.payoutStartAge,
    input.payoutEndAge,
    ctx.assumptions.payoutPhaseReturnPercent,
    withdrawal,
    plan.inflationPercent,
  );
  if (!planResult.ok) return { ok: false, issues: planResult.issues };
  const payout = planResult.plan;
  const monthly = payout.monthly;
  const percent = payout.strategy === 'percent';

  const gainShare = plan.taxEnabled && capital > 0 ? Math.max(0, capital - costBasis) / capital : 0;
  const keep = 1 - input.tax.partialExemptionRate / 100;
  const yearTaxOf = (paid: number) =>
    Math.max(0, paid * gainShare * keep - input.tax.taxFreeAllowance) *
    (input.tax.capitalGainsTaxRate / 100);
  // The annuity keeps its constant yearly tax; the percent strategy taxes the first year's payments.
  const taxYear = plan.taxEnabled
    ? yearTaxOf(percent ? paidBetween(payout, 0, Math.min(12, payout.months)) : 12 * monthly)
    : 0;
  const payoutYear = payoutYearOf(input, ctx);
  let taxMonthly = percent ? taxYear / Math.min(12, payout.months) : taxYear / 12;
  let payoutLumpSum: number | undefined;
  if (run && plan.taxEnabled) {
    const withAdvance = payoutTaxWithAdvance(
      payout,
      ctx.assumptions.payoutPhaseReturnPercent,
      gainShare,
      base.advanceLumpSumTotal ?? 0,
      input.tax,
      run.parameters,
      payoutYear,
    );
    taxMonthly = percent
      ? withAdvance.firstYearTax / Math.min(12, payout.months)
      : withAdvance.taxTotal / payout.months;
    payoutLumpSum = withAdvance.lumpSumTotal;
  }
  const depletionAge =
    payout.depletionMonth === undefined
      ? undefined
      : input.payoutStartAge + payout.depletionMonth / 12;
  const inflationFactor = Math.pow(1 + plan.inflationPercent / 100, payoutYear - ctx.currentYear);
  const warnings: string[] = [];
  if (input.plan.durationYears !== plan.durationYears) warnings.push('etf_duration_overridden');
  if (plan.taxEnabled) {
    warnings.push('etf_tax_simplified');
    if (input.taxUnverified) warnings.push('unverified:tax');
  }
  if (depletionAge !== undefined) warnings.push('etf_withdrawal_depleted');
  if (run) {
    warnings.push('etf_advance_lump_sum');
    const lastYear = payoutYear + Math.ceil(payout.months / 12) - 1;
    if (usesAssumedBaseInterest(run.parameters, ctx.currentYear, lastYear)) {
      warnings.push('etf_advance_assumed_rate');
    }
  }

  return {
    ok: true,
    result: {
      productId: PRODUCT_ID,
      scenario,
      series: base.series,
      capitalAtRetirement: capital,
      monthlyPensionNominal: monthly,
      monthlyPensionReal: monthly / inflationFactor,
      taxAndContributions: taxMonthly / inflationFactor,
      taxableMonthlyReal: 0,
      contributionsMonthlyReal: 0,
      fixedTaxMonthlyReal: taxMonthly / inflationFactor,
      netMonthlyPensionReal: (monthly - taxMonthly) / inflationFactor,
      ...(percent ? { indexationPercent: plan.inflationPercent } : {}),
      ...(depletionAge === undefined ? {} : { payoutEndAge: depletionAge }),
      warnings,
      details: {
        payoutYear,
        durationYears: plan.durationYears,
        savingMonths,
        inflationPercent: plan.inflationPercent,
        inflationFactor,
        grossCapital: capital,
        totalContributions: contributions,
        gainShare,
        planMonths: payout.months,
        withdrawal,
        ...(depletionAge === undefined ? {} : { depletionAge }),
        remainingCapitalAtEnd: payout.remainingAtEnd,
        ...(percent ? { withdrawalYears: withdrawalYears(payout, input.payoutStartAge) } : {}),
        taxMonthlyNominal: taxMonthly,
        netMonthlyNominal: monthly - taxMonthly,
        ...(run
          ? {
              advanceLumpSumSaving: base.advanceLumpSumTotal ?? 0,
              advanceTaxSaving: base.advanceTaxPaid ?? 0,
              advanceLumpSumPayout: payoutLumpSum ?? 0,
            }
          : {}),
      },
    },
  };
}

export const etfProjector: ProductProjector<EtfProjectorInput, EtfProjection> = {
  type: PRODUCT_ID,
  validate: validateEtfProjector,
  project: projectEtfWithPayout,
};
