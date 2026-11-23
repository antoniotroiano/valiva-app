import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OTHER_INCOME_KEYS,
  OTHER_INCOME_LIMITS,
  isValidOtherIncomeName,
  otherIncomeSurvivorHint,
  resolveLegalParameters,
  validateOtherIncomeEntry,
  validateOtherIncomeState,
} from '../../src';
import type {
  DepotKey,
  IncomeTaxKey,
  LegalConfig,
  OtherIncomeEntry,
  OtherIncomeKey,
  PensionKey,
  SocialKey,
} from '../../src';
import { LEGAL, LEGAL_OI, OI_CTX, UNVERIFIED_RULE_KEYS, oiEntry } from '../pensionFixtures';

const root = join(__dirname, '../../../../config');
const read = <K extends string>(f: string) =>
  JSON.parse(readFileSync(join(root, f), 'utf8')) as LegalConfig<K>;

const codes = (e: OtherIncomeEntry) =>
  validateOtherIncomeEntry(e, OI_CTX).map((i) => `${i.field}:${i.code}`);

describe('config/other-income-de.json', () => {
  const config = read<OtherIncomeKey>('other-income-de.json');
  const four = [
    read<PensionKey>('pension-de.json'),
    read<SocialKey>('social-de.json'),
    read<DepotKey>('altersvorsorge-de.json'),
    read<IncomeTaxKey>('income-tax-de.json'),
  ] as const;

  it('has exactly the five rule keys, only the Riester simplification unverified, with the usual fields', () => {
    expect(Object.keys(config.values).sort()).toEqual([...OTHER_INCOME_KEYS].sort());
    for (const v of Object.values(config.values)) {
      expect(v.status).toBe(
        UNVERIFIED_RULE_KEYS.some((k) => config.values[k] === v) ? 'unverified' : 'confirmed',
      );
      expect(v.value).toBe(1);
      expect(v.unit).toBe('rule');
      expect(v.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.validTo).toBeNull();
      expect(v.source.length).toBeGreaterThan(0);
      expect(v.sourceDe.length).toBeGreaterThan(0);
    }
  });

  it('resolves into the test fixture and lists only the unverified rule', () => {
    const r = resolveLegalParameters(...four, '2026-11-11', config);
    if (!r.ok) throw new Error(r.missingOrExpired.join());
    expect(r.legal).toEqual(LEGAL_OI);
    expect(r.legal.unverified).toEqual(
      expect.arrayContaining(UNVERIFIED_RULE_KEYS.map((k) => `otherIncome.${k}`)),
    );
    expect(r.legal.unverified.filter((k) => k.startsWith('otherIncome.'))).toEqual(
      UNVERIFIED_RULE_KEYS.map((k) => `otherIncome.${k}`),
    );
  });

  it('leaves existing callers unchanged without the fifth file', () => {
    const r = resolveLegalParameters(...four, '2026-11-11');
    if (!r.ok) throw new Error(r.missingOrExpired.join());
    expect(r.legal).toEqual(LEGAL);
    expect(r.legal.otherIncome).toBeUndefined();
  });

  it('reports expired rules as data', () => {
    const r = resolveLegalParameters(...four, '2020-01-01', config);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missingOrExpired).toContain('otherIncome.basisPensionTaxShare');
  });
});

