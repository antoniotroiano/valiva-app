import type {
  GlobalAssumptions,
  LegalParameters,
  OtherIncomeEntry,
  ProjectionContext,
  Profile,
  StatutoryInput,
} from '../src';

/** Values as in config/pension-de.json and social-de.json (a test checks they stay in sync). */
export const LEGAL: LegalParameters = {
  pension: {
    pensionValue: 42.52,
    averageEarningsYearly: 51944,
    regularRetirementAge: 67,
    regularAgeFromBirthYear: 1964,
    regularAgeBeforeRaise: 65,
    regularAgeRaiseFirstBirthYear: 1947,
    regularAgeRaisePhase1LastBirthYear: 1958,
    regularAgeRaisePhase1MonthsPerYear: 1,
    regularAgeRaisePhase2MonthsPerYear: 2,
    earlyReductionPercentPerMonth: 0.3,
    maxEarlyReductionPercent: 14.4,
    lateIncreasePercentPerMonth: 0.5,
    taxableShareBasePercent: 84,
    taxableShareBaseYear: 2026,
    taxableShareIncreasePerYear: 0.5,
    taxableShareMaxPercent: 100,
    survivorPensionRateNewPercent: 55,
    survivorPensionRateOldPercent: 60,
    survivorIncomeFreeFactor: 26.4,
    survivorIncomeCreditedPercent: 40,
  },
  social: {
    healthGeneralRatePercent: 14.6,
    healthAdditionalRatePercent: 2.9,
    careRatePercent: 3.6,
    careRateChildlessPercent: 4.2,
    contributionCeilingPensionMonthly: 8450,
    referenceIncomeMonthly: 3955,
    occupationalHealthAllowanceMonthly: 197.75,
    occupationalCareThresholdMonthly: 197.75,
    occupationalSocialInsuranceFreeMonthly: 338,
    occupationalTaxFreeMonthly: 676,
    employerSubsidyPercent: 15,
  },
  depot: {
    basicGrantTier1Limit: 360,
    basicGrantTier1RatePercent: 50,
    basicGrantTier2Limit: 1800,
    basicGrantTier2RatePercent: 25,
    childGrantRatePercent: 100,
    childGrantContributionLimit: 1800,
    childGrantMaxPerChild: 300,
    childGrantMaxAge: 18,
    youthBonusAmount: 200,
    youthBonusMaxAge: 25,
    minOwnContributionYearly: 120,
    maxContributionYearly: 6840,
    firstContributionYear: 2027,
    payoutStartAgeMin: 65,
    payoutStartAgeMax: 70,
    payoutEndAgeMin: 85,
    lumpSumMaxPercent: 30,
    standardCostCapPercent: 1,
    guaranteeLevelLowPercent: 80,
    guaranteeLevelHighPercent: 100,
  },
  incomeTax: {
    basicAllowance: 12348,
    zone2Limit: 17799,
    zone3Limit: 69878,
    zone4Limit: 277825,
    zone2CoefficientY: 914.51,
    zone2CoefficientBase: 1400,
    zone3CoefficientZ: 173.1,
    zone3CoefficientBase: 2397,
    zone3Constant: 1034.87,
    zone4RatePercent: 42,
    zone4Constant: 11135.63,
    zone5RatePercent: 45,
    zone5Constant: 19470.38,
    pensionIncomeLumpSumDeductionYearly: 102,
    specialExpensesLumpSumYearly: 36,
  },
  unverified: ['depot.childGrantMaxAge', 'depot.youthBonusMaxAge'],
};

export const PROFILE: Profile = {
  birthYear: 1985,
  targetRetirementAge: 67,
  lifeExpectancyAge: 90,
  childrenBirthYears: [],
};

export const ASSUMPTIONS: GlobalAssumptions = {
  inflationPercent: 2,
  returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
  pensionAdjustmentPercent: 2.5,
  payoutPhaseReturnPercent: 2,
  marginalTaxRateTodayPercent: 35,
  employeeSocialInsuranceRatePercent: 20,
  health: { mode: 'statutoryCompulsory', additionalRatePercent: 2.9, childless: false },
};

export const CTX: ProjectionContext = {
  profile: PROFILE,
  assumptions: ASSUMPTIONS,
  legal: LEGAL,
  currentYear: 2026,
};

export const STATUTORY: StatutoryInput = {
  projectedMonthlyPensionToday: 1800,
  statementYear: 2026,
  retirementAge: 67,
};

/** Rule assumptions as in config/other-income-de.json: all `unverified` (a test checks they stay in sync). */
export const OTHER_INCOME_RULE_KEYS = [
  'basisPensionTaxShare',
  'privateAnnuityEarningsShare',
  'riesterFullyTaxable',
  'sharedBenefitThreshold',
  'survivorIncomeCredited',
] as const;

/** `LEGAL` plus the other-income rules, as the app resolves them with `config/other-income-de.json`. */
export const LEGAL_OI: LegalParameters = {
  ...LEGAL,
  otherIncome: {
    basisPensionTaxShare: 1,
    privateAnnuityEarningsShare: 1,
    riesterFullyTaxable: 1,
    sharedBenefitThreshold: 1,
    survivorIncomeCredited: 1,
  },
  unverified: [...LEGAL.unverified, ...OTHER_INCOME_RULE_KEYS.map((k) => `otherIncome.${k}`)],
};

/** Context of the concept examples (`15` §5.4): today 2026, born 1976, retirement at 67 (year 2043). */
export const OI_CTX: ProjectionContext = {
  profile: {
    birthYear: 1976,
    targetRetirementAge: 67,
    lifeExpectancyAge: 90,
    childrenBirthYears: [],
  },
  assumptions: ASSUMPTIONS,
  legal: LEGAL_OI,
  currentYear: 2026,
};

/** A valid entry (rent, 600 EUR in today's purchasing power, like inflation, from retirement, lifelong). */
export function oiEntry(over: Partial<OtherIncomeEntry> = {}): OtherIncomeEntry {
  return {
    id: 'e1',
    name: 'Rent',
    kind: 'rent',
    enabled: true,
    amountMonthly: 600,
    amountBasis: 'today',
    adjustment: { mode: 'inflation' },
    start: { mode: 'retirement' },
    end: { mode: 'lifelong' },
    taxMode: 'full',
    contributions: 'none',
    survivorPercent: 0,
    ...over,
  };
}
