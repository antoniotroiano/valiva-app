import type { LegalValue } from '@valiva/core';
import { de } from '../i18n/de';
import { formatLegalValue } from './legalValue';
import {
  depotConfig,
  incomeTaxConfig,
  jointAssessmentConfig,
  otherIncomeConfig,
  pensionConfig,
  socialConfig,
} from './legalConfig';

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
    rent_allowance_not_applicable: de.otherIncome.warnings.rent_allowance_not_applicable,
    shared_occupational_threshold: de.otherIncome.warnings.shared_occupational_threshold,
    survivor_needs_pair: de.otherIncome.warnings.survivor_needs_pair,
    first_full_year_estimated: de.retired.warnings.first_full_year_estimated,
    depot_before_first_contribution_year: de.retired.warnings.depot_before_first_contribution_year,
  };
  if (direct[code]) return direct[code];

  if (code.startsWith(VALUES_PREFIX)) {
    const items = code
      .slice(VALUES_PREFIX.length)
      .split('+')
      .map((path) => unverifiedItemText(path));
    return o.unverifiedValues(items.join('; '));
  }
  if (code === DEPOT_ASSUMPTIONS) return o.depotAssumptions;
  if (code.startsWith('unverified:')) {
    // A single code that was not merged (`mergeUnverified` is not applied): same text as a merged one.
    return o.unverifiedValues(unverifiedItemText(code.slice('unverified:'.length)));
  }
  return o.unknownWarning;
}

const VALUES_PREFIX = 'unverified:values:';
const DEPOT_ASSUMPTIONS = 'unverified:depot.assumptions';
/** Unverified assumptions about how a payout is taxed: statements, not legal values with an amount. */
const DEPOT_ASSUMPTION_CODES = [
  'unverified:depot.payoutTaxation',
  'unverified:depot.noHealthContributions',
];
/** Not a value of one config file, and has a text of its own. */
const OWN_TEXT_CODES = new Set(['unverified:tax', ...DEPOT_ASSUMPTION_CODES]);

const NAMES: Record<string, Names> = {
  pension: de.assumptions.pensionNames,
  social: de.assumptions.socialNames,
  depot: de.assumptions.depotNames,
  incomeTax: de.assumptions.incomeTaxNames,
  jointAssessment: de.assumptions.jointAssessmentNames,
  otherIncome: de.otherIncome.ruleNames,
};
const VALUES: Record<string, Record<string, LegalValue> | undefined> = {
  pension: pensionConfig.values,
  social: socialConfig.values,
  depot: depotConfig.values,
  incomeTax: incomeTaxConfig.values,
  jointAssessment: jointAssessmentConfig.values,
  otherIncome: otherIncomeConfig.values,
};

/** "group.key" (as in `unverified:group.key`) as a name with its amount from `config/`, e.g. "… : 72 €". */
function unverifiedItemText(path: string): string {
  const [group = '', key = ''] = path.split('.');
  const value = VALUES[group]?.[key];
  const sentence = de.assumptions.unverifiedItem[path];
  if (sentence && value) return sentence(value.value);
  const name = NAMES[group]?.[key] ?? key;
  // A rule assumption has no amount; the name says it all.
  if (!value || value.unit === 'rule') return name;
  return `${name}: ${formatLegalValue(value)}`;
}

/**
 * Unverified legal values become one note ("Ungeprüfte Rechtswerte: A; B; C"), the two unverified depot payout
 * assumptions another one; everything else stays as it is. Every value stays named, so nothing unverified is
 * hidden (CLAUDE.md). The merged codes are `unverified:values:<group.key>+…` and `unverified:depot.assumptions`.
 */
export function mergeUnverified(codes: readonly string[]): string[] {
  const values = [
    ...new Set(
      codes
        .filter((c) => c.startsWith('unverified:') && !OWN_TEXT_CODES.has(c))
        .map((c) => c.slice('unverified:'.length)),
    ),
  ];
  const bothDepot = DEPOT_ASSUMPTION_CODES.every((c) => codes.includes(c));
  const rest = codes.filter(
    (c) =>
      !(c.startsWith('unverified:') && !OWN_TEXT_CODES.has(c)) &&
      !(bothDepot && DEPOT_ASSUMPTION_CODES.includes(c)),
  );
  return [
    ...(values.length > 0 ? [`${VALUES_PREFIX}${values.join('+')}`] : []),
    ...(bothDepot ? [DEPOT_ASSUMPTIONS] : []),
    ...rest,
  ];
}

const INFO_CODES = new Set([
  'etf_duration_overridden',
  'etf_tax_simplified',
  'etf_advance_lump_sum',
  'statutory_amount_for_retirement_age',
  'thresholds_indexed',
  'shared_occupational_threshold',
  'rent_allowance_not_applicable',
  'first_full_year_estimated',
  // The depot page says it in its own text; the hint stays in the background list.
  'depot_before_first_contribution_year',
]);

/** Notes that change the result or rest on unchecked values are "important"; the rest is background. */
export function warningWeight(code: string): 'important' | 'info' {
  return INFO_CODES.has(code) ? 'info' : 'important';
}
