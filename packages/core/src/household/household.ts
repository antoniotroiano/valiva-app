import { validateAssumptions, validateProfile } from '../shared/profile';
import type { GlobalAssumptions, HealthInsurance, Profile } from '../shared/profile';
import type { ChurchTaxChoice, ReturnScenarios, ValidationIssue } from '../shared/types';

/** Assumptions shared by the whole household. */
export type HouseholdAssumptions = {
  inflationPercent: number;
  returnScenarios: ReturnScenarios;
  pensionAdjustmentPercent: number;
  payoutPhaseReturnPercent: number;
};

/** Assumptions that differ per person. */
export type PersonalAssumptions = {
  marginalTaxRateTodayPercent: number;
  employeeSocialInsuranceRatePercent: number;
  health: HealthInsurance;
  churchTax?: ChurchTaxChoice;
};

export type Person = {
  id: string;
  name: string;
  birthYear: number;
  targetRetirementAge: number;
  lifeExpectancyAge: number;
  childrenBirthYears: number[];
  personalAssumptions: PersonalAssumptions;
  savingsBudgetMonthly?: number;
};

/** Smallest and largest share of the wish that still counts after the first death. */
export const SURVIVOR_WISH_PERCENT_LIMITS = { min: 10, max: 100 } as const;

export type Household = {
  id: string;
  name?: string;
  /** Shared net income wish per month in today's purchasing power. */
  desiredMonthlyIncomeToday?: number;
  /**
   * Survivor's pension of the statutory pension for a household of exactly two (married) persons: `new` for
   * marriages from 2002 on (55 %), `old` for older marriages (60 %). Absent: not modelled (`11` §4.1).
   */
  survivorPension?: 'new' | 'old';
  /** Share of the wish that counts after the first death, in percent. Absent: 100. Two-person households only. */
  survivorWishPercent?: number;
  assumptions: HouseholdAssumptions;
  persons: Person[];
};

/** What the per-person projectors and `overview` work with: the household values merged with the person's own. */
export type PersonContext = { profile: Profile; assumptions: GlobalAssumptions };

export function personContext(household: Household, person: Person): PersonContext {
  return {
    profile: {
      birthYear: person.birthYear,
      targetRetirementAge: person.targetRetirementAge,
      lifeExpectancyAge: person.lifeExpectancyAge,
      childrenBirthYears: person.childrenBirthYears,
      desiredMonthlyIncomeToday: household.desiredMonthlyIncomeToday,
    },
    assumptions: { ...household.assumptions, ...person.personalAssumptions },
  };
}

/** Splits global assumptions (Phase 3a shape) into the household and the personal part. */
export function splitAssumptions(a: GlobalAssumptions): {
  household: HouseholdAssumptions;
  personal: PersonalAssumptions;
} {
  return {
    household: {
      inflationPercent: a.inflationPercent,
      returnScenarios: a.returnScenarios,
      pensionAdjustmentPercent: a.pensionAdjustmentPercent,
      payoutPhaseReturnPercent: a.payoutPhaseReturnPercent,
    },
    personal: {
      marginalTaxRateTodayPercent: a.marginalTaxRateTodayPercent,
      employeeSocialInsuranceRatePercent: a.employeeSocialInsuranceRatePercent,
      health: a.health,
      ...(a.churchTax !== undefined && { churchTax: a.churchTax }),
    },
  };
}

/**
 * Validates the household. Issues of a person carry the field prefix `persons.<id>.`; household issues
 * (`desiredMonthlyIncomeToday` and the shared assumptions) have no prefix. Shared assumptions are checked
 * once, against the first person's context; personal ones for every person.
 */
export function validateHousehold(household: Household, currentYear: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (household.persons.length === 0) {
    issues.push({ field: 'persons', code: 'required' });
    return issues;
  }
  const wish = household.survivorWishPercent;
  if (
    wish !== undefined &&
    !(
      Number.isFinite(wish) &&
      wish >= SURVIVOR_WISH_PERCENT_LIMITS.min &&
      wish <= SURVIVOR_WISH_PERCENT_LIMITS.max
    )
  ) {
    issues.push(
      Number.isFinite(wish)
        ? { field: 'survivorWishPercent', code: 'out_of_range', ...SURVIVOR_WISH_PERCENT_LIMITS }
        : { field: 'survivorWishPercent', code: 'not_finite' },
    );
  }
  const rule = household.survivorPension;
  if (rule !== undefined && rule !== 'new' && rule !== 'old') {
    issues.push({ field: 'survivorPension', code: 'required' });
  }
  const shared = new Set<string>();
  const sharedFields = [
    'inflationPercent',
    'returnScenarios',
    'pensionAdjustmentPercent',
    'payoutPhaseReturnPercent',
  ];
  for (const person of household.persons) {
    const ctx = personContext(household, person);
    const found = [
      ...validateProfile(ctx.profile, currentYear),
      ...validateAssumptions(ctx.assumptions),
    ];
    for (const issue of found) {
      const isShared =
        issue.field === 'desiredMonthlyIncomeToday' ||
        sharedFields.some((f) => issue.field === f || issue.field.startsWith(`${f}.`));
      if (isShared) {
        const key = `${issue.field}|${issue.code}`;
        if (!shared.has(key)) {
          shared.add(key);
          issues.push(issue);
        }
      } else {
        issues.push({ ...issue, field: `persons.${person.id}.${issue.field}` });
      }
    }
    const budget = person.savingsBudgetMonthly;
    if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
      issues.push({
        field: `persons.${person.id}.savingsBudgetMonthly`,
        code: Number.isFinite(budget) ? 'negative' : 'not_finite',
      });
    }
  }
  return issues;
}
