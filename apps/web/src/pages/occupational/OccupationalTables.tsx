import {
  type GlobalAssumptions,
  type LegalParameters,
  type OccupationalInput,
  type OccupationalProjection,
  type ScenarioName,
} from '@valiva/core';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { ScrollTable } from '../../components/cards/ScrollTable';
import { ScenarioResults } from './OccupationalResults';

export function EffortTable({
  result,
  assumptions: a,
  legal,
}: {
  result: OccupationalProjection;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.occupational.effort;
  const e = result.details.netEffort;
  return (
    <ScrollTable label={t.title(formatEur(e.gross), formatEur(e.net))} className="card">
      <table>
        <caption>{t.title(formatEur(e.gross), formatEur(e.net))}</caption>
        <thead>
          <tr>
            <th scope="col">{t.cols.item}</th>
            <th scope="col">{t.cols.monthly}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="left">
              {t.conversion}
            </th>
            <td>{formatEur(e.gross)}</td>
          </tr>
          <tr>
            <th scope="row" className="left">
              {t.taxSaving(
                formatEur(Math.min(e.gross, legal.social.occupationalTaxFreeMonthly)),
                formatNumber(a.marginalTaxRateTodayPercent),
              )}
            </th>
            <td>− {formatEur(e.taxSaving)}</td>
          </tr>
          <tr>
            <th scope="row" className="left">
              {t.socialSaving(
                formatEur(Math.min(e.gross, legal.social.occupationalSocialInsuranceFreeMonthly)),
                formatNumber(a.employeeSocialInsuranceRatePercent),
              )}
            </th>
            <td>− {formatEur(e.socialSaving)}</td>
          </tr>
          <tr className="sum">
            <th scope="row" className="left">
              {t.net}
            </th>
            <td>{formatEur(e.net)}</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">{t.note(formatEur(result.details.subsidyMonthly))}</p>
    </ScrollTable>
  );
}

export function ScenarioTable({
  results,
  assumptions: a,
}: {
  results: ScenarioResults;
  assumptions: GlobalAssumptions;
}) {
  const t = de.occupational.scenarioTable;
  const rows: [ScenarioName, string][] = [
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

export function StepsTable({
  result,
  assumptions: a,
  input,
  legal,
}: {
  result: OccupationalProjection;
  assumptions: GlobalAssumptions;
  input: OccupationalInput;
  legal: LegalParameters;
}) {
  const t = de.occupational.steps;
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
  const compulsory = a.health.mode === 'statutoryCompulsory';
  const careRate = a.health.childless
    ? legal.social.careRateChildlessPercent
    : legal.social.careRatePercent;
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
              formatEur(result.capitalAtRetirement ?? 0),
            ),
            n.gross,
          )}
          {row(t.tax, n.tax, '− ')}
          {row(
            compulsory
              ? t.healthCompulsory(
                  formatNumber(
                    legal.social.healthGeneralRatePercent + a.health.additionalRatePercent,
                  ),
                  formatEur(d.healthAllowanceReal),
                )
              : t.healthOther(formatNumber(a.health.otherRatePercent ?? 0)),
            n.health,
            '− ',
          )}
          {compulsory &&
            row(n.care > 0 ? t.careOver(formatNumber(careRate)) : t.careUnder, n.care, '− ')}
          {row(t.net, n.net, '', true)}
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}
