import type { IncomeTaxParameters } from '../tax/incomeTax';
import { personContext, validateHousehold } from '../household/household';
import type { PensionKey } from '../tax/legalConfig';
import { validateRetirementTiming } from '../shared/profile';
import type { Household } from '../household/household';
import { overview } from './overview';
import type { OverviewProductInput, OverviewProductKind, OverviewResult } from './overview';
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
  byPersonProduct: Record<string, Partial<Record<OverviewProductKind, number>>>;
  total: number;
  /** Wish of this year (reduced after the first death by `survivorWishPercent`); only with a wish set. */
  desired?: number;
  /** Survivor's pension per person in this year; already part of `byPerson` and `total`. */
  survivorPension?: Record<string, number>;
  /** Only while at least one person lives and a wish is set. */
  gap?: number;
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
  byPersonProduct: Record<string, Partial<Record<OverviewProductKind, number>>>;
  gap?: number;
  surplus?: number;
  /** One-off payouts (retirement depot) per person, kept apart from the monthly pension. */
  lumpSumNetReal: Record<string, number>;
};

export type HouseholdScenario = {
  snapshot: HouseholdSnapshot;
  path: HouseholdPathPoint[];
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
): HouseholdOutcome {
  const issues = validateHousehold(household, currentYear);
  // A person who has to retire in the past must never yield a household result that looks valid.
  for (const person of household.persons) {
    const ctx = personContext(household, person);
    for (const i of validateRetirementTiming(ctx.profile, currentYear)) {
      issues.push({ ...i, field: `persons.${person.id}.${i.field}` });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const desired = household.desiredMonthlyIncomeToday;
  const persons: HouseholdPersonEntry[] = [];
  for (const person of household.persons) {
    const ctx = personContext(household, person);
    const out = overview(
      productsByPerson[person.id] ?? [],
      ctx.profile,
      ctx.assumptions,
      currentYear,
      incomeTaxParameters,
      person.id,
    );
    if (!out.ok) {
      return {
        ok: false,
        issues: out.issues.map((i) => ({ ...i, field: `persons.${person.id}.${i.field}` })),
      };
    }
    persons.push({ personId: person.id, name: person.name, overview: out.result });
  }

  const startYear = (p: Household['persons'][number]) => p.birthYear + p.targetRetirementAge;
  const endYear = (p: Household['persons'][number]) => p.birthYear + p.lifeExpectancyAge;
  const firstYear = Math.min(...household.persons.map(startYear));
  const snapshotYear = Math.max(...household.persons.map(startYear));
  const lastYear = Math.max(...household.persons.map(endYear));

  const [first, second] = household.persons;
  const two = household.persons.length === 2 && first !== undefined && second !== undefined;
  const firstDeathYear = Math.min(...household.persons.map(endYear));
  const wishPercent = two ? household.survivorWishPercent : undefined;
  const desiredIn = (year: number): number | undefined =>
    desired === undefined
      ? undefined
      : wishPercent !== undefined && year > firstDeathYear
        ? (desired * wishPercent) / 100
        : desired;

  let survivor: HouseholdSurvivor | undefined;
  if (two && household.survivorPension !== undefined && survivorParameters !== undefined) {
    const [deceased, left] = endYear(first) <= endYear(second) ? [first, second] : [second, first];
    if (endYear(deceased) < endYear(left)) {
      survivor = { deceasedId: deceased.id, survivorId: left.id, deathYear: endYear(deceased) };
    }
  }

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
      const income = (mine.statutory ?? 0) + (mine.occupational ?? 0) + (mine.retirementDepot ?? 0);
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
      const wish = desiredIn(year);
      if (wish !== undefined) point.desired = wish;
      if (wish !== undefined && year <= lastYear) point.gap = Math.max(0, wish - point.total);
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
