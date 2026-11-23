import type { LegalValue } from '@valiva/core';
import { de } from '../i18n/de';
import { formatNumber } from './format';

/** A legal value as text with its unit ("18 Jahre", "72 €"); a rule assumption has no amount. */
export function formatLegalValue(v: LegalValue): string {
  // A rule assumption has no amount: the value 1 only means "the rule is applied".
  if (v.unit === 'rule') return de.assumptions.legal.ruleApplies;
  const units = de.assumptions.units as Record<string, string>;
  const unit = units[v.unit] ?? v.unit;
  // Years such as 2026 or 1964 are not grouped like amounts.
  const num = v.unit === 'year' ? String(v.value) : formatNumber(v.value);
  return unit ? `${num} ${unit}` : num;
}
