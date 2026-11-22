import { IssueCollector as Collector } from './issues';
import type { ChurchTaxChoice, ReturnScenarios, ValidationIssue } from './types';

export type HealthInsurance = {
  /** `statutoryCompulsory` = pension insurance members in the statutory scheme (KVdR). */
  mode: 'statutoryCompulsory' | 'other';
  /** Total rate on the gross pension, used when `mode` is `other`. */
  otherRatePercent?: number;
  additionalRatePercent: number;
  /** Childless people pay a higher long-term care rate. */
  childless: boolean;
};

/** Person data for the pension blocks. Separate from the Phase 1 `Person` until Phase 4b merges them. */
export type Profile = {
  birthYear: number;
  targetRetirementAge: number;
  lifeExpectancyAge: number;
  childrenBirthYears: number[];
  /** Wanted net income per month in today's purchasing power; absent = the pension gap cannot be computed. */
  desiredMonthlyIncomeToday?: number;
};

export type GlobalAssumptions = {
  inflationPercent: number;
  returnScenarios: ReturnScenarios;
  pensionAdjustmentPercent: number;
  payoutPhaseReturnPercent: number;
  marginalTaxRateTodayPercent: number;
  employeeSocialInsuranceRatePercent: number;
  health: HealthInsurance;
  /** Church tax on capital gains (ETF, savings goals). Absent: none. */
  churchTax?: ChurchTaxChoice;
};

export const PROFILE_LIMITS = {
  birthYear: { min: 1900 },
  retirementAge: { min: 55, max: 75 },
  lifeExpectancyMax: 120,
  percentWide: { min: -50, max: 100 },
  percentRate: { min: 0, max: 100 },
} as const;

/** Defaults for a new profile (assumptions, not legal values). The additional health rate comes from config. */
export function defaultAssumptions(additionalHealthRatePercent: number): GlobalAssumptions {
  return {
    inflationPercent: 2,
    returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
    pensionAdjustmentPercent: 2.5,
    payoutPhaseReturnPercent: 2,
    marginalTaxRateTodayPercent: 35,
    employeeSocialInsuranceRatePercent: 20,
    health: {
      mode: 'statutoryCompulsory',
      additionalRatePercent: additionalHealthRatePercent,
      childless: false,
    },
  };
}

/** Validates the profile. `currentYear` is passed in so the function stays deterministic. */
export function validateProfile(profile: Profile, currentYear: number): ValidationIssue[] {
  const c = new Collector();
  const L = PROFILE_LIMITS;
  c.integer('birthYear', profile.birthYear, { min: L.birthYear.min, max: currentYear });
  c.integer('targetRetirementAge', profile.targetRetirementAge, L.retirementAge);
  if (Number.isFinite(profile.targetRetirementAge)) {
    c.integer('lifeExpectancyAge', profile.lifeExpectancyAge, {
      min: profile.targetRetirementAge + 1,
      max: L.lifeExpectancyMax,
    });
  } else {
    c.finite('lifeExpectancyAge', profile.lifeExpectancyAge);
  }
  profile.childrenBirthYears.forEach((y, i) =>
    c.integer(`childrenBirthYears.${i}`, y, { min: L.birthYear.min, max: currentYear }),
  );
  if (profile.desiredMonthlyIncomeToday !== undefined) {
    if (c.finite('desiredMonthlyIncomeToday', profile.desiredMonthlyIncomeToday)) {
      if (profile.desiredMonthlyIncomeToday < 0) {
        c.issues.push({ field: 'desiredMonthlyIncomeToday', code: 'negative', min: 0 });
      }
    }
  }
  return c.issues;
}

export function validateAssumptions(a: GlobalAssumptions): ValidationIssue[] {
  const c = new Collector();
  const wide = PROFILE_LIMITS.percentWide;
  const rate = PROFILE_LIMITS.percentRate;
  c.number('inflationPercent', a.inflationPercent, wide);
  c.number('pensionAdjustmentPercent', a.pensionAdjustmentPercent, wide);
  c.number('payoutPhaseReturnPercent', a.payoutPhaseReturnPercent, wide);
  c.number('marginalTaxRateTodayPercent', a.marginalTaxRateTodayPercent, rate);
  c.number('employeeSocialInsuranceRatePercent', a.employeeSocialInsuranceRatePercent, rate);
  const s = a.returnScenarios;
  c.number('returnScenarios.pessimistic', s.pessimistic, wide);
  c.number('returnScenarios.neutral', s.neutral, wide);
  c.number('returnScenarios.optimistic', s.optimistic, wide);
  if (
    [s.pessimistic, s.neutral, s.optimistic].every(Number.isFinite) &&
    !(s.pessimistic <= s.neutral && s.neutral <= s.optimistic)
  ) {
    c.issues.push({ field: 'returnScenarios', code: 'scenario_order' });
  }
  c.number('health.additionalRatePercent', a.health.additionalRatePercent, rate);
  if (a.churchTax !== undefined && a.churchTax !== 'low' && a.churchTax !== 'high') {
    c.issues.push({ field: 'churchTax', code: 'not_finite' });
  }
  if (a.health.mode === 'other') {
    c.number('health.otherRatePercent', a.health.otherRatePercent ?? Number.NaN, rate);
  }
  return c.issues;
}
