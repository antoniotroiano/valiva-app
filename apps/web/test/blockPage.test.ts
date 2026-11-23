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
import { WarningList } from '../src/components/cards/WarningList';
import { BlockSection } from '../src/components/layout/BlockPage';
import { currentLegal } from '../src/lib/legalConfig';
import { DepotResults } from '../src/pages/depot/DepotResults';
import { OccupationalResults } from '../src/pages/occupational/OccupationalResults';
import { StatutoryResults } from '../src/pages/statutory/StatutoryResults';

/**
 * AP-10 proof: the unchanged result components of the Depot, bAV and statutory pension pages fit into
 * the slots of `BlockSection`, and the shared tables express the tables of those pages. The three pages
 * themselves are rebuilt in AP-11.
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

describe('BlockSection takes the unchanged result components of the other three pages', () => {
  it('Depot', () => {
    const results = scenarios<DepotProjection>((s) => projectDepot(depotInput, ctx, s));
    const html = slots(
      h(DepotResults, {
        results,
        input: depotInput,
        assumptions: ctx.assumptions,
        legal,
      }),
    );
    expect(html).toContain('class="bp-result"');
    expect(html).toContain('class="bp-in"');
    expect(html).toContain('kpi');
  });

  it('bAV', () => {
    const results = scenarios<OccupationalProjection>((s) => projectOccupational(occInput, ctx, s));
    const html = slots(
      h(OccupationalResults, { results, input: occInput, assumptions: ctx.assumptions, legal }),
    );
    expect(html).toContain('class="bp-result"');
    expect(html).toContain('kpi');
  });

  it('statutory pension', () => {
    const r = projectStatutory(statutoryInput, ctx);
    if (!r.ok) throw new Error('projection failed');
    const html = slots(
      h(StatutoryResults, { result: r.result, assumptions: ctx.assumptions, legal }),
    );
    expect(html).toContain('class="bp-result"');
    expect(html).toContain('kpi');
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
