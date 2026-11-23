import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  applyWorkspace,
  defaultBlock,
  parseWorkspace,
  personContext,
  projectDepot,
  projectOccupational,
  projectStatutory,
  withdrawalOf,
} from '@valiva/core';
import type { DepotProjection, OccupationalProjection, ScenarioName } from '@valiva/core';
import { WORKSPACE_FORMAT } from '../src/app/appConfig';
import { ResultFrame } from '../src/components/cards/ResultFrame';
import { ScenarioTable, StepsTable } from '../src/components/cards/ResultTable';
import {
  ImportantNotes,
  InfoNotes,
  WarningList,
  notesFromCodes,
  type Note,
} from '../src/components/cards/WarningList';
import { BlockSection } from '../src/components/layout/BlockPage';
import { currentLegal } from '../src/lib/legalConfig';
import { DepotCalculation, DepotResult } from '../src/pages/depot/DepotResults';
import { AllowanceTable } from '../src/pages/depot/DepotTables';
import {
  OccupationalCalculation,
  OccupationalResult,
} from '../src/pages/occupational/OccupationalResults';
import { StatutoryCalculation, StatutoryResult } from '../src/pages/statutory/StatutoryResults';

/**
 * AP-10/AP-11: the result and calculation components of the Depot, bAV and statutory pension pages fill
 * the slots of `BlockSection`, the shared tables express their tables, notes are bundled by weight.
 */