describe('validateOtherIncomeEntry', () => {
  it('accepts a valid entry and the extreme valid values', () => {
    expect(codes(oiEntry())).toEqual([]);
    expect(
      codes(
        oiEntry({
          amountMonthly: 100_000,
          adjustment: { mode: 'fixed', percent: -50 },
          start: { mode: 'age', age: 18 },
          end: { mode: 'age', age: 120 },
          survivorPercent: 100,
        }),
      ),
    ).toEqual([]);
    expect(
      codes(oiEntry({ amountMonthly: 0, adjustment: { mode: 'fixed', percent: 100 } })),
    ).toEqual([]);
  });

  it('checks structure and finiteness first', () => {
    expect(codes(oiEntry({ amountMonthly: NaN }))).toEqual(['amountMonthly:not_finite']);
    expect(codes(oiEntry({ amountMonthly: Infinity }))).toEqual(['amountMonthly:not_finite']);
    expect(codes(oiEntry({ amountMonthly: -1 }))).toEqual(['amountMonthly:out_of_range']);
    expect(codes(oiEntry({ amountMonthly: 100_000.01 }))).toEqual(['amountMonthly:out_of_range']);
    expect(codes(oiEntry({ adjustment: { mode: 'fixed', percent: -50.1 } }))).toEqual([
      'adjustment.percent:out_of_range',
    ]);
    expect(codes(oiEntry({ adjustment: { mode: 'fixed', percent: NaN } }))).toEqual([
      'adjustment.percent:not_finite',
    ]);
    expect(codes(oiEntry({ start: { mode: 'age', age: 17 } }))).toEqual(['start.age:out_of_range']);
    expect(codes(oiEntry({ start: { mode: 'age', age: 101 } }))).toEqual([
      'start.age:out_of_range',
    ]);
    expect(codes(oiEntry({ start: { mode: 'age', age: 67.5 } }))).toEqual([
      'start.age:not_integer',
    ]);
    expect(codes(oiEntry({ end: { mode: 'age', age: 121 } }))).toEqual(['end.age:out_of_range']);
    expect(codes(oiEntry({ survivorPercent: 101 }))).toEqual(['survivorPercent:out_of_range']);
    expect(codes(oiEntry({ survivorPercent: -1 }))).toEqual(['survivorPercent:out_of_range']);
    expect(codes(oiEntry({ taxMode: 'percent', taxSharePercent: 100.5 }))).toEqual([
      'taxSharePercent:out_of_range',
    ]);
  });

  it('rejects unknown enum values and modes', () => {
    const bad = (over: Record<string, unknown>) =>
      codes(oiEntry(over as Partial<OtherIncomeEntry>));
    expect(bad({ kind: 'crypto' })).toEqual(['kind:required']);
    expect(bad({ amountBasis: 'real' })).toEqual(['amountBasis:required']);
    expect(bad({ taxMode: 'half' })).toEqual(['taxMode:required']);
    expect(bad({ contributions: 'all' })).toEqual(['contributions:required']);
    expect(bad({ adjustment: { mode: 'magic' } })).toEqual(['adjustment.mode:required']);
    expect(bad({ start: { mode: 'later' } })).toEqual(['start.mode:required']);
    expect(bad({ end: { mode: 'never' } })).toEqual(['end.mode:required']);
    expect(bad({ adjustment: undefined })).toEqual(['adjustment.mode:required']);
  });

  it('checks the id format', () => {
    for (const id of ['', 'a b', 'ä', 'x'.repeat(33), '__proto__ ', 'a/b']) {
      expect(codes(oiEntry({ id }))).toEqual(['id:invalid_id']);
    }
    for (const id of ['a', 'A_b-9', 'x'.repeat(32), '__proto__', 'constructor']) {
      expect(codes(oiEntry({ id }))).toEqual([]);
    }
    expect(codes(oiEntry({ id: 5 as unknown as string }))).toEqual(['id:invalid_id']);
  });

  it('checks the name: 1 to 60 characters after trimming, no control characters', () => {
    expect(codes(oiEntry({ name: '' }))).toEqual(['name:name_invalid']);
    expect(codes(oiEntry({ name: '   ' }))).toEqual(['name:name_invalid']);
    expect(codes(oiEntry({ name: 'x'.repeat(61) }))).toEqual(['name:name_invalid']);
    expect(codes(oiEntry({ name: 'bad\u0000name' }))).toEqual(['name:name_invalid']);
    expect(codes(oiEntry({ name: 'line\nbreak' }))).toEqual(['name:name_invalid']);
    expect(codes(oiEntry({ name: 'x'.repeat(60) }))).toEqual([]);
    expect(codes(oiEntry({ name: ' Pension "Müller" ' }))).toEqual([]);
    expect(isValidOtherIncomeName(undefined)).toBe(false);
  });

  it('requires the end to lie after the start (explicit age and retirement)', () => {
    expect(
      validateOtherIncomeEntry(
        oiEntry({ start: { mode: 'age', age: 70 }, end: { mode: 'age', age: 70 } }),
        OI_CTX,
      ),
    ).toEqual([{ field: 'end.age', code: 'end_not_after_start', min: 71 }]);
    expect(
      codes(oiEntry({ start: { mode: 'age', age: 70 }, end: { mode: 'age', age: 71 } })),
    ).toEqual([]);
    // Start with the retirement age (67): an end at 67 is not after it.
    expect(codes(oiEntry({ end: { mode: 'age', age: 67 } }))).toEqual([
      'end.age:end_not_after_start',
    ]);
    expect(codes(oiEntry({ end: { mode: 'age', age: 68 } }))).toEqual([]);
  });

  it('allows start and end before the retirement age', () => {
    expect(
      codes(oiEntry({ start: { mode: 'age', age: 55 }, end: { mode: 'age', age: 60 } })),
    ).toEqual([]);
  });

  it('flags a nominal amount at the start only if the start has already passed', () => {
    // Born 1976, today 2026: age 50 = 2026 (not in the past), age 49 = 2025 (past).
    const nominal = (age: number) =>
      codes(oiEntry({ amountBasis: 'nominalAtStart', start: { mode: 'age', age } }));
    expect(nominal(50)).toEqual([]);
    expect(nominal(49)).toEqual(['amountBasis:nominal_start_in_past']);
    expect(nominal(67)).toEqual([]);
    expect(codes(oiEntry({ amountBasis: 'today', start: { mode: 'age', age: 49 } }))).toEqual([]);
  });

  it('requires a share for the percent tax mode', () => {
    expect(codes(oiEntry({ taxMode: 'percent' }))).toEqual(['taxSharePercent:required']);
    expect(codes(oiEntry({ taxMode: 'percent', taxSharePercent: 0 }))).toEqual([]);
    expect(codes(oiEntry({ taxMode: 'percent', taxSharePercent: 100 }))).toEqual([]);
    expect(codes(oiEntry({ taxMode: 'full' }))).toEqual([]);
  });

  it('returns every issue of an entry (no early exit) and never throws', () => {
    const c = codes(
      oiEntry({
        name: '',
        amountMonthly: NaN,
        survivorPercent: 200,
        end: { mode: 'age', age: 30 },
      }),
    );
    expect(c).toEqual(
      expect.arrayContaining([
        'name:name_invalid',
        'amountMonthly:not_finite',
        'survivorPercent:out_of_range',
        'end.age:end_not_after_start',
      ]),
    );
    expect(() => validateOtherIncomeEntry({} as OtherIncomeEntry, OI_CTX)).not.toThrow();
  });
});

