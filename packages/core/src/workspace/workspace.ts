import { PERSON_BLOCKS, HOUSEHOLD_SCHEMA_VERSION } from '../household/householdMigration';
import type { HouseholdState, PersonBlock } from '../household/householdMigration';
import { parseBlock } from './blocks';
import type { BlockStates } from './blocks';
import { validateHousehold } from '../household/household';
import type { Household, Person } from '../household/household';
import type { HealthInsurance } from '../shared/profile';

/**
 * Current file format version. A change to any block raises it and adds a migration. Version 2 adds the
 * optional block `otherIncome` (`15` §7): an older app must refuse such a file instead of losing the entries.
 */
export const WORKSPACE_SCHEMA_VERSION = 2;

export const WORKSPACE_LIMITS = {
  /** Characters of the file content (an upper bound of 2 MB for typical files). */
  maxChars: 2_000_000,
  maxPersons: 20,
  maxStringLength: 100,
  maxChildren: 20,
  maxAbsValue: 1e12,
  maxDepth: 12,
} as const;

export const PERSON_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export type WorkspaceMeta = { synthetic?: boolean };

export type Workspace = {
  format: string;
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  appVersion: string;
  /** ISO 8601. */
  exportedAt: string;
  meta?: WorkspaceMeta;
  household: Household;
  activePersonId: string;
  /** Validated block states per person; a missing block means "defaults". */
  byPerson: Record<string, Partial<BlockStates>>;
};

export type WorkspaceIssueCode =
  | 'empty'
  | 'too_large'
  | 'invalid_json'
  | 'not_an_object'
  | 'wrong_format'
  | 'invalid_version'
  | 'newer_version'
  | 'no_migration'
  | 'forbidden_key'
  | 'too_deep'
  | 'invalid_household'
  | 'invalid_person_id'
  | 'duplicate_person_id'
  | 'too_many_persons'
  | 'unknown_active_person'
  | 'invalid_field';

/** Errors stop the import; `field` is a path such as `household.persons.p1.birthYear`. */
export type WorkspaceIssue = { code: WorkspaceIssueCode; field?: string };

export type WorkspaceWarning =
  | { code: 'block_replaced'; personId: string; block: PersonBlock; fields: string[] }
  | { code: 'unknown_person_blocks'; personId: string }
  | { code: 'unknown_block'; personId: string; block: string };

export type WorkspaceParseResult =
  | { status: 'ok'; workspace: Workspace; warnings: WorkspaceWarning[] }
  | { status: 'error'; issues: WorkspaceIssue[] };

export type WorkspaceInfo = {
  format: string;
  appVersion: string;
  exportedAt: string;
  synthetic?: boolean;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * One entry per step from version `n` to `n + 1`. Version 1 to 2 is the identity: files of version 1 have no
 * `otherIncome` block and load with the default (an empty list).
 */
export const WORKSPACE_MIGRATIONS: Record<number, (workspace: Record<string, unknown>) => unknown> =
  { 1: (workspace) => workspace };

/**
 * Brings an older file up to `target` step by step. Returns the migrated object or an issue.
 * The version is read from `schemaVersion`; versions above `target` are refused.
 */
export function migrateWorkspace(
  raw: Record<string, unknown>,
  migrations: Record<number, (w: Record<string, unknown>) => unknown> = WORKSPACE_MIGRATIONS,
  target: number = WORKSPACE_SCHEMA_VERSION,
): { ok: true; value: Record<string, unknown> } | { ok: false; issue: WorkspaceIssue } {
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, issue: { code: 'invalid_version', field: 'schemaVersion' } };
  }
  if (version > target) {
    return { ok: false, issue: { code: 'newer_version', field: 'schemaVersion' } };
  }
  let current = raw;
  for (let v = version; v < target; v++) {
    const step = migrations[v];
    if (!step) return { ok: false, issue: { code: 'no_migration', field: 'schemaVersion' } };
    const next = step(current);
    if (!isObject(next))
      return { ok: false, issue: { code: 'no_migration', field: 'schemaVersion' } };
    current = { ...next, schemaVersion: v + 1 };
  }
  return { ok: true, value: current };
}

