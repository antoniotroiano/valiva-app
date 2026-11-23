import { OTHER_INCOME_KINDS, personContext, validateOtherIncomeEntry } from '@valiva/core';
import { defaultHouseholdState } from '@valiva/core';
import { describe, expect, it } from 'vitest';
import { newOtherIncomeEntry, nextEntryId } from '../src/lib/otherIncomeDefaults';
import { currentLegal } from '../src/lib/legalConfig';
import { de } from '../src/i18n/de';
import { CURRENT_YEAR, defaultGlobalAssumptions } from '../src/state/useHousehold';

const legal = currentLegal();
const household = defaultHouseholdState(CURRENT_YEAR, defaultGlobalAssumptions()).household;

describe('newOtherIncomeEntry', () => {
  it('starts every kind with an entry that is valid once an amount is entered', () => {
    if (!legal.ok) throw new Error('legal config');
    const ctx = {
      ...personContext(household, household.persons[0]!),
      legal: legal.legal,
      currentYear: CURRENT_YEAR,
    };
    for (const kind of OTHER_INCOME_KINDS) {
      const entry = {
        ...newOtherIncomeEntry(kind, 'e1', de.otherIncome.kinds[kind], 67),
        amountMonthly: 300,
      };
      expect(validateOtherIncomeEntry(entry, ctx), kind).toEqual([]);
    }
  });

  it('follows the presets of concept 15 section 3.1', () => {
    const riester = newOtherIncomeEntry('riester', 'a', 'Riester', 67);
    expect(riester).toMatchObject({
      amountBasis: 'nominalAtStart',
      adjustment: { mode: 'fixed', percent: 0 },
      start: { mode: 'age', age: 67 },
      end: { mode: 'lifelong' },
      taxMode: 'full',
      contributions: 'none',
      survivorPercent: 0,
      enabled: true,
    });
    expect(newOtherIncomeEntry('basisPension', 'a', 'B', 65).taxMode).toBe('pensionShare');
    const annuity = newOtherIncomeEntry('privateAnnuity', 'a', 'P', 65);
    expect(annuity).toMatchObject({ taxMode: 'percent', taxSharePercent: 0 });
    expect(newOtherIncomeEntry('civilServicePension', 'a', 'P', 65)).toMatchObject({
      amountBasis: 'today',
      adjustment: { mode: 'pension' },
      start: { mode: 'retirement' },
    });
    for (const kind of ['rent', 'other'] as const) {
      expect(newOtherIncomeEntry(kind, 'a', 'M', 65)).toMatchObject({
        amountBasis: 'today',
        adjustment: { mode: 'inflation' },
        start: { mode: 'retirement' },
        taxMode: 'full',
      });
    }
  });

  it('keeps a start age inside the allowed range', () => {
    expect(newOtherIncomeEntry('riester', 'a', 'R', 5).start).toEqual({ mode: 'age', age: 18 });
    expect(newOtherIncomeEntry('riester', 'a', 'R', 200).start).toEqual({ mode: 'age', age: 100 });
  });
});

describe('nextEntryId', () => {
  it('takes the smallest free id', () => {
    expect(nextEntryId([])).toBe('e1');
    expect(nextEntryId([{ id: 'e1' }, { id: 'e3' }])).toBe('e2');
    expect(nextEntryId([{ id: 'e1' }, { id: 'e2' }])).toBe('e3');
  });
});
