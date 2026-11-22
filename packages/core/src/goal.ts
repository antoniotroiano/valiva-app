import { calendarYearOfIndex, indexToMonth, isJanuaryIndex, monthToIndex } from './months';
import { GOAL_LIMITS, validateSavingsGoal } from './goalValidation';
import { solveRequiredContribution } from './solver';
import type {
  GoalProjection,
  GoalResult,
  GoalSeriesPoint,
  GoalTaxAssumptions,
  GoalWarning,
  GoalYearSummary,
  SavingsGoal,
} from './goalTypes';

/** Float noise guard for the "target reached" comparison. */
const REACH_EPSILON = 1e-9;

/** Allowance still available to a goal in a calendar year. */
type AllowanceFor = (calendarYear: number) => number;

type Simulation = {
  series: GoalSeriesPoint[];
  last: GoalSeriesPoint;
  yearly: GoalYearSummary[];
  interestGross: number;
  tax: number;
  reachedAt: number | null;
};

/**
 * Month-by-month simulation. Assumes validated input.
 *
 * Per month m >= 1: contribution at the start of the month, then interest
 * (balance * ((1 + r)^(1/12) - 1), r = rate valid in that calendar month), then tax on the
 * interest above the remaining yearly allowance (allowance resets every January), net interest
 * is credited. Stops at the first month with balance >= target (after tax) if `stopWhenReached`,
 * but never before `minMonths`; never after `maxMonths`.
 */
function simulate(
  goal: SavingsGoal,
  monthlyContribution: number,
  tax: GoalTaxAssumptions,
  maxMonths: number,
  minMonths: number,
  stopWhenReached: boolean,
  allowanceFor: AllowanceFor,
): Simulation {
  const startIdx = monthToIndex(goal.startMonth) as number;
  const changes = (goal.interestChanges ?? []).map((c) => ({
    from: monthToIndex(c.fromMonth) as number,
    percent: c.percent,
  }));

  let balance = goal.currentAmount;
  let contributed = goal.currentAmount;
  let allowanceLeft = 0;
  let interestGross = 0;
  let taxTotal = 0;
  let reachedAt: number | null = balance >= goal.targetAmount - REACH_EPSILON ? 0 : null;

  let last: GoalSeriesPoint = {
    month: 0,
    calendarMonth: indexToMonth(startIdx),
    contributed,
    balance,
  };
  const series: GoalSeriesPoint[] = [last];
  const yearly: GoalYearSummary[] = [];
  let year = { interestGross: 0, tax: 0, allowanceUsed: 0 };

  const closeYear = (calendarYear: number) =>
    yearly.push({ calendarYear, contributed, balance, ...year });

  for (let m = 1; m <= maxMonths; m++) {
    if (stopWhenReached && reachedAt !== null && m > minMonths) break;
    const idx = startIdx + m;
    if (isJanuaryIndex(idx)) {
      closeYear(calendarYearOfIndex(idx - 1));
      year = { interestGross: 0, tax: 0, allowanceUsed: 0 };
    }
    // The allowance of a calendar year is set at its first month: January or the first simulated month.
    if (m === 1 || isJanuaryIndex(idx)) allowanceLeft = allowanceFor(calendarYearOfIndex(idx));

    let percent = goal.accountInterestPercent;
    for (const c of changes) if (c.from <= idx) percent = c.percent;

    balance += monthlyContribution;
    contributed += monthlyContribution;
    const interest = balance * (Math.pow(1 + percent / 100, 1 / 12) - 1);
    let monthTax = 0;
    if (goal.taxEnabled) {
      const taxable = Math.max(0, interest - allowanceLeft);
      year.allowanceUsed += Math.min(allowanceLeft, interest);
      allowanceLeft = Math.max(0, allowanceLeft - interest);
      monthTax = (taxable * tax.capitalGainsTaxRate) / 100;
    }
    balance += interest - monthTax;
    interestGross += interest;
    taxTotal += monthTax;
    year.interestGross += interest;
    year.tax += monthTax;

    last = { month: m, calendarMonth: indexToMonth(idx), contributed, balance };
    series.push(last);
    if (reachedAt === null && balance >= goal.targetAmount - REACH_EPSILON) reachedAt = m;
  }

  const lastYear = calendarYearOfIndex(startIdx + last.month);
  if (yearly.at(-1)?.calendarYear !== lastYear) {
    closeYear(lastYear);
  }

  return { series, last, yearly, interestGross, tax: taxTotal, reachedAt };
}

