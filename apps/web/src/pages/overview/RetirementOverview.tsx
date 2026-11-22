import { productName, gapMeta, type BudgetInfo } from './RetirementGap';
import {
  type OverviewProductKind,
  type OverviewProductStatus,
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
import { StatusChip, type StatusKind } from '../../components/cards/StatusChip';
import { Disclosure } from '../../components/cards/Disclosure';
import { EmptyState } from '../../components/cards/EmptyState';
import { ScrollTable } from '../../components/cards/ScrollTable';
import { GapTile, Row, PathTable } from './RetirementGap';
import { ImportantNotes, InfoNotes, TopNotice, splitWarnings } from './OverviewNotes';

type Target = 'profile' | 'etf' | 'statutory' | 'depot' | 'occupational' | 'assumptions';

const PAGE_OF: Record<OverviewBlock, Target> = {
  etf: 'etf',
  statutory: 'statutory',
  retirementDepot: 'depot',
  occupational: 'occupational',
};

const pageOf = (id: OverviewProductKind): Target => (id === 'retirementDepot' ? 'depot' : id);

const warningsOf = (result: OverviewResult) =>
  SCENARIO_NAMES.flatMap((s) => result.scenarios[s].snapshot.warnings);

/**
 * Notices that belong above the page head: unusable profile or block, and the important notes.
 * They stay visible; background notes are collapsed inside the page (`InfoNotes`).
 */
export function RetirementAlerts({
  api,
  goTo,
}: {
  api: OverviewApi;
  goTo: (page: Target) => void;
}) {
  const t = de.overview.retirement;
  const { outcome } = api;
  const toProfile = (
    <button type="button" className="link" onClick={() => goTo('profile')}>
      {t.toProfile}
    </button>
  );
  if (outcome === undefined) {
    return (
      <TopNotice kind="bad">
        {t.profileInvalid}{' '}
        {api.profileIssues.map((i: ValidationIssue) => issueMessage(i)).join(' ')} {toProfile}
      </TopNotice>
    );
  }
  if (!outcome.ok) {
    return (
      <TopNotice kind="bad">
        {t.profileInvalid} {outcome.issues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}{' '}
        {toProfile}
      </TopNotice>
    );
  }
  const invalid = outcome.result.products.filter((p) => p.status === 'invalid');
  return (
    <>
      {invalid.map((p) => (
        <TopNotice key={p.productId} kind="bad">
          <b>{t.sections.blockInvalid(productName(p.productId))}</b>{' '}
          {p.issues?.map((i: ValidationIssue) => issueMessage(i)).join(' ')}{' '}
          <button type="button" className="link" onClick={() => goTo(pageOf(p.productId))}>
            {t.toBlock}
          </button>
        </TopNotice>
      ))}
      <ImportantNotes codes={splitWarnings(warningsOf(outcome.result)).important} />
    </>
  );
}

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
  const { outcome } = api;
  if (!outcome?.ok) return null;
  return (
    <Result
      api={api}
      result={outcome.result}
      goTo={goTo}
      budget={budget}
      wish={wish}
      setWish={setWish}
    />
  );
}

const STATUS_KIND: Record<OverviewProductStatus['status'], StatusKind> = {
  included: 'ok',
  later: 'hint',
  disabled: 'hint',
  invalid: 'error',
};

