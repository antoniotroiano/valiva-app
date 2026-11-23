import { IssueCollector } from '../shared/issues';
import { occupationalContributions, taxableShare } from './netPension';
import type { SharedThresholdParameters } from './netPension';
import type {
  ProductProjector,
  ProjectionContext,
  ProjectionOutcome,
  ProjectionResult,
} from './projection';
import { otherIncomeOf } from './projection';
import type { GlobalAssumptions } from '../shared/profile';
import { retirementIncomeTax } from '../tax/retirementTax';
import type { ScenarioName, ValidationIssue } from '../shared/types';

/**
 * Generic entry "other income in retirement" (`15` §3): a given monthly amount (from a statement, a contract,
 * a lease, a notice) that is carried over time, tax and contributions into the overview. It forecasts no
 * capital and has no return scenarios. `kind` only presets form values and shows hints; the calculation knows
 * the general fields only.
 */
export const OTHER_INCOME_KINDS = [
  'riester',
  'basisPension',
  'privateAnnuity',
  'civilServicePension',
  'rent',
  'other',
] as const;
export type OtherIncomeKind = (typeof OTHER_INCOME_KINDS)[number];

/** `today`: the amount is in today's purchasing power. `nominalAtStart`: it is the nominal amount at the start. */
export const OTHER_INCOME_BASES = ['today', 'nominalAtStart'] as const;
export type OtherIncomeBasis = (typeof OTHER_INCOME_BASES)[number];

/**
 * `none`: not taxable. `full`: fully taxable. `percent`: a fixed share of the amount (an earnings share).
 * `pensionShare`: like the statutory pension (taxable share by start year, tax-free part fixed in euros).
 */
export const OTHER_INCOME_TAX_MODES = ['none', 'full', 'percent', 'pensionShare'] as const;
export type OtherIncomeTaxMode = (typeof OTHER_INCOME_TAX_MODES)[number];

/** `likeOccupational`: health and care contributions like the occupational pension, with a shared threshold. */
export const OTHER_INCOME_CONTRIBUTIONS = ['none', 'likeOccupational'] as const;
export type OtherIncomeContributions = (typeof OTHER_INCOME_CONTRIBUTIONS)[number];

export type OtherIncomeAdjustment =
  { mode: 'inflation' } | { mode: 'pension' } | { mode: 'fixed'; percent: number };

export type OtherIncomeStart = { mode: 'retirement' } | { mode: 'age'; age: number };
export type OtherIncomeEnd = { mode: 'lifelong' } | { mode: 'age'; age: number };

export type OtherIncomeEntry = {
  /** `[A-Za-z0-9_-]{1,32}`, unique per person. */
  id: string;
  name: string;
  kind: OtherIncomeKind;
  enabled: boolean;
  /** Gross per month, before tax and contributions. */
  amountMonthly: number;
  amountBasis: OtherIncomeBasis;
  adjustment: OtherIncomeAdjustment;
  start: OtherIncomeStart;
  end: OtherIncomeEnd;
  taxMode: OtherIncomeTaxMode;
  /** Only with `taxMode: 'percent'`. */
  taxSharePercent?: number;
  contributions: OtherIncomeContributions;
  /** Share paid on to the partner after the death, in percent; 0 = ends with the death. */
  survivorPercent: number;
};

/** Stored per person as `valiva.p.<id>.otherIncome.v1`. */
export type OtherIncomeState = { schemaVersion: 1; entries: OtherIncomeEntry[] };

/** App limits (not legal values, so not in `config/`). */
export const OTHER_INCOME_LIMITS = {
  maxEntries: 10,
  nameMaxLength: 60,
  idPattern: /^[A-Za-z0-9_-]{1,32}$/,
  amountMonthly: { min: 0, max: 100_000 },
  adjustmentPercent: { min: -50, max: 100 },
  startAge: { min: 18, max: 100 },
  endAgeMax: 120,
  percent: { min: 0, max: 100 },
} as const;

/** Prefix of the overview product id of an entry: `otherIncome:<id>`. */
export const OTHER_INCOME_PRODUCT_PREFIX = 'otherIncome:';
export const otherIncomeProductId = (id: string): `otherIncome:${string}` =>
  `${OTHER_INCOME_PRODUCT_PREFIX}${id}`;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;

/** True if the text contains a control character (C0, DEL or C1): never allowed in names. */
export const hasControlCharacters = (text: string): boolean => CONTROL_CHARACTERS.test(text);

