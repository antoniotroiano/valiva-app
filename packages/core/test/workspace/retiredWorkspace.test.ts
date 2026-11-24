import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_LIMITS,
  WORKSPACE_MIGRATIONS,
  WORKSPACE_SCHEMA_VERSION,
  applyWorkspace,
  buildRetiredProducts,
  householdOverview,
  parseWorkspace,
  personContext,
  serializeWorkspace,
} from '../../src';
import type { OverviewProductInput } from '../../src';
import { JOINT, LEGAL, LEGAL_R } from '../pensionFixtures';

const YEAR = 2026;
const FORMAT = 'valiva-workspace';
const examples = join(__dirname, '../../../../examples');
const v2dir = join(__dirname, '../fixtures/workspace-v2');
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const load = (dir: string, file: string): Loose =>
  JSON.parse(readFileSync(join(dir, file), 'utf8')) as Loose;
const parse = (value: unknown, year = YEAR) =>
  parseWorkspace(typeof value === 'string' ? value : JSON.stringify(value), year, FORMAT);
const errors = (value: unknown) => {
  const r = parse(value);
  return r.status === 'error' ? r.issues : [];
};
/** The couple example with one change applied to a copy. */
const mutate = (fn: (w: Loose) => void, file = 'couple-retired.workspace.json') => {
  const w = load(examples, file);
  fn(w);
  return w;
};
const marta = (w: Loose) => w.household.persons[0] as Loose;

describe('workspace format version 3', () => {
  it('is version 3, and the steps from 1 and from 2 are the identity', () => {
    expect(WORKSPACE_SCHEMA_VERSION).toBe(3);
    const sample = { schemaVersion: 2, household: { id: 'h' } };
    expect(WORKSPACE_MIGRATIONS[2]!(sample)).toBe(sample);
    expect(WORKSPACE_MIGRATIONS[1]!(sample)).toBe(sample);
  });

  it('loads every real example file of version 2 (copies of the previous release) without warnings', () => {
    const files = readdirSync(v2dir).filter((f) => f.endsWith('.v2.json'));
    expect(files).toHaveLength(3);
    for (const file of files) {
      const raw = readFileSync(join(v2dir, file), 'utf8');
      expect(JSON.parse(raw).schemaVersion, file).toBe(2);
      const r = parse(raw);
      expect(r.status, file).toBe('ok');
      if (r.status !== 'ok') continue;
      expect(r.warnings, file).toEqual([]);
      expect(r.workspace.schemaVersion).toBe(3);
      for (const person of r.workspace.household.persons) {
        expect(person.retired, file).toBeUndefined();
        expect(person.retirementStartYear, file).toBeUndefined();
      }
      // Written again, only the version differs from the old file: nothing was lost or added.
      const again = JSON.parse(serializeWorkspace(r.workspace)) as Loose;
      expect(again.schemaVersion).toBe(3);
      expect({ ...again, schemaVersion: 2 }).toEqual(JSON.parse(raw));
    }
  });

  it('loads a file of version 1 as well (chain 1, 2, 3)', () => {
    const v1 = load(v2dir, 'single.v2.json');
    v1.schemaVersion = 1;
    for (const blocks of Object.values<Loose>(v1.byPerson)) delete blocks.otherIncome;
    expect(parse(v1).status).toBe('ok');
  });

  it('refuses version 4 and, for an app of version 2, refuses a file of version 3 instead of misreading it', () => {
    expect(errors(mutate((w) => (w.schemaVersion = 4)))).toEqual([
      { code: 'newer_version', field: 'schemaVersion' },
    ]);
    const old = parseWorkspace(
      JSON.stringify(load(examples, 'retired.workspace.json')),
      YEAR,
      FORMAT,
      { 1: (w) => w },
      2,
    );
    expect(old).toEqual({
      status: 'error',
      issues: [{ code: 'newer_version', field: 'schemaVersion' }],
    });
  });

  it('writes the version 3 into every file it serializes', () => {
    const r = parse(readFileSync(join(v2dir, 'single.v2.json'), 'utf8'));
    if (r.status !== 'ok') throw new Error('parse');
    expect(serializeWorkspace(r.workspace)).toContain('"schemaVersion": 3');
  });
});

