import { monthToIndex } from '../shared/months';
import type { SavingsGoal } from './goalTypes';
import type { ValidationIssue } from '../shared/types';

export const GOAL_LIMITS = {
  interestPercent: { min: 0, max: 20 },
  horizonMonths: 600,
} as const;

/** Validates a savings goal. Errors are returned as data, never thrown. */
export function validateSavingsGoal(goal: SavingsGoal): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const finite = (field: string, v: number): boolean => {
    if (!Number.isFinite(v)) {
      issues.push({ field, code: 'not_finite' });
      return false;
    }
    return true;
  };
  const nonNegative = (field: string, v: number) => {
    if (finite(field, v) && v < 0) issues.push({ field, code: 'negative', min: 0 });
  };
  const interest = (field: string, v: number) => {
    if (
      finite(field, v) &&
      (v < GOAL_LIMITS.interestPercent.min || v > GOAL_LIMITS.interestPercent.max)
    ) {
      issues.push({ field, code: 'out_of_range', ...GOAL_LIMITS.interestPercent });
    }
  };

  if (finite('targetAmount', goal.targetAmount) && goal.targetAmount <= 0) {
    issues.push({ field: 'targetAmount', code: 'not_positive' });
  }
  nonNegative('currentAmount', goal.currentAmount);
  nonNegative('monthlyContribution', goal.monthlyContribution);
  nonNegative('taxFreeAllowancePerYear', goal.taxFreeAllowancePerYear);
  finite('priority', goal.priority);
  interest('accountInterestPercent', goal.accountInterestPercent);

  const start = monthToIndex(goal.startMonth);
  if (start === null) issues.push({ field: 'startMonth', code: 'invalid_month' });

  if (goal.targetMonth !== undefined) {
    const target = monthToIndex(goal.targetMonth);
    if (target === null) issues.push({ field: 'targetMonth', code: 'invalid_month' });
    else if (start !== null) {
      if (target <= start) issues.push({ field: 'targetMonth', code: 'not_after_start' });
      else if (target - start > GOAL_LIMITS.horizonMonths) {
        issues.push({
          field: 'targetMonth',
          code: 'out_of_range',
          max: GOAL_LIMITS.horizonMonths,
        });
      }
    }
  }

  let previous = start;
  (goal.interestChanges ?? []).forEach((change, i) => {
    interest(`interestChanges.${i}.percent`, change.percent);
    const idx = monthToIndex(change.fromMonth);
    if (idx === null) {
      issues.push({ field: `interestChanges.${i}.fromMonth`, code: 'invalid_month' });
      return;
    }
    if (previous !== null) {
      if (i === 0 && idx <= previous) {
        issues.push({ field: `interestChanges.${i}.fromMonth`, code: 'not_after_start' });
      } else if (i > 0 && idx <= previous) {
        issues.push({ field: `interestChanges.${i}.fromMonth`, code: 'not_chronological' });
      }
    }
    previous = idx;
  });

  return issues;
}
