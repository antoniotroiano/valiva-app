import {
  capitalGainsRateWithChurchTax,
  resolveAdvanceLumpSumParameters,
  resolveChurchTaxParameters,
  resolveTaxAssumptions,
} from '@valiva/core';
import type {
  AdvanceLumpSumParameters,
  ChurchTaxChoice,
  ChurchTaxParameters,
  TaxAssumptions,
  TaxConfig,
} from '@valiva/core';
import raw from '../../../config/tax-de.json';
import { todayLocal } from './format';

export const taxConfig = raw as unknown as TaxConfig;

const today = todayLocal;

/**
 * Base interest and factor for the advance lump-sum tax, with the plan starting this month. Falls back to the
 * config values as they are if today is outside their period (the assumed rate then still covers later years).
 */
export function advanceLumpSumParameters(): AdvanceLumpSumParameters | undefined {
  const date = today();
  const start = { startYear: Number(date.slice(0, 4)), startMonth: Number(date.slice(5, 7)) };
  const r = resolveAdvanceLumpSumParameters(taxConfig, date);
  return r.ok ? { ...r.parameters, ...start } : undefined;
}

/** Falls back to the latest values if today is outside every period (the flag then says unverified). */
export function churchTaxParameters(): { parameters: ChurchTaxParameters; unverified: boolean } {
  const r = resolveChurchTaxParameters(taxConfig, today());
  if (r.ok) return { parameters: r.parameters, unverified: r.unverified.length > 0 };
  const v = taxConfig.values;
  return {
    parameters: {
      baseRate: v.capitalGainsBaseRate.value,
      solidarityRate: v.solidaritySurchargeRate.value,
      rateLow: v.churchTaxRateLow.value,
      rateHigh: v.churchTaxRateHigh.value,
    },
    unverified: true,
  };
}

/**
 * Falls back to the values valid at the latest validFrom if today is outside every period. With a church
 * tax choice the capital gains rate includes it (the person's own rate).
 */
export function currentTaxAssumptions(churchTax?: ChurchTaxChoice): {
  assumptions: TaxAssumptions;
  unverified: boolean;
} {
  const r = resolveTaxAssumptions(taxConfig, today());
  const base = r.ok
    ? { assumptions: r.assumptions, unverified: r.unverified.length > 0 }
    : {
        assumptions: {
          capitalGainsTaxRate: taxConfig.values.capitalGainsTaxRate.value,
          partialExemptionRate: taxConfig.values.partialExemptionRate.value,
          taxFreeAllowance: taxConfig.values.taxFreeAllowance.value,
        },
        unverified: true,
      };
  const advance = advanceLumpSumParameters();
  if (advance) base.assumptions = { ...base.assumptions, advanceLumpSum: advance };
  if (churchTax === undefined) return base;
  const church = churchTaxParameters();
  return {
    assumptions: {
      ...base.assumptions,
      capitalGainsTaxRate: capitalGainsRateWithChurchTax(church.parameters, churchTax),
    },
    unverified: base.unverified || church.unverified,
  };
}
