import fc from 'fast-check';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OTHER_INCOME_LIMITS,
  PERSON_BLOCKS,
  WORKSPACE_LIMITS,
  WORKSPACE_MIGRATIONS,
  WORKSPACE_SCHEMA_VERSION,
  applyWorkspace,
  buildOtherIncomeProducts,
  buildWorkspace,
  defaultBlock,
  defaultHouseholdState,
  hasControlCharacters,
  householdOverview,
  loadBlock,
  parseBlock,
  parseWorkspace,
  personContext,
  serializeWorkspace,
} from '../../src';
import type { OtherIncomeEntry, OtherIncomeState } from '../../src';
import { ASSUMPTIONS, LEGAL_OI, oiEntry } from '../pensionFixtures';

const YEAR = 2026;
const FORMAT = 'valiva-workspace';
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const block = (entries: unknown[], extra: Loose = {}) => ({ schemaVersion: 1, entries, ...extra });
const parse = (raw: unknown) => parseBlock('otherIncome', raw, YEAR);
const state = (entries: OtherIncomeEntry[]): OtherIncomeState => ({ schemaVersion: 1, entries });

/** A workspace of one person with the given raw `otherIncome` block, as text. */
function workspaceText(otherIncome: unknown, version: number = WORKSPACE_SCHEMA_VERSION): string {
  const household = defaultHouseholdState(YEAR, ASSUMPTIONS, 'Alex');
  const w = JSON.parse(
    serializeWorkspace(
      buildWorkspace(
        household,
        {},
        { format: FORMAT, appVersion: '0', exportedAt: '2026-11-23T10:00:00.000Z' },
        YEAR,
      ),
    ),
  ) as Loose;
  w.schemaVersion = version;
  if (otherIncome !== undefined) w.byPerson.p1.otherIncome = otherIncome;
  return JSON.stringify(w);
}

describe('otherIncome block: defaults and reading', () => {
  it('is a block of the person with an empty default', () => {
    expect(PERSON_BLOCKS).toContain('otherIncome');
    expect(defaultBlock('otherIncome', YEAR)).toEqual({ schemaVersion: 1, entries: [] });
    expect(loadBlock('otherIncome', null, YEAR)).toEqual({ schemaVersion: 1, entries: [] });
    expect(loadBlock('otherIncome', '{not json', YEAR)).toEqual({ schemaVersion: 1, entries: [] });
  });

  it('reads valid entries and copies them into new objects', () => {
    const entries = [
      oiEntry({ id: 'a' }),
      oiEntry({
        id: 'b',
        name: 'Pension',
        kind: 'civilServicePension',
        adjustment: { mode: 'fixed', percent: -3.5 },
        start: { mode: 'age', age: 63 },
        end: { mode: 'age', age: 90 },
        taxMode: 'percent',
        taxSharePercent: 17.5,
        contributions: 'likeOccupational',
        survivorPercent: 55,
        enabled: false,
      }),
    ];
    const raw = JSON.parse(JSON.stringify(state(entries))) as Loose;
    const r = parse(raw);
    expect(r.ok && r.problems).toEqual([]);
    expect(r.ok && r.value).toEqual(state(entries));
    if (r.ok) {
      expect(r.value.entries[0]).not.toBe(raw.entries[0]);
      expect(r.value.entries[0]!.adjustment).not.toBe(raw.entries[0].adjustment);
    }
  });

  it('drops unknown fields, also inside the nested objects', () => {
    const raw = block([{ ...oiEntry(), extra: 1, start: { mode: 'retirement', age: 99, x: 1 } }], {
      more: 1,
    });
    const r = parse(raw);
    expect(r.ok && r.problems).toEqual([]);
    expect(r.ok && JSON.stringify(r.value)).toBe(JSON.stringify(state([oiEntry()])));
  });

  it('fills the optional fields with their defaults', () => {
    const r = parse(block([{ id: 'x', name: 'N', kind: 'rent', amountMonthly: 100 }]));
    expect(r.ok && r.problems).toEqual([]);
    expect(r.ok && r.value.entries[0]).toEqual({
      id: 'x',
      name: 'N',
      kind: 'rent',
      enabled: true,
      amountMonthly: 100,
      amountBasis: 'today',
      adjustment: { mode: 'inflation' },
      start: { mode: 'retirement' },
      end: { mode: 'lifelong' },
      taxMode: 'full',
      contributions: 'none',
      survivorPercent: 0,
    });
  });

  it('refuses a wrong block version and a missing or wrong entries list', () => {
    expect(parse({ schemaVersion: 2, entries: [] }).ok).toBe(false);
    expect(parse({ entries: [] }).ok).toBe(false);
    expect(parse({ schemaVersion: 1 }).ok).toBe(false);
    expect(parse({ schemaVersion: 1, entries: 'x' }).ok).toBe(false);
    expect(parse({ schemaVersion: 1, entries: { length: 1 } }).ok).toBe(false);
    expect(parseBlock('otherIncome', [], YEAR).ok).toBe(false);
    expect(parseBlock('otherIncome', null, YEAR).ok).toBe(false);
  });
});

