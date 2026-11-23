import {
  type DepotInput,
  type DepotProjection,
  type GlobalAssumptions,
  type ScenarioName,
} from '@valiva/core';
import { Fragment, useState } from 'react';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import {
  ScenarioTable as ScenarioTableView,
  StepsTable as StepsTableView,
  type ResultRow,
} from '../../components/cards/ResultTable';
import { ScenarioResults } from './DepotResults';

export function ScenarioTable({
  results,
  input,
  assumptions: a,
}: {
  results: ScenarioResults;
  input: DepotInput;
  assumptions: GlobalAssumptions;
}) {
  const t = de.depot.scenarioTable;
  const override = input.returnOverridePercent;
  const names: [ScenarioName, string][] =
    override !== undefined
      ? [['neutral', t.override(formatNumber(override))]]
      : [
          ['pessimistic', t.pessimistic(formatNumber(a.returnScenarios.pessimistic))],
          ['neutral', t.neutral(formatNumber(a.returnScenarios.neutral))],
          ['optimistic', t.optimistic(formatNumber(a.returnScenarios.optimistic))],
        ];
  return (
    <ScenarioTableView
      title={t.title}
      columns={[
        t.scenario,
        t.capital(results.neutral.details.payoutYear),
        t.grossNominal,
        t.grossReal,
        t.netReal,
      ]}
      rows={names.map(([s, label]) => {
        const r = results[s];
        return {
          label,
          emphasis: s === 'neutral',
          values: [
            formatEur(r.capitalAtRetirement ?? 0),
            formatEur(r.monthlyPensionNominal),
            formatEur(r.monthlyPensionReal),
            formatEur(r.netMonthlyPensionReal),
          ],
        };
      })}
    />
  );
}

/** Number of year cards shown on a phone before "show all". */
const FIRST_CARDS = 5;

/**
 * Allowances per calendar year. Wide screens get the table, narrow ones (under 640 px, CSS) a list of
 * cards with the total first; both carry the same figures. Mockup: docs/mockups/depot-ap11.html.
 */
export function AllowanceTable({ details: d }: { details: DepotProjection['details'] }) {
  const t = de.depot.allowanceTable;
  const [showAll, setShowAll] = useState(false);
  const sum = (f: (y: (typeof d.yearly)[number]) => number) =>
    d.yearly.reduce((s, y) => s + f(y), 0);
  const columns = [t.year, t.contribution, t.basic, t.child, t.bonus, t.total, t.value];
  const rows: ResultRow[] = [
    ...d.yearly.map((y) => ({
      label: String(y.year),
      values: [y.contributions, y.basic, y.child, y.bonus, y.total, y.valueEnd].map(formatEur),
    })),
    {
      label: t.sum,
      sum: true,
      values: [
        sum((y) => y.contributions),
        sum((y) => y.basic),
        sum((y) => y.child),
        sum((y) => y.bonus),
        sum((y) => y.total),
        d.modelCapital,
      ].map(formatEur),
    },
  ];
  const card = (
    key: string,
    title: string,
    total: string,
    values: readonly string[],
    sumCard = false,
  ) => (
    <li key={key} className={sumCard ? 'sum' : undefined}>
      <h3>
        <span>{title}</span>
        <span className="tot">{total}</span>
      </h3>
      <dl>
        {[t.contribution, t.basic, t.child, t.bonus, t.value].map((label, i) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd>{values[i]}</dd>
          </Fragment>
        ))}
      </dl>
    </li>
  );
  const years = showAll ? d.yearly : d.yearly.slice(0, FIRST_CARDS);
  const first = d.yearly[0];
  const last = d.yearly[d.yearly.length - 1];
  return (
    <>
      <div className="only-wide">
        <StepsTableView title={t.title} columns={columns} rows={rows} note={t.note} />
      </div>
      <div className="only-narrow">
        <ol className="year-cards" aria-label={t.cardsLabel}>
          {first &&
            last &&
            card(
              'sum',
              t.sumCard(first.year, last.year),
              formatEur(sum((y) => y.total)),
              [
                sum((y) => y.contributions),
                sum((y) => y.basic),
                sum((y) => y.child),
                sum((y) => y.bonus),
                d.modelCapital,
              ].map(formatEur),
              true,
            )}
          {years.map((y) =>
            card(
              String(y.year),
              String(y.year),
              t.cardTotal(formatEur(y.total)),
              [y.contributions, y.basic, y.child, y.bonus, y.valueEnd].map(formatEur),
            ),
          )}
        </ol>
        {d.yearly.length > FIRST_CARDS && (
          <button
            type="button"
            className="btn year-cards-more"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? t.showFirst(FIRST_CARDS) : t.showAll(FIRST_CARDS, d.yearly.length)}
          </button>
        )}
        <p className="hint">{t.note}</p>
      </div>
    </>
  );
}

export function StepsTable({
  result,
  assumptions: a,
  input,
}: {
  result: DepotProjection;
  assumptions: GlobalAssumptions;
  input: DepotInput;
}) {
  const t = de.depot.steps;
  const d = result.details;
  const n = d.nominal;
  const real = (v: number) => formatEur(v / d.inflationFactor);
  const row = (label: string, nominal: number, sign: '' | '− ' = '', sum = false): ResultRow => ({
    label,
    values: [`${sign}${formatEur(nominal)}`, `${sign}${real(nominal)}`],
    ...(sum ? { sum: true } : {}),
  });
  return (
    <StepsTableView
      title={t.title}
      columns={[t.cols.step, t.cols.nominal, t.cols.real]}
      rows={[
        row(
          t.plan(
            d.payoutYear,
            d.payoutYear - input.payoutStartAge + input.payoutEndAge,
            d.planMonths,
            formatNumber(a.payoutPhaseReturnPercent),
          ),
          n.gross,
        ),
        row(t.tax, n.tax, '− '),
        row(
          a.health.mode === 'other'
            ? t.healthOther(formatNumber(a.health.otherRatePercent ?? 0))
            : t.healthCompulsory,
          n.contributions,
          '− ',
        ),
        row(t.net, n.net, '', true),
      ]}
      note={t.note}
    />
  );
}