function findForbiddenKey(value: unknown, depth = 0): WorkspaceIssue | undefined {
  if (depth > WORKSPACE_LIMITS.maxDepth) return { code: 'too_deep' };
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenKey(item, depth + 1);
      if (found) return found;
    }
  } else if (isObject(value)) {
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) return { code: 'forbidden_key', field: key };
      const found = findForbiddenKey(value[key], depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

/** Reads a field of untrusted data for the household part; every problem becomes an issue. */
class Strict {
  readonly issues: WorkspaceIssue[] = [];
  constructor(
    readonly src: Record<string, unknown>,
    private readonly path: string,
  ) {}
  private fail(key: string) {
    this.issues.push({ code: 'invalid_field', field: `${this.path}.${key}` });
  }
  private absent(key: string) {
    return this.src[key] === undefined || this.src[key] === null;
  }
  num(key: string): number {
    const v = this.src[key];
    if (
      typeof v === 'number' &&
      Number.isFinite(v) &&
      Math.abs(v) <= WORKSPACE_LIMITS.maxAbsValue
    ) {
      return v;
    }
    this.fail(key);
    return 0;
  }
  optNum(key: string): number | undefined {
    return this.absent(key) ? undefined : this.num(key);
  }
  str(key: string, max: number = WORKSPACE_LIMITS.maxStringLength): string {
    const v = this.src[key];
    if (typeof v === 'string' && v.length <= max) return v;
    this.fail(key);
    return '';
  }
  optStr(key: string): string | undefined {
    return this.absent(key) ? undefined : this.str(key);
  }
  bool(key: string): boolean {
    const v = this.src[key];
    if (typeof v === 'boolean') return v;
    this.fail(key);
    return false;
  }
  obj(key: string): Record<string, unknown> {
    const v = this.src[key];
    if (isObject(v)) return v;
    this.fail(key);
    return {};
  }
}

function parseHealth(raw: Record<string, unknown>, path: string, issues: WorkspaceIssue[]) {
  const r = new Strict(raw, path);
  const mode = raw.mode;
  if (mode !== 'statutoryCompulsory' && mode !== 'other') {
    issues.push({ code: 'invalid_field', field: `${path}.mode` });
  }
  const health: HealthInsurance = {
    mode: mode === 'other' ? 'other' : 'statutoryCompulsory',
    additionalRatePercent: r.num('additionalRatePercent'),
    childless: r.bool('childless'),
  };
  const other = r.optNum('otherRatePercent');
  if (other !== undefined) health.otherRatePercent = other;
  issues.push(...r.issues);
  return health;
}

function parsePerson(raw: unknown, index: number, issues: WorkspaceIssue[]): Person | undefined {
  const base = `household.persons.${index}`;
  if (!isObject(raw)) {
    issues.push({ code: 'invalid_household', field: base });
    return undefined;
  }
  if (typeof raw.id !== 'string' || !PERSON_ID_PATTERN.test(raw.id)) {
    issues.push({ code: 'invalid_person_id', field: `${base}.id` });
    return undefined;
  }
  const r = new Strict(raw, `household.persons.${raw.id}`);
  const children = Array.isArray(raw.childrenBirthYears) ? raw.childrenBirthYears : undefined;
  if (!children || children.length > WORKSPACE_LIMITS.maxChildren) {
    r.issues.push({ code: 'invalid_field', field: `${base}.childrenBirthYears` });
  }
  const childYears: number[] = [];
  for (const c of children ?? []) {
    if (
      typeof c === 'number' &&
      Number.isFinite(c) &&
      Math.abs(c) <= WORKSPACE_LIMITS.maxAbsValue
    ) {
      childYears.push(c);
    } else {
      r.issues.push({ code: 'invalid_field', field: `${base}.childrenBirthYears` });
      break;
    }
  }
  const pa = r.obj('personalAssumptions');
  const pr = new Strict(pa, `${base}.personalAssumptions`);
  const person: Person = {
    id: raw.id,
    name: r.str('name'),
    birthYear: r.num('birthYear'),
    targetRetirementAge: r.num('targetRetirementAge'),
    lifeExpectancyAge: r.num('lifeExpectancyAge'),
    childrenBirthYears: childYears,
    personalAssumptions: {
      marginalTaxRateTodayPercent: pr.num('marginalTaxRateTodayPercent'),
      employeeSocialInsuranceRatePercent: pr.num('employeeSocialInsuranceRatePercent'),
      health: parseHealth(pr.obj('health'), `${base}.personalAssumptions.health`, pr.issues),
    },
  };
  const churchTax = pa.churchTax;
  if (churchTax === 'low' || churchTax === 'high') person.personalAssumptions.churchTax = churchTax;
  else if (churchTax !== undefined && churchTax !== null) {
    issues.push({ code: 'invalid_field', field: `${base}.personalAssumptions.churchTax` });
  }
  const budget = r.optNum('savingsBudgetMonthly');
  if (budget !== undefined) person.savingsBudgetMonthly = budget;
  issues.push(...r.issues, ...pr.issues);
  return person;
}

function parseHousehold(
  raw: unknown,
  issues: WorkspaceIssue[],
): { household: Household; ids: string[] } | undefined {
  if (!isObject(raw)) {
    issues.push({ code: 'invalid_household', field: 'household' });
    return undefined;
  }
  if (!Array.isArray(raw.persons) || raw.persons.length === 0) {
    issues.push({ code: 'invalid_household', field: 'household.persons' });
    return undefined;
  }
  if (raw.persons.length > WORKSPACE_LIMITS.maxPersons) {
    issues.push({ code: 'too_many_persons', field: 'household.persons' });
    return undefined;
  }
  const count = issues.length;
  const r = new Strict(raw, 'household');
  const ar = new Strict(r.obj('assumptions'), 'household.assumptions');
  const sr = new Strict(ar.obj('returnScenarios'), 'household.assumptions.returnScenarios');
  const persons: Person[] = [];
  const ids = new Set<string>();
  raw.persons.forEach((p, i) => {
    const person = parsePerson(p, i, issues);
    if (!person) return;
    if (ids.has(person.id)) {
      issues.push({ code: 'duplicate_person_id', field: `household.persons.${i}.id` });
      return;
    }
    ids.add(person.id);
    persons.push(person);
  });
  const household: Household = {
    id: r.str('id'),
    assumptions: {
      inflationPercent: ar.num('inflationPercent'),
      returnScenarios: {
        pessimistic: sr.num('pessimistic'),
        neutral: sr.num('neutral'),
        optimistic: sr.num('optimistic'),
      },
      pensionAdjustmentPercent: ar.num('pensionAdjustmentPercent'),
      payoutPhaseReturnPercent: ar.num('payoutPhaseReturnPercent'),
    },
    persons,
  };
  const name = r.optStr('name');
  if (name !== undefined) household.name = name;
  const desired = r.optNum('desiredMonthlyIncomeToday');
  if (desired !== undefined) household.desiredMonthlyIncomeToday = desired;
  const rule = raw.survivorPension;
  if (rule === 'new' || rule === 'old') household.survivorPension = rule;
  else if (rule !== undefined && rule !== null) {
    issues.push({ code: 'invalid_field', field: 'household.survivorPension' });
  }
  // Strict: only true or false (null and other types are errors, unlike survivorPension).
  const joint = raw.jointAssessment;
  if (typeof joint === 'boolean') household.jointAssessment = joint;
  else if (joint !== undefined)
    issues.push({ code: 'invalid_field', field: 'household.jointAssessment' });
  const wishPercent = r.optNum('survivorWishPercent');
  if (wishPercent !== undefined) household.survivorWishPercent = wishPercent;
  issues.push(...r.issues, ...ar.issues, ...sr.issues);
  if (issues.length > count) return undefined;
  return { household, ids: persons.map((p) => p.id) };
}

function parseTopLevelInfo(raw: Record<string, unknown>, issues: WorkspaceIssue[]) {
  const text = (key: string, max: number): string => {
    const v = raw[key];
    if (typeof v === 'string' && v.length > 0 && v.length <= max) return v;
    issues.push({ code: 'invalid_field', field: key });
    return '';
  };
  const appVersion = text('appVersion', 50);
  const exportedAt = text('exportedAt', 40);
  if (exportedAt && Number.isNaN(Date.parse(exportedAt))) {
    issues.push({ code: 'invalid_field', field: 'exportedAt' });
  }
  let meta: WorkspaceMeta | undefined;
  if (raw.meta !== undefined && raw.meta !== null) {
    if (!isObject(raw.meta)) issues.push({ code: 'invalid_field', field: 'meta' });
    else if (typeof raw.meta.synthetic === 'boolean') meta = { synthetic: raw.meta.synthetic };
    else meta = {};
  }
  return { appVersion, exportedAt, meta };
}

/**
 * Reads a workspace file (untrusted text). Order of checks: size, JSON, forbidden keys, format, version,
 * migration, household, blocks. Never throws. A broken block is replaced by defaults (it is left out and
 * reported as a warning); a broken household or any structural problem stops the import.
 */
export function parseWorkspace(
  raw: string,
  currentYear: number,
  expectedFormat: string,
  migrations: Record<number, (w: Record<string, unknown>) => unknown> = WORKSPACE_MIGRATIONS,
  currentSchemaVersion: number = WORKSPACE_SCHEMA_VERSION,
): WorkspaceParseResult {
  const fail = (...issues: WorkspaceIssue[]): WorkspaceParseResult => ({ status: 'error', issues });
  if (raw.trim() === '') return fail({ code: 'empty' });
  if (raw.length > WORKSPACE_LIMITS.maxChars) return fail({ code: 'too_large' });

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail({ code: 'invalid_json' });
  }
  if (!isObject(json)) return fail({ code: 'not_an_object' });
  const forbidden = findForbiddenKey(json);
  if (forbidden) return fail(forbidden);
  if (json.format !== expectedFormat) return fail({ code: 'wrong_format', field: 'format' });

  const migrated = migrateWorkspace(json, migrations, currentSchemaVersion);
  if (!migrated.ok) return fail(migrated.issue);
  const file = migrated.value;

  const issues: WorkspaceIssue[] = [];
  const info = parseTopLevelInfo(file, issues);
  const parsed = parseHousehold(file.household, issues);
  if (!parsed) return fail(...issues);
  const { household, ids } = parsed;
  if (typeof file.activePersonId !== 'string' || !ids.includes(file.activePersonId)) {
    issues.push({ code: 'unknown_active_person', field: 'activePersonId' });
  }
  const validation = validateHousehold(household, currentYear);
  for (const v of validation) issues.push({ code: 'invalid_household', field: v.field });
  if (!isObject(file.byPerson)) issues.push({ code: 'invalid_field', field: 'byPerson' });
  if (issues.length > 0) return fail(...issues);

  const warnings: WorkspaceWarning[] = [];
  const byPerson: Workspace['byPerson'] = {};
  const stored = file.byPerson as Record<string, unknown>;
  for (const personId of Object.keys(stored)) {
    if (!ids.includes(personId)) warnings.push({ code: 'unknown_person_blocks', personId });
  }
  for (const personId of ids) {
    const blocks = stored[personId];
    const result: Partial<BlockStates> = {};
    if (isObject(blocks)) {
      for (const key of Object.keys(blocks)) {
        if (!(PERSON_BLOCKS as readonly string[]).includes(key)) {
          warnings.push({ code: 'unknown_block', personId, block: key });
        }
      }
      for (const block of PERSON_BLOCKS) {
        if (blocks[block] === undefined) continue;
        const parsedBlock = parseBlock(block, blocks[block], currentYear);
        if (parsedBlock.ok && parsedBlock.problems.length === 0) {
          (result as Record<string, unknown>)[block] = parsedBlock.value;
        } else {
          warnings.push({
            code: 'block_replaced',
            personId,
            block,
            fields: parsedBlock.ok ? parsedBlock.problems : [],
          });
        }
      }
    } else if (blocks !== undefined) {
      warnings.push({ code: 'unknown_person_blocks', personId });
    }
    byPerson[personId] = result;
  }

  const workspace: Workspace = {
    format: expectedFormat,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    appVersion: info.appVersion,
    exportedAt: info.exportedAt,
    household,
    activePersonId: file.activePersonId as string,
    byPerson,
  };
  if (info.meta) workspace.meta = info.meta;
  return { status: 'ok', workspace, warnings };
}