describe('otherIncome block: malicious and broken input', () => {
  const bad = (over: Loose) => parse(block([{ ...oiEntry(), ...over }]));
  const problems = (over: Loose) => {
    const r = bad(over);
    return r.ok ? r.problems : ['not ok'];
  };

  it('rejects wrong types', () => {
    expect(problems({ amountMonthly: '600' })).toEqual(['entries.0.amountMonthly']);
    expect(problems({ amountMonthly: null })).toEqual(['entries.0.amountMonthly']);
    expect(problems({ amountMonthly: true })).toEqual(['entries.0.amountMonthly']);
    expect(problems({ amountMonthly: [] })).toEqual(['entries.0.amountMonthly']);
    expect(problems({ id: 5 })).toEqual(['entries.0.id']);
    expect(problems({ name: {} })).toEqual(['entries.0.name']);
    expect(problems({ enabled: 'yes' })).toEqual(['entries.0.enabled']);
    expect(problems({ adjustment: 'inflation' })).toEqual(['entries.0.adjustment']);
    expect(problems({ start: [] })).toEqual(['entries.0.start']);
    expect(
      parse(block([5, 'x', null, []])).ok &&
        (parse(block([5, 'x', null, []])) as { problems: string[] }).problems,
    ).toEqual(['entries.0', 'entries.1', 'entries.2', 'entries.3']);
  });

  it('rejects NaN and Infinity (as they can appear in objects built in code)', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(problems({ amountMonthly: value })).toEqual(['entries.0.amountMonthly']);
      expect(problems({ survivorPercent: value })).toEqual(['entries.0.survivorPercent']);
      expect(problems({ adjustment: { mode: 'fixed', percent: value } })).toEqual([
        'entries.0.adjustment.percent',
      ]);
      expect(problems({ start: { mode: 'age', age: value } })).toEqual(['entries.0.start.age']);
    }
  });

  it('rejects numbers outside the ranges and non-integer ages', () => {
    expect(problems({ amountMonthly: -0.01 })).toEqual(['entries.0.amountMonthly']);
    expect(problems({ amountMonthly: 100_000.01 })).toEqual(['entries.0.amountMonthly']);
    expect(problems({ survivorPercent: 100.1 })).toEqual(['entries.0.survivorPercent']);
    expect(problems({ taxSharePercent: -1 })).toEqual(['entries.0.taxSharePercent']);
    expect(problems({ adjustment: { mode: 'fixed', percent: 100.1 } })).toEqual([
      'entries.0.adjustment.percent',
    ]);
    expect(problems({ adjustment: { mode: 'fixed' } })).toEqual(['entries.0.adjustment.percent']);
    expect(problems({ start: { mode: 'age', age: 17 } })).toEqual(['entries.0.start.age']);
    expect(problems({ start: { mode: 'age', age: 101 } })).toEqual(['entries.0.start.age']);
    expect(problems({ start: { mode: 'age', age: 67.5 } })).toEqual(['entries.0.start.age']);
    expect(problems({ start: { mode: 'age' } })).toEqual(['entries.0.start.age']);
    expect(problems({ end: { mode: 'age', age: 121 } })).toEqual(['entries.0.end.age']);
    expect(problems({ end: { mode: 'age', age: 70.5 } })).toEqual(['entries.0.end.age']);
  });

  it('rejects unknown enum values and modes', () => {
    expect(problems({ kind: 'crypto' })).toEqual(['entries.0.kind']);
    expect(problems({ kind: undefined })).toEqual(['entries.0.kind']);
    expect(problems({ amountBasis: 'real' })).toEqual(['entries.0.amountBasis']);
    expect(problems({ taxMode: 'half' })).toEqual(['entries.0.taxMode']);
    expect(problems({ contributions: 'all' })).toEqual(['entries.0.contributions']);
    expect(problems({ adjustment: { mode: 'magic' } })).toEqual(['entries.0.adjustment.mode']);
    expect(problems({ start: { mode: 'later' } })).toEqual(['entries.0.start.mode']);
    expect(problems({ end: { mode: 'never' } })).toEqual(['entries.0.end.mode']);
  });

  it('rejects ids and names that are not allowed (control characters, length, pattern)', () => {
    for (const id of ['', 'a b', 'ä', 'x'.repeat(33), 'a/b', '../etc', '<script>']) {
      expect(problems({ id })).toEqual(['entries.0.id']);
    }
    for (const name of [
      'bad\u0000name',
      'line\nbreak',
      'tab\there',
      'x'.repeat(61),
      'del\u007f',
      'nel\u0085',
    ]) {
      expect(problems({ name })).toEqual(['entries.0.name']);
    }
    expect(bad({ name: 'x'.repeat(60) }).ok && problems({ name: 'x'.repeat(60) })).toEqual([]);
    expect(problems({ id: '__proto__' })).toEqual([]); // a legal id string; only keys are forbidden
  });

  it('refuses the whole block for __proto__, constructor and prototype keys on every level', () => {
    const viaJson = (text: string) => parse(JSON.parse(text));
    expect(viaJson('{"schemaVersion":1,"entries":[],"__proto__":{"x":1}}').ok).toBe(false);
    expect(viaJson('{"schemaVersion":1,"entries":[],"constructor":{}}').ok).toBe(false);
    expect(viaJson('{"schemaVersion":1,"entries":[],"prototype":1}').ok).toBe(false);
    const entry = JSON.stringify(oiEntry());
    expect(
      viaJson(
        `{"schemaVersion":1,"entries":[${entry.slice(0, -1)},"__proto__":{"polluted":true}}]}`,
      ).ok,
    ).toBe(false);
    expect(
      viaJson(
        `{"schemaVersion":1,"entries":[${entry.slice(0, -1)},"adjustment":{"mode":"inflation","constructor":1}}]}`,
      ).ok,
    ).toBe(false);
    expect(
      viaJson(
        `{"schemaVersion":1,"entries":[${entry.slice(0, -1)},"start":{"mode":"retirement","prototype":{}}}]}`,
      ).ok,
    ).toBe(false);
    // deeply nested, hidden in an unknown field
    expect(viaJson('{"schemaVersion":1,"entries":[],"x":{"y":{"z":[{"__proto__":1}]}}}').ok).toBe(
      false,
    );
    expect(({} as Loose).polluted).toBeUndefined();
  });

  it('refuses a block that is nested too deeply', () => {
    let deep: unknown = 1;
    for (let i = 0; i < 40; i++) deep = { a: deep };
    expect(parse({ schemaVersion: 1, entries: [], deep }).ok).toBe(false);
  });

  it('11 entries: the block is invalid with `too_many_entries`, ten are fine', () => {
    const list = (n: number) =>
      Array.from({ length: n }, (_, i) => JSON.parse(JSON.stringify(oiEntry({ id: `e${i}` }))));
    const ten = parse(block(list(OTHER_INCOME_LIMITS.maxEntries)));
    expect(ten.ok && ten.problems).toEqual([]);
    const eleven = parse(block(list(11)));
    expect(eleven.ok && eleven.problems).toEqual(['entries.too_many_entries']);
    const huge = parse(block(list(5000)));
    expect(huge.ok && huge.problems).toEqual(['entries.too_many_entries']);
    expect(huge.ok && huge.value.entries).toHaveLength(10);
  });

  it('keeps specialist errors (they are shown on the page, not import errors)', () => {
    const r = parse(
      block([
        { ...oiEntry({ id: 'a', name: '' }) }, // empty name
        { ...oiEntry({ id: 'a' }), start: { mode: 'age', age: 70 }, end: { mode: 'age', age: 65 } }, // end before start, repeated id
        { ...oiEntry({ id: 'b', taxMode: 'percent' }) }, // percent without share
        { ...oiEntry({ id: 'c', amountBasis: 'nominalAtStart' }), start: { mode: 'age', age: 18 } }, // start in the past
      ]),
    );
    expect(r.ok && r.problems).toEqual([]);
    expect(r.ok && r.value.entries).toHaveLength(4);
  });

  it('never throws, whatever it is given', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const r = parse(value);
        if (!r.ok) return true;
        return r.value.entries.every(
          (e) =>
            Number.isFinite(e.amountMonthly) &&
            e.amountMonthly >= 0 &&
            e.amountMonthly <= 100_000 &&
            Number.isFinite(e.survivorPercent),
        );
      }),
      { numRuns: 500 },
    );
    fc.assert(
      fc.property(fc.array(fc.jsonValue(), { maxLength: 12 }), (entries) => {
        const r = parse(block(entries));
        return !r.ok || r.value.entries.length <= 10;
      }),
      { numRuns: 300 },
    );
  });
});

