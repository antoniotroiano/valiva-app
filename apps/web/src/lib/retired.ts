import { PROFILE_LIMITS, RETIREMENT_NOTICE_LEAD_MONTHS, isRetired } from '@valiva/core';
import type { Profile } from '@valiva/core';

/**
 * Start year offered when a person is switched to the retiree mode: the planned start (`birthYear + target age`),
 * kept inside the allowed band (50 to 75 years old at the start) and not after the current year.
 */
export function defaultRetirementStartYear(profile: Profile, currentYear: number): number {
  const planned = profile.birthYear + profile.targetRetirementAge;
  const min = profile.birthYear + PROFILE_LIMITS.retirementStartAge.min;
  const max = Math.min(currentYear, profile.birthYear + PROFILE_LIMITS.retirementStartAge.max);
  const guess = Number.isFinite(planned) ? planned : currentYear;
  return Math.max(min, Math.min(max, guess));
}

/**
 * True for a person in the planning mode whose retirement starts within `RETIREMENT_NOTICE_LEAD_MONTHS` months
 * (or this year): then the pension notice is probably there and the actual values are the better input (`16` §2).
 * The start month is not known, so the start counts as January of the start year.
 */
export function noticeMayBeThere(
  profile: Profile,
  currentYear: number,
  currentMonth: number,
): boolean {
  if (isRetired(profile)) return false;
  const startYear = profile.birthYear + profile.targetRetirementAge;
  if (!Number.isInteger(startYear) || startYear < currentYear) return false;
  return startYear * 12 - (currentYear * 12 + currentMonth - 1) <= RETIREMENT_NOTICE_LEAD_MONTHS;
}