describe('the retiree-mode examples', () => {
  const files = ['retired.workspace.json', 'couple-retired.workspace.json'];

  it.each(files)(
    '%s parses without warnings, is synthetic and byte-identical after serialize',
    (file) => {
      const text = readFileSync(join(examples, file), 'utf8');
      const r = parse(text);
      if (r.status !== 'ok') throw new Error(JSON.stringify(r));
      expect(r.warnings).toEqual([]);
      expect(r.workspace.meta?.synthetic).toBe(true);
      expect(r.workspace.schemaVersion).toBe(3);
      expect(serializeWorkspace(r.workspace)).toBe(text);
      const person = r.workspace.household.persons[0]!;
      expect(person.retired).toBe(true);
      expect(person.retirementStartYear).toBe(2019);
    },
  );

  it('give a household overview: transition 2026 to 2028, snapshot 2029, tile for Marta', () => {
    const r = parse(readFileSync(join(examples, 'couple-retired.workspace.json'), 'utf8'));
    if (r.status !== 'ok') throw new Error('parse');
    const { state, blocks } = applyWorkspace(r.workspace);
    const marta = state.household.persons[0]!;
    const b = blocks[marta.id]!;
    const ctx = { ...personContext(state.household, marta), legal: LEGAL_R, currentYear: YEAR };
    const products: Record<string, OverviewProductInput[]> = {
      [marta.id]: buildRetiredProducts(
        {
          statutory: b.statutory!,
          occupational: b.occupational!,
          depot: b.depot!,
          etfPayout: b.etfPayout!,
          enabled: b.overview!.enabled,
          etf: {
            tax: { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 },
          },
        },
        ctx,
      ),
      [state.household.persons[1]!.id]: [],
    };
    const out = householdOverview(
      state.household,
      products,
      YEAR,
      LEGAL.incomeTax,
      LEGAL.pension,
      JOINT,
    );
    if (!out.ok) throw new Error(JSON.stringify(out.issues));
    const s = out.result.scenarios.neutral;
    expect(out.result.snapshotYear).toBe(2029);
    expect(s.path.filter((p) => p.transition).map((p) => p.year)).toEqual([2026, 2027, 2028]);
    expect(s.retiredToday?.[0]?.name).toBe('Marta Beispiel');
    expect(s.retiredToday![0]!.netMonthlyReal).toBeGreaterThan(1500);
    expect(out.result.survivor?.survivorId).toBe('p2');
  });
});

describe('person fields are checked strictly on import', () => {
  it.each([null, 1, 0, 'true', 'false', {}, [], [true]])('rejects `retired` = %j', (value) => {
    const issues = errors(mutate((w) => (marta(w).retired = value)));
    expect(issues).toEqual([{ code: 'invalid_field', field: 'household.persons.0.retired' }]);
  });

  it('accepts true and false and keeps them', () => {
    for (const value of [true, false]) {
      const r = parse(mutate((w) => (marta(w).retired = value)));
      expect(r.status === 'ok' && r.workspace.household.persons[0]!.retired).toBe(value);
    }
  });

  it.each([null, '2019', true, {}, [], Number.POSITIVE_INFINITY, 1e13])(
    'rejects `retirementStartYear` = %j as not a usable number',
    (value) => {
      // JSON.stringify turns Infinity into null, so write the number as text for that case
      const w = mutate((x) => (marta(x).retirementStartYear = value));
      const text = JSON.stringify(w).replace(
        '"retirementStartYear":null',
        '"retirementStartYear":1e999',
      );
      const raw = value === Number.POSITIVE_INFINITY ? text : JSON.stringify(w);
      expect(errors(raw)).toEqual([
        { code: 'invalid_field', field: 'household.persons.0.retirementStartYear' },
      ]);
    },
  );

  it('household validation: required, not an integer, out of the band are import errors', () => {
    const fields = (fn: (p: Loose) => void) =>
      errors(mutate((w) => fn(marta(w)))).map((i) => `${i.code}:${i.field}`);
    expect(fields((p) => delete p.retirementStartYear)).toEqual([
      'invalid_household:persons.p1.retirementStartYear',
    ]);
    expect(fields((p) => (p.retirementStartYear = 2019.5))).toEqual([
      'invalid_household:persons.p1.retirementStartYear',
    ]);
    expect(fields((p) => (p.retirementStartYear = 2004))).toEqual([
      'invalid_household:persons.p1.retirementStartYear',
    ]);
    expect(fields((p) => (p.retirementStartYear = 2031))).toEqual([
      'invalid_household:persons.p1.retirementStartYear',
    ]);
  });

  it('a start year without `retired` is ignored; `retired: false` stays a planning person', () => {
    const r = parse(
      mutate((w) => {
        marta(w).retired = false;
        marta(w).retirementStartYear = 1900;
      }),
    );
    expect(r.status).toBe('ok');
  });

  it('specialist errors are no import errors: a start in the future and a life expectancy in the past are stored', () => {
    const future = parse(mutate((w) => (marta(w).retirementStartYear = 2030)));
    expect(future.status).toBe('ok');
    const early = parse(
      mutate((w) => (marta(w).retirementStartYear = 2019)),
      2018,
    );
    // the household of the file was valid in 2018 as well: the check is the band, not the calendar
    expect(early.status).toBe('ok');
    const dead = parse(
      mutate((w) => {
        marta(w).birthYear = 1930;
        marta(w).retirementStartYear = 1990;
        marta(w).lifeExpectancyAge = 90;
      }),
    );
    expect(dead.status).toBe('ok');
    expect(dead.status === 'ok' && dead.workspace.household.persons[0]!.lifeExpectancyAge).toBe(90);
  });

  it('forbidden keys are refused on every level', () => {
    const at = (fn: (w: Loose) => void) => {
      const text = JSON.stringify(mutate(fn)).replace('"X"', '"__proto__"');
      return errors(text);
    };
    const forbidden = [{ code: 'forbidden_key', field: '__proto__' }];
    expect(at((w) => (w.X = 1))).toEqual(forbidden);
    expect(at((w) => (w.household.X = 1))).toEqual(forbidden);
    expect(at((w) => (marta(w).X = 1))).toEqual(forbidden);
    expect(at((w) => (marta(w).personalAssumptions.X = 1))).toEqual(forbidden);
    expect(at((w) => (w.byPerson.p1.statutory.X = 1))).toEqual(forbidden);
    expect(at((w) => (w.byPerson.p1.occupational.annuityAdjustment.X = 1))).toEqual(forbidden);
    for (const key of ['constructor', 'prototype']) {
      const text = JSON.stringify(mutate((w) => (marta(w).X = 1))).replace('"X"', `"${key}"`);
      expect(errors(text)).toEqual([{ code: 'forbidden_key', field: key }]);
    }
    expect(({} as Loose).polluted).toBeUndefined();
  });

  it('file limits are unchanged: persons, children, size', () => {
    expect(WORKSPACE_LIMITS.maxPersons).toBe(20);
    expect(WORKSPACE_LIMITS.maxChars).toBe(2_000_000);
    const manyChildren = errors(
      mutate((w) => (marta(w).childrenBirthYears = Array(21).fill(1990))),
    );
    expect(manyChildren.map((i) => i.code)).toContain('invalid_field');
    const tooMany = mutate((w) => {
      const base = marta(w);
      w.household.persons = Array.from({ length: 21 }, (_, i) => ({ ...base, id: `x${i}` }));
    });
    expect(errors(tooMany).map((i) => i.code)).toEqual(['too_many_persons']);
    const huge =
      JSON.stringify(mutate((w) => (w.household.name = 'x'.repeat(10)))) + ' '.repeat(2_000_001);
    expect(errors(huge).map((i) => i.code)).toEqual(['too_large']);
  });

  it('property: any value for `retired` is accepted as a boolean or refused with a field issue, never a crash', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const w = mutate((x) => (marta(x).retired = value));
        let r;
        try {
          r = parse(w);
        } catch {
          throw new Error('parseWorkspace threw');
        }
        if (typeof value === 'boolean') expect(r.status).toBe('ok');
        else if (value !== undefined) expect(r.status).toBe('error');
      }),
    );
  });
});