describe('workspace format version 2 (the block otherIncome; the current version is 3)', () => {
  it('is version 3 now and the step from 1 is the identity', () => {
    expect(WORKSPACE_SCHEMA_VERSION).toBe(3);
    const sample = { schemaVersion: 1, household: { id: 'h' } };
    expect(WORKSPACE_MIGRATIONS[1]!(sample)).toBe(sample);
  });

  it('loads a version 1 file (no block) with an empty list and no warnings', () => {
    const r = parseWorkspace(workspaceText(undefined, 1), YEAR, FORMAT);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual([]);
    expect(r.workspace.schemaVersion).toBe(3);
    expect(r.workspace.byPerson.p1!.otherIncome).toBeUndefined();
    const { blocks } = applyWorkspace(r.workspace);
    expect(blocks.p1!.otherIncome).toBeUndefined(); // the app falls back to the default: an empty list
    expect(serializeWorkspace(r.workspace)).toContain('"schemaVersion": 3');
  });

  it('migrates all example files written in version 1 (the files of the previous release)', () => {
    const dir = join(__dirname, '../../../../examples');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.workspace.json'))) {
      const v2 = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Loose;
      v2.schemaVersion = 1;
      for (const blocks of Object.values<Loose>(v2.byPerson)) delete blocks.otherIncome;
      const r = parseWorkspace(JSON.stringify(v2), YEAR, FORMAT);
      expect(r.status, file).toBe('ok');
      if (r.status === 'ok') expect(r.warnings, file).toEqual([]);
    }
  });

  it('refuses version 4 (and keeps refusing 0 and non-integers)', () => {
    for (const version of [4, 99]) {
      const r = parseWorkspace(workspaceText(undefined, version), YEAR, FORMAT);
      expect(r).toEqual({
        status: 'error',
        issues: [{ code: 'newer_version', field: 'schemaVersion' }],
      });
    }
    for (const version of [0, -1, 1.5]) {
      const r = parseWorkspace(workspaceText(undefined, version), YEAR, FORMAT);
      expect(r.status).toBe('error');
    }
  });

  it('round-trips entries and writes the block before the overview block', () => {
    const household = defaultHouseholdState(YEAR, ASSUMPTIONS, 'Alex');
    const entries = [
      oiEntry({ id: 'a' }),
      oiEntry({ id: 'b', amountMonthly: 250.5, survivorPercent: 40 }),
    ];
    const w = buildWorkspace(
      household,
      { p1: { otherIncome: state(entries), overview: defaultBlock('overview', YEAR) } },
      { format: FORMAT, appVersion: '0', exportedAt: '2026-11-23T10:00:00.000Z' },
      YEAR,
    );
    const text = serializeWorkspace(w);
    expect(text.indexOf('"otherIncome"')).toBeGreaterThan(-1);
    expect(text.indexOf('"otherIncome"')).toBeLessThan(text.indexOf('"overview"'));
    const r = parseWorkspace(text, YEAR, FORMAT);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual([]);
    expect(r.workspace).toEqual(w);
    expect(serializeWorkspace(r.workspace)).toBe(text);
    expect(applyWorkspace(r.workspace).blocks.p1!.otherIncome).toEqual(state(entries));
  });

  it('property: parse(serialize(w)) keeps any valid entry list', () => {
    const entryArb = fc
      .record({
        amount: fc.double({ min: 0, max: 100_000, noNaN: true }),
        percent: fc.double({ min: -50, max: 100, noNaN: true }),
        age: fc.integer({ min: 18, max: 100 }),
        share: fc.double({ min: 0, max: 100, noNaN: true }),
        name: fc
          .string({ minLength: 1, maxLength: 60 })
          .filter((s) => s.trim() !== '' && !hasControlCharacters(s)),
      })
      .map((r) =>
        oiEntry({
          name: r.name,
          amountMonthly: r.amount,
          adjustment: { mode: 'fixed', percent: r.percent },
          start: { mode: 'age', age: r.age },
          taxMode: 'percent',
          taxSharePercent: r.share,
          survivorPercent: r.share,
        }),
      );
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 10 }), (list) => {
        const entries = list.map((e, i) => ({ ...e, id: `e${i}` }));
        const w = buildWorkspace(
          defaultHouseholdState(YEAR, ASSUMPTIONS, 'A'),
          { p1: { otherIncome: state(entries) } },
          { format: FORMAT, appVersion: '0', exportedAt: '2026-11-23T10:00:00.000Z' },
          YEAR,
        );
        const text = serializeWorkspace(w);
        const r = parseWorkspace(text, YEAR, FORMAT);
        return (
          r.status === 'ok' && r.warnings.length === 0 && serializeWorkspace(r.workspace) === text
        );
      }),
      { numRuns: 100 },
    );
  });

  it('drops an invalid block at import, keeps the household and the other blocks', () => {
    const raw = JSON.parse(workspaceText(block([oiEntry()]))) as Loose;
    raw.byPerson.p1.depot = defaultBlock('depot', YEAR);
    raw.byPerson.p1.otherIncome.entries[0].amountMonthly = 'many';
    const r = parseWorkspace(JSON.stringify(raw), YEAR, FORMAT);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual([
      {
        code: 'block_replaced',
        personId: 'p1',
        block: 'otherIncome',
        fields: ['entries.0.amountMonthly'],
      },
    ]);
    expect(r.workspace.byPerson.p1!.otherIncome).toBeUndefined();
    expect(r.workspace.byPerson.p1!.depot).toBeDefined();
  });

  it('warns `too_many_entries` for 11 entries and drops only that block', () => {
    const entries = Array.from({ length: 11 }, (_, i) => oiEntry({ id: `e${i}` }));
    const r = parseWorkspace(workspaceText(state(entries)), YEAR, FORMAT);
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.warnings).toEqual([
      {
        code: 'block_replaced',
        personId: 'p1',
        block: 'otherIncome',
        fields: ['entries.too_many_entries'],
      },
    ]);
    expect(r.workspace.byPerson.p1!.otherIncome).toBeUndefined();
    expect(r.workspace.household.persons).toHaveLength(1);
  });

  it('refuses the whole file for a forbidden key inside the block, without polluting', () => {
    const text = workspaceText(block([oiEntry()])).replace(
      '"survivorPercent":0',
      '"survivorPercent":0,"__proto__":{"polluted":true}',
    );
    expect(text).toContain('__proto__');
    const r = parseWorkspace(text, YEAR, FORMAT);
    expect(r).toEqual({ status: 'error', issues: [{ code: 'forbidden_key', field: '__proto__' }] });
    expect(({} as Loose).polluted).toBeUndefined();
  });

  it('leaves out an invalid block when building', () => {
    const w = buildWorkspace(
      defaultHouseholdState(YEAR, ASSUMPTIONS, 'A'),
      { p1: { otherIncome: block([{ ...oiEntry(), amountMonthly: NaN }]) } },
      { format: FORMAT, appVersion: '0', exportedAt: '2026-11-23T10:00:00.000Z' },
      YEAR,
    );
    expect(w.byPerson.p1!.otherIncome).toBeUndefined();
  });

  it('20 persons with 10 entries each stay far below the size limit and parse', () => {
    const base = JSON.parse(workspaceText(undefined)) as Loose;
    const person = base.household.persons[0] as Loose;
    base.household.persons = [];
    base.byPerson = {};
    for (let i = 1; i <= WORKSPACE_LIMITS.maxPersons; i++) {
      base.household.persons.push({ ...person, id: `p${i}`, name: `Person ${i}` });
      base.byPerson[`p${i}`] = {
        otherIncome: state(
          Array.from({ length: 10 }, (_, j) =>
            oiEntry({
              id: `entry-${j}`,
              name: `Entry number ${j} with a long name to stay realistic`,
            }),
          ),
        ),
      };
    }
    base.activePersonId = 'p1';
    const text = JSON.stringify(base, null, 2);
    expect(text.length).toBeLessThan(500_000);
    expect(text.length).toBeLessThan(WORKSPACE_LIMITS.maxChars);
    const r = parseWorkspace(text, YEAR, FORMAT);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.warnings).toEqual([]);
  });
});

