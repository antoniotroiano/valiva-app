import type { IncomeTaxParameters } from '../tax/incomeTax';
import { validateJointAssessmentParameters } from '../tax/jointTax';
import type { JointAssessmentInput } from '../tax/jointTax';
import { jointContextFor } from './jointAssessment';
import { personContext, validateHousehold } from '../household/household';
import type { Person } from '../household/household';
import type { GlobalAssumptions } from '../shared/profile';
import type { ProjectionResult } from '../pension/projection';
import type { PensionKey } from '../tax/legalConfig';
import { isRetired, payoutStartYearOf, validateRetirementTiming } from '../shared/profile';
import type { Household } from '../household/household';
import { activityFactor, overview } from './overview';
import type { OverviewProductId, OverviewProductInput, OverviewResult } from './overview';
import { SCENARIO_NAMES } from '../shared/types';
import type { ScenarioName, ValidationIssue } from '../shared/types';

export type HouseholdPersonEntry = {
  personId: string;
  name: string;
  /** The person's own overview (`10` §5.2) with the household's wish; its gap is not the household gap. */
  overview: OverviewResult;
};

export type HouseholdPathPoint = {
  year: number;
  /** Net monthly income per person, in today's purchasing power. */
  byPerson: Record<string, number>;
  byPersonProduct: Record<string, Partial<Record<OverviewProductId, number>>>;
  total: number;
  /** Wish of this year (reduced after the first death by `survivorWishPercent`); only with a wish set. */
  desired?: number;
  /** Survivor's pension per person in this year; already part of `byPerson` and `total`. */
  survivorPension?: Record<string, number>;
  /**
   * Net amount per person that goes on from the deceased partner's entries of the generic block (`15` §4.2);
   * already part of `byPerson` and `total` (and of `byPersonProduct` under `otherIncome:survivor:...`).
   */
  survivorOtherIncome?: Record<string, number>;
  /**
   * True for the years before the last person starts to draw the pension, in a household in which at least one
   * person already draws it (`16` §4.2): the salary of the working person is not modelled, so these years carry
   * no gap and do not count in `totalGapReal` (the wish may still be shown).
   */
  transition?: boolean;
  /** Only while at least one person lives and a wish is set. */
  gap?: number;
};

/** What a person who already draws the pension receives today (`16` §4.2), independent of the snapshot year. */
export type HouseholdRetiredToday = {
  personId: string;
  name: string;
  /** Net monthly income today, in today's purchasing power. */
  netMonthlyReal: number;
};

/** Legal values of the survivor's pension (`pension-de.json`). */
export type SurvivorParameters = Pick<
  Record<PensionKey, number>,
  | 'pensionValue'
  | 'survivorPensionRateNewPercent'
  | 'survivorPensionRateOldPercent'
  | 'survivorIncomeFreeFactor'
  | 'survivorIncomeCreditedPercent'
>;

export type HouseholdSurvivor = {
  deceasedId: string;
  survivorId: string;
  /** Last calendar year of the person who dies first; the pension starts in the following year. */
  deathYear: number;
};

export type HouseholdSnapshot = {
  /** Year in which the last person starts retirement. */
  year: number;
  netMonthlyPensionReal: number;
  byPerson: Record<string, number>;
  byPersonProduct: Record<string, Partial<Record<OverviewProductId, number>>>;
  gap?: number;
  surplus?: number;
  /** One-off payouts (retirement depot) per person, kept apart from the monthly pension. */
  lumpSumNetReal: Record<string, number>;
};

export type HouseholdScenario = {
  snapshot: HouseholdSnapshot;
  path: HouseholdPathPoint[];
  /** Only if at least one person is in the retiree mode: their net income today ("already retired" tile). */
  retiredToday?: HouseholdRetiredToday[];
  /** Sum of `12 x gap` over the years from the first year up to, excluding, the last year. */
  totalGapReal?: number;
};

export type HouseholdResult = {
  householdId: string;
  desiredMonthlyIncomeToday?: number;
  persons: HouseholdPersonEntry[];
  firstYear: number;
  lastYear: number;
  snapshotYear: number;
  /** Set when the survivor's pension is modelled and the two persons die in different years. */
  survivor?: HouseholdSurvivor;
  scenarios: Record<ScenarioName, HouseholdScenario>;
};

export type HouseholdOutcome =
  { ok: true; result: HouseholdResult } | { ok: false; issues: ValidationIssue[] };