const YEAR = new Date().getFullYear();
const parsed = parseWorkspace(
  readFileSync(join(__dirname, '../../../examples/single.workspace.json'), 'utf8'),
  YEAR,
  WORKSPACE_FORMAT,
);
if (parsed.status !== 'ok') throw new Error('example does not parse');
const { state, blocks } = applyWorkspace(parsed.workspace);
const person = state.household.persons[0]!;
const own = blocks[person.id] ?? {};
const ctxPerson = personContext(state.household, person);
const legalResolution = currentLegal();
if (!legalResolution.ok) throw new Error('legal config');
const legal = legalResolution.legal;
const ctx = {
  profile: ctxPerson.profile,
  assumptions: ctxPerson.assumptions,
  legal,
  currentYear: YEAR,
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const target = ctxPerson.profile.targetRetirementAge;

const dc = own.depot ?? defaultBlock('depot', YEAR);
const depotInput = {
  ownContributionMonthly: dc.ownContributionMonthly,
  startMonth: dc.startMonth,
  variant: dc.variant,
  costPercentPerYear: dc.costPercentPerYear,
  annualContributionIncreasePercent: dc.annualContributionIncreasePercent,
  payoutStartAge:
    dc.payoutStartAge ??
    clamp(target, legal.depot.payoutStartAgeMin, legal.depot.payoutStartAgeMax),
  payoutEndAge: dc.payoutEndAge,
  lumpSumSharePercent: dc.lumpSumSharePercent,
  withdrawal: withdrawalOf(dc),
  returnOverridePercent: undefined,
};
const oc = own.occupational ?? defaultBlock('occupational', YEAR);
const occInput = {
  employeeContributionMonthlyGross: oc.employeeContributionMonthlyGross,
  employerSubsidyMode: oc.employerSubsidyMode,
  employerSubsidyCustomMonthly:
    oc.employerSubsidyMode === 'custom' ? oc.employerSubsidyCustomMonthly : undefined,
  employerContributionMonthly: oc.employerContributionMonthly,
  costPercentPerYear: oc.costPercentPerYear,
  annualContributionIncreasePercent: oc.annualContributionIncreasePercent,
  startMonth: oc.startMonth,
  payoutStartAge: oc.payoutStartAge ?? clamp(target, 62, 70),
  payoutEndAge: oc.payoutEndAge ?? ctxPerson.profile.lifeExpectancyAge,
  guaranteedRatePercent: undefined,
};
const sc = own.statutory ?? defaultBlock('statutory', YEAR);
const statutoryInput = {
  projectedMonthlyPensionToday: sc.projectedMonthlyPensionToday,
  projectedMonthlyPensionAtRetirementAgeToday: sc.projectedMonthlyPensionAtRetirementAgeToday,
  statementYear: sc.statementYear,
  retirementAge: sc.retirementAge ?? target,
  regularRetirementAge: sc.regularRetirementAge,
};

function scenarios<T>(
  run: (s: ScenarioName) => { ok: true; result: T } | { ok: false },
): Record<ScenarioName, T> {
  const out = {} as Record<ScenarioName, T>;
  for (const s of SCENARIO_NAMES) {
    const r = run(s);
    if (!r.ok) throw new Error('projection failed');
    out[s] = r.result;
  }
  return out;
}

const slots = (result: ReturnType<typeof h>, calculation?: ReturnType<typeof h>) =>
  renderToStaticMarkup(
    h(BlockSection, {
      id: 'x',
      inputs: h('form', { className: 'card' }, 'inputs'),
      result,
      ...(calculation ? { calculation } : {}),
    }),
  );

const facts = h('dl', { className: 'facts' });

describe('the three pages fill the slots of BlockSection (AP-11)', () => {
  it('Depot: hero, all key figures, collapsed calculation rows', () => {
    const results = scenarios<DepotProjection>((s) => projectDepot(depotInput, ctx, s));
    const props = { results, input: depotInput, assumptions: ctx.assumptions, legal };
    const html = slots(
      h(DepotResult, props),
      h(DepotCalculation, { props, profileFacts: facts, simplification: 'Vereinfachung' }),
    );
    expect(html).toContain('class="bp-result"');
    expect(html).toContain('class="bp-calc"');
    expect(html).toContain('result-frame');
    for (const label of ['Davon Zulagen', 'Davon Eigenbeiträge', 'Steuer pro Monat'])
      expect(html).toContain(label);
    for (const row of [
      'Alle Szenarien im Vergleich',
      'Kapital bis Auszahlbeginn',
      'Zulagen je Kalenderjahr',
      'So wird aus dem Kapital die Nettorente',
      'Annahmen aus dem Profil',
    ])
      expect(html).toContain(row);
    expect(html).not.toContain('<details class="dt" open');
  });

  it('Depot allowances: table and cards carry every year and all seven columns', () => {
    const results = scenarios<DepotProjection>((s) => projectDepot(depotInput, ctx, s));
    const d = results.neutral.details;
    const html = renderToStaticMarkup(h(AllowanceTable, { details: d }));
    // Table: header + one row per year + sum row.
    expect(html.match(/<th scope="col"/g)).toHaveLength(7);
    expect(html.match(/<tr/g)).toHaveLength(1 + d.yearly.length + 1);
    // Cards: sum card + first five years, "show all" button names the total.
    expect(html.match(/<li/g)).toHaveLength(1 + Math.min(5, d.yearly.length));
    expect(html).toContain(`Alle ${d.yearly.length} Jahre anzeigen`);
    for (const label of ['Eigenbeitrag', 'Grundzulage', 'Kinderzulage', 'Bonus unter 25'])
      expect(html.split(label).length - 1).toBeGreaterThanOrEqual(2);
  });

  it('bAV: hero, key figures including the net effort, collapsed rows', () => {
    const results = scenarios<OccupationalProjection>((s) => projectOccupational(occInput, ctx, s));
    const props = { results, input: occInput, assumptions: ctx.assumptions, legal };
    const html = slots(
      h(OccupationalResult, props),
      h(OccupationalCalculation, { props, profileFacts: facts, simplification: 'Vereinfachung' }),
    );
    expect(html).toContain('class="bp-result"');
    expect(html).toContain('Netto-Aufwand pro Monat');
    expect(html).toContain('Einzahlung in den Vertrag');
    expect(html).toContain('Netto-Aufwand: so wird aus');
    expect(html).toContain('Alle Szenarien im Vergleich');
  });

  it('statutory pension: hero, key figures, collapsed rows', () => {
    const r = projectStatutory(statutoryInput, ctx);
    if (!r.ok) throw new Error('projection failed');
    const html = slots(
      h(StatutoryResult, { result: r.result }),
      h(StatutoryCalculation, {
        result: r.result,
        assumptions: ctx.assumptions,
        legal,
        profileFacts: facts,
        showSimplification: true,
      }),
    );
    expect(html).toContain('class="bp-result"');
    expect(html).toContain('Rentenbeginn');
    expect(html).toContain('So wird aus der Renteninformation die Nettorente');
    expect(html).toContain('Verlauf als Tabelle');
  });
});

describe('notes are bundled by weight', () => {
  const notes: Note[] = [
    { id: 'a', text: 'Wichtig A', weight: 'important' },
    { id: 'b', text: 'Hintergrund B', weight: 'info' },
  ];
  it('important notes are visible, info notes sit in a collapsed row with a count', () => {
    const visible = renderToStaticMarkup(h(ImportantNotes, { notes }));
    expect(visible).toContain('Wichtig A');
    expect(visible).not.toContain('Hintergrund B');
    const rows = renderToStaticMarkup(h(InfoNotes, { notes }));
    expect(rows).toContain('Hintergrund B');
    expect(rows).not.toContain('Wichtig A');
    expect(rows).toContain('1 Hinweis');
    expect(rows).not.toContain('open');
  });
  it('renders nothing when there is nothing of that weight', () => {
    expect(renderToStaticMarkup(h(ImportantNotes, { notes: [notes[1]!] }))).toBe('');
    expect(renderToStaticMarkup(h(InfoNotes, { notes: [notes[0]!] }))).toBe('');
  });
  it('core warning codes get their weight from warningWeight', () => {
    const list = notesFromCodes(['cost_capped', 'etf_tax_simplified', 'cost_capped']);
    expect(list.map((n) => n.weight)).toEqual(['important', 'info']);
  });
});

describe('the shared components express the tables and notes of the three pages', () => {
  const render = (el: ReturnType<typeof h>) => renderToStaticMarkup(el);

  it('ScenarioTable: five columns, neutral row emphasised (Depot, bAV)', () => {
    const html = render(
      h(ScenarioTable, {
        title: 'Szenarien',
        columns: ['Szenario', 'Kapital', 'Brutto', 'Real', 'Netto'],
        rows: [
          { label: 'Pessimistisch', values: ['1', '2', '3', '4'] },
          { label: 'Neutral', values: ['1', '2', '3', '4'], emphasis: true },
        ],
      }),
    );
    expect(html.match(/<th scope="col"/g)).toHaveLength(5);
    expect(html.match(/class="sum"/g)).toHaveLength(1);
  });

  it('StepsTable: three columns with a total row and a note (Depot, statutory pension)', () => {
    const html = render(
      h(StepsTable, {
        title: 'Rechenweg',
        columns: ['Schritt', 'Nominal', 'Kaufkraft heute'],
        rows: [
          { label: 'Brutto', values: ['602 €', '359 €'] },
          { label: 'Netto', values: ['483 €', '288 €'], sum: true },
        ],
        note: 'Ein Satz.',
      }),
    );
    expect(html.match(/<th scope="col"/g)).toHaveLength(3);
    expect(html).toContain('class="sum"');
    expect(html).toContain('Ein Satz.');
  });

  it('StepsTable: two columns (bAV effort table)', () => {
    const html = render(
      h(StepsTable, {
        title: 'Aufwand',
        columns: ['Posten', 'Monat'],
        rows: [{ label: 'Umwandlung', values: ['200 €'] }],
      }),
    );
    expect(html.match(/<th scope="col"/g)).toHaveLength(2);
  });

  it('ResultFrame: hero figure with and without range, key figures, notes', () => {
    const full = render(
      h(ResultFrame, {
        eyebrow: 'Netto pro Monat',
        value: '288 €',
        unit: 'pro Monat',
        range: 'Spanne',
        kpis: [
          { label: 'Kapital', value: '1 €' },
          { label: 'Zulagen', value: '2 €', note: 'Notiz' },
        ],
        footnote: 'Fußnote',
      }),
    );
    expect(full).toContain('288 €');
    expect(full.match(/<dt>/g)).toHaveLength(2);
    const bare = render(h(ResultFrame, { eyebrow: 'e', value: 'v' }));
    expect(bare).not.toContain('<dl');
  });

  it('WarningList: one notice per page, nothing when empty', () => {
    expect(render(h(WarningList, { codes: [] }))).toBe('');
    expect(render(h(WarningList, { codes: ['cost_capped', 'unverified:tax'] }))).toContain('<ul>');
  });
});