describe('examples with entries', () => {
  it('the couple example has entries that calculate in the household overview', () => {
    const text = readFileSync(
      join(__dirname, '../../../../examples/couple.workspace.json'),
      'utf8',
    );
    const r = parseWorkspace(text, YEAR, FORMAT);
    if (r.status !== 'ok') throw new Error('parse');
    expect(r.warnings).toEqual([]);
    expect(r.workspace.meta?.synthetic).toBe(true);
    const { state: hs, blocks } = applyWorkspace(r.workspace);
    const products = Object.fromEntries(
      hs.household.persons.map((p) => [
        p.id,
        buildOtherIncomeProducts(blocks[p.id]?.otherIncome?.entries ?? [], {
          ...personContext(hs.household, p),
          legal: LEGAL_OI,
          currentYear: YEAR,
        }),
      ]),
    );
    expect(Object.values(products).flat().length).toBe(3);
    expect(
      Object.values(products)
        .flat()
        .every((p) => p.outcome.ok),
    ).toBe(true);
    const out = householdOverview(
      hs.household,
      products,
      YEAR,
      LEGAL_OI.incomeTax,
      LEGAL_OI.pension,
    );
    expect(out.ok).toBe(true);
    if (out.ok)
      expect(out.result.scenarios.neutral.snapshot.netMonthlyPensionReal).toBeGreaterThan(0);
  });
});
