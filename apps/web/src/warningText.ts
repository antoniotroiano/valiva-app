import { de } from './i18n/de';

type Names = Record<string, string>;

/** Single place that turns core warning codes into German texts. Unknown codes never show raw. */
export function warningText(code: string): string {
  const o = de.overview.retirement;
  const direct: Record<string, string> = {
    'unverified:tax': o.unverifiedTax,
    etf_duration_overridden: o.etfDurationOverridden,
    etf_tax_simplified: o.etfTaxSimplified,
    etf_advance_lump_sum: o.etfAdvanceLumpSum,
    etf_advance_assumed_rate: o.etfAdvanceAssumedRate,
    etf_withdrawal_depleted: o.etfWithdrawalDepleted,
    depot_withdrawal_depleted: o.depotWithdrawalDepleted,
    taxable_share_before_base_year: de.statutory.warnings.taxable_share_before_base_year,
    cost_capped: de.depot.warnings.cost_capped,
    contribution_capped_at_maximum: de.depot.warnings.contribution_capped_at_maximum,
    conversion_capped_at_tax_free_limit:
      de.occupational.warnings.conversion_capped_at_tax_free_limit,
    'unverified:depot.payoutTaxation': de.depot.warnings.payoutTaxation,
    'unverified:depot.noHealthContributions': de.depot.warnings.noHealthContributions,
    statutory_amount_for_retirement_age: de.statutory.warnings.statutory_amount_for_retirement_age,
    contributions_above_tax_free: de.occupational.warnings.contributions_above_tax_free,
    thresholds_indexed: de.occupational.warnings.thresholds_indexed,
  };
  if (direct[code]) return direct[code];

  if (code.startsWith('unverified:')) {
    const [group, key] = code.slice('unverified:'.length).split('.');
    const names: Record<string, Names> = {
      pension: de.assumptions.pensionNames,
      social: de.assumptions.socialNames,
      depot: de.assumptions.depotNames,
      incomeTax: de.assumptions.incomeTaxNames,
    };
    return o.unverified(names[group ?? '']?.[key ?? ''] ?? key ?? '');
  }
  return o.unknownWarning;
}

const INFO_CODES = new Set([
  'etf_duration_overridden',
  'etf_tax_simplified',
  'etf_advance_lump_sum',
  'statutory_amount_for_retirement_age',
  'thresholds_indexed',
]);

/** Notes that change the result or rest on unchecked values are "important"; the rest is background. */
export function warningWeight(code: string): 'important' | 'info' {
  return INFO_CODES.has(code) ? 'info' : 'important';
}
