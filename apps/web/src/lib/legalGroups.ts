import type { LegalValue } from '@valiva/core';
import { de } from '../i18n/de';
import { taxConfig } from './taxConfig';
import { depotConfig, incomeTaxConfig, pensionConfig, socialConfig } from './legalConfig';

/** One legal value with its display name, as listed on the Annahmen page. */
export type LegalItem = { key: string; name: string; value: LegalValue };

/** A group of values; `parts` lets a group carry a sub-heading (tax: base interest). */
export type LegalGroup = {
  id: 'tax' | 'pension' | 'social' | 'depot' | 'incomeTax';
  title: string;
  parts: { heading?: string; items: LegalItem[] }[];
};

const taxKeys = [
  'capitalGainsTaxRate',
  'partialExemptionRate',
  'taxFreeAllowance',
  'capitalGainsBaseRate',
  'solidaritySurchargeRate',
  'churchTaxRateLow',
  'churchTaxRateHigh',
] as const;

function items(
  keys: readonly string[],
  values: Record<string, LegalValue>,
  names: Record<string, string>,
): LegalItem[] {
  return keys.flatMap((key) => {
    const value = values[key];
    return value ? [{ key, name: names[key] ?? key, value }] : [];
  });
}

/** Base interest by year plus factor and assumed rate; years sorted, assumed rate last. */
function advanceItems(): LegalItem[] {
  const config = taxConfig.advanceLumpSum;
  if (!config) return [];
  const a = de.assumptions;
  const list: LegalItem[] = [
    {
      key: 'baseEarningsFactor',
      name: a.names.baseEarningsFactor ?? 'baseEarningsFactor',
      value: config.baseEarningsFactor,
    },
  ];
  for (const entry of [...config.baseInterest].sort((x, y) => x.year - y.year)) {
    list.push({
      key: `baseInterest${entry.year}`,
      name: a.baseInterestName(entry.year),
      value: entry,
    });
  }
  list.push({
    key: 'baseInterestAssumed',
    name: a.names.baseInterestAssumed ?? 'baseInterestAssumed',
    value: config.baseInterestAssumed,
  });
  return list;
}

/** All legal values of the config files, grouped for the page. Display only; nothing is computed here. */
export function legalGroups(): LegalGroup[] {
  const a = de.assumptions;
  const g = a.legal.groups;
  return [
    {
      id: 'tax',
      title: g.tax,
      parts: [
        { items: items(taxKeys, taxConfig.values, a.names) },
        { heading: a.legal.baseInterestHeading, items: advanceItems() },
      ],
    },
    {
      id: 'pension',
      title: g.pension,
      parts: [
        {
          items: items(Object.keys(pensionConfig.values), pensionConfig.values, a.pensionNames),
        },
      ],
    },
    {
      id: 'social',
      title: g.social,
      parts: [
        { items: items(Object.keys(socialConfig.values), socialConfig.values, a.socialNames) },
      ],
    },
    {
      id: 'depot',
      title: g.depot,
      parts: [{ items: items(Object.keys(depotConfig.values), depotConfig.values, a.depotNames) }],
    },
    {
      id: 'incomeTax',
      title: g.incomeTax,
      parts: [
        {
          items: items(
            Object.keys(incomeTaxConfig.values),
            incomeTaxConfig.values,
            a.incomeTaxNames,
          ),
        },
      ],
    },
  ];
}

export const groupItems = (group: LegalGroup): LegalItem[] => group.parts.flatMap((p) => p.items);

export const unverifiedItems = (group: LegalGroup): LegalItem[] =>
  groupItems(group).filter((i) => i.value.status === 'unverified');
