import type { LegalParameters } from '../tax/legalConfig';

export type AllowanceBreakdown = {
  /** Own contributions of the calendar year, in euros. */
  contributions: number;
  basic: number;
  child: number;
  bonus: number;
  total: number;
  /** True if the contribution is below the minimum own contribution (no basic or child grant). */
  belowMinimum: boolean;
  /** Basic grant that stays unclaimed because the contribution is below the full-grant limit. */
  basicGrantMissed: number;
};

export type AllowanceContext = {
  /** Calendar year of the contributions. */
  year: number;
  birthYear: number;
  childrenBirthYears: readonly number[];
  /** Bonus under 25 is paid once, in the first contribution year. */
  isFirstContributionYear: boolean;
};

/**
 * Grants for one calendar year (`09` §5.3). Pure function of the yearly own contributions `A`:
 * - Below the minimum (120 EUR) there is neither basic nor child grant.
 * - Basic = 50 % of min(A, 360) + 25 % of the part from 360 up to 1,800.
 * - Child = min(300, 100 % of min(A, 1,800)) per child below the age limit (`unverified`: 18).
 * - Bonus 200 EUR in the first contribution year if the age limit (25) is not reached at the start of that year.
 * The minimum applies to the whole grant: below it everything is 0.
 */
export function allowanceForYear(
  yearlyContribution: number,
  ctx: AllowanceContext,
  legal: LegalParameters,
): AllowanceBreakdown {
  const d = legal.depot;
  const A = Math.max(0, yearlyContribution);
  const fullBasic =
    (d.basicGrantTier1Limit * d.basicGrantTier1RatePercent) / 100 +
    ((d.basicGrantTier2Limit - d.basicGrantTier1Limit) * d.basicGrantTier2RatePercent) / 100;
  if (A < d.minOwnContributionYearly) {
    return {
      contributions: A,
      basic: 0,
      child: 0,
      bonus: 0,
      total: 0,
      belowMinimum: true,
      basicGrantMissed: fullBasic,
    };
  }
  const basic =
    (Math.min(A, d.basicGrantTier1Limit) * d.basicGrantTier1RatePercent) / 100 +
    (Math.max(0, Math.min(A, d.basicGrantTier2Limit) - d.basicGrantTier1Limit) *
      d.basicGrantTier2RatePercent) /
      100;
  const perChild = Math.min(
    d.childGrantMaxPerChild,
    (Math.min(A, d.childGrantContributionLimit) * d.childGrantRatePercent) / 100,
  );
  const eligibleChildren = ctx.childrenBirthYears.filter(
    (y) => ctx.year - y >= 0 && ctx.year - y < d.childGrantMaxAge,
  ).length;
  const child = perChild * eligibleChildren;
  const bonus =
    ctx.isFirstContributionYear && ctx.year - ctx.birthYear < d.youthBonusMaxAge
      ? d.youthBonusAmount
      : 0;
  return {
    contributions: A,
    basic,
    child,
    bonus,
    total: basic + child + bonus,
    belowMinimum: false,
    basicGrantMissed: fullBasic - basic,
  };
}
