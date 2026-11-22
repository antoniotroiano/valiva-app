import type { EtfScenarioResult } from '@pathwise/core';
import { de } from '../i18n/de';
import { formatEur } from '../format';

export function YearTable({ result }: { result: EtfScenarioResult }) {
  const t = de.etf.table;
  const advance = result.yearly.some((y) => y.advanceLumpSum !== undefined);
  return (
    <details className="card table-wrap">
      <summary>{de.etf.tableToggle(result.yearly.length)}</summary>
      <table>
        <caption>
          {t.title} ({t.scenario}: {de.etf.chart.neutral})
        </caption>
        <thead>
          <tr>
            <th scope="col">{t.year}</th>
            <th scope="col">{t.contributed}</th>
            <th scope="col">{t.value}</th>
            <th scope="col">{t.real}</th>
            {advance && <th scope="col">{t.advanceLumpSum}</th>}
            {advance && <th scope="col">{t.advanceTax}</th>}
          </tr>
        </thead>
        <tbody>
          {result.yearly.map((y) => (
            <tr key={y.year}>
              <th scope="row">{y.year}</th>
              <td>{formatEur(y.contributed)}</td>
              <td>{formatEur(y.value)}</td>
              <td>{formatEur(y.valueReal)}</td>
              {advance && <td>{formatEur(y.advanceLumpSum ?? 0)}</td>}
              {advance && <td>{formatEur(y.advanceTax ?? 0)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
