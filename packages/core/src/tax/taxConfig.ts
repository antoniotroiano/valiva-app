import type { AdvanceLumpSumParameters, TaxAssumptions } from '../shared/types';

export type LegalValue = {
  value: number;
  unit: string;
  validFrom: string; // ISO date
  validTo: string | null;
  source: string;
  /** German display text for the source, shown in the UI. */
  sourceDe: string;
  status: 'confirmed' | 'unverified';
};

export type ChurchTaxKey =
  'capitalGainsBaseRate' | 'solidaritySurchargeRate' | 'churchTaxRateLow' | 'churchTaxRateHigh';

export type BaseTaxKey = 'capitalGainsTaxRate' | 'partialExemptionRate' | 'taxFreeAllowance';

/** Base interest of one calendar year (BMF, §18 Abs. 4 InvStG). */
export type BaseInterestValue = LegalValue & { year: number };

export type AdvanceLumpSumConfig = {
  description: string;
  baseEarningsFactor: LegalValue;
  baseInterest: BaseInterestValue[];
  /** Rate for years after the last published one. */
  baseInterestAssumed: LegalValue;
};

export type TaxConfig = {
  schemaVersion: number;
  values: Record<BaseTaxKey, LegalValue> & Record<ChurchTaxKey, LegalValue>;
  advanceLumpSum?: AdvanceLumpSumConfig;
};

export type AdvanceLumpSumResolution =
  | {
      ok: true;
      /** Without the plan start; the caller adds `startYear` and `startMonth`. */
      parameters: Omit<AdvanceLumpSumParameters, 'startYear' | 'startMonth'>;
      /** The base interest years (or `assumed` / `factor`) whose status is unverified. */
      unverified: ('factor' | 'assumed' | number)[];
    }
  | { ok: false; missingOrExpired: ('config' | 'factor' | 'assumed')[] };

/** Parameters of the capital gains tax with church tax (§32d Abs. 1 EStG), all in percent. */
export type ChurchTaxParameters = {
  baseRate: number;
  solidarityRate: number;
  rateLow: number;
  rateHigh: number;
};

export type ChurchTaxResolution =
  | { ok: true; parameters: ChurchTaxParameters; unverified: ChurchTaxKey[] }
  | { ok: false; missingOrExpired: ChurchTaxKey[] };

export type TaxResolution =
  | { ok: true; assumptions: TaxAssumptions; unverified: BaseTaxKey[] }
  | { ok: false; missingOrExpired: BaseTaxKey[] };

const KEYS: BaseTaxKey[] = ['capitalGainsTaxRate', 'partialExemptionRate', 'taxFreeAllowance'];

/** Picks the values valid on `date` (ISO yyyy-mm-dd) and reports which are unverified. */
export function resolveTaxAssumptions(config: TaxConfig, date: string): TaxResolution {
  const bad: BaseTaxKey[] = [];
  const unverified: BaseTaxKey[] = [];
  const out = {} as Record<BaseTaxKey, number>;
  for (const key of KEYS) {
    const v = config.values[key] as LegalValue | undefined;
    if (!v || date < v.validFrom || (v.validTo !== null && date > v.validTo)) {
      bad.push(key);
      continue;
    }
    out[key] = v.value;
    if (v.status === 'unverified') unverified.push(key);
  }
  return bad.length > 0
    ? { ok: false, missingOrExpired: bad }
    : { ok: true, assumptions: out, unverified };
}

function validOn(v: LegalValue, date: string): boolean {
  return date >= v.validFrom && (v.validTo === null || date <= v.validTo);
}

/**
 * Collects the base interest rates and the base earnings factor valid on `date`. A rate counts as
 * published once its year has a `baseInterest` entry; the factor and the assumed rate must be valid on
 * `date`. Rates of years whose entry is `unverified` are reported, so the UI does not show them as certain.
 */
export function resolveAdvanceLumpSumParameters(
  config: TaxConfig,
  date: string,
): AdvanceLumpSumResolution {
  const c = config.advanceLumpSum;
  if (!c) return { ok: false, missingOrExpired: ['config'] };
  const bad: ('config' | 'factor' | 'assumed')[] = [];
  if (!validOn(c.baseEarningsFactor, date)) bad.push('factor');
  if (!c.baseInterestAssumed) bad.push('assumed');
  if (bad.length > 0) return { ok: false, missingOrExpired: bad };
  const unverified: ('factor' | 'assumed' | number)[] = [];
  if (c.baseEarningsFactor.status === 'unverified') unverified.push('factor');
  if (c.baseInterestAssumed.status === 'unverified') unverified.push('assumed');
  const byYear: Record<number, number> = {};
  for (const entry of c.baseInterest) {
    byYear[entry.year] = entry.value;
    if (entry.status === 'unverified') unverified.push(entry.year);
  }
  return {
    ok: true,
    parameters: {
      baseEarningsFactorPercent: c.baseEarningsFactor.value,
      baseInterestByYear: byYear,
      assumedBaseInterestPercent: c.baseInterestAssumed.value,
    },
    unverified,
  };
}

const CHURCH_KEYS: ChurchTaxKey[] = [
  'capitalGainsBaseRate',
  'solidaritySurchargeRate',
  'churchTaxRateLow',
  'churchTaxRateHigh',
];

/** Same rules as `resolveTaxAssumptions`, for the values needed only if a person pays church tax. */
export function resolveChurchTaxParameters(config: TaxConfig, date: string): ChurchTaxResolution {
  const bad: ChurchTaxKey[] = [];
  const unverified: ChurchTaxKey[] = [];
  const out = {} as Record<ChurchTaxKey, number>;
  for (const key of CHURCH_KEYS) {
    const v = config.values[key] as LegalValue | undefined;
    if (!v || date < v.validFrom || (v.validTo !== null && date > v.validTo)) {
      bad.push(key);
      continue;
    }
    out[key] = v.value;
    if (v.status === 'unverified') unverified.push(key);
  }
  return bad.length > 0
    ? { ok: false, missingOrExpired: bad }
    : {
        ok: true,
        parameters: {
          baseRate: out.capitalGainsBaseRate,
          solidarityRate: out.solidaritySurchargeRate,
          rateLow: out.churchTaxRateLow,
          rateHigh: out.churchTaxRateHigh,
        },
        unverified,
      };
}
