import {
  type DepotInput,
  type DepotProjection,
  type GlobalAssumptions,
  type ScenarioName,
} from '@valiva/core';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { ScrollTable } from '../../components/cards/ScrollTable';
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
  const rows: [ScenarioName, string][] =
    override !== undefined
      ? [['neutral', t.override(formatNumber(override))]]
      : [
          ['pessimistic', t.pessimistic(formatNumber(a.returnScenarios.pessimistic))],
          ['neutral', t.neutral(formatNumber(a.returnScenarios.neutral))],
          ['optimistic', t.optimistic(formatNumber(a.returnScenarios.optimistic))],
        ];
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.scenario}</th>
            <th scope="col">{t.capital(results.neutral.details.payoutYear)}</th>
            <th scope="col">{t.grossNominal}</th>
            <th scope="col">{t.grossReal}</th>
            <th scope="col">{t.netReal}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([s, label]) => {
            const r = results[s];
            return (
              <tr key={s} className={s === 'neutral' ? 'sum' : undefined}>
                <th scope="row" className="left">
                  {label}
                </th>
                <td>{formatEur(r.capitalAtRetirement ?? 0)}</td>
                <td>{formatEur(r.monthlyPensionNominal)}</td>
                <td>{formatEur(r.monthlyPensionReal)}</td>
                <td>{formatEur(r.netMonthlyPensionReal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollTable>
  );
}

export function AllowanceTable({ details: d }: { details: DepotProjection['details'] }) {
  const t = de.depot.allowanceTable;
  const sum = (f: (y: (typeof d.yearly)[number]) => number) =>
    d.yearly.reduce((s, y) => s + f(y), 0);
  return (
    <details className="card">
      <summary>{t.toggle(d.yearly.length)}</summary>
      <ScrollTable label={t.title}>
        <table>
          <caption>{t.title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.year}</th>
              <th scope="col">{t.contribution}</th>
              <th scope="col">{t.basic}</th>
              <th scope="col">{t.child}</th>
              <th scope="col">{t.bonus}</th>
              <th scope="col">{t.total}</th>
              <th scope="col">{t.value}</th>
            </tr>
          </thead>
          <tbody>
            {d.yearly.map((y) => (
              <tr key={y.year}>
                <th scope="row">{y.year}</th>
                <td>{formatEur(y.contributions)}</td>
                <td>{formatEur(y.basic)}</td>
                <td>{formatEur(y.child)}</td>
                <td>{formatEur(y.bonus)}</td>
                <td>{formatEur(y.total)}</td>
                <td>{formatEur(y.valueEnd)}</td>
              </tr>
            ))}
            <tr className="sum">
              <th scope="row">{t.sum}</th>
              <td>{formatEur(sum((y) => y.contributions))}</td>
              <td>{formatEur(sum((y) => y.basic))}</td>
              <td>{formatEur(sum((y) => y.child))}</td>
              <td>{formatEur(sum((y) => y.bonus))}</td>
              <td>{formatEur(sum((y) => y.total))}</td>
              <td>{formatEur(d.modelCapital)}</td>
            </tr>
          </tbody>
        </table>
      </ScrollTable>
      <p className="hint">{t.note}</p>
    </details>
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
  const row = (label: string, nominal: number, sign: '' | '− ' = '', sum = false) => (
    <tr className={sum ? 'sum' : undefined} key={label}>
      <th scope="row" className="left">
        {label}
      </th>
      <td>
        {sign}
        {formatEur(nominal)}
      </td>
      <td>
        {sign}
        {real(nominal)}
      </td>
    </tr>
  );
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.cols.step}</th>
            <th scope="col">{t.cols.nominal}</th>
            <th scope="col">{t.cols.real}</th>
          </tr>
        </thead>
        <tbody>
          {row(
            t.plan(
              d.payoutYear,
              d.payoutYear - input.payoutStartAge + input.payoutEndAge,
              d.planMonths,
              formatNumber(a.payoutPhaseReturnPercent),
            ),
            n.gross,
          )}
          {row(t.tax, n.tax, '− ')}
          {row(
            a.health.mode === 'other'
              ? t.healthOther(formatNumber(a.health.otherRatePercent ?? 0))
              : t.healthCompulsory,
            n.contributions,
            '− ',
          )}
          {row(t.net, n.net, '', true)}
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}
