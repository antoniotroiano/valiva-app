import {
  type GlobalAssumptions,
  type LegalParameters,
  type OccupationalInput,
  type OccupationalProjection,
  type ScenarioName,
} from '@valiva/core';
import type { ReactNode } from 'react';
import { Disclosure } from '../../components/cards/Disclosure';
import { ResultFrame, type ResultKpi } from '../../components/cards/ResultFrame';
import {
  ImportantNotes,
  InfoNotes,
  notesFromCodes,
  type Note,
} from '../../components/cards/WarningList';
import { OccupationalChart } from '../../components/charts/OccupationalChart';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
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

type Props = {
  results: ScenarioResults;
  input: OccupationalInput;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
};

/** Notes of the block with their weight: what changes the result stays visible, background is collapsed. */
function notesOf({ results, input, assumptions, legal }: Props): Note[] {
  const t = de.occupational;
  const d = results.neutral.details;
  const cappedAt = legal.social.occupationalSocialInsuranceFreeMonthly;
  return [
    ...notesFromCodes(results.neutral.warnings),
    ...(input.employerSubsidyMode === 'auto15' && input.employeeContributionMonthlyGross > cappedAt
      ? [
          {
            id: 'subsidyCapped',
            weight: 'info' as const,
            text: t.notices.subsidyCapped(formatEur(cappedAt), formatEur(d.subsidyMonthly)),
          },
        ]
      : []),
    ...(d.statutoryLossMonthlyToday > 0
      ? [
          {
            id: 'statutoryLoss',
            weight: 'info' as const,
            text: t.notices.statutoryLoss(formatEur(d.statutoryLossMonthlyToday)),
          },
        ]
      : []),
    ...(d.guaranteeActive
      ? [
          {
            id: 'guarantee',
            weight: 'info' as const,
            text: t.notices.guarantee(
              `${formatNumber(d.grossReturnPercent - input.costPercentPerYear)} %`,
              `${formatNumber(d.netReturnPercentUsed)} %`,
            ),
          },
        ]
      : []),
    ...(d.nominal.care === 0 && d.nominal.health === 0 && assumptions.health.mode !== 'other'
      ? [
          {
            id: 'belowThreshold',
            weight: 'info' as const,
            text: t.notices.belowThreshold(formatEur(d.careThresholdReal)),
          },
        ]
      : []),
  ];
}

/** Result: important notes, then the hero figure (net per month) with the key figures. */
export function OccupationalResult(props: Props) {
  const { results } = props;
  const t = de.occupational;
  const r = results.neutral;
  const d = r.details;
  const kpis: ResultKpi[] = [
    {
      label: t.kpi.netEffort,
      value: formatEur(d.netEffort.net),
      note: t.kpi.netEffortNote(formatEur(d.netEffort.gross)),
    },
    {
      label: t.kpi.intoContract,
      value: formatEur(d.intoContractMonthly),
      note: t.kpi.intoContractNote(formatEur(d.netEffort.gross), formatEur(d.subsidyMonthly)),
    },
    { label: t.kpi.capital(d.payoutYear), value: formatEur(r.capitalAtRetirement ?? 0) },
    {
      label: t.kpi.parts,
      value: `${formatEur(d.employeeTotal)} / ${formatEur(d.subsidyTotal + d.employerExtraTotal)}`,
    },
    { label: t.kpi.grossNominal, value: formatEur(r.monthlyPensionNominal) },
    { label: t.kpi.grossReal, value: formatEur(r.monthlyPensionReal) },
    { label: t.kpi.tax, value: formatEur(r.taxAndContributions) },
  ];
  return (
    <>
      <ImportantNotes notes={notesOf(props)} />
      <ResultFrame
        eyebrow={t.heroEyebrow(d.payoutYear)}
        value={formatEur(r.netMonthlyPensionReal)}
        unit={t.perMonth}
        range={de.blocks.range(
          formatEur(results.pessimistic.netMonthlyPensionReal),
          formatEur(results.optimistic.netMonthlyPensionReal),
        )}
        kpis={kpis}
      />
    </>
  );
}

/** Calculation as collapsible rows. Without a result only the rows that do not need one are shown. */
export function OccupationalCalculation({
  props,
  profileFacts,
  simplification,
}: {
  props: Props | undefined;
  profileFacts: ReactNode;
  simplification: string;
}) {
  const t = de.occupational;
  const b = de.blocks;
  const r = props?.results.neutral;
  return (
    <div className="dts">
      {props && r && (
        <>
          <Disclosure
            title={t.effort.title(
              formatEur(r.details.netEffort.gross),
              formatEur(r.details.netEffort.net),
            )}
          >
            <EffortTable result={r} assumptions={props.assumptions} legal={props.legal} />
          </Disclosure>
          <Disclosure title={b.scenarios}>
            <ScenarioTable results={props.results} assumptions={props.assumptions} />
          </Disclosure>
          <Disclosure title={t.chart.title} meta={b.chartMeta}>
            <OccupationalChart scenarios={props.results} bare />
          </Disclosure>
          <Disclosure title={t.steps.title}>
            <StepsTable
              result={r}
              assumptions={props.assumptions}
              input={props.input}
              legal={props.legal}
            />
          </Disclosure>
          <InfoNotes notes={notesOf(props)} />
        </>
      )}
      <Disclosure title={b.simplification}>
        <p className="hint">{simplification}</p>
      </Disclosure>
      <Disclosure title={b.assumptions} meta={b.assumptionsMeta}>
        {profileFacts}
      </Disclosure>
    </div>
  );
}
