import { useState } from 'react';
import type { ReactNode } from 'react';
import type { GapSolveResult, ScenarioName, ValidationIssue } from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import { formatEur } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import type { HouseholdApi } from '../../state/useHousehold';
import type { HouseholdOverviewApi } from '../../state/useHouseholdOverview';
import { GapBar, ScenarioSwitch } from '../../components/charts/RetirementCharts';
import {
  HouseholdPathChart,
  PersonCompositionChart,
} from '../../components/charts/HouseholdCharts';
import { PageShell } from '../../components/layout/PageShell';
import { ScrollTable } from '../../components/cards/ScrollTable';
import { Disclosure } from '../../components/cards/Disclosure';
import { StatusChip } from '../../components/cards/StatusChip';
import { Icon } from '../../components/layout/Icon';
import { NumberField } from '../../components/forms/NumberField';
import { gapMeta } from '../overview/RetirementGap';
import { ImportantNotes, InfoNotes, TopNotice, splitWarnings } from '../overview/OverviewNotes';

export function HouseholdOverview({
  household,
  data,
  openPerson,
  goToPersonProfile,
  goToJointQuestion,
  guide,
}: {
  household: HouseholdApi;
  data: HouseholdOverviewApi;
  openPerson: (id: string) => void;
  goToPersonProfile: (id: string) => void;
  goToJointQuestion: () => void;
  guide?: ReactNode;
}) {
  const t = de.householdView;
  const r = de.overview.retirement;
  const [scenario, setScenario] = useState<ScenarioName>('neutral');
  const { outcome } = data;
  const { persons } = household.state.household;
  const names = persons.map((p, i) => p.name.trim() || de.household.newPersonName(i + 1));

  const warnings = outcome?.ok
    ? outcome.result.persons.flatMap((p) => p.overview.scenarios[scenario].snapshot.warnings)
    : [];
  const split = splitWarnings(warnings);

  const alerts = (
    <>
      {outcome && !outcome.ok && (
        <TopNotice kind="bad" title={t.invalid}>
          <ul className="note-list">
            {outcome.issues.map((i: ValidationIssue) => {
              const owner = persons.find((p) => i.field.startsWith(`persons.${p.id}.`));
              const name = owner?.name.trim() || undefined;
              return (
                <li key={`${i.field}|${i.code}`}>
                  {name !== undefined && <b>{name}: </b>}
                  {issueMessage(i)}
                  {owner && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="link"
                        onClick={() => goToPersonProfile(owner.id)}
                      >
                        {t.fixPerson(name ?? owner.id)}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </TopNotice>
      )}
      <ImportantNotes codes={split.important} />
    </>
  );

  return (
    <PageShell
      title={de.overview.title}
      subtitle={de.overview.subtitleHousehold(names.join(', '))}
      personInTitle={false}
      above={alerts}
      tools={
        <button type="button" className="btn quiet no-print" onClick={() => window.print()}>
          {r.print}
        </button>
      }
    >
      {guide}
      <JointNote household={household} goToQuestion={goToJointQuestion} />
      {!outcome && <p>{t.loading}</p>}
      {outcome?.ok && (
        <Result
          data={data}
          household={household}
          scenario={scenario}
          setScenario={setScenario}
          openPerson={openPerson}
          result={outcome.result}
          infoCodes={split.info}
          r={r}
        />
      )}
      <a className="linkcard" href="#goals">
        <Icon name="goals" size="lg" />
        <span>
          <b>{de.overview.goalsLink.title}</b>
          <small>{de.overview.goalsLink.text}</small>
        </span>
        <Icon name="go" />
      </a>
    </PageShell>
  );
}

/**
 * Tax note of a couple (AP-16): the open question with a jump to it, or a quiet line with the answer. A household
 * of one person (or more than two) gets none.
 */
function JointNote({
  household,
  goToQuestion,
}: {
  household: HouseholdApi;
  goToQuestion: () => void;
}) {
  const { persons, jointAssessment } = household.state.household;
  if (persons.length !== 2) return null;
  const t = de.householdView.joint;
  if (jointAssessment === undefined) {
    return (
      <div className="notice warn joint-note" role="status">
        <Icon name="warn" />
        <div>
          <b>{t.open.badge}</b>
          <span>{t.open.text}</span>{' '}
          <button type="button" className="btn" onClick={goToQuestion}>
            {t.open.button}
          </button>
        </div>
      </div>
    );
  }
  const note = jointAssessment ? t.yes : t.no;
  return (
    <div className="notice info joint-note" role="note">
      <b>{note.badge}</b>
      <span>{note.text}</span>
    </div>
  );
}

type Outcome = NonNullable<HouseholdOverviewApi['outcome']>;

function Result({
  data,
  household,
  scenario,
  setScenario,
  openPerson,
  result,
  infoCodes,
  r,
}: {
  data: HouseholdOverviewApi;
  household: HouseholdApi;
  scenario: ScenarioName;
  setScenario: (s: ScenarioName) => void;
  openPerson: (id: string) => void;
  result: Extract<Outcome, { ok: true }>['result'];
  infoCodes: string[];
  r: typeof de.overview.retirement;
}) {
  const t = de.householdView;
  const wishPercent = household.state.household.survivorWishPercent;
  const chosen = result.scenarios[scenario].snapshot;
  const desired = result.desiredMonthlyIncomeToday;
  const hasWish = desired !== undefined;
  const emptyPerson = (id: string) =>
    result.persons
      .find((p) => p.personId === id)
      ?.overview.products.every((p) => p.status !== 'included' && p.status !== 'later') ?? true;
  const gap = chosen.gap;
  const chip = !hasWish ? (
    <StatusChip kind="hint" size="lg">
      {r.hero.chipNoWish}
    </StatusChip>
  ) : gap !== undefined && gap > 0 ? (
    <StatusChip kind="warn" size="lg">
      {r.hero.chipGap(formatEur(gap))}
    </StatusChip>
  ) : (
    <StatusChip kind="ok" size="lg">
      {r.hero.chipCovered}
    </StatusChip>
  );
  const gapOpen = () => {
    const d = document.getElementById('close-gap');
    if (d instanceof HTMLDetailsElement) {
      d.open = true;
      d.scrollIntoView({ block: 'center' });
    }
  };
  const compositionRows = ['statutory', 'etf', 'retirementDepot', 'occupational'] as const;
  /** Entries of "other income" and the share paid on to the partner, as one column. */
  const otherOf = (personId: string) =>
    Object.entries(chosen.byPersonProduct[personId] ?? {}).reduce(
      (sum, [id, v]) => (id.startsWith('otherIncome:') ? sum + (v ?? 0) : sum),
      0,
    );

  return (
    <>
      <section className="hero-grid" aria-label={t.title}>
        <article className="card kpi kpi-hero hero">
          <span className="kpi-label">
            {t.headline(result.snapshotYear, r.scenarios[scenario])}
          </span>
          <div className="hero-num">
            <b className="kpi-value">
              {r.charts.perMonth(formatEur(chosen.netMonthlyPensionReal))}
            </b>
            {chip}
          </div>
          <span className="kpi-label">
            {r.charts.range(
              formatEur(result.scenarios.pessimistic.snapshot.netMonthlyPensionReal),
              formatEur(result.scenarios.optimistic.snapshot.netMonthlyPensionReal),
            )}
            {desired !== undefined && `. ${r.charts.wish(formatEur(desired))}`}
          </span>
          {desired !== undefined ? (
            <GapBar net={chosen.netMonthlyPensionReal} desired={desired} />
          ) : (
            <p>{t.noWish}</p>
          )}
          {hasWish && data.gap && (
            <p>
              <button type="button" className="link" onClick={gapOpen}>
                {r.hero.closeGapLink}
              </button>
            </p>
          )}
        </article>
        <aside className="card" id="wish-field">
          <NumberField
            label={de.household.wishLabel}
            hint={t.hero.wishHint}
            unit={de.profile.units.eurPerMonth}
            value={household.state.household.desiredMonthlyIncomeToday}
            onChange={(v) => household.setDesiredIncome(v)}
            onClear={() => household.setDesiredIncome(undefined)}
          />
        </aside>
      </section>

      <ScenarioSwitch value={scenario} onChange={setScenario} />

      <h2 className="block-h">{t.compositionTitle}</h2>
      <div className="card">
        <PersonCompositionChart result={result} scenario={scenario} />
      </div>

      <h2 className="block-h">{r.sections.more}</h2>
      <div className="dts">
        <Disclosure title={t.pathTitle} meta={r.sections.pathMeta}>
          <HouseholdPathChart result={result} scenario={scenario} />
          <SurvivorNote result={result} scenario={scenario} wishPercent={wishPercent} />
        </Disclosure>
        {hasWish && data.gap && (
          <Disclosure id="close-gap" title={r.closeGap.title} meta={gapMeta(data.gap)}>
            <GapTile
              gap={data.gap}
              gapPersonId={data.gapPersonId}
              setGapPersonId={data.setGapPersonId}
              result={result}
              budget={data.blocks?.[data.gapPersonId]?.goals}
            />
          </Disclosure>
        )}
        <Disclosure title={t.sections.details} meta={t.sections.detailsMeta}>
          <ScrollTable label={t.compositionCaption(r.scenarios[scenario])}>
            <table>
              <caption>{t.compositionCaption(r.scenarios[scenario])}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.person}</th>
                  {compositionRows.map((k) => (
                    <th key={k} scope="col">
                      {r.productNames[k]}
                    </th>
                  ))}
                  <th scope="col">{r.productNames.otherIncome}</th>
                  <th scope="col">{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {result.persons.map((p) => (
                  <tr key={p.personId}>
                    <th scope="row">{p.name}</th>
                    {compositionRows.map((k) => (
                      <td key={k} className="num">
                        {formatEur(chosen.byPersonProduct[p.personId]?.[k] ?? 0)}
                      </td>
                    ))}
                    <td className="num">{formatEur(otherOf(p.personId))}</td>
                    <td className="num">
                      <b>{formatEur(chosen.byPerson[p.personId] ?? 0)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
          {result.persons.map((p) => {
            const lump = chosen.lumpSumNetReal[p.personId] ?? 0;
            return lump > 0 ? <p key={p.personId}>{t.lumpSum(p.name, formatEur(lump))}</p> : null;
          })}
          <h3>{t.persons}</h3>
          <ul className="person-list">
            {result.persons.map((p) => (
              <li key={p.personId} className="person-row">
                <div>
                  <strong>
                    {t.personLine(
                      p.name,
                      r.charts.perMonth(formatEur(chosen.byPerson[p.personId] ?? 0)),
                    )}
                  </strong>
                  {emptyPerson(p.personId) && <p className="hint">{t.personEmpty}</p>}
                </div>
                <button type="button" className="btn" onClick={() => openPerson(p.personId)}>
                  {t.personEdit(p.name)}
                </button>
              </li>
            ))}
          </ul>
        </Disclosure>
        <InfoNotes
          codes={infoCodes}
          extra={[result.survivor ? t.survivorSimplified : t.noSurvivor]}
        />
      </div>
    </>
  );
}

function GapTile({
  gap,
  gapPersonId,
  setGapPersonId,
  result,
  budget,
}: {
  gap: GapSolveResult | undefined;
  gapPersonId: string;
  setGapPersonId: (id: string) => void;
  result: Extract<Outcome, { ok: true }>['result'];
  budget: { savingsBudgetMonthly?: number; goals: { monthlyContribution: number }[] } | undefined;
}) {
  const t = de.overview.retirement.closeGap;
  const v = de.householdView;
  if (result.desiredMonthlyIncomeToday === undefined || !gap) return null;
  const neutral = gap.ok ? gap.scenarios.neutral : undefined;
  let rest: number | undefined;
  if (
    gap.ok &&
    neutral &&
    neutral.status !== 'unreachable' &&
    budget?.savingsBudgetMonthly !== undefined
  ) {
    const others = budget.goals.reduce(
      (sum, g) => sum + (Number.isFinite(g.monthlyContribution) ? g.monthlyContribution : 0),
      0,
    );
    rest = budget.savingsBudgetMonthly - others - neutral.newMonthly;
  }
  return (
    <>
      <div className="field">
        <label htmlFor="hh-gap-person">{v.gapPerson}</label>
        <select
          id="hh-gap-person"
          value={gapPersonId}
          onChange={(e) => setGapPersonId(e.target.value)}
        >
          {result.persons.map((p) => (
            <option key={p.personId} value={p.personId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {!gap.ok && <p>{gap.issues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}</p>}
      {gap.ok && (
        <>
          <p>{t.intro(formatEur(gap.desiredMonthlyIncomeToday), formatEur(gap.currentMonthly))}</p>
          <ScrollTable label={t.caption}>
            <table>
              <caption>{t.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{de.overview.retirement.row}</th>
                  {SCENARIO_NAMES.map((s) => (
                    <th key={s} scope="col">
                      {de.overview.retirement.scenarios[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{t.row}</th>
                  {SCENARIO_NAMES.map((s) => {
                    const x = gap.scenarios[s];
                    return (
                      <td key={s} className="num">
                        {x.status === 'ok' ? <b>{formatEur(x.monthly)}</b> : t.status[x.status]}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">{t.newRow}</th>
                  {SCENARIO_NAMES.map((s) => {
                    const x = gap.scenarios[s];
                    return (
                      <td key={s} className="num">
                        {x.status === 'unreachable' ? '–' : formatEur(x.newMonthly)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </ScrollTable>
          {rest !== undefined && (
            <p className="hint">
              {rest >= 0 ? t.budgetRest(formatEur(rest)) : t.budgetOver(formatEur(-rest))}
            </p>
          )}
        </>
      )}
    </>
  );
}

function SurvivorNote({
  result,
  scenario,
  wishPercent,
}: {
  result: Extract<Outcome, { ok: true }>['result'];
  scenario: ScenarioName;
  wishPercent: number | undefined;
}) {
  const t = de.householdView;
  const s = result.survivor;
  const name = (id: string) => result.persons.find((p) => p.personId === id)?.name ?? id;
  const first = s
    ? result.scenarios[scenario].path.find((p) => p.year === s.deathYear + 1)
    : undefined;
  const amount = s ? (first?.survivorPension?.[s.survivorId] ?? 0) : 0;
  const reduced = wishPercent !== undefined && wishPercent < 100 && result.persons.length === 2;
  const passedOn = s ? (first?.survivorOtherIncome?.[s.survivorId] ?? 0) : 0;
  const deathPoint = s
    ? result.scenarios[scenario].path.find((p) => p.year === s.deathYear)
    : undefined;
  const hasEntries =
    s !== undefined &&
    Object.keys(deathPoint?.byPersonProduct[s.deceasedId] ?? {}).some((id) =>
      id.startsWith('otherIncome:'),
    );
  if (!s && !reduced) return null;
  return (
    <>
      {s && (
        <>
          <h3>{t.survivorTitle}</h3>
          <p>
            {amount > 0
              ? t.survivorText(
                  name(s.deceasedId),
                  s.deathYear,
                  name(s.survivorId),
                  formatEur(amount),
                )
              : t.survivorNone(name(s.deceasedId), s.deathYear, name(s.survivorId))}
          </p>
        </>
      )}
      {s && passedOn > 0 && (
        <p>{t.survivorOtherIncomeText(name(s.survivorId), formatEur(passedOn))}</p>
      )}
      {hasEntries && <p className="hint">{t.survivorOtherIncomeNote}</p>}
      {reduced && <p>{t.wishReduced(wishPercent)}</p>}
    </>
  );
}
