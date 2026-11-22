import type { SavingsGoal } from '../../src';

export const baseGoal: SavingsGoal = {
  id: 'g1',
  name: 'Test goal',
  targetAmount: 3000,
  currentAmount: 500,
  monthlyContribution: 150,
  accountInterestPercent: 2.5,
  priority: 1,
  taxEnabled: false,
  taxFreeAllowancePerYear: 1000,
  startMonth: '2026-01',
};

export const goalTax = { capitalGainsTaxRate: 26.375 };
