import { useState } from 'react';
import type { GapSolveResult, ScenarioName, ValidationIssue } from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import { formatEur } from '../format';
import { de, issueMessage } from '../i18n/de';
import type { HouseholdApi } from '../useHousehold';
import type { HouseholdOverviewApi } from '../useHouseholdOverview';
import { GapBar, ScenarioSwitch } from './RetirementCharts';
import { HouseholdPathChart, PersonCompositionChart } from './HouseholdCharts';
import { warningText } from '../warningText';
import { PageShell } from './PageShell';
import { ScrollTable } from './ScrollTable';

export function HouseholdOverview({
  household,
  data,
  goToHousehold,
  openPerson,
  goToPersonProfile,
}: {
  household: HouseholdApi;
  data: HouseholdOverviewApi;
  goToHousehold: () => void;
  openPerson: (id: string) => void;
  goToPersonProfile: (id: string) => void;
}) {
  const t = de.householdView;
  const r = de.overview.retirement;
  const [scenario, setScenario] = useState<ScenarioName>('neutral');
  const { outcome } = data;
  const { persons } = household.state.household;

  return (
    <PageShell title={de.overview.title} subtitle={de.overview.subtitle}>
      <section className="card" aria-labelledby="hh-overview">
        <h2 id="hh-overview">{t.title}</h2>
        {!outcome && <p>{t.loading}</p>}
        {outcome && !outcome.ok && (
          <>
            <p>{t.invalid}</p>
            <ul>
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
          </>
        )}
        {outcome?.ok && (
          <Result
            data={data}
            household={household.state.household}
            persons={persons.length}
            scenario={scenario}
            setScenario={setScenario}
            goToHousehold={goToHousehold}
            openPerson={openPerson}
            result={outcome.result}
            r={r}
          />
        )}
      </section>
    </PageShell>
  );
}

type Outcome = NonNullable<HouseholdOverviewApi['outcome']>;

function Result({
  data,
  household,
  scenario,
  setScenario,
  goToHousehold,
  openPerson,
  result,
  r,
}: {
  data: HouseholdOverviewApi;
  household: HouseholdApi['state']['household'];
  persons: number;
  scenario: ScenarioName;
  setScenario: (s: ScenarioName) => void;
  goToHousehold: () => void;
  openPerson: (id: string) => void;
  result: Extract<Outcome, { ok: true }>['result'];
  r: typeof de.overview.retirement;
}) {
  const t = de.householdView;
  const wishPercent = household.survivorWishPercent;
  const chosen = result.scenarios[scenario].snapshot;
  const desired = result.desiredMonthlyIncomeToday;
  const warnings = [
    ...new Set(result.persons.flatMap((p) => p.overview.scenarios[scenario].snapshot.warnings)),
  ];
  const emptyPerson = (id: string) =>
    result.persons
      .find((p) => p.personId === id)
      ?.overview.products.every((p) => p.status !== 'included' && p.status !== 'later') ?? true;
  return (
    <>
      <p>{t.intro(result.snapshotYear)}</p>
      <ScenarioSwitch value={scenario} onChange={setScenario} />
      <div className="kpi">
        <span className="kpi-label">{t.headline(result.snapshotYear, r.scenarios[scenario])}</span>
        <b className="kpi-value">{r.charts.perMonth(formatEur(chosen.netMonthlyPensionReal))}</b>
        <span className="kpi-label">
          {r.charts.range(
            formatEur(result.scenarios.pessimistic.snapshot.netMonthlyPensionReal),
            formatEur(result.scenarios.optimistic.snapshot.netMonthlyPensionReal),
          )}
          {desired !== undefined && `. ${r.charts.wish(formatEur(desired))}`}
        </span>
      </div>
      {desired !== undefined ? (
        <>
          <h3>{r.charts.gapTitle}</h3>
          <GapBar net={chosen.netMonthlyPensionReal} desired={desired} />
        </>
      ) : (
        <p>
          {t.noWish}{' '}
          <button type="button" className="link" onClick={goToHousehold}>
            {t.toHousehold}
          </button>
        </p>
      )}

      <h3>{t.compositionTitle}</h3>
      <PersonCompositionChart result={result} scenario={scenario} />
      <ScrollTable label={t.compositionCaption(r.scenarios[scenario])}>
        <table>
          <caption>{t.compositionCaption(r.scenarios[scenario])}</caption>
          <thead>
            <tr>
              <th scope="col">{t.person}</th>
              {(['statutory', 'etf', 'retirementDepot', 'occupational'] as const).map((k) => (
                <th key={k} scope="col">
                  {r.productNames[k]}
                </th>
              ))}
              <th scope="col">{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {result.persons.map((p) => (
              <tr key={p.personId}>
                <th scope="row">{p.name}</th>
                {(['statutory', 'etf', 'retirementDepot', 'occupational'] as const).map((k) => (
                  <td key={k} className="num">
                    {formatEur(chosen.byPersonProduct[p.personId]?.[k] ?? 0)}
                  </td>
                ))}
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

      <SurvivorNote result={result} scenario={scenario} wishPercent={wishPercent} />
      <h3>{t.pathTitle}</h3>
      <HouseholdPathChart result={result} scenario={scenario} />

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

      <GapTile
        gap={data.gap}
        gapPersonId={data.gapPersonId}
        setGapPersonId={data.setGapPersonId}
        result={result}
        budget={data.blocks?.[data.gapPersonId]?.goals}
      />

      <ul className="warnings">
        <li>{result.survivor ? t.survivorSimplified : t.noSurvivor}</li>
        <li>{t.flatTax}</li>
        {warnings.map((w) => (
          <li key={w}>{warningText(w)}</li>
        ))}
      </ul>
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
    <section aria-labelledby="hh-gap">
      <h3 id="hh-gap">{t.title}</h3>
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
    </section>
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
      {reduced && <p>{t.wishReduced(wishPercent)}</p>}
    </>
  );
}
