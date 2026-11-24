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
  /**
   * True: the person already draws the pension (retiree mode, `16`). Absent = false. Then `retirementStartYear`
   * is required and `targetRetirementAge` is kept but not used.
   */
  retired?: boolean;
  /** Year the pension started according to the pension notice; only used with `retired`. */
  retirementStartYear?: number;
};

/**
 * Months before the retirement start from which the app reminds a person in the planning mode to enter the
 * actual values once the pension notice is there (`16` §15 point 6, a planner assumption; the text is UI).
 */
export const RETIREMENT_NOTICE_LEAD_MONTHS = 12;

/** True if the person is in the retiree mode (strictly `true`). */
export function isRetired(profile: Pick<Profile, 'retired'>): boolean {
  return profile.retired === true;
}

/**
 * Year in which the person's income from the pension blocks starts counting: `currentYear` for a person who
 * already draws the pension (the calculation runs from today), else the planned start `birthYear + target age`.
 */
export function payoutStartYearOf(
  profile: Pick<Profile, 'retired' | 'birthYear' | 'targetRetirementAge'>,
  currentYear: number,
): number {
  return isRetired(profile) ? currentYear : profile.birthYear + profile.targetRetirementAge;
}

/** Age (at the end of the year) from which the person's pension blocks pay: today's age for a person in the retiree mode. */
export function payoutStartAgeOf(
  profile: Pick<Profile, 'retired' | 'birthYear' | 'targetRetirementAge'>,
  currentYear: number,
): number {
  return isRetired(profile) ? currentYear - profile.birthYear : profile.targetRetirementAge;
}

/**
 * Age at which the person's pension (the entries "with my retirement start") started or starts: the age at the
 * pension start for a person in the retiree mode, else the target retirement age.
 */
export function pensionStartAgeOf(
  profile: Pick<Profile, 'retired' | 'birthYear' | 'targetRetirementAge' | 'retirementStartYear'>,
): number {
  return isRetired(profile) && profile.retirementStartYear !== undefined
    ? profile.retirementStartYear - profile.birthYear
    : profile.targetRetirementAge;
}

/**
 * Year in which the pension itself started (for the splitting rule): the year of the notice for a person in the
 * retiree mode, else the planned start.
 */
export function pensionStartYearOf(
  profile: Pick<Profile, 'retired' | 'birthYear' | 'targetRetirementAge' | 'retirementStartYear'>,
): number {
  return isRetired(profile)
    ? (profile.retirementStartYear ?? profile.birthYear + profile.targetRetirementAge)
    : profile.birthYear + profile.targetRetirementAge;
}

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
  /** Age at the pension start of a person in the retiree mode (`16` §3.1: `birthYear + 50` to `+ 75`). */
  retirementStartAge: { min: 50, max: 75 },
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

/**
 * Age at the pension start of a person in the retiree mode, checked against `16` §3.6 (`required`, `not_integer`,
 * `out_of_range` for `birthYear + 50` to `+ 75`). Undefined if the person is not retired or the start year is
 * unusable; the calendar-dependent rule (not after `currentYear`) is in `validateRetirementTiming`.
 */
function retiredStartAge(profile: Profile, c: Collector): number | undefined {
  if (profile.retired !== true) return undefined;
  const year = profile.retirementStartYear;
  if (year === undefined || year === null) {
    c.issues.push({ field: 'retirementStartYear', code: 'required' });
    return undefined;
  }
  if (!Number.isFinite(profile.birthYear)) {
    c.finite('retirementStartYear', year);
    return undefined;
  }
  const L = PROFILE_LIMITS.retirementStartAge;
  c.integer('retirementStartYear', year, {
    min: profile.birthYear + L.min,
    max: profile.birthYear + L.max,
  });
  const ok =
    Number.isInteger(year) &&
    year >= profile.birthYear + L.min &&
    year <= profile.birthYear + L.max;
  return ok ? year - profile.birthYear : undefined;
}

/** Validates the profile. `currentYear` is passed in so the function stays deterministic. */
export function validateProfile(profile: Profile, currentYear: number): ValidationIssue[] {
  const c = new Collector();
  const L = PROFILE_LIMITS;
  c.integer('birthYear', profile.birthYear, { min: L.birthYear.min, max: currentYear });
  c.integer('targetRetirementAge', profile.targetRetirementAge, L.retirementAge);
  if (profile.retired !== undefined && typeof profile.retired !== 'boolean') {
    c.issues.push({ field: 'retired', code: 'required' });
  }
  const startAge = retiredStartAge(profile, c);
  if (startAge !== undefined) {
    c.integer('lifeExpectancyAge', profile.lifeExpectancyAge, {
      min: startAge + 1,
      max: L.lifeExpectancyMax,
    });
  } else if (Number.isFinite(profile.targetRetirementAge)) {
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

/**
 * Calendar-dependent rules of the profile. Kept apart from `validateProfile` on purpose: that one also guards
 * loading and importing saved data, and a rule that depends on the calendar must not discard a stored household
 * when the year changes. The calculation entry points (`overview`, `householdOverview`) and the profile form use
 * this one. A person in the planning mode: the retirement start (`birthYear + targetRetirementAge`) must not lie
 * before `currentYear` (`retirement_in_past`, `min` is the earliest valid age); a start in `currentYear` itself
 * is valid. A person in the retiree mode: the start year must not lie after `currentYear`
 * (`retired_start_in_future`, `max` is the latest valid year). For everyone the year of the life expectancy must
 * not lie before `currentYear` (`life_expectancy_in_past`); it is not reported on top of `retirement_in_past`,
 * because that one already names the profile as unusable. Returns no issue while the inputs are not finite
 * integers (`validateProfile` reports those).
 */
export function validateRetirementTiming(profile: Profile, currentYear: number): ValidationIssue[] {
  if (!Number.isInteger(profile.birthYear)) return [];
  const issues: ValidationIssue[] = [];
  if (isRetired(profile)) {
    const year = profile.retirementStartYear;
    if (Number.isInteger(year) && (year as number) > currentYear) {
      issues.push({
        field: 'retirementStartYear',
        code: 'retired_start_in_future',
        max: currentYear,
      });
    }
  } else if (
    Number.isInteger(profile.targetRetirementAge) &&
    profile.birthYear + profile.targetRetirementAge < currentYear
  ) {
    return [
      {
        field: 'targetRetirementAge',
        code: 'retirement_in_past',
        min: currentYear - profile.birthYear,
      },
    ];
  }
  if (Number.isInteger(profile.lifeExpectancyAge)) {
    if (profile.birthYear + profile.lifeExpectancyAge < currentYear) {
      issues.push({
        field: 'lifeExpectancyAge',
        code: 'life_expectancy_in_past',
        min: currentYear - profile.birthYear,
      });
    }
  }
  return issues;
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
