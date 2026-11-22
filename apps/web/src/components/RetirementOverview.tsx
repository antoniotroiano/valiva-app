import type {
  GapSolveResult,
  OverviewProductKind,
  OverviewResult,
  ScenarioName,
  ValidationIssue,
} from '@pathwise/core';
import { SCENARIO_NAMES } from '@pathwise/core';
import { useState } from 'react';
import { formatEur } from '../format';
import { WhatIfCard } from './WhatIfCard';
import { NumberField } from './NumberField';
import { withTerms } from './Terms';
import { CompositionChart, GapBar, PathChart, ScenarioSwitch } from './RetirementCharts';
import { de, issueMessage } from '../i18n/de';
import { warningText, warningWeight } from '../warningText';
import type { OverviewApi, OverviewBlock } from '../useOverview';
import { OVERVIEW_BLOCKS } from '../useOverview';

type Target = 'profile' | 'etf' | 'statutory' | 'depot' | 'occupational' | 'assumptions';

const PAGE_OF: Record<OverviewBlock, Target> = {
  etf: 'etf',
  statutory: 'statutory',
  retirementDepot: 'depot',
  occupational: 'occupational',
};

export type BudgetInfo = { budget?: number; otherSavingsMonthly: number };

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
        <p>
          {t.profileInvalid}{' '}
          <button type="button" className="link" onClick={() => goTo('profile')}>
            {t.toProfile}
          </button>
        </p>
      )}
      {outcome && !outcome.ok && (
        <p>
          {t.profileInvalid}{' '}
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

function productName(id: OverviewProductKind): string {
  const n = de.overview.retirement.productNames;
  return n[id];
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
            values={SCENARIO_NAMES.map((s) => result.scenarios[s].snapshot.grossMonthlyPensionReal)}
          />
          <Row
            label={t.tax}
            values={SCENARIO_NAMES.map((s) => result.scenarios[s].snapshot.taxAndContributionsReal)}
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

function Notes({ codes }: { codes: string[] }) {
  const t = de.overview.retirement;
  const sorted = [...codes].sort(
    (a, b) => Number(warningWeight(a) === 'info') - Number(warningWeight(b) === 'info'),
  );
  const important = sorted.filter((c) => warningWeight(c) === 'important').length;
  return (
    <details className="notes" open={important > 0}>
      <summary>{t.notes(sorted.length, important)}</summary>
      <ul className="warnings">
        {sorted.map((w) => (
          <li key={w}>
            <span className={warningWeight(w) === 'important' ? 'tag important' : 'tag'}>
              {warningWeight(w) === 'important' ? t.noteImportant : t.noteInfo}
            </span>
            {withTerms(warningText(w))}
          </li>
        ))}
      </ul>
    </details>
  );
}

function GapTile({
  gap,
  budget,
  etfEnabled,
  hasWish,
}: {
  gap: GapSolveResult;
  budget: BudgetInfo;
  etfEnabled: boolean;
  hasWish: boolean;
}) {
  const t = de.overview.retirement.closeGap;
  if (!hasWish) return null;
  return (
    <section aria-labelledby="ov-gap">
      <h3 id="ov-gap">{t.title}</h3>
      {!gap.ok && <p>{gap.issues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}</p>}
      {gap.ok && (
        <>
          <p>{t.intro(formatEur(gap.desiredMonthlyIncomeToday), formatEur(gap.currentMonthly))}</p>
          {!etfEnabled && <p className="hint">{t.etfOff}</p>}
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
                  const r = gap.scenarios[s];
                  return (
                    <td key={s} className="num">
                      {r.status === 'ok' ? <b>{formatEur(r.monthly)}</b> : t.status[r.status]}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">{t.newRow}</th>
                {SCENARIO_NAMES.map((s) => {
                  const r = gap.scenarios[s];
                  return (
                    <td key={s} className="num">
                      {r.status === 'unreachable' ? '–' : formatEur(r.newMonthly)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          <BudgetHint gap={gap} budget={budget} />
        </>
      )}
    </section>
  );
}

function BudgetHint({
  gap,
  budget,
}: {
  gap: Extract<GapSolveResult, { ok: true }>;
  budget: BudgetInfo;
}) {
  const t = de.overview.retirement.closeGap;
  const neutral = gap.scenarios.neutral;
  if (budget.budget === undefined || neutral.status === 'unreachable') return null;
  const rest = budget.budget - budget.otherSavingsMonthly - neutral.newMonthly;
  return (
    <p className="hint">
      {rest >= 0 ? t.budgetRest(formatEur(rest)) : t.budgetOver(formatEur(-rest))}
    </p>
  );
}

function Row({
  label,
  values,
  strong,
}: {
  label: string;
  values: (number | undefined)[];
  strong?: boolean;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {values.map((v, i) => (
        <td key={i} className="num">
          {v === undefined ? '–' : strong ? <b>{formatEur(v)}</b> : formatEur(v)}
        </td>
      ))}
    </tr>
  );
}

function PathTable({ result, scenario }: { result: OverviewResult; scenario: ScenarioName }) {
  const t = de.overview.retirement;
  const hasWish = result.desiredMonthlyIncomeToday !== undefined;
  const kinds = result.products.filter((p) => p.status !== 'disabled' && p.status !== 'invalid');
  return (
    <table>
      <caption>{t.pathCaption(t.scenarios[scenario])}</caption>
      <thead>
        <tr>
          <th scope="col">{t.age}</th>
          {kinds.map((k) => (
            <th key={k.productId} scope="col">
              {productName(k.productId)}
            </th>
          ))}
          <th scope="col">{t.net}</th>
          {hasWish && <th scope="col">{t.gap}</th>}
        </tr>
      </thead>
      <tbody>
        {result.scenarios[scenario].path.map((pt) => (
          <tr key={pt.age}>
            <th scope="row">{pt.age}</th>
            {kinds.map((k) => (
              <td key={k.productId} className="num">
                {formatEur(pt.byProduct[k.productId] ?? 0)}
              </td>
            ))}
            <td className="num">{formatEur(pt.total)}</td>
            {hasWish && <td className="num">{pt.gap === undefined ? '–' : formatEur(pt.gap)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
