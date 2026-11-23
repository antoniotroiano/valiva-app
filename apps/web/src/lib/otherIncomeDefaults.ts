import { OTHER_INCOME_LIMITS } from '@valiva/core';
import type { OtherIncomeEntry, OtherIncomeKind } from '@valiva/core';

/**
 * Form start values per kind (`15` §3.1). Only the start of the form: the stored entry always holds all fields.
 * A start at an age takes the person's target retirement age as the first value.
 */
export function newOtherIncomeEntry(
  kind: OtherIncomeKind,
  id: string,
  name: string,
  targetRetirementAge: number,
): OtherIncomeEntry {
  const age = Math.min(
    OTHER_INCOME_LIMITS.startAge.max,
    Math.max(OTHER_INCOME_LIMITS.startAge.min, Math.round(targetRetirementAge)),
  );
  const base = {
    id,
    name,
    kind,
    enabled: true,
    amountMonthly: 0,
    contributions: 'none',
    survivorPercent: 0,
    end: { mode: 'lifelong' },
  } as const;
  switch (kind) {
    case 'riester':
      return {
        ...base,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 0 },
        start: { mode: 'age', age },
        taxMode: 'full',
      };
    case 'basisPension':
      return {
        ...base,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 0 },
        start: { mode: 'age', age },
        taxMode: 'pensionShare',
      };
    case 'privateAnnuity':
      return {
        ...base,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 0 },
        start: { mode: 'age', age },
        taxMode: 'percent',
        taxSharePercent: 0,
      };
    case 'civilServicePension':
      return {
        ...base,
        amountBasis: 'today',
        adjustment: { mode: 'pension' },
        start: { mode: 'retirement' },
        taxMode: 'full',
      };
    case 'rent':
    case 'other':
      return {
        ...base,
        amountBasis: 'today',
        adjustment: { mode: 'inflation' },
        start: { mode: 'retirement' },
        taxMode: 'full',
      };
  }
}

/** Smallest free id `e1`, `e2`, … of a list. */
export function nextEntryId(entries: readonly { id: string }[]): string {
  const used = new Set(entries.map((e) => e.id));
  for (let n = 1; ; n++) if (!used.has(`e${n}`)) return `e${n}`;
}