/** Product id prefix of the continued part of an entry of the deceased partner: `otherIncome:survivor:<person>:<entry>`. */
export const SURVIVOR_ENTRY_PREFIX = 'otherIncome:survivor:';

/**
 * The deceased partner's entries with `survivorPercent > 0` as products of the surviving person (`15` §4.2): from
 * the year after the death on, the share of the entry's gross in the year of the death, going on with the
 * entry's own factor, until the entry ends (lifelong: up to the survivor's life expectancy). It joins the
 * survivor's tax on the sum as its own income with the entry's tax mode; no contributions are due on it
 * (simplification). An entry that has not started by the death or ended before the following year gives nothing.
 */
function survivorEntryProducts(
  deceased: Person,
  survivorPerson: Person,
  products: OverviewProductInput[],
  assumptions: GlobalAssumptions,
  deathYear: number,
  currentYear: number,
): OverviewProductInput[] {
  const out: OverviewProductInput[] = [];
  const inflation = 1 + assumptions.inflationPercent / 100;
  const firstYear = deathYear + 1;
  const startAge = firstYear - survivorPerson.birthYear;
  for (const p of products) {
    const share = p.survivorPercent;
    if (share === undefined || !(share > 0) || !p.enabled || !p.outcome.ok) continue;
    if (!p.productId.startsWith('otherIncome:')) continue;
    const endYear = p.payoutEndAge === undefined ? undefined : deceased.birthYear + p.payoutEndAge;
    if (endYear !== undefined && endYear <= firstYear) continue;
    const results = p.outcome.results;
    const next = {} as Record<ScenarioName, ProjectionResult>;
    let paysSomething = false;
    for (const scenario of SCENARIO_NAMES) {
      const r = results[scenario];
      // Gross at the death (the entry must pay then), carried one year on with the entry's own factor.
      const atDeath = activityFactor(p, r, deceased.lifeExpectancyAge, assumptions);
      const first =
        atDeath > 0 ? activityFactor(p, r, deceased.lifeExpectancyAge + 1, assumptions) : 0;
      const real = (share / 100) * r.monthlyPensionReal * first;
      if (real > 0) paysSomething = true;
      const taxFreeAtStart =
        r.fixedTaxFreeMonthlyReal === undefined
          ? undefined
          : (share / 100) *
            r.fixedTaxFreeMonthlyReal *
            Math.pow(inflation, -(deceased.lifeExpectancyAge + 1 - p.payoutStartAge));
      next[scenario] = {
        productId: `${SURVIVOR_ENTRY_PREFIX}${deceased.id}:${p.productId.slice('otherIncome:'.length)}`,
        scenario,
        series: [],
        monthlyPensionNominal: real * Math.pow(inflation, firstYear - currentYear),
        monthlyPensionReal: real,
        taxAndContributions: 0,
        netMonthlyPensionReal: 0,
        taxableMonthlyReal:
          taxFreeAtStart !== undefined
            ? Math.max(0, real - taxFreeAtStart)
            : r.monthlyPensionReal > 0
              ? (r.taxableMonthlyReal / r.monthlyPensionReal) * real
              : 0,
        contributionsMonthlyReal: 0,
        fixedTaxMonthlyReal: 0,
        ...(r.indexationPercent === undefined ? {} : { indexationPercent: r.indexationPercent }),
        ...(taxFreeAtStart === undefined ? {} : { fixedTaxFreeMonthlyReal: taxFreeAtStart }),
        warnings: r.warnings,
      };
    }
    if (!paysSomething) continue;
    out.push({
      productId: next.neutral.productId as OverviewProductId,
      enabled: true,
      payoutStartAge: startAge,
      ...(endYear === undefined ? {} : { payoutEndAge: endYear - survivorPerson.birthYear }),
      outcome: { ok: true, results: next },
    });
  }
  return out;
}

/**
 * Overall view of a household (`11` §4.1): runs `overview` per person and sums the paths on a calendar-year
 * axis. A person contributes from the year of the retirement start up to the year of the life expectancy;
 * the wish counts while at least one person lives. For a household of exactly two persons the survivor's
 * pension (`11` §4.1a) and a reduced wish after the first death can be switched on; without them the gap after
 * the first death is rather too large. Pure; invalid input is returned as data.
 */
