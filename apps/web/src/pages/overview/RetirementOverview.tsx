import { productName, type BudgetInfo } from './RetirementGap';
import {
  type OverviewProductKind,
  type OverviewResult,
  type ScenarioName,
  type ValidationIssue,
} from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import { useState } from 'react';
import { formatEur } from '../../lib/format';
import { WhatIfCard } from '../../components/cards/WhatIfCard';
import { NumberField } from '../../components/forms/NumberField';
import {
  CompositionChart,
  GapBar,
  PathChart,
  ScenarioSwitch,
} from '../../components/charts/RetirementCharts';
import { de, issueMessage } from '../../i18n/de';
import { type OverviewApi, type OverviewBlock } from '../../state/useOverview';
import { OVERVIEW_BLOCKS } from '../../state/useOverview';
import { ScrollTable } from '../../components/cards/ScrollTable';
import { Notes, GapTile, Row, PathTable } from './RetirementGap';

type Target = 'profile' | 'etf' | 'statutory' | 'depot' | 'occupational' | 'assumptions';

const PAGE_OF: Record<OverviewBlock, Target> = {
  etf: 'etf',
  statutory: 'statutory',
  retirementDepot: 'depot',
  occupational: 'occupational',
};

export function RetirementOverview({
  api,
  goTo,
  budget,
  wish,
  setWish,
}: {
  api: OverviewApi;
  goTo: (page: Target) => void;
  budget: BudgetInfo;
  wish: number | undefined;
  setWish: (value: number | undefined) => void;
}) {
  const t = de.overview.retirement;
  const { outcome } = api;

  return (
    <section className="card" aria-labelledby="ov-retirement">
      <div className="heading-row">
        <h2 id="ov-retirement">{t.title}</h2>
        <button type="button" className="btn no-print" onClick={() => window.print()}>
          {t.print}
        </button>
      </div>
      <p>{t.intro}</p>
      <fieldset>
        <legend>{t.blocks}</legend>
        {OVERVIEW_BLOCKS.map((b) => (
          <label key={b} className="check">
            <input
              type="checkbox"
              checked={api.state.enabled[b]}
              onChange={(e) => api.setEnabled(b, e.target.checked)}
            />{' '}
            {de.nav[PAGE_OF[b]]}
          </label>
        ))}
      </fieldset>
      {outcome === undefined && (
        <p role="alert">
          {t.profileInvalid}{' '}
          {api.profileIssues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}{' '}
          <button type="button" className="link" onClick={() => goTo('profile')}>
            {t.toProfile}
          </button>
        </p>
      )}
      {outcome && !outcome.ok && (
        <p role="alert">
          {t.profileInvalid} {outcome.issues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}{' '}
          <button type="button" className="link" onClick={() => goTo('profile')}>
            {t.toProfile}
          </button>
        </p>
      )}
      {outcome?.ok && <Result result={outcome.result} goTo={goTo} wish={wish} setWish={setWish} />}
      {outcome?.ok && <WhatIfCard api={api} />}
      {outcome?.ok && api.gap && (
        <GapTile
          gap={api.gap}
          budget={budget}
          etfEnabled={api.state.enabled.etf}
          hasWish={outcome.result.desiredMonthlyIncomeToday !== undefined}
        />
      )}
    </section>
  );
}

