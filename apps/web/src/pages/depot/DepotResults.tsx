import {
  type DepotInput,
  type DepotProjection,
  type GlobalAssumptions,
  type LegalParameters,
  type ScenarioName,
} from '@valiva/core';
import { DepotChart } from '../../components/charts/DepotChart';
import { KpiTile } from '../../components/cards/KpiTile';
import { WithdrawalChart, ageText } from '../../components/forms/WithdrawalFields';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { warningText } from '../../lib/warningText';
import { ScenarioTable, AllowanceTable, StepsTable } from './DepotTables';

export type ScenarioResults = Record<ScenarioName, DepotProjection>;

export function DepotResults({
  results,
  input,
  assumptions,
  legal,
}: {
  results: ScenarioResults;
  input: DepotInput;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.depot;
  const r = results.neutral;
  const d = r.details;
  const firstGrantRow = d.yearly.find((y) => !y.belowMinimum);
  const monthly = input.ownContributionMonthly;
  const fullYear =
    (legal.depot.basicGrantTier1Limit * legal.depot.basicGrantTier1RatePercent) / 100 +
    ((legal.depot.basicGrantTier2Limit - legal.depot.basicGrantTier1Limit) *
      legal.depot.basicGrantTier2RatePercent) /
      100;
  const guaranteeLevel =
    input.variant === 'guarantee100'
      ? legal.depot.guaranteeLevelHighPercent
      : legal.depot.guaranteeLevelLowPercent;
  return (
    <>
      {r.warnings.length > 0 && (
        <div className="notice" role="status">
          <ul>
            {r.warnings.map((w) => (
              <li key={w}>{warningText(w)}</li>
            ))}
          </ul>
        </div>
      )}
      {d.yearly.length > 0 && d.yearly.every((y) => y.belowMinimum) && (
        <div className="notice" role="status">
          {t.notices.belowMinimum(formatEur(legal.depot.minOwnContributionYearly))}
        </div>
      )}
      {firstGrantRow && d.basicGrantMissedPerYear > 0.005 && (
        <div className="notice" role="status">
          {t.notices.missed(
            formatEur(monthly),
            formatEur(monthly * 12),
            formatEur(firstGrantRow.basic),
            formatEur(legal.depot.basicGrantTier2Limit / 12),
            formatEur(fullYear),
            formatEur(d.basicGrantMissedPerYear),
          )}
        </div>
      )}
      {d.guaranteeActive && (
        <div className="notice info" role="status">
          {t.notices.guarantee(
            formatEur(d.modelCapital),
            formatEur(d.guaranteeFloor),
            `${formatNumber(guaranteeLevel)} %`,
          )}
        </div>
      )}
      <p className="hint">{t.scenarioNote(t.scenarioNames.neutral)}</p>
      <div className="kpis">
        <KpiTile
          label={t.kpi.capital(d.payoutYear)}
          value={formatEur(r.capitalAtRetirement ?? 0)}
        />
        <KpiTile label={t.kpi.own} value={formatEur(d.ownTotal)} />
        <KpiTile label={t.kpi.allowances} value={formatEur(d.allowanceTotal)} />
        <KpiTile label={t.kpi.grossNominal} value={formatEur(r.monthlyPensionNominal)} />
        <KpiTile label={t.kpi.grossReal} value={formatEur(r.monthlyPensionReal)} />
        <KpiTile label={t.kpi.tax} value={formatEur(r.taxAndContributions)} />
        <KpiTile label={t.kpi.netReal} value={formatEur(r.netMonthlyPensionReal)} />
        {r.lumpSum && (
          <>
            <KpiTile label={t.kpi.lumpGross} value={formatEur(r.lumpSum.gross)} />
            <KpiTile
              label={t.kpi.lumpNet}
              value={formatEur(r.lumpSum.net)}
              note={`${t.kpi.lumpReal}: ${formatEur(r.lumpSum.netReal)}`}
            />
          </>
        )}
      </div>
      {d.withdrawal.strategy === 'percent' && (
        <div className="kpis">
          <KpiTile
            label={de.withdrawal.lasts}
            value={
              d.depletionAge === undefined
                ? de.withdrawal.lastsEnd(input.payoutEndAge)
                : ageText(d.depletionAge)
            }
          />
          <KpiTile label={de.withdrawal.remaining} value={formatEur(d.remainingCapitalAtEnd)} />
        </div>
      )}
      <ScenarioTable results={results} input={input} assumptions={assumptions} />
      <DepotChart scenarios={results} />
      {d.withdrawal.strategy === 'percent' && (
        <>
          <p className="hint">{de.withdrawal.note}</p>
          <WithdrawalChart
            start={d.planCapital}
            years={{
              pessimistic: results.pessimistic.details.withdrawalYears,
              neutral: d.withdrawalYears,
              optimistic: results.optimistic.details.withdrawalYears,
            }}
          />
        </>
      )}
      <AllowanceTable details={d} />
      <StepsTable result={r} assumptions={assumptions} input={input} />
      {r.lumpSum && <p className="hint">{t.notices.lump}</p>}
    </>
  );
}