export function householdOverview(
  household: Household,
  productsByPerson: Record<string, OverviewProductInput[]>,
  currentYear: number,
  incomeTaxParameters: IncomeTaxParameters,
  survivorParameters?: SurvivorParameters,
  jointParameters?: JointAssessmentInput,
): HouseholdOutcome {
  const issues = validateHousehold(household, currentYear);
  if (jointParameters !== undefined && household.jointAssessment === true) {
    issues.push(...validateJointAssessmentParameters(jointParameters));
  }
  // A person who has to retire in the past must never yield a household result that looks valid.
  for (const person of household.persons) {
    const ctx = personContext(household, person);
    for (const i of validateRetirementTiming(ctx.profile, currentYear)) {
      issues.push({ ...i, field: `persons.${person.id}.${i.field}` });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const desired = household.desiredMonthlyIncomeToday;
  const endYear = (p: Household['persons'][number]) => p.birthYear + p.lifeExpectancyAge;
  const [first, second] = household.persons;
  const two = household.persons.length === 2 && first !== undefined && second !== undefined;

  let survivor: HouseholdSurvivor | undefined;
  let deceasedPerson: Person | undefined;
  let survivorPerson: Person | undefined;
  if (two && household.survivorPension !== undefined && survivorParameters !== undefined) {
    const [deceased, left] = endYear(first) <= endYear(second) ? [first, second] : [second, first];
    if (endYear(deceased) < endYear(left)) {
      survivor = { deceasedId: deceased.id, survivorId: left.id, deathYear: endYear(deceased) };
      deceasedPerson = deceased;
      survivorPerson = left;
    }
  }

  // The products each person's overview takes (with the continued entries of a deceased partner).
  const finalProducts: Record<string, OverviewProductInput[]> = {};
  for (const person of household.persons) {
    let products = productsByPerson[person.id] ?? [];
    if (
      survivor !== undefined &&
      deceasedPerson &&
      survivorPerson &&
      person.id === survivor.survivorId
    ) {
      // The deceased partner's entries that go on (`15` §4.2) count as the survivor's own income from then on.
      const own = personContext(household, deceasedPerson).assumptions;
      products = [
        ...products,
        ...survivorEntryProducts(
          deceasedPerson,
          survivorPerson,
          productsByPerson[deceasedPerson.id] ?? [],
          own,
          survivor.deathYear,
          currentYear,
        ),
      ];
    }
    finalProducts[person.id] = products;
  }

  const persons: HouseholdPersonEntry[] = [];
  for (const person of household.persons) {
    const ctx = personContext(household, person);
    const products = finalProducts[person.id] ?? [];
    // Joint assessment (AP-16): without the answer yes, no parameters or one person, `joint` stays undefined.
    const joint =
      jointParameters === undefined
        ? undefined
        : jointContextFor(household, person.id, finalProducts, jointParameters);
    const out = overview(
      products,
      ctx.profile,
      ctx.assumptions,
      currentYear,
      incomeTaxParameters,
      person.id,
      joint,
    );
    if (!out.ok) {
      return {
        ok: false,
        issues: out.issues.map((i) => ({ ...i, field: `persons.${person.id}.${i.field}` })),
      };
    }
    persons.push({ personId: person.id, name: person.name, overview: out.result });
  }

  // A person in the retiree mode starts to count today (`16` §4.2).
  const startYear = (p: Household['persons'][number]) => payoutStartYearOf(p, currentYear);
  const anyRetired = household.persons.some(isRetired);
  const firstYear = Math.min(...household.persons.map(startYear));
  const snapshotYear = Math.max(...household.persons.map(startYear));
  const lastYear = Math.max(...household.persons.map(endYear));

  const firstDeathYear = Math.min(...household.persons.map(endYear));
  const wishPercent = two ? household.survivorWishPercent : undefined;
  const desiredIn = (year: number): number | undefined =>
    desired === undefined
      ? undefined
      : wishPercent !== undefined && year > firstDeathYear
        ? (desired * wishPercent) / 100
        : desired;

  const scenarios = {} as Record<ScenarioName, HouseholdScenario>;
  for (const scenario of SCENARIO_NAMES) {
    /** The persons' own income in `year`, without a survivor's pension. */
    const ownPoint = (year: number): HouseholdPathPoint => {
      const point: HouseholdPathPoint = { year, byPerson: {}, byPersonProduct: {}, total: 0 };
      for (const person of household.persons) {
        const entry = persons.find((e) => e.personId === person.id)!;
        const age = year - person.birthYear;
        const p = entry.overview.scenarios[scenario].path.find((x) => x.age === age);
        const byProduct = p?.byProduct ?? {};
        const value = p?.total ?? 0;
        point.byPerson[person.id] = value;
        point.byPersonProduct[person.id] = byProduct;
        point.total += value;
      }
      return point;
    };

    /** Survivor's pension in `year` (`11` §4.1a): 55 % or 60 % of the deceased's net statutory pension, minus 40 % of the own income above the free amount. */
    const survivorPensionIn = (year: number, own: HouseholdPathPoint): number => {
      if (survivor === undefined || survivorParameters === undefined) return 0;
      const survivorEnd = endYear(household.persons.find((x) => x.id === survivor.survivorId)!);
      if (year <= survivor.deathYear || year > survivorEnd) return 0;
      const base =
        ownPoint(survivor.deathYear).byPersonProduct[survivor.deceasedId]?.statutory ?? 0;
      const ratePercent =
        household.survivorPension === 'old'
          ? survivorParameters.survivorPensionRateOldPercent
          : survivorParameters.survivorPensionRateNewPercent;
      const mine = own.byPersonProduct[survivor.survivorId] ?? {};
      // Capital withdrawals from the ETF are not income in the sense of §18a SGB IV; only the other products count.
      // Own entries of the generic block and the continued share of the partner's entries count too (`15` §4.2, §9).
      const entries = Object.entries(mine)
        .filter(([id]) => id.startsWith('otherIncome:'))
        .reduce((sum, [, net]) => sum + (net ?? 0), 0);
      const income =
        (mine.statutory ?? 0) + (mine.occupational ?? 0) + (mine.retirementDepot ?? 0) + entries;
      const free = survivorParameters.survivorIncomeFreeFactor * survivorParameters.pensionValue;
      const credited =
        (survivorParameters.survivorIncomeCreditedPercent / 100) * Math.max(0, income - free);
      return Math.max(0, (ratePercent / 100) * base - credited);
    };

    const pointOf = (year: number): HouseholdPathPoint => {
      const point = ownPoint(year);
      const w = survivorPensionIn(year, point);
      if (survivor !== undefined && w > 0) {
        point.survivorPension = { [survivor.survivorId]: w };
        point.byPerson[survivor.survivorId] = (point.byPerson[survivor.survivorId] ?? 0) + w;
        point.total += w;
      }
      if (survivor !== undefined) {
        const carried = Object.entries(point.byPersonProduct[survivor.survivorId] ?? {})
          .filter(([id]) => id.startsWith(SURVIVOR_ENTRY_PREFIX))
          .reduce((sum, [, net]) => sum + (net ?? 0), 0);
        if (carried > 0) point.survivorOtherIncome = { [survivor.survivorId]: carried };
      }
      const wish = desiredIn(year);
      if (wish !== undefined) point.desired = wish;
      if (anyRetired && year < snapshotYear) {
        point.transition = true;
      } else if (wish !== undefined && year <= lastYear) {
        point.gap = Math.max(0, wish - point.total);
      }
      return point;
    };

    const path: HouseholdPathPoint[] = [];
    let totalGap = 0;
    for (let year = firstYear; year <= lastYear; year++) {
      const point = pointOf(year);
      if (point.gap !== undefined && year < lastYear) totalGap += 12 * point.gap;
      path.push(point);
    }

    const at = path.find((p) => p.year === snapshotYear)!;
    scenarios[scenario] = {
      snapshot: {
        year: snapshotYear,
        netMonthlyPensionReal: at.total,
        byPerson: at.byPerson,
        byPersonProduct: at.byPersonProduct,
        gap: at.desired === undefined ? undefined : Math.max(0, at.desired - at.total),
        surplus: at.desired === undefined ? undefined : Math.max(0, at.total - at.desired),
        lumpSumNetReal: Object.fromEntries(
          persons.map((e) => [e.personId, e.overview.scenarios[scenario].snapshot.lumpSumNetReal]),
        ),
      },
      path,
      totalGapReal: desired === undefined ? undefined : totalGap,
      ...(anyRetired
        ? {
            retiredToday: household.persons.filter(isRetired).map((p) => ({
              personId: p.id,
              name: p.name,
              netMonthlyReal: ownPoint(currentYear).byPerson[p.id] ?? 0,
            })),
          }
        : {}),
    };
  }

  return {
    ok: true,
    result: {
      householdId: household.id,
      desiredMonthlyIncomeToday: desired,
      persons,
      firstYear,
      lastYear,
      snapshotYear,
      survivor,
      scenarios,
    },
  };
}