function Result({
  result,
  goTo,
  wish,
  setWish,
}: {
  result: OverviewResult;
  goTo: (page: Target) => void;
  wish: number | undefined;
  setWish: (value: number | undefined) => void;
}) {
  const t = de.overview.retirement;
  const [scenario, setScenario] = useState<ScenarioName>('neutral');
  const neutral = result.scenarios.neutral;
  const chosen = result.scenarios[scenario].snapshot;
  const desired = result.desiredMonthlyIncomeToday;
  const hasWish = result.desiredMonthlyIncomeToday !== undefined;
  const warnings = [
    ...new Set(SCENARIO_NAMES.flatMap((s) => result.scenarios[s].snapshot.warnings)),
  ];
  const pageOf = (id: OverviewProductKind): Target => (id === 'retirementDepot' ? 'depot' : id);

  return (
    <>
      <ul className="status-list">
        {result.products.map((p) => (
          <li key={p.productId}>
            <b>{productName(p.productId)}:</b>{' '}
            {p.empty ? t.statusEmpty : t.status[p.status](p.payoutStartAge)}
            {p.status === 'invalid' && p.issues && (
              <>
                {' '}
                {p.issues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}{' '}
                {pageOf(p.productId) && (
                  <button type="button" className="link" onClick={() => goTo(pageOf(p.productId)!)}>
                    {t.toBlock}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <ScenarioSwitch value={scenario} onChange={setScenario} />
      <div className="kpi hero">
        <span className="kpi-label">
          {t.charts.headline(result.targetRetirementAge, t.scenarios[scenario])}
        </span>
        <b className="kpi-value">{t.charts.perMonth(formatEur(chosen.netMonthlyPensionReal))}</b>
        <span className="kpi-label">
          {t.charts.range(
            formatEur(result.scenarios.pessimistic.snapshot.netMonthlyPensionReal),
            formatEur(result.scenarios.optimistic.snapshot.netMonthlyPensionReal),
          )}
          {desired !== undefined && `. ${t.charts.wish(formatEur(desired))}`}
        </span>
        {desired !== undefined && <GapBar net={chosen.netMonthlyPensionReal} desired={desired} />}
      </div>

      <ScrollTable label={t.snapshotCaption(result.targetRetirementAge)}>
        <table>
          <caption>{t.snapshotCaption(result.targetRetirementAge)}</caption>
          <thead>
            <tr>
              <th scope="col">{t.row}</th>
              {SCENARIO_NAMES.map((s) => (
                <th key={s} scope="col">
                  {t.scenarios[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasWish && (
              <Row
                label={t.desired}
                values={SCENARIO_NAMES.map(() => result.desiredMonthlyIncomeToday)}
              />
            )}
            <Row
              label={t.gross}
              values={SCENARIO_NAMES.map(
                (s) => result.scenarios[s].snapshot.grossMonthlyPensionReal,
              )}
            />
            <Row
              label={t.tax}
              values={SCENARIO_NAMES.map(
                (s) => result.scenarios[s].snapshot.taxAndContributionsReal,
              )}
            />
            <Row
              label={t.net}
              strong
              values={SCENARIO_NAMES.map((s) => result.scenarios[s].snapshot.netMonthlyPensionReal)}
            />
            {hasWish && (
              <>
                <Row
                  label={t.gap}
                  strong
                  values={SCENARIO_NAMES.map((s) => result.scenarios[s].snapshot.gap)}
                />
                <Row
                  label={t.surplus}
                  values={SCENARIO_NAMES.map((s) => result.scenarios[s].snapshot.surplus)}
                />
                <Row
                  label={t.totalGap}
                  values={SCENARIO_NAMES.map((s) => result.scenarios[s].totalGapReal)}
                />
              </>
            )}
            {neutral.snapshot.lumpSumNetReal > 0 && (
              <Row
                label={t.lumpSum}
                values={SCENARIO_NAMES.map((s) => result.scenarios[s].snapshot.lumpSumNetReal)}
              />
            )}
          </tbody>
        </table>
      </ScrollTable>
      <NumberField
        label={de.overview.wish.label}
        hint={hasWish ? undefined : de.overview.wish.hint}
        unit={de.overview.wish.unit}
        value={wish}
        onChange={setWish}
        onClear={() => setWish(undefined)}
      />

      <h3>{t.charts.compositionTitle}</h3>
      <CompositionChart result={result} scenario={scenario} />
      <h3>{t.charts.pathTitle}</h3>
      <PathChart result={result} scenario={scenario} />
      {result.firstPayoutEndAge !== undefined && <p>{t.firstEnd(result.firstPayoutEndAge)}</p>}
      <details>
        <summary>{t.pathTitle}</summary>
        <PathTable result={result} scenario={scenario} />
      </details>

      {warnings.length > 0 && <Notes codes={warnings} />}
    </>
  );
}
