import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_LIMITS,
  WORKSPACE_SCHEMA_VERSION,
  applyWorkspace,
  buildWorkspace,
  defaultBlock,
  defaultHouseholdState,
  defaultPerson,
  migrateWorkspace,
  parseWorkspace,
  serializeWorkspace,
} from '../../src';
import type { HouseholdState, PersonBlock, Workspace } from '../../src';
import { ASSUMPTIONS } from '../pensionFixtures';

const YEAR = 2026;
const FORMAT = 'test-format';
const INFO = { format: FORMAT, appVersion: '0.0.0', exportedAt: '2026-11-18T10:00:00.000Z' };

function twoPersons(): HouseholdState {
  const state = defaultHouseholdState(YEAR, ASSUMPTIONS, 'Alex');
  state.household.persons.push(defaultPerson('p2', 'Sam', YEAR, ASSUMPTIONS));
  return state;
}

function sample(): Workspace {
  return buildWorkspace(
    twoPersons(),
    {
      p1: {
        etfPlan: defaultBlock('etfPlan', YEAR),
        depot: { ...defaultBlock('depot', YEAR), ownContributionMonthly: 120 },
      },
      p2: { statutory: { ...defaultBlock('statutory', YEAR), projectedMonthlyPensionToday: 1400 } },
    },
    INFO,
    YEAR,
  );
}

const parse = (raw: string) => parseWorkspace(raw, YEAR, FORMAT);
const errorCodes = (raw: string) => {
  const r = parse(raw);
  return r.status === 'error' ? r.issues.map((i) => i.code) : [];
};
/** Untyped JSON the tests edit freely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

/** Edits the serialized sample as JSON. */
function mutate(edit: (w: Loose) => void): string {
  const w = JSON.parse(serializeWorkspace(sample())) as Loose;
  edit(w);
  return JSON.stringify(w);
}

describe('serializeWorkspace / parseWorkspace', () => {
  it('round-trips the sample and is byte-stable', () => {
    const w = sample();
    const text = serializeWorkspace(w);
    const r = parse(text);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual([]);
    expect(r.workspace).toEqual(w);
    expect(serializeWorkspace(r.workspace)).toBe(text);
  });

  it('writes a fixed top-level order, 2-space indent and a trailing newline', () => {
    const text = serializeWorkspace(sample());
    expect(text.endsWith('}\n')).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual([
      'format',
      'schemaVersion',
      'appVersion',
      'exportedAt',
      'household',
      'activePersonId',
      'byPerson',
    ]);
    expect(text.split('\n')[1]).toMatch(/^ {2}"format"/);
  });

  it('keeps meta.synthetic', () => {
    const w = buildWorkspace(twoPersons(), {}, { ...INFO, synthetic: true }, YEAR);
    const r = parse(serializeWorkspace(w));
    expect(r.status === 'ok' && r.workspace.meta).toEqual({ synthetic: true });
  });

  it('applyWorkspace returns the household state and the blocks', () => {
    const w = sample();
    const { state, blocks } = applyWorkspace(w);
    expect(state.household).toEqual(w.household);
    expect(state.activePersonId).toBe('p1');
    expect(Object.keys(blocks)).toEqual(['p1', 'p2']);
    expect(blocks.p1?.depot?.ownContributionMonthly).toBe(120);
  });

  it('leaves out blocks that do not validate when building', () => {
    const w = buildWorkspace(
      twoPersons(),
      { p1: { depot: { schemaVersion: 1, ownContributionMonthly: 'x' }, goals: 5 } },
      INFO,
      YEAR,
    );
    expect(w.byPerson.p1).toEqual({});
  });

  it('property: parse(serialize(w)) equals w for 1 to 5 persons with random blocks', () => {
    const num = (min: number, max: number) =>
      fc.integer({ min: min * 100, max: max * 100 }).map((n) => n / 100 + 0);
    const person = fc.record({
      birthYear: fc.integer({ min: 1940, max: 2005 }),
      retirement: fc.integer({ min: 60, max: 70 }),
      pension: num(0, 4000),
      contribution: num(0, 2000),
      variant: fc.constantFrom('standard', 'guarantee80', 'guarantee100', 'noGuarantee'),
      plan: num(0, 5000),
      goals: fc.array(num(1, 50000), { maxLength: 3 }),
    });
    fc.assert(
      fc.property(fc.array(person, { minLength: 1, maxLength: 5 }), (people) => {
        const state = defaultHouseholdState(YEAR, ASSUMPTIONS);
        const blocks: Record<string, Partial<Record<PersonBlock, unknown>>> = {};
        people.forEach((p, i) => {
          const id = `p${i + 1}`;
          if (i > 0) state.household.persons.push(defaultPerson(id, `P${i}`, YEAR, ASSUMPTIONS));
          const person = state.household.persons[i]!;
          person.birthYear = p.birthYear;
          person.targetRetirementAge = p.retirement;
          blocks[id] = {
            etfPlan: { ...defaultBlock('etfPlan', YEAR), monthlyContribution: p.plan },
            statutory: {
              ...defaultBlock('statutory', YEAR),
              projectedMonthlyPensionToday: p.pension,
            },
            depot: {
              ...defaultBlock('depot', YEAR),
              ownContributionMonthly: p.contribution,
              variant: p.variant,
            },
            goals: {
              schemaVersion: 1,
              goals: p.goals.map((amount, g) => ({
                id: `g${g}`,
                name: `Goal ${g}`,
                targetAmount: amount,
                currentAmount: 0,
                monthlyContribution: 10,
                accountInterestPercent: 2,
                priority: g,
                taxEnabled: true,
                taxFreeAllowancePerYear: 0,
                startMonth: '2026-01',
              })),
            },
          };
        });
        const w = buildWorkspace(state, blocks, INFO, YEAR);
        const text = serializeWorkspace(w);
        const r = parse(text);
        expect(r.status).toBe('ok');
        if (r.status !== 'ok') return;
        expect(r.warnings).toEqual([]);
        expect(r.workspace).toEqual(w);
        expect(serializeWorkspace(r.workspace)).toBe(text);
      }),
      { numRuns: 100 },
    );
  });
});

