import {
  OTHER_INCOME_LIMITS,
  otherIncomeProductId,
  otherIncomeStartAge,
  projectOtherIncome,
  validateOtherIncomeState,
} from '../pension/otherIncome';
import type { OtherIncomeEntry } from '../pension/otherIncome';
import type { ProjectionContext, ProjectionResult } from '../pension/projection';
import { pensionStartAgeOf } from '../shared/profile';
import { SCENARIO_NAMES } from '../shared/types';
import type { ScenarioName, ValidationIssue } from '../shared/types';
import type { OverviewProductInput } from './overview';

/**
 * Overview products of one person's entries (`15` §4.1): one product `otherIncome:<id>` per entry, in list order.
 * A product that fails validation is returned as `invalid` with its reasons (also an entry beyond the tenth
 * and the later one of two entries with the same id), the others calculate on. A disabled entry is still
 * projected so its numbers stay available. Entries with `likeOccupational` join the shared threshold group
 * of the overview (they carry the social values from `ctx.legal`). Pure; no state is read.
 */
export function buildOtherIncomeProducts(
  entries: OtherIncomeEntry[],
  ctx: ProjectionContext,
): OverviewProductInput[] {
  const listIssues = validateOtherIncomeState(entries, ctx);
  return entries.map((entry, i) => {
    const prefix = `entries.${i}.`;
    const issues: ValidationIssue[] = listIssues
      .filter((x) => x.field.startsWith(prefix))
      .map((x) => ({ ...x, field: x.field.slice(prefix.length) }));
    if (i >= OTHER_INCOME_LIMITS.maxEntries) {
      issues.push({
        field: 'entries',
        code: 'too_many_entries',
        max: OTHER_INCOME_LIMITS.maxEntries,
      });
    }
    const startAge = otherIncomeStartAge(entry, pensionStartAgeOf(ctx.profile));
    const base = {
      productId: otherIncomeProductId(String(entry.id)),
      enabled: entry.enabled === true,
      payoutStartAge: startAge,
      ...(entry.end?.mode === 'age' ? { payoutEndAge: entry.end.age } : {}),
    } satisfies Partial<OverviewProductInput>;
    if (issues.length > 0) return { ...base, outcome: { ok: false as const, issues } };

    const social = ctx.legal.social;
    const sharedThreshold =
      entry.contributions === 'likeOccupational'
        ? {
            healthGeneralRatePercent: social.healthGeneralRatePercent,
            careRatePercent: social.careRatePercent,
            careRateChildlessPercent: social.careRateChildlessPercent,
            occupationalHealthAllowanceMonthly: social.occupationalHealthAllowanceMonthly,
            occupationalCareThresholdMonthly: social.occupationalCareThresholdMonthly,
            ...(ctx.legal.retired
              ? {
                  careChildlessExemptBeforeBirthYear:
                    ctx.legal.retired.careChildlessExemptBeforeBirthYear,
                }
              : {}),
          }
        : undefined;
    const results = {} as Record<ScenarioName, ProjectionResult>;
    for (const scenario of SCENARIO_NAMES) {
      const out = projectOtherIncome(entry, ctx, scenario);
      if (!out.ok) return { ...base, outcome: { ok: false as const, issues: out.issues } };
      results[scenario] = out.result;
    }
    return {
      ...base,
      ...(sharedThreshold ? { sharedThreshold } : {}),
      ...(entry.survivorPercent > 0 ? { survivorPercent: entry.survivorPercent } : {}),
      outcome: { ok: true as const, results },
    };
  });
}
