import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultAssumptions } from '@valiva/core';
import { de } from '../src/i18n/de';
import { groupItems, legalGroups, unverifiedItems } from '../src/lib/legalGroups';
import { formatLegalValue } from '../src/lib/legalValue';
import { splitSourceText } from '../src/lib/sourceText';
import { AssumptionsPage } from '../src/pages/assumptions/AssumptionsPage';
import { GroupStatus, LegalValues } from '../src/pages/assumptions/LegalValues';

/**
 * AP-12: the Annahmen page shows legal values by area. Unverified values stay visibly marked (also when
 * an area is collapsed), no value is lost and no developer path or review log shows up in the UI.
 */
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

type RawValue = { status: string; sourceDe: string };
const configDir = join(__dirname, '../../../config');
const readJson = (file: string) => JSON.parse(readFileSync(join(configDir, file), 'utf8'));

/** Every value of the six config files, read straight from the JSON (not through the page code). */
function rawValues(): Record<string, RawValue[]> {
  const tax = readJson('tax-de.json');
  const advance = tax.advanceLumpSum;
  return {
    tax: [
      ...Object.values<RawValue>(tax.values),
      advance.baseEarningsFactor,
      ...advance.baseInterest,
      advance.baseInterestAssumed,
    ],
    pension: Object.values<RawValue>(readJson('pension-de.json').values),
    social: Object.values<RawValue>(readJson('social-de.json').values),
    depot: Object.values<RawValue>(readJson('altersvorsorge-de.json').values),
    incomeTax: Object.values<RawValue>(readJson('income-tax-de.json').values),
    otherIncome: Object.values<RawValue>(readJson('other-income-de.json').values),
    jointAssessment: Object.values<RawValue>(readJson('joint-assessment-de.json').values),
  };
}

describe('legal groups', () => {
  const raw = rawValues();
  const groups = legalGroups();

  it('lists every value of every config file, in the seven areas', () => {
    expect(groups.map((g) => g.id)).toEqual([
      'tax',
      'pension',
      'social',
      'depot',
      'incomeTax',
      'otherIncome',
      'jointAssessment',
    ]);
    for (const g of groups) expect(groupItems(g)).toHaveLength(raw[g.id]!.length);
    expect(groups.reduce((n, g) => n + groupItems(g).length, 0)).toBe(91);
  });

  it('counts the unverified values per area as the config says', () => {
    for (const g of groups) {
      const expected = raw[g.id]!.filter((v) => v.status === 'unverified').length;
      expect(unverifiedItems(g)).toHaveLength(expected);
    }
  });

  it('gives every value a German name (no key shown as name)', () => {
    for (const item of groups.flatMap(groupItems)) expect(item.name).not.toBe(item.key);
  });
});

