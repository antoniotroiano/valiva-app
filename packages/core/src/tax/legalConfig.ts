import type { LegalValue } from './taxConfig';

export const PENSION_KEYS = [
  'pensionValue',
  'averageEarningsYearly',
  'regularRetirementAge',
  'regularAgeFromBirthYear',
  'regularAgeBeforeRaise',
  'regularAgeRaiseFirstBirthYear',
  'regularAgeRaisePhase1LastBirthYear',
  'regularAgeRaisePhase1MonthsPerYear',
  'regularAgeRaisePhase2MonthsPerYear',
  'earlyReductionPercentPerMonth',
  'maxEarlyReductionPercent',
  'lateIncreasePercentPerMonth',
  'taxableShareBasePercent',
  'taxableShareBaseYear',
  'taxableShareIncreasePerYear',
  'taxableShareMaxPercent',
  'survivorPensionRateNewPercent',
  'survivorPensionRateOldPercent',
  'survivorIncomeFreeFactor',
  'survivorIncomeCreditedPercent',
] as const;

export const SOCIAL_KEYS = [
  'healthGeneralRatePercent',
  'healthAdditionalRatePercent',
  'careRatePercent',
  'careRateChildlessPercent',
  'contributionCeilingPensionMonthly',
  'referenceIncomeMonthly',
  'occupationalHealthAllowanceMonthly',
  'occupationalCareThresholdMonthly',
  'occupationalSocialInsuranceFreeMonthly',
  'occupationalTaxFreeMonthly',
  'employerSubsidyPercent',
] as const;

export const DEPOT_KEYS = [
  'basicGrantTier1Limit',
  'basicGrantTier1RatePercent',
  'basicGrantTier2Limit',
  'basicGrantTier2RatePercent',
  'childGrantRatePercent',
  'childGrantContributionLimit',
  'childGrantMaxPerChild',
  'childGrantMaxAge',
  'youthBonusAmount',
  'youthBonusMaxAge',
  'minOwnContributionYearly',
  'maxContributionYearly',
  'firstContributionYear',
  'payoutStartAgeMin',
  'payoutStartAgeMax',
  'payoutEndAgeMin',
  'lumpSumMaxPercent',
  'standardCostCapPercent',
  'guaranteeLevelLowPercent',
  'guaranteeLevelHighPercent',
] as const;

export const INCOME_TAX_KEYS = [
  'basicAllowance',
  'zone2Limit',
  'zone3Limit',
  'zone4Limit',
  'zone2CoefficientY',
  'zone2CoefficientBase',
  'zone3CoefficientZ',
  'zone3CoefficientBase',
  'zone3Constant',
  'zone4RatePercent',
  'zone4Constant',
  'zone5RatePercent',
  'zone5Constant',
  'pensionIncomeLumpSumDeductionYearly',
  'specialExpensesLumpSumYearly',
] as const;

/**
 * Rule assumptions of the generic "other income" block (`15` §9). No amounts: each value is 1 and every
 * status is `unverified`, so the rules show up as assumptions instead of looking certain.
 */
export const OTHER_INCOME_KEYS = [
  'basisPensionTaxShare',
  'privateAnnuityEarningsShare',
  'riesterFullyTaxable',
  'sharedBenefitThreshold',
  'survivorIncomeCredited',
] as const;

/** Values of the joint assessment (splitting, `config/joint-assessment-de.json`). */
export const JOINT_ASSESSMENT_KEYS = [
  'splittingDivisor',
  'specialExpensesLumpSumJointYearly',
] as const;

export type JointAssessmentKey = (typeof JOINT_ASSESSMENT_KEYS)[number];
export type PensionKey = (typeof PENSION_KEYS)[number];
export type OtherIncomeKey = (typeof OTHER_INCOME_KEYS)[number];
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type DepotKey = (typeof DEPOT_KEYS)[number];
export type IncomeTaxKey = (typeof INCOME_TAX_KEYS)[number];

/** One step of the taxable-share table: the share applies to pensions starting in `fromYear` up to the next step. */
export type TaxableShareTier = { fromYear: number; percent: number };

/** The taxable-share table of §22 Nr. 1 Satz 3 Buchst. a aa EStG for starts up to 2025 (retiree mode, `16` §10). */
export type TaxableShareTableConfig = Omit<LegalValue, 'value' | 'unit'> & {
  unit: string;
  tiers: TaxableShareTier[];
};

/**
 * Values of the retiree mode (`16` §10), kept outside `values` so far. In `pension-de.json`:
 * `taxableShareTable` and `taxFreeAmountFixedFromYearAfterStart`; in `social-de.json`:
 * `careChildlessExemptBeforeBirthYear`. Absent in older or hand-built configs.
 */
export type RetiredConfig = {
  description?: string;
  taxableShareTable?: TaxableShareTableConfig;
  taxFreeAmountFixedFromYearAfterStart?: LegalValue;
  careChildlessExemptBeforeBirthYear?: LegalValue;
};

export type LegalConfig<K extends string> = {
  schemaVersion: number;
  values: Record<K, LegalValue>;
  retired?: RetiredConfig;
};

/** Resolved values of the retiree mode valid on one date (`16` §10). */
export type RetiredLegalParameters = {
  /** Steps sorted by `fromYear`; the first step also covers every earlier start. */
  taxableShareTiers: TaxableShareTier[];
  /** Rule switch (always 1): the tax-free part is fixed from the year after the pension start. */
  taxFreeAmountFixedFromYearAfterStart: number;
  /** Members born before this year pay no care insurance surcharge for the childless. */
  careChildlessExemptBeforeBirthYear: number;
};

