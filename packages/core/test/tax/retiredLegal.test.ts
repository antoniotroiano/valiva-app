import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveLegalParameters, taxableShare, taxableShareForStartYear } from '../../src';
import type { DepotKey, IncomeTaxKey, LegalConfig, PensionKey, SocialKey } from '../../src';
import { LEGAL, LEGAL_R, RETIRED_LEGAL } from '../pensionFixtures';

const root = join(__dirname, '../../../../config');
const read = <K extends string>(f: string) =>
  JSON.parse(readFileSync(join(root, f), 'utf8')) as LegalConfig<K>;
const four = () =>
  [
    read<PensionKey>('pension-de.json'),
    read<SocialKey>('social-de.json'),
    read<DepotKey>('altersvorsorge-de.json'),
    read<IncomeTaxKey>('income-tax-de.json'),
  ] as const;

/** §22 Nr. 1 Satz 3 Buchst. a aa EStG, read on gesetze-im-internet.de on 2026-11-24, as an independent list. */
const LAW_TABLE: Record<number, number> = {
  2005: 50,
  2006: 52,
  2007: 54,
  2008: 56,
  2009: 58,
  2010: 60,
  2011: 62,
  2012: 64,
  2013: 66,
  2014: 68,
  2015: 70,
  2016: 72,
  2017: 74,
  2018: 76,
  2019: 78,
  2020: 80,
  2021: 81,
  2022: 82,
  2023: 82.5,
  2024: 83,
  2025: 83.5,
  2026: 84,
  2027: 84.5,
  2028: 85,
  2030: 86,
  2040: 91,
  2050: 96,
  2057: 99.5,
  2058: 100,
};

describe('retiree-mode config values', () => {
  it('resolve with the flag and match the fixture', () => {
    const r = resolveLegalParameters(...four(), '2026-11-24', undefined, undefined, true);
    if (!r.ok) throw new Error(r.missingOrExpired.join());
    expect(r.legal).toEqual(LEGAL_R);
    expect(r.legal.unverified).toEqual(LEGAL.unverified);
  });

  it('are not part of the result without the flag, so older callers stay unchanged', () => {
    const r = resolveLegalParameters(...four(), '2026-11-24');
    if (!r.ok) throw new Error(r.missingOrExpired.join());
    expect(r.legal.retired).toBeUndefined();
    expect(r.legal).toEqual(LEGAL);
  });

  it('carry source, German source and a status like every other value', () => {
    const p = read<PensionKey>('pension-de.json').retired!;
    const s = read<SocialKey>('social-de.json').retired!;
    for (const v of [
      p.taxableShareTable!,
      p.taxFreeAmountFixedFromYearAfterStart!,
      s.careChildlessExemptBeforeBirthYear!,
    ]) {
      expect(v.source.length).toBeGreaterThan(0);
      expect(v.sourceDe.length).toBeGreaterThan(0);
      expect(['confirmed', 'unverified']).toContain(v.status);
      expect(v.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(p.taxFreeAmountFixedFromYearAfterStart!.sourceDe).toContain('Bezugsjahr');
  });

  it('report the keys as missing when the section is absent, malformed or not yet valid', () => {
    const [p, s, d, t] = four();
    const noSection = resolveLegalParameters(
      { ...p, retired: undefined },
      { ...s, retired: undefined },
      d,
      t,
      '2026-11-24',
      undefined,
      undefined,
      true,
    );
    expect(noSection.ok).toBe(false);
    const broken = resolveLegalParameters(
      {
        ...p,
        retired: {
          ...p.retired,
          taxableShareTable: {
            ...p.retired!.taxableShareTable!,
            tiers: [{ fromYear: 2005, percent: Number.NaN }],
          },
        },
      },
      s,
      d,
      t,
      '2026-11-24',
      undefined,
      undefined,
      true,
    );
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.missingOrExpired).toContain('pension.taxableShareTable');
    const early = resolveLegalParameters(p, s, d, t, '2025-12-31', undefined, undefined, true);
    expect(early.ok).toBe(false);
  });

  it('mark an unverified status and sort the steps', () => {
    const [p, s, d, t] = four();
    const shuffled = {
      ...p.retired!.taxableShareTable!,
      status: 'unverified' as const,
      tiers: [...p.retired!.taxableShareTable!.tiers].reverse(),
    };
    const r = resolveLegalParameters(
      { ...p, retired: { ...p.retired, taxableShareTable: shuffled } },
      {
        ...s,
        retired: {
          ...s.retired,
          careChildlessExemptBeforeBirthYear: {
            ...s.retired!.careChildlessExemptBeforeBirthYear!,
            status: 'unverified',
          },
        },
      },
      d,
      t,
      '2026-11-24',
      undefined,
      undefined,
      true,
    );
    if (!r.ok) throw new Error(r.missingOrExpired.join());
    expect(r.legal.retired?.taxableShareTiers[0]?.fromYear).toBe(2005);
    expect(r.legal.unverified).toEqual(
      expect.arrayContaining([
        'pension.taxableShareTable',
        'social.careChildlessExemptBeforeBirthYear',
      ]),
    );
  });
});

describe('taxableShareForStartYear', () => {
  it('matches the table of the law for every year of the sample', () => {
    for (const [year, percent] of Object.entries(LAW_TABLE)) {
      expect(taxableShareForStartYear(Number(year), LEGAL_R)).toBeCloseTo(percent, 10);
    }
  });

  it('covers every start up to 2005 with 50 % and never goes below it', () => {
    for (const y of [1950, 1990, 2004, 2005]) expect(taxableShareForStartYear(y, LEGAL_R)).toBe(50);
  });

  it('agrees with the planning formula from the base year on and caps at 100 %', () => {
    for (const y of [2026, 2035, 2058, 2070]) {
      expect(taxableShareForStartYear(y, LEGAL_R)).toBe(taxableShare(y, LEGAL).percent);
    }
    expect(taxableShareForStartYear(2080, LEGAL_R)).toBe(100);
  });

  it('never decreases with a later start year', () => {
    let last = 0;
    for (let y = 1950; y <= 2070; y++) {
      const v = taxableShareForStartYear(y, LEGAL_R)!;
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });

  it('is undefined without a table', () => {
    expect(taxableShareForStartYear(2019, LEGAL)).toBeUndefined();
  });

  it('keeps the fixture in sync with the config', () => {
    const t = read<PensionKey>('pension-de.json').retired!.taxableShareTable!.tiers;
    expect(t).toEqual(RETIRED_LEGAL.taxableShareTiers);
  });
});
