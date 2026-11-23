import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { mergeOtherIncomeRules, warningText } from '../src/lib/warningText';

describe('warningText', () => {
  it('translates every code the projectors emit', () => {
    const codes = [
      'unverified:tax',
      'etf_duration_overridden',
      'etf_tax_simplified',
      'taxable_share_before_base_year',
      'cost_capped',
      'thresholds_indexed',
      'unverified:depot.payoutTaxation',
      'unverified:depot.noHealthContributions',
      'unverified:depot.childGrantMaxAge',
      'unverified:social.occupationalHealthAllowanceMonthly',
      'unverified:pension.pensionValue',
      'unverified:otherIncome.riesterFullyTaxable',
      'rent_allowance_not_applicable',
      'shared_occupational_threshold',
      'survivor_needs_pair',
    ];
    for (const code of codes) {
      const text = warningText(code);
      expect(text).not.toContain(code);
      expect(text).not.toBe(de.overview.retirement.unknownWarning);
    }
  });

  it('merges the rule assumptions of the entries into one note', () => {
    const codes = [
      'unverified:otherIncome.riesterFullyTaxable',
      'etf_tax_simplified',
      'unverified:otherIncome.survivorIncomeCredited',
      'unverified:otherIncome.riesterFullyTaxable',
    ];
    const merged = mergeOtherIncomeRules(codes);
    expect(merged).toEqual([
      'etf_tax_simplified',
      'unverified:otherIncome.riesterFullyTaxable+survivorIncomeCredited',
    ]);
    const text = warningText(merged[1]!);
    expect(text).toContain(de.otherIncome.ruleNames.riesterFullyTaxable);
    expect(text).toContain(de.otherIncome.ruleNames.survivorIncomeCredited);
    expect(mergeOtherIncomeRules(['etf_tax_simplified'])).toEqual(['etf_tax_simplified']);
  });

  it('never returns a raw code', () => {
    expect(warningText('something_new')).toBe(de.overview.retirement.unknownWarning);
  });
});