/** True for a name of 1 to 60 characters (after trimming) without control characters. */
export function isValidOtherIncomeName(name: unknown): boolean {
  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.length <= OTHER_INCOME_LIMITS.nameMaxLength &&
    !hasControlCharacters(name)
  );
}

/** First age at which the entry pays: the profile's target age for `retirement`. */
export function otherIncomeStartAge(entry: OtherIncomeEntry, targetRetirementAge: number): number {
  return entry.start.mode === 'age' ? entry.start.age : targetRetirementAge;
}

const oneOf = <T extends string>(allowed: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v);

/**
 * Validates one entry; errors only, as data. Structure and finiteness first (`not_finite`, `not_integer`,
 * `out_of_range`), then the specialist rules. Notes that are not errors (`taxable_share_before_base_year`,
 * `survivor_needs_pair`, the `unverified:` rules) are not issues; they come with the projection.
 * Start and end before the retirement age are allowed.
 */
export function validateOtherIncomeEntry(
  entry: OtherIncomeEntry,
  ctx: ProjectionContext,
): ValidationIssue[] {
  const c = new IssueCollector();
  const L = OTHER_INCOME_LIMITS;

  if (typeof entry.id !== 'string' || !L.idPattern.test(entry.id)) {
    c.issues.push({ field: 'id', code: 'invalid_id' });
  }
  if (!isValidOtherIncomeName(entry.name)) c.issues.push({ field: 'name', code: 'name_invalid' });
  if (!oneOf(OTHER_INCOME_KINDS, entry.kind)) c.issues.push({ field: 'kind', code: 'required' });
  c.number('amountMonthly', entry.amountMonthly, L.amountMonthly);
  if (!oneOf(OTHER_INCOME_BASES, entry.amountBasis)) {
    c.issues.push({ field: 'amountBasis', code: 'required' });
  }

  const adjustment = entry.adjustment as { mode?: unknown; percent?: number } | undefined;
  if (adjustment?.mode === 'fixed') {
    c.number('adjustment.percent', adjustment.percent as number, L.adjustmentPercent);
  } else if (adjustment?.mode !== 'inflation' && adjustment?.mode !== 'pension') {
    c.issues.push({ field: 'adjustment.mode', code: 'required' });
  }

  const start = entry.start as { mode?: unknown; age?: number } | undefined;
  let startAge: number | undefined;
  if (start?.mode === 'age') {
    c.integer('start.age', start.age as number, L.startAge);
    if (Number.isInteger(start.age)) startAge = start.age;
  } else if (start?.mode === 'retirement') {
    startAge = ctx.profile.targetRetirementAge;
  } else {
    c.issues.push({ field: 'start.mode', code: 'required' });
  }

  const end = entry.end as { mode?: unknown; age?: number } | undefined;
  if (end?.mode === 'age') {
    c.integer('end.age', end.age as number, { max: L.endAgeMax });
    if (Number.isInteger(end.age) && startAge !== undefined && (end.age as number) <= startAge) {
      c.issues.push({ field: 'end.age', code: 'end_not_after_start', min: startAge + 1 });
    }
  } else if (end?.mode !== 'lifelong') {
    c.issues.push({ field: 'end.mode', code: 'required' });
  }

  if (!oneOf(OTHER_INCOME_TAX_MODES, entry.taxMode)) {
    c.issues.push({ field: 'taxMode', code: 'required' });
  }
  if (entry.taxSharePercent !== undefined) {
    c.number('taxSharePercent', entry.taxSharePercent, L.percent);
  } else if (entry.taxMode === 'percent') {
    c.issues.push({ field: 'taxSharePercent', code: 'required' });
  }
  if (!oneOf(OTHER_INCOME_CONTRIBUTIONS, entry.contributions)) {
    c.issues.push({ field: 'contributions', code: 'required' });
  }
  c.number('survivorPercent', entry.survivorPercent, L.percent);

  // A nominal amount at the start is only defined for a start that has not passed yet.
  if (
    entry.amountBasis === 'nominalAtStart' &&
    startAge !== undefined &&
    Number.isFinite(ctx.profile.birthYear) &&
    ctx.profile.birthYear + startAge < ctx.currentYear
  ) {
    c.issues.push({ field: 'amountBasis', code: 'nominal_start_in_past' });
  }
  return c.issues;
}

