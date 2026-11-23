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

export type LegalConfig<K extends string> = {
  schemaVersion: number;
  values: Record<K, LegalValue>;
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
          unverified,
        },
      };
}