describe('blocks of a retired person on import', () => {
  const block = (name: string, fn: (b: Loose) => void) => {
    const r = parse(mutate((w) => fn(w.byPerson.p1[name] as Loose)));
    if (r.status !== 'ok') throw new Error(JSON.stringify(r));
    return r;
  };

  it('keeps the valid fields and drops unknown ones', () => {
    const r = block('statutory', (b) => (b.unknown = 1));
    expect(r.warnings).toEqual([]);
    const s = r.workspace.byPerson.p1!.statutory as Loose;
    expect(s.actualMonthlyGross).toBe(1650);
    expect('unknown' in s).toBe(false);
  });

  it.each([
    ['statutory', 'actualMonthlyGross', 20001],
    ['statutory', 'actualMonthlyGross', '1650'],
    ['statutory', 'mode', 'both'],
    ['depot', 'retiredCapitalToday', -1],
    ['depot', 'retiredEndAge', 90.5],
    ['occupational', 'retiredForm', 'rest'],
    ['occupational', 'annuityEndAge', 'forever'],
    ['occupational', 'annuityMonthlyGross', 20001],
    ['etfPayout', 'holdingValue', 5e7 + 1],
    ['etfPayout', 'holdingContributions', 'many'],
  ])('replaces the block %s when %s is %j (warning, no import error)', (name, key, value) => {
    const r = block(name, (b) => (b[key] = value));
    expect(r.warnings).toEqual([
      { code: 'block_replaced', personId: 'p1', block: name, fields: [key] },
    ]);
    expect(r.workspace.byPerson.p1![name as 'statutory']).toBeUndefined();
  });

  it('round-trips the retiree example exactly', () => {
    const text = readFileSync(join(examples, 'retired.workspace.json'), 'utf8');
    const first = parse(text);
    if (first.status !== 'ok') throw new Error('parse');
    const second = parse(serializeWorkspace(first.workspace));
    expect(second.status === 'ok' && second.workspace).toEqual(first.workspace);
  });
});
