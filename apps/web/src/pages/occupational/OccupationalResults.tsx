import {
  type GlobalAssumptions,
  type LegalParameters,
  type OccupationalInput,
  type OccupationalProjection,
  type ScenarioName,
} from '@valiva/core';
import { KpiTile } from '../../components/cards/KpiTile';
import { OccupationalChart } from '../../components/charts/OccupationalChart';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { warningText } from '../../lib/warningText';
import { EffortTable, ScenarioTable, StepsTable } from './OccupationalTables';

export type ScenarioResults = Record<ScenarioName, OccupationalProjection>;

export function ProfileFacts({ a, legal }: { a: GlobalAssumptions; legal?: LegalParameters }) {
  const r = de.occupational.profileRows;
  const health =
    a.health.mode === 'other'
      ? r.healthOther(formatNumber(a.health.otherRatePercent ?? 0))
      : r.healthCompulsory(
          formatNumber(a.health.additionalRatePercent),
          formatNumber(
            a.health.childless
              ? (legal?.social.careRateChildlessPercent ?? 4.2)
              : (legal?.social.careRatePercent ?? 3.6),
          ),
        );
  return (
    <dl className="facts">
      <dt>{r.scenarios}</dt>
      <dd>
        {formatNumber(a.returnScenarios.pessimistic)} % / {formatNumber(a.returnScenarios.neutral)}{' '}
        % / {formatNumber(a.returnScenarios.optimistic)} %
      </dd>
      <dt>{r.payoutReturn}</dt>
      <dd>{formatNumber(a.payoutPhaseReturnPercent)} %</dd>
      <dt>{r.inflation}</dt>
      <dd>{formatNumber(a.inflationPercent)} %</dd>
      <dt>{r.marginalTax}</dt>
      <dd>{formatNumber(a.marginalTaxRateTodayPercent)} %</dd>
      <dt>{r.socialInsurance}</dt>
      <dd>{formatNumber(a.employeeSocialInsuranceRatePercent)} %</dd>
      <dt>{r.tax}</dt>
      <dd>{r.taxValue}</dd>
      <dt>{r.health}</dt>
      <dd>{health}</dd>
    </dl>
  );
}

export function OccupationalResults({
  results,
  input,
  assumptions,
  legal,
}: {
  results: ScenarioResults;
  input: OccupationalInput;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.occupational;
  const r = results.neutral;
  const d = r.details;
  const cappedAt = legal.social.occupationalSocialInsuranceFreeMonthly;
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
      {input.employerSubsidyMode === 'auto15' &&
        input.employeeContributionMonthlyGross > cappedAt && (
          <div className="notice info" role="status">
            {t.notices.subsidyCapped(formatEur(cappedAt), formatEur(d.subsidyMonthly))}
          </div>
        )}
      {d.statutoryLossMonthlyToday > 0 && (
        <div className="notice info" role="status">
          {t.notices.statutoryLoss(formatEur(d.statutoryLossMonthlyToday))}
        </div>
      )}
      {d.guaranteeActive && (
        <div className="notice info" role="status">
          {t.notices.guarantee(
            `${formatNumber(d.grossReturnPercent - input.costPercentPerYear)} %`,
            `${formatNumber(d.netReturnPercentUsed)} %`,
          )}
        </div>
      )}
      {d.nominal.care === 0 && d.nominal.health === 0 && assumptions.health.mode !== 'other' && (
        <div className="notice info" role="status">
          {t.notices.belowThreshold(formatEur(d.careThresholdReal))}
        </div>
      )}
      <p className="hint">{t.scenarioNote(t.scenarioNames.neutral)}</p>
      <div className="kpis">
        <KpiTile
          label={t.kpi.netEffort}
          value={formatEur(d.netEffort.net)}
          note={t.kpi.netEffortNote(formatEur(d.netEffort.gross))}
        />
        <KpiTile
          label={t.kpi.intoContract}
          value={formatEur(d.intoContractMonthly)}
          note={t.kpi.intoContractNote(formatEur(d.netEffort.gross), formatEur(d.subsidyMonthly))}
        />
        <KpiTile
          label={t.kpi.capital(d.payoutYear)}
          value={formatEur(r.capitalAtRetirement ?? 0)}
        />
        <KpiTile
          label={t.kpi.parts}
          value={`${formatEur(d.employeeTotal)} / ${formatEur(d.subsidyTotal + d.employerExtraTotal)}`}
        />
        <KpiTile label={t.kpi.grossNominal} value={formatEur(r.monthlyPensionNominal)} />
        <KpiTile label={t.kpi.grossReal} value={formatEur(r.monthlyPensionReal)} />
        <KpiTile label={t.kpi.tax} value={formatEur(r.taxAndContributions)} />
        <KpiTile label={t.kpi.netReal} value={formatEur(r.netMonthlyPensionReal)} />
      </div>
      <EffortTable result={r} assumptions={assumptions} legal={legal} />
      <ScenarioTable results={results} assumptions={assumptions} />
      <OccupationalChart scenarios={results} />
      <StepsTable result={r} assumptions={assumptions} input={input} legal={legal} />
    </>
  );
}
