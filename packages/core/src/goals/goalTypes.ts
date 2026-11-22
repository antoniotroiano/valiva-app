import type { ScenarioName, ValidationIssue } from '../shared/types';

export type InterestChange = {
  /** `YYYY-MM`; the new rate applies from this calendar month on. */
  fromMonth: string;
  percent: number;
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  /** Desired date, `YYYY-MM`. */
  targetMonth?: string;
  currentAmount: number;
  monthlyContribution: number;
  /** Effective annual rate, % p. a. */
  accountInterestPercent: number;
  interestChanges?: InterestChange[];
  /** Sort order only; Phase 2 has no automatic allocation. */
  priority: number;
  taxEnabled: boolean;
  /** Used when the goal is projected on its own; `projectGoals` shares one yearly allowance instead. */
  taxFreeAllowancePerYear: number;
  /** `YYYY-MM`; month index 0. */
  startMonth: string;
};

/** Only the tax rate is needed for interest; there is no partial exemption on cash interest. */
export type GoalTaxAssumptions = { capitalGainsTaxRate: number };

export type GoalStatus = 'reached_at_start' | 'reached' | 'not_reached';

export type GoalSeriesPoint = {
  /** 0 = start, 1..n = end of month. */
  month: number;
  /** Calendar month `YYYY-MM`. */
  calendarMonth: string;
  /** Start amount plus all contributions so far. */
  contributed: number;
  balance: number;
};

export type GoalYearSummary = {
  calendarYear: number;
  contributed: number;
  balance: number;
  interestGross: number;
  tax: number;
  /** Part of the yearly allowance this goal used up (interest not taxed because of it). */
  allowanceUsed: number;
};

export type SolveStatus = 'already_reached' | 'ok' | 'unreachable';

export type SolveResult = {
  status: SolveStatus;
  /** Smallest whole-cent monthly amount that reaches the target; 0 if `already_reached`. */
  monthly: number;
};

export type GoalWarning = 'target_month_missed';

export type GoalProjection = {
  status: GoalStatus;
  reachedMonth?: string;
  monthsToReach?: number;
  series: GoalSeriesPoint[];
  yearly: GoalYearSummary[];
  interestGross: number;
  tax: number;
  interestNet: number;
  finalBalance: number;
  /** Only with `targetMonth`: rate needed to hold the target amount in that month. */
  requiredMonthlyForTargetMonth?: SolveResult;
  warnings: GoalWarning[];
};

export type GoalResult = { ok: false; issues: ValidationIssue[] } | ({ ok: true } & GoalProjection);

export type TargetBasis = 'nominal' | 'real';

export type EtfTargetScenarioResult = SolveResult & {
  /** Required start rate minus the current rate (negative: current rate is more than enough). */
  differenceToCurrent: number;
};

export type EtfTargetResult =
  | { ok: false; issues: ValidationIssue[] }
  | {
      ok: true;
      /** Target in nominal terms at the end of the plan (real targets are inflated). */
      targetNominal: number;
      currentMonthly: number;
      scenarios: Record<ScenarioName, EtfTargetScenarioResult>;
    };