/**
 * Builds a workspace from the household state and the raw block values (for example parsed from
 * `localStorage`). Blocks that do not validate are left out; only inputs are included, never results.
 */
export function buildWorkspace(
  state: HouseholdState,
  blocks: Record<string, Partial<Record<PersonBlock, unknown>> | undefined>,
  info: WorkspaceInfo,
  currentYear: number,
): Workspace {
  const byPerson: Workspace['byPerson'] = {};
  for (const person of state.household.persons) {
    const result: Partial<BlockStates> = {};
    const own = blocks[person.id] ?? {};
    for (const block of PERSON_BLOCKS) {
      if (own[block] === undefined) continue;
      const parsed = parseBlock(block, own[block], currentYear);
      if (parsed.ok && parsed.problems.length === 0) {
        (result as Record<string, unknown>)[block] = parsed.value;
      }
    }
    byPerson[person.id] = result;
  }
  const workspace: Workspace = {
    format: info.format,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    appVersion: info.appVersion,
    exportedAt: info.exportedAt,
    household: state.household,
    activePersonId: state.activePersonId,
    byPerson,
  };
  if (info.synthetic !== undefined) workspace.meta = { synthetic: info.synthetic };
  return workspace;
}

/** Sorts object keys recursively and drops `undefined`, so equal data gives identical text. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (isObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] !== undefined) out[key] = canonical(value[key]);
    }
    return out;
  }
  return value;
}

/** Stable text form: fixed top-level order, nested keys sorted, 2-space indent, trailing newline. */
export function serializeWorkspace(workspace: Workspace): string {
  const byPerson: Record<string, unknown> = {};
  for (const person of workspace.household.persons) {
    const blocks = workspace.byPerson[person.id] ?? {};
    const ordered: Record<string, unknown> = {};
    for (const block of PERSON_BLOCKS) {
      if (blocks[block] !== undefined) ordered[block] = canonical(blocks[block]);
    }
    byPerson[person.id] = ordered;
  }
  const top: Record<string, unknown> = {
    format: workspace.format,
    schemaVersion: workspace.schemaVersion,
    appVersion: workspace.appVersion,
    exportedAt: workspace.exportedAt,
  };
  if (workspace.meta) top.meta = canonical(workspace.meta);
  top.household = canonical(workspace.household);
  top.activePersonId = workspace.activePersonId;
  top.byPerson = byPerson;
  return `${JSON.stringify(top, null, 2)}\n`;
}

/** What the web layer needs to restore: the household state and the block values per person. */
export function applyWorkspace(workspace: Workspace): {
  state: HouseholdState;
  blocks: Record<string, Partial<BlockStates>>;
} {
  return {
    state: {
      schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
      household: workspace.household,
      activePersonId: workspace.activePersonId,
    },
    blocks: workspace.byPerson,
  };
}
