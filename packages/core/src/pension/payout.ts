import type { ValidationIssue } from '../shared/types';

export type PayoutPlan = {
  /** Constant nominal monthly payment, due at the end of each month. */
  monthly: number;
  months: number;
  /** Remaining capital after each month; index 0 is the start, the last entry is 0 (up to rounding). */
  remaining: number[];
};

export type PayoutPlanResult =
  { ok: true; plan: PayoutPlan } | { ok: false; issues: ValidationIssue[] };

/**
 * Payout plan over `(endAge - startAge) * 12` months with a constant nominal monthly payment:
 * `P = C * i / (1 - (1 + i)^-n)` with `i = (1 + r)^(1/12) - 1`. For `i = 0` the payment is `C / n`.
 * Phase 4 reuses this for the withdrawal plan.
 */
export function payoutPlan(
  capital: number,
  startAge: number,
  endAge: number,
  annualReturnPercent: number,
): PayoutPlanResult {
  const issues: ValidationIssue[] = [];
  if (!Number.isFinite(capital)) issues.push({ field: 'capital', code: 'not_finite' });
  else if (capital < 0) issues.push({ field: 'capital', code: 'negative', min: 0 });
  if (!Number.isFinite(startAge)) issues.push({ field: 'startAge', code: 'not_finite' });
  if (!Number.isFinite(endAge)) issues.push({ field: 'endAge', code: 'not_finite' });
  else if (Number.isFinite(startAge) && endAge <= startAge) {
    issues.push({ field: 'endAge', code: 'out_of_range', min: startAge + 1 });
  }
  if (!Number.isFinite(annualReturnPercent)) {
    issues.push({ field: 'annualReturnPercent', code: 'not_finite' });
  } else if (annualReturnPercent <= -100) {
    issues.push({ field: 'annualReturnPercent', code: 'out_of_range', min: -100 });
  }
  if (issues.length > 0) return { ok: false, issues };

  const months = Math.round((endAge - startAge) * 12);
  const i = Math.pow(1 + annualReturnPercent / 100, 1 / 12) - 1;
  const monthly = i === 0 ? capital / months : (capital * i) / (1 - Math.pow(1 + i, -months));
  const remaining = [capital];
  let balance = capital;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + i) - monthly;
    remaining.push(m === months && Math.abs(balance) < 1e-6 ? 0 : balance);
  }
  return { ok: true, plan: { monthly, months, remaining } };
}

export const WITHDRAWAL_STRATEGIES = ['annuity', 'percent'] as const;
export type WithdrawalStrategy = (typeof WITHDRAWAL_STRATEGIES)[number];

/** How a depot is paid out. Absent in stored data means `annuity`. */
export type WithdrawalSettings = { strategy: 'annuity' } | { strategy: 'percent'; percent: number };

export const DEFAULT_WITHDRAWAL_PERCENT = 4;
export const WITHDRAWAL_PERCENT_MAX = 100;

export type WithdrawalPlan = PayoutPlan & {
  strategy: WithdrawalStrategy;
  /** Nominal payment per month, `months` entries; 0 from the month the capital is used up. */
  payments: number[];
  /** First month (1-based) in which the capital is used up before the planned end; absent if it lasts. */
  depletionMonth?: number;
  /** Capital left after the planned last month. */
  remainingAtEnd: number;
};

export type WithdrawalPlanResult =
  { ok: true; plan: WithdrawalPlan } | { ok: false; issues: ValidationIssue[] };

/** `percent` out of range as a validation issue; empty for the annuity. */
export function validateWithdrawal(settings: WithdrawalSettings | undefined): ValidationIssue[] {
  if (settings?.strategy !== 'percent') return [];
  const p = settings.percent;
  if (!Number.isFinite(p)) return [{ field: 'withdrawal.percent', code: 'not_finite' }];
  if (p <= 0) return [{ field: 'withdrawal.percent', code: 'not_positive' }];
  if (p > WITHDRAWAL_PERCENT_MAX) {
    return [{ field: 'withdrawal.percent', code: 'out_of_range', max: WITHDRAWAL_PERCENT_MAX }];
  }
  return [];
}

/**
 * Withdrawal plan for the chosen strategy. `annuity` is `payoutPlan` (constant nominal payment, capital ends
 * at 0 at the planned end). `percent`: the first-year payment is `percent / 100 * capital / 12`; from every
 * following year it rises by `indexationPercent` (0 = constant nominal, the inflation = constant in today's
 * purchasing power). The capital earns the return monthly; a payment never exceeds the capital left. If the
 * capital is used up before the planned end, the last payment is cut and `depletionMonth` is set.
 */
export function withdrawalPlan(
  capital: number,
  startAge: number,
  endAge: number,
  annualReturnPercent: number,
  settings: WithdrawalSettings | undefined,
  indexationPercent = 0,
): WithdrawalPlanResult {
  const settingsIssues = validateWithdrawal(settings);
  if (settingsIssues.length > 0) return { ok: false, issues: settingsIssues };
  if (settings?.strategy !== 'percent') {
    const r = payoutPlan(capital, startAge, endAge, annualReturnPercent);
    if (!r.ok) return r;
    return {
      ok: true,
      plan: {
        ...r.plan,
        strategy: 'annuity',
        payments: new Array<number>(r.plan.months).fill(r.plan.monthly),
        remainingAtEnd: r.plan.remaining[r.plan.months] ?? 0,
      },
    };
  }
  const base = payoutPlan(capital, startAge, endAge, annualReturnPercent);
  if (!base.ok) return base;
  if (!Number.isFinite(indexationPercent) || indexationPercent <= -100) {
    return {
      ok: false,
      issues: [{ field: 'indexationPercent', code: 'out_of_range', min: -100 }],
    };
  }
  const months = base.plan.months;
  const i = Math.pow(1 + annualReturnPercent / 100, 1 / 12) - 1;
  const start = (capital * settings.percent) / 100 / 12;
  const payments: number[] = [];
  const remaining = [capital];
  let balance = capital;
  let depletionMonth: number | undefined;
  for (let m = 1; m <= months; m++) {
    const scheduled = start * Math.pow(1 + indexationPercent / 100, Math.floor((m - 1) / 12));
    const due = balance * (1 + i);
    const pay = Math.min(scheduled, due);
    balance = due - pay;
    if (balance < 1e-6) balance = 0;
    if (balance === 0 && m < months && depletionMonth === undefined && capital > 0) {
      depletionMonth = m;
    }
    payments.push(pay);
    remaining.push(balance);
  }
  return {
    ok: true,
    plan: {
      monthly: start,
      months,
      remaining,
      strategy: 'percent',
      payments,
      ...(depletionMonth === undefined ? {} : { depletionMonth }),
      remainingAtEnd: balance,
    },
  };
}

export type WithdrawalYear = {
  /** Age at the end of the payout year. */
  age: number;
  /** Payment per month in this year (the first month's payment), nominal. */
  monthlyPayment: number;
  /** Capital at the end of the year, nominal. */
  remaining: number;
};

/** One row per payout year, for the table and the chart of the percent strategy. */
export function withdrawalYears(plan: WithdrawalPlan, startAge: number): WithdrawalYear[] {
  const rows: WithdrawalYear[] = [];
  for (let from = 0; from < plan.months; from += 12) {
    rows.push({
      age: startAge + from / 12 + 1,
      monthlyPayment: plan.payments[from] ?? 0,
      remaining: plan.remaining[Math.min(from + 12, plan.months)] ?? 0,
    });
  }
  return rows;
}