/** Resolved legal values valid on one date. Keys of `unverified` look like `pension.pensionValue`. */
export type LegalParameters = {
  pension: Record<PensionKey, number>;
  social: Record<SocialKey, number>;
  depot: Record<DepotKey, number>;
  incomeTax: Record<IncomeTaxKey, number>;
  /** Rule assumptions of the other-income block; absent if the caller passed no `other-income-de.json`. */
  otherIncome?: Record<OtherIncomeKey, number>;
  /** Splitting values; absent if the caller passed no `joint-assessment-de.json`. */
  jointAssessment?: Record<JointAssessmentKey, number>;
  /** Retiree-mode values; absent unless the caller asked for them (`includeRetired`). */
  retired?: RetiredLegalParameters;
  unverified: string[];
};

export type LegalResolution =
  { ok: true; legal: LegalParameters } | { ok: false; missingOrExpired: string[] };

function pick<K extends string>(
  config: LegalConfig<K>,
  keys: readonly K[],
  prefix: string,
  date: string,
  bad: string[],
  unverified: string[],
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const key of keys) {
    const v = config.values[key] as LegalValue | undefined;
    if (!v || date < v.validFrom || (v.validTo !== null && date > v.validTo)) {
      bad.push(`${prefix}.${key}`);
      continue;
    }
    out[key] = v.value;
    if (v.status === 'unverified') unverified.push(`${prefix}.${key}`);
  }
  return out;
}

function inForce(v: { validFrom: string; validTo: string | null }, date: string): boolean {
  return date >= v.validFrom && (v.validTo === null || date <= v.validTo);
}

const isTier = (t: unknown): t is TaxableShareTier =>
  typeof t === 'object' &&
  t !== null &&
  Number.isInteger((t as TaxableShareTier).fromYear) &&
  Number.isFinite((t as TaxableShareTier).percent);

/**
 * Picks the retiree-mode values, asked for with `includeRetired`. A config without the `retired` section, an
 * incomplete or malformed one, or one not valid on `date` reports its keys as missing, like every other value.
 */
function pickRetired(
  pension: LegalConfig<PensionKey>,
  social: LegalConfig<SocialKey>,
  date: string,
  bad: string[],
  unverified: string[],
): RetiredLegalParameters | undefined {
  if (!pension.retired && !social.retired) {
    bad.push('pension.taxableShareTable');
    return undefined;
  }
  const table = pension.retired?.taxableShareTable;
  const rule = pension.retired?.taxFreeAmountFixedFromYearAfterStart;
  const care = social.retired?.careChildlessExemptBeforeBirthYear;
  const tiers =
    table && inForce(table, date) && Array.isArray(table.tiers) && table.tiers.every(isTier)
      ? [...table.tiers].sort((a, b) => a.fromYear - b.fromYear)
      : [];
  if (tiers.length === 0) bad.push('pension.taxableShareTable');
  else if (table?.status === 'unverified') unverified.push('pension.taxableShareTable');
  if (!rule || !inForce(rule, date)) bad.push('pension.taxFreeAmountFixedFromYearAfterStart');
  else if (rule.status === 'unverified') {
    unverified.push('pension.taxFreeAmountFixedFromYearAfterStart');
  }
  if (!care || !inForce(care, date)) bad.push('social.careChildlessExemptBeforeBirthYear');
  else if (care.status === 'unverified') {
    unverified.push('social.careChildlessExemptBeforeBirthYear');
  }
  return {
    taxableShareTiers: tiers,
    taxFreeAmountFixedFromYearAfterStart: rule?.value ?? 0,
    careChildlessExemptBeforeBirthYear: care?.value ?? 0,
  };
}

/**
 * Picks the values valid on `date` (ISO yyyy-mm-dd). The core never reads files; the app passes the parsed
 * config. `otherIncome` is optional so callers that do not use the other-income block stay unchanged.
 */
export function resolveLegalParameters(
  pension: LegalConfig<PensionKey>,
  social: LegalConfig<SocialKey>,
  depot: LegalConfig<DepotKey>,
  incomeTax: LegalConfig<IncomeTaxKey>,
  date: string,
  otherIncome?: LegalConfig<OtherIncomeKey>,
  jointAssessment?: LegalConfig<JointAssessmentKey>,
  includeRetired = false,
): LegalResolution {
  const bad: string[] = [];
  const unverified: string[] = [];
  const p = pick(pension, PENSION_KEYS, 'pension', date, bad, unverified);
  const s = pick(social, SOCIAL_KEYS, 'social', date, bad, unverified);
  const d = pick(depot, DEPOT_KEYS, 'depot', date, bad, unverified);
  const t = pick(incomeTax, INCOME_TAX_KEYS, 'incomeTax', date, bad, unverified);
  const o = otherIncome
    ? pick(otherIncome, OTHER_INCOME_KEYS, 'otherIncome', date, bad, unverified)
    : undefined;
  const j = jointAssessment
    ? pick(jointAssessment, JOINT_ASSESSMENT_KEYS, 'jointAssessment', date, bad, unverified)
    : undefined;
  const r = includeRetired ? pickRetired(pension, social, date, bad, unverified) : undefined;
  return bad.length > 0
    ? { ok: false, missingOrExpired: bad }
    : {
        ok: true,
        legal: {
          pension: p,
          social: s,
          depot: d,
          incomeTax: t,
          ...(o ? { otherIncome: o } : {}),
          ...(j ? { jointAssessment: j } : {}),
          ...(r ? { retired: r } : {}),
          unverified,
        },
      };
}