/** Balance after tax at the end of month `months` for a given monthly contribution. */
function balanceAt(
  goal: SavingsGoal,
  monthlyContribution: number,
  tax: GoalTaxAssumptions,
  months: number,
  allowanceFor: AllowanceFor,
): number {
  const sim = simulate(goal, monthlyContribution, tax, months, months, false, allowanceFor);
  return sim.last.balance;
}

/**
 * Validates, then projects a savings goal. Returns issues as data on invalid input. On its own the goal
 * uses its `taxFreeAllowancePerYear` every year; `projectGoals` passes what is left of a shared allowance.
 */
export function projectGoal(
  goal: SavingsGoal,
  tax: GoalTaxAssumptions,
  allowanceFor: AllowanceFor = () => goal.taxFreeAllowancePerYear,
): GoalResult {
  const issues = validateSavingsGoal(goal);
  if (issues.length > 0) return { ok: false, issues };

  const startIdx = monthToIndex(goal.startMonth) as number;
  const monthsToTargetMonth =
    goal.targetMonth !== undefined ? (monthToIndex(goal.targetMonth) as number) - startIdx : 0;

  const sim = simulate(
    goal,
    goal.monthlyContribution,
    tax,
    GOAL_LIMITS.horizonMonths,
    monthsToTargetMonth,
    true,
    allowanceFor,
  );

  const reachedAt = sim.reachedAt;
  const status: GoalProjection['status'] =
    reachedAt === null ? 'not_reached' : reachedAt === 0 ? 'reached_at_start' : 'reached';

  const warnings: GoalWarning[] = [];
  if (goal.targetMonth !== undefined && (reachedAt === null || reachedAt > monthsToTargetMonth)) {
    warnings.push('target_month_missed');
  }

  const projection: GoalProjection = {
    status,
    series: sim.series,
    yearly: sim.yearly,
    interestGross: sim.interestGross,
    tax: sim.tax,
    interestNet: sim.interestGross - sim.tax,
    finalBalance: sim.last.balance,
    warnings,
  };
  if (reachedAt !== null) {
    projection.reachedMonth = indexToMonth(startIdx + reachedAt);
    projection.monthsToReach = reachedAt;
  }
  if (goal.targetMonth !== undefined) {
    projection.requiredMonthlyForTargetMonth = solveRequiredContribution(
      (rate) => balanceAt(goal, rate, tax, monthsToTargetMonth, allowanceFor),
      goal.targetAmount,
    );
  }
  return { ok: true, ...projection };
}

/**
 * Projects all goals of one person with one shared yearly allowance (review 13, F-6). The goals are taken in
 * the order of `priority` (ties: input order); each gets, per calendar year, what the earlier goals left of
 * `poolYearly`. The per-goal `taxFreeAllowancePerYear` is not used. Invalid goals return their issues and use
 * no allowance.
 */
export function projectGoals(
  goals: SavingsGoal[],
  tax: GoalTaxAssumptions,
  poolYearly: number,
): Map<string, GoalResult> {
  const used = new Map<number, number>();
  const left: AllowanceFor = (year) => Math.max(0, poolYearly - (used.get(year) ?? 0));
  const results = new Map<string, GoalResult>();
  const order = goals
    .map((goal, index) => ({ goal, index }))
    .sort((a, b) => (a.goal.priority || 0) - (b.goal.priority || 0) || a.index - b.index);
  for (const { goal } of order) {
    const result = projectGoal(goal, tax, left);
    results.set(goal.id, result);
    if (!result.ok) continue;
    for (const y of result.yearly) {
      used.set(y.calendarYear, (used.get(y.calendarYear) ?? 0) + y.allowanceUsed);
    }
  }
  return results;
}