describe('legal values markup', () => {
  const html = render(h(LegalValues));
  const summaryOf = (id: string) => {
    const m = new RegExp(
      `<details class="dt" id="legal-${id}">\\s*<summary>(.*?)</summary>`,
      's',
    ).exec(html);
    if (!m) throw new Error(`no row ${id}`);
    return m[1]!;
  };

  it('starts every area collapsed', () => {
    expect(html).not.toMatch(/<details class="dt"[^>]* open/);
  });

  it('shows the unverified count in the collapsed row of an area with unverified values', () => {
    const raw = rawValues();
    for (const g of legalGroups()) {
      const n = raw[g.id]!.filter((v) => v.status === 'unverified').length;
      const row = summaryOf(g.id);
      if (n > 0) {
        expect(row).toContain(`${n} ungeprüft`);
        expect(row).toContain('chip warn');
        expect(row).not.toContain('alle bestätigt');
      } else {
        expect(row).toContain('alle bestätigt');
        expect(row).not.toContain('ungeprüft');
      }
    }
  });

  it('marks each unverified value itself with a chip and the area note', () => {
    const rows = html.match(/<li class="val unv">.*?<\/li>/gs) ?? [];
    const raw = rawValues();
    const total = Object.values(raw)
      .flat()
      .filter((v) => v.status === 'unverified').length;
    expect(rows).toHaveLength(total);
    for (const row of rows) expect(row).toContain('chip warn');
    expect(html).toContain(de.assumptions.unverifiedNote);
  });

  it('renders one row with a source per value', () => {
    expect((html.match(/<li class="val/g) ?? []).length).toBe(91);
    expect((html.match(/<details class="src"/g) ?? []).length).toBe(91);
  });

  it('shows the overall unverified count above the areas', () => {
    expect(html).toContain('5 ungeprüft');
  });

  it('labels a rule as applied when the law text carries it and as assumed when it is unverified (AP-23)', () => {
    const rule = {
      value: 1,
      unit: 'rule',
      validFrom: '2026-01-01',
      validTo: null,
      source: '',
      sourceDe: '',
    };
    expect(formatLegalValue({ ...rule, status: 'confirmed' })).toBe('wird angewendet');
    expect(formatLegalValue({ ...rule, status: 'unverified' })).toBe('wird angenommen');
  });
});

describe('GroupStatus', () => {
  it('is a warning with a count when values are unverified, otherwise a confirmation', () => {
    expect(render(h(GroupStatus, { unverified: 2 }))).toMatch(/chip warn.*2 ungeprüft/s);
    expect(render(h(GroupStatus, { unverified: 0 }))).toMatch(/chip ok.*alle bestätigt/s);
  });
});

describe('the whole page', () => {
  const html = render(
    h(AssumptionsPage, { assumptions: defaultAssumptions(2.9), goToProfile: () => undefined }),
  );

  it('starts with the own assumptions, then the legal values, then the rules', () => {
    const order = ['your-assumptions', 'legal-values', 'calc-rules', 'id="glossary"'].map((k) =>
      html.indexOf(k),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('shows no config file path and no review log', () => {
    expect(html).not.toMatch(/config\//);
    expect(html).not.toMatch(/\.json/);
    expect(html).not.toContain('geprüft am');
    expect(html).not.toContain('gesetze-im-internet');
    expect(html).not.toMatch(/\(am \d{1,2}\.\d{1,2}\.\d{4} gelesen\)/);
  });

  it('keeps every calculation rule word for word', () => {
    const a = de.assumptions;
    const all = [
      a.rules,
      a.pensionRules,
      a.depotRules,
      a.occupationalRules,
      a.otherIncomeRules,
      a.jointAssessmentRules,
      a.withdrawalRules,
      a.goalRules,
    ];
    for (const rule of all.flat()) {
      expect(html).toContain(
        rule.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;'),
      );
    }
  });

  it('shows the four own assumptions read only with a link to the profile', () => {
    expect(html).toContain('Inflation p. a.');
    expect(html).toContain('Rentenanpassung p. a.');
    expect(html).toContain('Rendite in der Rentenphase p. a.');
    expect(html).toContain('3 / 5 / 7 %');
    expect(html).toContain('Im Profil ändern');
    expect(html).not.toContain('<input');
  });
});

describe('splitSourceText', () => {
  const sources = Object.values(rawValues())
    .flat()
    .map((v) => v.sourceDe);
  const words = (s: string) =>
    s
      .replace(/[,;:()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && w !== '-' && w !== '–');
  const hasLog = (s: string) =>
    /geprüft am \d|\d{1,2}\.\d{1,2}\.\d{4} (gelesen|im BMF-Schreiben gelesen)/.test(s);

  it('takes the review log out of every text that has one and keeps its date', () => {
    for (const s of sources.filter(hasLog)) {
      const r = splitSourceText(s);
      expect(r.date, s).toMatch(/^\d{1,2}\.\d{1,2}\.\d{4}$/);
      expect(s).toContain(r.date!);
      expect(hasLog(r.text), r.text).toBe(false);
      expect(r.text).not.toContain('gesetze-im-internet');
    }
  });

  it('removes nothing else: every remaining word is in the original', () => {
    for (const s of sources) {
      const original = words(s);
      for (const w of words(splitSourceText(s).text)) expect(original, s).toContain(w);
    }
  });

  it('leaves texts without a review log exactly as they are', () => {
    for (const s of sources.filter((x) => !hasLog(x))) {
      expect(splitSourceText(s)).toEqual({ text: s });
    }
  });

  it('handles the known patterns', () => {
    expect(
      splitSourceText(
        'Teilfreistellung für Aktienfonds 30 % (§20 Abs. 1 InvStG), geprüft am 19.11.2026 auf gesetze-im-internet.de',
      ),
    ).toEqual({
      text: 'Teilfreistellung für Aktienfonds 30 % (§20 Abs. 1 InvStG)',
      date: '19.11.2026',
      kind: 'checked',
    });
    expect(
      splitSourceText(
        'EStG §32a (Fassung ab 2026), gesetze-im-internet.de, geprüft am 19.11.2026 - Obergrenze der Tarifzone 2',
      ),
    ).toEqual({
      text: 'EStG §32a (Fassung ab 2026) – Obergrenze der Tarifzone 2',
      date: '19.11.2026',
      kind: 'checked',
    });
    expect(
      splitSourceText(
        'Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156 (am 11.11.2026 gelesen), § 84',
      ),
    ).toEqual({
      text: 'Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156, § 84',
      date: '11.11.2026',
      kind: 'read',
    });
    expect(
      splitSourceText(
        'Basiszins 2026 (BMF-Schreiben vom 13.01.2026, §18 Abs. 4 InvStG), am 20.11.2026 im BMF-Schreiben gelesen',
      ),
    ).toEqual({
      text: 'Basiszins 2026 (BMF-Schreiben vom 13.01.2026, §18 Abs. 4 InvStG)',
      date: '20.11.2026',
      kind: 'read',
    });
  });
});
