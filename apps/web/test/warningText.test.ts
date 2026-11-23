import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { mergeUnverified, warningText } from '../src/lib/warningText';

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
      'unverified:jointAssessment.specialExpensesLumpSumJointYearly',
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

  it('merges all unverified legal values into one note and names every value with its amount', () => {
    const codes = [
      'unverified:depot.childGrantMaxAge',
      'unverified:depot.payoutTaxation',
      'unverified:depot.noHealthContributions',
      'unverified:depot.youthBonusMaxAge',
      'unverified:jointAssessment.specialExpensesLumpSumJointYearly',
      'unverified:otherIncome.riesterFullyTaxable',
      'unverified:otherIncome.survivorIncomeCredited',
      'unverified:otherIncome.riesterFullyTaxable',
      'etf_tax_simplified',
      'unverified:tax',
    ];
    const merged = mergeUnverified(codes);
    expect(merged).toEqual([
      'unverified:values:depot.childGrantMaxAge+depot.youthBonusMaxAge+jointAssessment.specialExpensesLumpSumJointYearly+otherIncome.riesterFullyTaxable+otherIncome.survivorIncomeCredited',
      'unverified:depot.assumptions',
      'etf_tax_simplified',
      'unverified:tax',
    ]);
    const values = warningText(merged[0]!);
    // Amounts come from config/, with full sentences for the two age limits.
    expect(values).toContain('Kinderzulage nur für Kinder jünger als 18 Jahre');
    expect(values).toContain('Bonus nur für Sparer unter 25 Jahren (Alter zu Jahresbeginn)');
    expect(values).toContain(
      `${de.assumptions.jointAssessmentNames.specialExpensesLumpSumJointYearly}: 72 €`,
    );
    expect(values).toContain(de.otherIncome.ruleNames.riesterFullyTaxable);
    expect(values).toContain(de.otherIncome.ruleNames.survivorIncomeCredited);
    expect(warningText(merged[1]!)).toBe(de.overview.retirement.depotAssumptions);
  });

  it('leaves a single depot assumption and unrelated codes alone', () => {
    expect(mergeUnverified(['etf_tax_simplified'])).toEqual(['etf_tax_simplified']);
    expect(mergeUnverified(['unverified:depot.payoutTaxation'])).toEqual([
      'unverified:depot.payoutTaxation',
    ]);
  });

  it('never returns a raw code', () => {
    expect(warningText('something_new')).toBe(de.overview.retirement.unknownWarning);
  });
});