describe('appVersion in the file header', () => {
  const withVersion = (appVersion: unknown) => mutate((w) => (w.appVersion = appVersion));

  it('is informational: older, newer and unusual app versions import and are kept as written', () => {
    for (const v of ['0.0.0', '0', '0.1.0', '1.4.2', '99.0.0', '0.1.0-beta.1', 'x'.repeat(50)]) {
      const r = parse(withVersion(v));
      expect(r.status).toBe('ok');
      if (r.status === 'ok') expect(r.workspace.appVersion).toBe(v);
    }
  });

  it('does not decide about the file format: only schemaVersion does', () => {
    expect(parse(withVersion('99.0.0')).status).toBe('ok');
    expect(errorCodes(mutate((w) => (w.schemaVersion = WORKSPACE_SCHEMA_VERSION + 1)))).toContain(
      'newer_version',
    );
  });

  it('stays a required, bounded text', () => {
    for (const v of [undefined, '', 1, null, 'x'.repeat(51)]) {
      expect(errorCodes(withVersion(v))).toContain('invalid_field');
    }
  });
});

describe('parseWorkspace errors', () => {
  it('rejects an empty file', () => {
    expect(errorCodes('')).toEqual(['empty']);
    expect(errorCodes('  \n')).toEqual(['empty']);
  });

  it('rejects text that is not JSON or not an object', () => {
    expect(errorCodes('{nope')).toEqual(['invalid_json']);
    expect(errorCodes('[1,2]')).toEqual(['not_an_object']);
    expect(errorCodes('42')).toEqual(['not_an_object']);
  });

  it('rejects files over the size limit', () => {
    expect(errorCodes(' '.repeat(10) + 'x'.repeat(WORKSPACE_LIMITS.maxChars))).toEqual([
      'too_large',
    ]);
  });

  it('rejects a wrong or missing format', () => {
    expect(errorCodes(mutate((w) => (w.format = 'other')))).toEqual(['wrong_format']);
    expect(errorCodes(mutate((w) => delete w.format))).toEqual(['wrong_format']);
  });

  it('rejects missing, invalid and newer schema versions', () => {
    expect(errorCodes(mutate((w) => delete w.schemaVersion))).toEqual(['invalid_version']);
    expect(errorCodes(mutate((w) => (w.schemaVersion = '1')))).toEqual(['invalid_version']);
    expect(errorCodes(mutate((w) => (w.schemaVersion = 0)))).toEqual(['invalid_version']);
    expect(errorCodes(mutate((w) => (w.schemaVersion = WORKSPACE_SCHEMA_VERSION + 1)))).toEqual([
      'newer_version',
    ]);
  });

  it('rejects duplicate person ids', () => {
    expect(errorCodes(mutate((w) => (w.household.persons[1].id = 'p1')))).toContain(
      'duplicate_person_id',
    );
  });

  it('rejects invalid person ids', () => {
    expect(errorCodes(mutate((w) => (w.household.persons[1].id = 'a b/c')))).toContain(
      'invalid_person_id',
    );
    expect(errorCodes(mutate((w) => (w.household.persons[1].id = 'x'.repeat(33))))).toContain(
      'invalid_person_id',
    );
  });

  it('rejects an unknown active person', () => {
    expect(errorCodes(mutate((w) => (w.activePersonId = 'p9')))).toEqual(['unknown_active_person']);
  });

  it('rejects too many persons', () => {
    const text = mutate((w) => {
      w.household.persons = Array.from({ length: 21 }, (_, i) => ({
        ...w.household.persons[0],
        id: `p${i}`,
      }));
    });
    expect(errorCodes(text)).toEqual(['too_many_persons']);
  });

  it('rejects numbers that are strings, null-like or not finite in the household', () => {
    expect(errorCodes(mutate((w) => (w.household.persons[0].birthYear = '1985')))).toContain(
      'invalid_field',
    );
    const infinite = serializeWorkspace(sample()).replace(
      /"inflationPercent": [\d.]+/,
      '"inflationPercent": 1e999',
    );
    expect(errorCodes(infinite)).toContain('invalid_field');
  });

  it('rejects values outside the household rules', () => {
    expect(errorCodes(mutate((w) => (w.household.persons[0].birthYear = 1500)))).toContain(
      'invalid_household',
    );
  });

  it('round-trips a church tax choice and rejects an unknown one', () => {
    const w = sample();
    w.household.persons[0]!.personalAssumptions.churchTax = 'high';
    const r = parse(serializeWorkspace(w));
    expect(r.status).toBe('ok');
    if (r.status === 'ok')
      expect(r.workspace.household.persons[0]!.personalAssumptions.churchTax).toBe('high');
    expect(
      errorCodes(mutate((x) => (x.household.persons[0].personalAssumptions.churchTax = 'maybe'))),
    ).toContain('invalid_field');
  });

  it('rejects too long strings', () => {
    expect(errorCodes(mutate((w) => (w.household.persons[0].name = 'x'.repeat(101))))).toContain(
      'invalid_field',
    );
  });

  it('rejects __proto__, constructor and prototype keys anywhere', () => {
    const raw = serializeWorkspace(sample());
    const proto = raw.replace('"byPerson": {', '"byPerson": {"__proto__": {"x": 1},');
    expect(errorCodes(proto)).toEqual(['forbidden_key']);
    for (const key of ['constructor', 'prototype']) {
      expect(errorCodes(mutate((w) => (w.byPerson.p1[key] = {})))).toEqual(['forbidden_key']);
    }
  });

  it('does not pollute the prototype', () => {
    parse(
      serializeWorkspace(sample()).replace('"byPerson": {', '"byPerson": {"__proto__": {"x": 1},'),
    );
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('stops at a broken household without exceptions', () => {
    expect(errorCodes(mutate((w) => (w.household = 'x')))).toEqual(['invalid_household']);
    expect(errorCodes(mutate((w) => (w.household.persons = [])))).toEqual(['invalid_household']);
    expect(errorCodes(mutate((w) => delete w.household))).toEqual(['invalid_household']);
  });
});

describe('broken blocks', () => {
  it('replaces one broken block with defaults and warns, the rest stays', () => {
    const text = mutate((w) => {
      w.byPerson.p1.depot.ownContributionMonthly = 'lots';
    });
    const r = parse(text);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual([
      {
        code: 'block_replaced',
        personId: 'p1',
        block: 'depot',
        fields: ['ownContributionMonthly'],
      },
    ]);
    expect(r.workspace.byPerson.p1?.depot).toBeUndefined();
    expect(r.workspace.byPerson.p1?.etfPlan).toBeDefined();
    expect(r.workspace.byPerson.p2?.statutory?.projectedMonthlyPensionToday).toBe(1400);
  });

  it('warns about blocks that are not objects, wrong version and unknown blocks', () => {
    const text = mutate((w) => {
      w.byPerson.p1.goals = 7;
      w.byPerson.p2.statutory.schemaVersion = 5;
      w.byPerson.p2.somethingNew = { a: 1 };
    });
    const r = parse(text);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual(
      expect.arrayContaining([
        { code: 'block_replaced', personId: 'p1', block: 'goals', fields: [] },
        { code: 'block_replaced', personId: 'p2', block: 'statutory', fields: [] },
        { code: 'unknown_block', personId: 'p2', block: 'somethingNew' },
      ]),
    );
  });

  it('ignores blocks of persons who are not in the household', () => {
    const r = parse(mutate((w) => (w.byPerson.ghost = { depot: {} })));
    expect(r.status === 'ok' && r.warnings).toEqual([
      { code: 'unknown_person_blocks', personId: 'ghost' },
    ]);
    expect(r.status === 'ok' && Object.keys(r.workspace.byPerson)).toEqual(['p1', 'p2']);
  });

  it('drops unknown fields everywhere', () => {
    const r = parse(
      mutate((w) => {
        w.household.persons[0].secret = 'x';
        w.household.extra = 1;
        w.byPerson.p1.depot.evil = true;
        w.topLevelExtra = 1;
      }),
    );
    expect(r.status === 'ok' && r.workspace).toEqual(sample());
  });

  it('accepts a workspace without any blocks', () => {
    const r = parse(mutate((w) => (w.byPerson = {})));
    expect(r.status === 'ok' && r.workspace.byPerson).toEqual({ p1: {}, p2: {} });
  });
});

describe('migration chain', () => {
  const migrations = {
    1: (w: Record<string, unknown>) => ({ ...w, renamed: w.old, old: undefined }),
    2: (w: Record<string, unknown>) => ({
      ...w,
      steps: [...((w.steps as string[]) ?? []), '2to3'],
    }),
  };

  it('applies each step in order and sets the version', () => {
    const r = migrateWorkspace({ schemaVersion: 1, old: 'x' }, migrations, 3);
    expect(r).toEqual({
      ok: true,
      value: { schemaVersion: 3, renamed: 'x', old: undefined, steps: ['2to3'] },
    });
  });

  it('does nothing for the current version', () => {
    expect(migrateWorkspace({ schemaVersion: 3, a: 1 }, migrations, 3)).toEqual({
      ok: true,
      value: { schemaVersion: 3, a: 1 },
    });
  });

  it('reports a newer version and a missing step', () => {
    expect(migrateWorkspace({ schemaVersion: 4 }, migrations, 3)).toEqual({
      ok: false,
      issue: { code: 'newer_version', field: 'schemaVersion' },
    });
    expect(migrateWorkspace({ schemaVersion: 1 }, {}, 2)).toEqual({
      ok: false,
      issue: { code: 'no_migration', field: 'schemaVersion' },
    });
  });

  it('parseWorkspace migrates an older file before validating it', () => {
    const old = JSON.parse(serializeWorkspace(sample())) as Record<string, unknown>;
    old.schemaVersion = 0.5;
    expect(errorCodes(JSON.stringify(old))).toEqual(['invalid_version']);
    // Artificial "version 2" app: version 1 files need the migration to parse.
    const v1 = JSON.parse(serializeWorkspace(sample())) as Record<string, unknown>;
    const r = parseWorkspace(JSON.stringify(v1), YEAR, FORMAT, { 1: (w) => w }, 2);
    expect(r.status).toBe('ok');
    expect(r.status === 'ok' && r.workspace.schemaVersion).toBe(WORKSPACE_SCHEMA_VERSION);
  });
});