/**
 * Validates the list: at most 10 entries, unique ids, and every entry. Entry issues carry the prefix
 * `entries.<index>.`; the list rules use the fields `entries` and `entries.<index>.id`. An entry that
 * repeats an earlier id is invalid (its later occurrence), so product ids stay unique.
 */
export function validateOtherIncomeState(
  entries: OtherIncomeEntry[],
  ctx: ProjectionContext,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (entries.length > OTHER_INCOME_LIMITS.maxEntries) {
    issues.push({
      field: 'entries',
      code: 'too_many_entries',
      max: OTHER_INCOME_LIMITS.maxEntries,
    });
  }
  const seen = new Set<string>();
  entries.forEach((entry, i) => {
    for (const issue of validateOtherIncomeEntry(entry, ctx)) {
      issues.push({ ...issue, field: `entries.${i}.${issue.field}` });
    }
    if (typeof entry.id === 'string') {
      if (seen.has(entry.id)) issues.push({ field: `entries.${i}.id`, code: 'duplicate_id' });
      seen.add(entry.id);
    }
  });
  return issues;
}

/**
 * Hint `survivor_needs_pair`: a continued payment to the partner only works in a household of exactly two
 * persons with the survivor's pension switched on. Not an error: the value stays stored, without effect.
 */
export function otherIncomeSurvivorHint(
  entry: Pick<OtherIncomeEntry, 'survivorPercent'>,
  household: { persons: unknown[]; survivorPension?: 'new' | 'old' },
): 'survivor_needs_pair' | undefined {
  if (!(entry.survivorPercent > 0)) return undefined;
  return household.persons.length === 2 && household.survivorPension !== undefined
    ? undefined
    : 'survivor_needs_pair';
}

export type OtherIncomeDetails = {
  /** Age at which the entry starts to pay (the target age for `start.mode: 'retirement'`). */
  startAge: number;
  /** Absent for `lifelong`: the payment runs up to the life expectancy. */
  endAge?: number;
  startYear: number;
  /** `startYear - currentYear`; negative if the entry already runs. */
  yearsToStart: number;
  /** Yearly adjustment `g` in percent. */
  adjustmentPercent: number;
  monthlyNominalAtStart: number;
  /** Taxable share of the gross amount at the start, in percent. */
  taxableSharePercent: number;
};

export type OtherIncomeProjection = ProjectionResult & { details: OtherIncomeDetails };

const PRODUCT_KIND = 'otherIncome';

/** Yearly adjustment of the amount in percent, from the entry and the global assumptions. */
export function otherIncomeAdjustmentPercent(
  adjustment: OtherIncomeAdjustment,
  assumptions: GlobalAssumptions,
): number {
  if (adjustment.mode === 'inflation') return assumptions.inflationPercent;
  if (adjustment.mode === 'pension') return assumptions.pensionAdjustmentPercent;
  return adjustment.percent;
}

/** The rule assumptions an entry rests on (`15` §9); only those that are `unverified` show as warnings. */
function ruleKeysOf(entry: OtherIncomeEntry): string[] {
  const keys: string[] = [];
  if (entry.taxMode === 'pensionShare') keys.push('basisPensionTaxShare');
  if (entry.kind === 'privateAnnuity' && entry.taxMode === 'percent') {
    keys.push('privateAnnuityEarningsShare');
  }
  if (entry.kind === 'riester' && entry.taxMode === 'full') keys.push('riesterFullyTaxable');
  if (entry.contributions === 'likeOccupational') keys.push('sharedBenefitThreshold');
  if (entry.survivorPercent > 0) keys.push('survivorIncomeCredited');
  return keys;
}

/**
 * Projection of one entry (`15` §5.1). No capital and no return scenarios, so all three scenarios give the
 * same entry values (only the other incomes of the scenario can change the tax). Amounts at the payout
 * start: with basis `today` the amount grows with the adjustment from today to the start, with
 * `nominalAtStart` it is the nominal amount at the start; the real value divides by the inflation. The overview
 * lets the amount follow the adjustment from the start on (`indexationPercent`). Income tax is levied on the sum
 * with the other incomes in the context (`otherIncome`); the entry carries its share. Pure; errors are data.
 */
