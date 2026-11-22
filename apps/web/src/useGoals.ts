import {
  GOAL_LIMITS,
  loadBlock,
  projectGoal,
  projectGoals,
  validateSavingsGoal,
} from '@valiva/core';
import type { ChurchTaxChoice, GoalResult, GoalsState, SavingsGoal } from '@valiva/core';
import { useCallback, useMemo, useState } from 'react';
import { currentTaxAssumptions } from './taxConfig';
import { personKey, readBlock } from './personStorage';
import { useDebounced, usePersist } from './useDebounced';
import { safeSetItem } from './storageStatus';

const allowanceIsValid = (v: number | undefined) =>
  v === undefined || (Number.isFinite(v) && v >= 0);

export const HORIZON_YEARS = GOAL_LIMITS.horizonMonths / 12;

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function newGoal(priority: number, name: string): SavingsGoal {
  return {
    id: crypto.randomUUID(),
    name,
    targetAmount: 3000,
    currentAmount: 0,
    monthlyContribution: 100,
    accountInterestPercent: 2.5,
    priority,
    taxEnabled: true,
    taxFreeAllowancePerYear: currentTaxAssumptions().assumptions.taxFreeAllowance,
    startMonth: currentMonth(),
  };
}

export type { GoalsState };

export function load(personId: string): GoalsState {
  return loadBlock('goals', readBlock(personId, 'goals'), new Date().getFullYear());
}

export function useGoals(personId: string, churchTax?: ChurchTaxChoice) {
  const [state, setState] = useState<GoalsState>(() => load(personId));
  const committed = useDebounced(state, 250);

  usePersist(state, committed, (committed) => {
    // Only valid states are saved, so a half-typed (NaN) field never overwrites good data.
    const valid =
      committed.goals.every((g) => validateSavingsGoal(g).length === 0) &&
      allowanceIsValid(committed.taxFreeAllowanceYearly);
    if (!valid) return;
    safeSetItem(personKey(personId, 'goals'), JSON.stringify(committed));
  });

  const defaultAllowance = currentTaxAssumptions().assumptions.taxFreeAllowance;
  const allowance = state.taxFreeAllowanceYearly ?? defaultAllowance;
  const committedAllowance = allowanceIsValid(committed.taxFreeAllowanceYearly)
    ? (committed.taxFreeAllowanceYearly ?? defaultAllowance)
    : defaultAllowance;

  const { results, allowanceShort } = useMemo(() => {
    const tax = currentTaxAssumptions(churchTax).assumptions;
    const map = projectGoals(committed.goals, tax, committedAllowance);
    // A goal is "short" if it pays more tax than it would with the whole allowance for itself.
    const short = new Set<string>();
    for (const g of committed.goals) {
      const shared = map.get(g.id);
      const alone = projectGoal(g, tax, () => committedAllowance);
      if (shared?.ok && alone.ok && shared.tax > alone.tax + 0.005) short.add(g.id);
    }
    return { results: map as Map<string, GoalResult>, allowanceShort: short };
  }, [committed.goals, committedAllowance, churchTax]);

  const sorted = useMemo(
    () => [...state.goals].sort((a, b) => (a.priority || 0) - (b.priority || 0)),
    [state.goals],
  );

  const addGoal = useCallback((name: string): string => {
    const goal = newGoal(0, name);
    setState((s) => ({
      ...s,
      goals: [...s.goals, { ...goal, priority: s.goals.length + 1 }],
    }));
    return goal.id;
  }, []);
  const updateGoal = useCallback((id: string, patch: Partial<SavingsGoal>) => {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  }, []);
  const removeGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }, []);
  const setAllowance = useCallback((value: number | undefined) => {
    setState((s) => {
      const next = { ...s, taxFreeAllowanceYearly: value };
      if (value === undefined) delete next.taxFreeAllowanceYearly;
      return next;
    });
  }, []);
  const setBudget = useCallback((value: number | undefined) => {
    setState((s) => ({ ...s, savingsBudgetMonthly: value }));
  }, []);

  return {
    state,
    goals: sorted,
    results,
    allowance,
    defaultAllowance,
    allowanceShort,
    setAllowance,
    addGoal,
    updateGoal,
    removeGoal,
    setBudget,
  };
}

export type GoalsApi = ReturnType<typeof useGoals>;
