import { splitAssumptions, validateHousehold } from './household';
import type { Household, Person } from './household';
import type { GlobalAssumptions, Profile } from '../shared/profile';

export const HOUSEHOLD_SCHEMA_VERSION = 2;

/** Household plus which person is shown. Stored as `valiva.household.v2`. */
export type HouseholdState = {
  schemaVersion: typeof HOUSEHOLD_SCHEMA_VERSION;
  household: Household;
  activePersonId: string;
};

/** Blocks stored per person next to the household (`valiva.p.<personId>.<block>.v1`). */
export const PERSON_BLOCKS = [
  'etfPlan',
  'etfPayout',
  'etfTarget',
  'goals',
  'statutory',
  'depot',
  'occupational',
  'otherIncome',
  'overview',
] as const;
export type PersonBlock = (typeof PERSON_BLOCKS)[number];

export const FIRST_PERSON_ID = 'p1';

export type LegacyStorage = {
  profile?: string | null;
} & Partial<Record<PersonBlock, string | null>>;

export type MigrationResult = {
  state: HouseholdState;
  /** Raw JSON strings of the old blocks, to be stored under the first person's keys. */
  personData: Partial<Record<PersonBlock, string>>;
};

export function defaultPerson(
  id: string,
  name: string,
  currentYear: number,
  defaults: GlobalAssumptions,
): Person {
  return {
    id,
    name,
    // A neutral starting value, not a real person: someone aged 40.
    birthYear: currentYear - 40,
    targetRetirementAge: 67,
    lifeExpectancyAge: 90,
    childrenBirthYears: [],
    personalAssumptions: splitAssumptions(defaults).personal,
  };
}

export function defaultHouseholdState(
  currentYear: number,
  defaults: GlobalAssumptions,
  personName = 'Person 1',
): HouseholdState {
  return {
    schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
    household: {
      id: 'household',
      assumptions: splitAssumptions(defaults).household,
      persons: [defaultPerson(FIRST_PERSON_ID, personName, currentYear, defaults)],
    },
    activePersonId: FIRST_PERSON_ID,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function parse(raw: string | null | undefined): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Fills missing fields with the defaults; stored data is untrusted. */
function mergeAssumptions(base: GlobalAssumptions, stored: unknown): GlobalAssumptions {
  if (!isObject(stored)) return base;
  const s = stored as Partial<GlobalAssumptions>;
  return {
    ...base,
    ...s,
    returnScenarios: { ...base.returnScenarios, ...s.returnScenarios },
    health: { ...base.health, ...s.health },
  };
}

/**
 * Reads the stored household state. Returns `undefined` for missing, unreadable, foreign-version or
 * invalid data so that the caller can fall back to the migration or to defaults. Never throws.
 */
export function parseHouseholdState(
  raw: string | null | undefined,
  currentYear: number,
): HouseholdState | undefined {
  const p = parse(raw);
  if (!isObject(p) || p.schemaVersion !== HOUSEHOLD_SCHEMA_VERSION) return undefined;
  const h = p.household as Household | undefined;
  if (!isObject(h) || !Array.isArray(h.persons) || h.persons.length === 0) return undefined;
  if (
    !h.persons.every(
      (x) => isObject(x) && typeof x.id === 'string' && Array.isArray(x.childrenBirthYears),
    )
  ) {
    return undefined;
  }
  if (!isObject(h.assumptions) || new Set(h.persons.map((x) => x.id)).size !== h.persons.length) {
    return undefined;
  }
  if (validateHousehold(h, currentYear).length > 0) return undefined;
  const active =
    typeof p.activePersonId === 'string' && h.persons.some((x) => x.id === p.activePersonId)
      ? p.activePersonId
      : h.persons[0]!.id;
  return { schemaVersion: HOUSEHOLD_SCHEMA_VERSION, household: h, activePersonId: active };
}

/**
 * One-time migration of the single-person storage (`valiva.*.v1`) into "Person 1" (`11` §5). The old
 * blocks are passed through as raw strings (their own loaders validate them); the profile is validated
 * here and replaced by defaults if it no longer fits. Never throws; the caller keeps the old data.
 */
export function migrateLegacyStorage(
  legacy: LegacyStorage,
  currentYear: number,
  defaults: GlobalAssumptions,
  personName = 'Person 1',
): MigrationResult {
  const base = defaultHouseholdState(currentYear, defaults, personName);
  const personData: MigrationResult['personData'] = {};
  for (const block of PERSON_BLOCKS) {
    const raw = legacy[block];
    if (typeof raw === 'string' && raw !== '') personData[block] = raw;
  }

  const stored = parse(legacy.profile);
  if (!isObject(stored) || stored.schemaVersion !== 1 || !isObject(stored.profile)) {
    return { state: base, personData };
  }
  const sp = stored.profile as Partial<Profile>;
  const assumptions = mergeAssumptions(defaults, stored.assumptions);
  const { household: shared, personal } = splitAssumptions(assumptions);
  const first = base.household.persons[0]!;
  const migrated: Household = {
    ...base.household,
    desiredMonthlyIncomeToday: sp.desiredMonthlyIncomeToday,
    assumptions: shared,
    persons: [
      {
        ...first,
        birthYear: sp.birthYear ?? first.birthYear,
        targetRetirementAge: sp.targetRetirementAge ?? first.targetRetirementAge,
        lifeExpectancyAge: sp.lifeExpectancyAge ?? first.lifeExpectancyAge,
        childrenBirthYears: Array.isArray(sp.childrenBirthYears) ? sp.childrenBirthYears : [],
        personalAssumptions: personal,
      },
    ],
  };
  if (validateHousehold(migrated, currentYear).length > 0) return { state: base, personData };
  return { state: { ...base, household: migrated }, personData };
}
