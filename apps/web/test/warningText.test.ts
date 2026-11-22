import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { warningText } from '../src/warningText';

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
    ];
    for (const code of codes) {
      const text = warningText(code);
      expect(text).not.toContain(code);
      expect(text).not.toBe(de.overview.retirement.unknownWarning);
    }
  });

  it('never returns a raw code', () => {
    expect(warningText('something_new')).toBe(de.overview.retirement.unknownWarning);
  });
});