describe('validateOtherIncomeState', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => oiEntry({ id: `e${i}` }));

  it('accepts none, one and ten entries', () => {
    expect(validateOtherIncomeState([], OI_CTX)).toEqual([]);
    expect(validateOtherIncomeState(ids(1), OI_CTX)).toEqual([]);
    expect(validateOtherIncomeState(ids(OTHER_INCOME_LIMITS.maxEntries), OI_CTX)).toEqual([]);
  });

  it('flags more than ten entries', () => {
    expect(validateOtherIncomeState(ids(11), OI_CTX)).toEqual([
      { field: 'entries', code: 'too_many_entries', max: 10 },
    ]);
  });

  it('flags a repeated id on the later entry only', () => {
    const list = [oiEntry({ id: 'a' }), oiEntry({ id: 'b' }), oiEntry({ id: 'a' })];
    expect(validateOtherIncomeState(list, OI_CTX)).toEqual([
      { field: 'entries.2.id', code: 'duplicate_id' },
    ]);
  });

  it('prefixes entry issues with the index', () => {
    const list = [oiEntry({ id: 'a' }), oiEntry({ id: 'b', amountMonthly: -5 })];
    expect(validateOtherIncomeState(list, OI_CTX)).toEqual([
      { field: 'entries.1.amountMonthly', code: 'out_of_range', min: 0, max: 100_000 },
    ]);
  });
});

describe('otherIncomeSurvivorHint', () => {
  const two = { persons: [{}, {}], survivorPension: 'new' as const };
  it('hints only when a share is set and the pair setup is missing', () => {
    expect(otherIncomeSurvivorHint({ survivorPercent: 0 }, { persons: [{}] })).toBeUndefined();
    expect(otherIncomeSurvivorHint({ survivorPercent: 55 }, two)).toBeUndefined();
    expect(otherIncomeSurvivorHint({ survivorPercent: 55 }, { persons: [{}] })).toBe(
      'survivor_needs_pair',
    );
    expect(otherIncomeSurvivorHint({ survivorPercent: 55 }, { persons: [{}, {}] })).toBe(
      'survivor_needs_pair',
    );
    expect(
      otherIncomeSurvivorHint(
        { survivorPercent: 1 },
        { persons: [{}, {}, {}], survivorPension: 'old' },
      ),
    ).toBe('survivor_needs_pair');
  });
});