export function projectOtherIncome(
  entry: OtherIncomeEntry,
  ctx: ProjectionContext,
  scenario: ScenarioName = 'neutral',
): ProjectionOutcome<OtherIncomeProjection> {
  const issues = validateOtherIncomeEntry(entry, ctx);
  if (issues.length > 0) return { ok: false, issues };

  const { profile, assumptions, legal } = ctx;
  const inflation = 1 + assumptions.inflationPercent / 100;
  const g = otherIncomeAdjustmentPercent(entry.adjustment, assumptions);
  const startAge = otherIncomeStartAge(entry, profile.targetRetirementAge);
  const startYear = profile.birthYear + startAge;
  const n = startYear - ctx.currentYear;

  const nominal =
    entry.amountBasis === 'today'
      ? entry.amountMonthly * Math.pow(1 + g / 100, n)
      : entry.amountMonthly;
  const real = nominal / Math.pow(inflation, n);

  const warnings: string[] = [];
  let taxable: number;
  let taxableSharePercent: number;
  let fixedTaxFree: number | undefined;
  switch (entry.taxMode) {
    case 'none':
      taxableSharePercent = 0;
      taxable = 0;
      break;
    case 'full':
      taxableSharePercent = 100;
      taxable = real;
      break;
    case 'percent':
      taxableSharePercent = entry.taxSharePercent ?? 0;
      taxable = (real * taxableSharePercent) / 100;
      break;
    default: {
      const share = taxableShare(startYear, legal);
      if (share.beforeBaseYear) warnings.push('taxable_share_before_base_year');
      taxableSharePercent = share.percent;
      taxable = (real * share.percent) / 100;
      fixedTaxFree = real - taxable;
    }
  }

  const contributions =
    entry.contributions === 'likeOccupational'
      ? (({ health, care }) => health + care)(
          occupationalContributions(real, 1, assumptions, legal.social),
        )
      : 0;

  const incomes = [{ id: 'own', taxableMonthly: taxable, contributionsMonthly: contributions }];
  if (ctx.otherIncome) {
    const other = otherIncomeOf(ctx, scenario);
    incomes.push({
      id: 'other',
      taxableMonthly: other.taxableMonthlyReal,
      contributionsMonthly: other.contributionsMonthlyReal,
    });
  }
  const tax = retirementIncomeTax(incomes, legal.incomeTax).byId.own ?? 0;

  for (const key of ruleKeysOf(entry)) {
    if (legal.unverified.includes(`otherIncome.${key}`)) {
      warnings.push(`unverified:otherIncome.${key}`);
    }
  }
  if (entry.kind === 'rent' && entry.taxMode !== 'none') {
    warnings.push('rent_allowance_not_applicable');
  }

  return {
    ok: true,
    result: {
      productId: otherIncomeProductId(entry.id),
      scenario,
      series: [],
      monthlyPensionNominal: nominal,
      monthlyPensionReal: real,
      taxAndContributions: tax + contributions,
      taxableMonthlyReal: taxable,
      contributionsMonthlyReal: contributions,
      fixedTaxMonthlyReal: 0,
      netMonthlyPensionReal: real - tax - contributions,
      indexationPercent: g,
      ...(fixedTaxFree === undefined ? {} : { fixedTaxFreeMonthlyReal: fixedTaxFree }),
      warnings,
      details: {
        startAge,
        endAge: entry.end.mode === 'age' ? entry.end.age : undefined,
        startYear,
        yearsToStart: n,
        adjustmentPercent: g,
        monthlyNominalAtStart: nominal,
        taxableSharePercent,
      },
    },
  };
}

export const otherIncomeProjector: ProductProjector<OtherIncomeEntry, OtherIncomeProjection> = {
  type: PRODUCT_KIND,
  validate: validateOtherIncomeEntry,
  project: projectOtherIncome,
};

/**
 * Contributions of the shared threshold group (`15` §5.2): the occupational pension and every active entry
 * with `contributions: 'likeOccupational'` of one person at one age. `gross` is the monthly gross of each member
 * in today's purchasing power (so the thresholds stay the config values). The sum is judged once: health on
 * the part above the allowance, care on the whole sum once it exceeds the threshold (all or nothing); with
 * `health.mode = other` the entered rate on the sum. The contributions are split in proportion to the gross.
 */
export function sharedOccupationalContributions(
  gross: { id: string; amount: number }[],
  social: SharedThresholdParameters,
  assumptions: GlobalAssumptions,
): Record<string, number> {
  const sum = gross.reduce((s, m) => s + Math.max(0, m.amount), 0);
  const { health, care } = occupationalContributions(sum, 1, assumptions, social);
  const total = health + care;
  const byId: Record<string, number> = {};
  for (const m of gross) byId[m.id] = sum > 0 ? (total * Math.max(0, m.amount)) / sum : 0;
  return byId;
}
