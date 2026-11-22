import type { SolveResult } from './goalTypes';

export const SOLVER_MAX_MONTHLY = 1_000_000;

const REACH_EPSILON = 1e-9;

/**
 * Finds the smallest whole-cent monthly amount R such that `forward(R) >= target`.
 *
 * `forward` must be non-decreasing in R. The search bisects over whole cents, so the result
 * reaches the target and the amount one cent lower does not. `unreachable` means even
 * SOLVER_MAX_MONTHLY per month is not enough.
 */
export function solveRequiredContribution(
  forward: (monthly: number) => number,
  target: number,
): SolveResult {
  const reaches = (cents: number) => forward(cents / 100) >= target - REACH_EPSILON;

  if (reaches(0)) return { status: 'already_reached', monthly: 0 };

  const maxCents = SOLVER_MAX_MONTHLY * 100;
  let hi = 100;
  while (!reaches(hi)) {
    if (hi >= maxCents) return { status: 'unreachable', monthly: 0 };
    hi = Math.min(hi * 2, maxCents);
  }
  let lo = 0; // known not to reach
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (reaches(mid)) hi = mid;
    else lo = mid;
  }
  return { status: 'ok', monthly: hi / 100 };
}