function Result({
  api,
  result,
  goTo,
  budget,
  wish,
  setWish,
}: {
  api: OverviewApi;
  result: OverviewResult;
  goTo: (page: Target) => void;
  budget: BudgetInfo;
  wish: number | undefined;
  setWish: (value: number | undefined) => void;
}) {
  const t = de.overview.retirement;
  const [scenario, setScenario] = useState<ScenarioName>('neutral');
  const neutral = result.scenarios.neutral;
  const chosen = result.scenarios[scenario].snapshot;
  const desired = result.desiredMonthlyIncomeToday;
  const hasWish = desired !== undefined;
  const info = splitWarnings(warningsOf(result)).info;
  const allEmpty = result.products.every((p) => p.empty || p.status === 'disabled');
  const enabledCount = OVERVIEW_BLOCKS.filter((b) => api.state.enabled[b]).length;

  const blocks = (
    <Disclosure title={t.blocks} meta={t.sections.blocksMeta(enabledCount, OVERVIEW_BLOCKS.length)}>
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
    </Disclosure>
  );

  if (allEmpty) {
    return (
      <>
        <EmptyState
          title={t.empty.title}
          primary={{ label: t.empty.primary, onClick: () => goTo('statutory') }}
          secondary={{ label: t.empty.secondary, onClick: () => goTo('profile') }}
        >
          {t.empty.text}
        </EmptyState>
        <div className="dts">{blocks}</div>
      </>
    );
  }

  const gapAmount = hasWish ? chosen.gap : undefined;
  const chip = !hasWish ? (
    <StatusChip kind="hint" size="lg">
      {t.hero.chipNoWish}
    </StatusChip>
  ) : gapAmount !== undefined && gapAmount > 0 ? (
    <StatusChip kind="warn" size="lg">
      {t.hero.chipGap(formatEur(gapAmount))}
    </StatusChip>
  ) : (
    <StatusChip kind="ok" size="lg">
      {t.hero.chipCovered}
    </StatusChip>
  );
  const gapOpen = () => {
    const d = document.getElementById('close-gap');
    if (d instanceof HTMLDetailsElement) {
      d.open = true;
      d.scrollIntoView({ block: 'center' });
    }
  };

  return (
    <>
      <section className="hero-grid" aria-label={t.title}>
        <article className="card kpi kpi-hero hero">
          <span className="kpi-label">
            {t.charts.headline(result.targetRetirementAge, t.scenarios[scenario])}
          </span>
          <div className="hero-num">
            <b className="kpi-value">
              {t.charts.perMonth(formatEur(chosen.netMonthlyPensionReal))}
            </b>
            {chip}
          </div>
          <span className="kpi-label">
            {t.charts.range(
              formatEur(result.scenarios.pessimistic.snapshot.netMonthlyPensionReal),
              formatEur(result.scenarios.optimistic.snapshot.netMonthlyPensionReal),
            )}
            {desired !== undefined && `. ${t.charts.wish(formatEur(desired))}`}
          </span>
          {desired !== undefined && <GapBar net={chosen.netMonthlyPensionReal} desired={desired} />}
          {hasWish && api.gap && (
            <p>
              <button type="button" className="link" onClick={gapOpen}>
                {t.hero.closeGapLink}
              </button>
            </p>
          )}
          <ul className="chips">
            {result.products.map((p) => (
              <li key={p.productId}>
                <StatusChip kind={p.empty ? 'warn' : STATUS_KIND[p.status]}>
                  {productName(p.productId)}:{' '}
                  {p.empty ? t.statusEmpty : t.status[p.status](p.payoutStartAge)}
                </StatusChip>
              </li>
            ))}
          </ul>
        </article>
        <aside className="card">
          <NumberField
            label={de.overview.wish.label}
            hint={hasWish ? undefined : de.overview.wish.hint}
            unit={de.overview.wish.unit}
            value={wish}
            onChange={setWish}
            onClear={() => setWish(undefined)}
          />
        </aside>
      </section>

      <ScenarioSwitch value={scenario} onChange={setScenario} />

      <h2 className="block-h">{t.sections.composition}</h2>
      <div className="card">
        <CompositionChart result={result} scenario={scenario} />
      </div>

      <h2 className="block-h">{t.sections.more}</h2>
      <div className="dts">
        <Disclosure title={t.charts.pathTitle} meta={t.sections.pathMeta}>
          <PathChart result={result} scenario={scenario} />
          {result.firstPayoutEndAge !== undefined && <p>{t.firstEnd(result.firstPayoutEndAge)}</p>}
        </Disclosure>
        {hasWish && api.gap && (
          <Disclosure id="close-gap" title={t.closeGap.title} meta={gapMeta(api.gap)}>
            <GapTile
              gap={api.gap}
              budget={budget}
              etfEnabled={api.state.enabled.etf}
              hasWish={hasWish}
            />
          </Disclosure>
        )}
        <WhatIfCard api={api} />
        <Disclosure title={t.sections.details} meta={t.sections.detailsMeta}>
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
                  values={SCENARIO_NAMES.map(
                    (s) => result.scenarios[s].snapshot.netMonthlyPensionReal,
                  )}
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
          <h3>{t.pathTitle}</h3>
          <PathTable result={result} scenario={scenario} />
        </Disclosure>
        {blocks}
        <InfoNotes codes={info} />
      </div>
    </>
  );
}
