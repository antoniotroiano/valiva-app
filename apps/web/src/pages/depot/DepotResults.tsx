import {
  type DepotInput,
  type DepotProjection,
  type GlobalAssumptions,
  type LegalParameters,
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
import { DepotChart } from '../../components/charts/DepotChart';
import { WithdrawalChart, ageText } from '../../components/forms/WithdrawalFields';
import { de } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';
import { AllowanceTable, ScenarioTable, StepsTable } from './DepotTables';

export type ScenarioResults = Record<ScenarioName, DepotProjection>;

type Props = {
  results: ScenarioResults;
  input: DepotInput;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
};

/** Notes of the block with their weight: what changes the result stays visible, background is collapsed. */
function notesOf({ results, input, legal }: Props): Note[] {
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
  const withdrawalPercent = d.withdrawal.strategy === 'percent';
  return [
    ...notesFromCodes(r.warnings),
    ...(d.yearly.length > 0 && d.yearly.every((y) => y.belowMinimum)
      ? [
          {
            id: 'belowMinimum',
            weight: 'important' as const,
            text: t.notices.belowMinimum(formatEur(legal.depot.minOwnContributionYearly)),
          },
        ]
      : []),
    ...(firstGrantRow && d.basicGrantMissedPerYear > 0.005
      ? [
          {
            id: 'missed',
            weight: 'important' as const,
            text: t.notices.missed(
              formatEur(monthly),
              formatEur(monthly * 12),
              formatEur(firstGrantRow.basic),
              formatEur(legal.depot.basicGrantTier2Limit / 12),
              formatEur(fullYear),
              formatEur(d.basicGrantMissedPerYear),
            ),
          },
        ]
      : []),
    ...(d.guaranteeActive
      ? [
          {
            id: 'guarantee',
            weight: 'info' as const,
            text: t.notices.guarantee(
              formatEur(d.modelCapital),
              formatEur(d.guaranteeFloor),
              `${formatNumber(guaranteeLevel)} %`,
            ),
          },
        ]
      : []),
    ...(r.lumpSum ? [{ id: 'lump', weight: 'info' as const, text: t.notices.lump }] : []),
    ...(withdrawalPercent
      ? [{ id: 'withdrawal', weight: 'info' as const, text: de.withdrawal.note }]
      : []),
  ];
}

/** Result: important notes, then the hero figure (net per month) with the key figures. */
export function DepotResult(props: Props) {
  const { results, input } = props;
  const t = de.depot;
  const r = results.neutral;
  const d = r.details;
  const percent = d.withdrawal.strategy === 'percent';
  const kpis: ResultKpi[] = [
    { label: t.kpi.capital(d.payoutYear), value: formatEur(r.capitalAtRetirement ?? 0) },
    { label: t.kpi.own, value: formatEur(d.ownTotal) },
    { label: t.kpi.allowances, value: formatEur(d.allowanceTotal) },
    { label: t.kpi.grossNominal, value: formatEur(r.monthlyPensionNominal) },
    { label: t.kpi.grossReal, value: formatEur(r.monthlyPensionReal) },
    { label: t.kpi.tax, value: formatEur(r.taxAndContributions) },
    ...(r.lumpSum
      ? [
          { label: t.kpi.lumpGross, value: formatEur(r.lumpSum.gross) },
          {
            label: t.kpi.lumpNet,
            value: formatEur(r.lumpSum.net),
            note: `${t.kpi.lumpReal}: ${formatEur(r.lumpSum.netReal)}`,
          },
        ]
      : []),
    ...(percent
      ? [
          {
            label: de.withdrawal.lasts,
            value:
              d.depletionAge === undefined
                ? de.withdrawal.lastsEnd(input.payoutEndAge)
                : ageText(d.depletionAge),
          },
          { label: de.withdrawal.remaining, value: formatEur(d.remainingCapitalAtEnd) },
        ]
      : []),
  ];
  return (
    <>
      <ImportantNotes notes={notesOf(props)} />
      <ResultFrame
        eyebrow={percent ? t.heroEyebrowPercent(d.payoutYear) : t.heroEyebrow(d.payoutYear)}
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
export function DepotCalculation({
  props,
  profileFacts,
  simplification,
}: {
  props: Props | undefined;
  profileFacts: ReactNode;
  simplification: string;
}) {
  const t = de.depot;
  const b = de.blocks;
  const r = props?.results.neutral;
  const d = r?.details;
  return (
    <div className="dts">
      {props && r && d && (
        <>
          <Disclosure title={b.scenarios}>
            <ScenarioTable
              results={props.results}
              input={props.input}
              assumptions={props.assumptions}
            />
          </Disclosure>
          <Disclosure title={t.chart.title} meta={b.chartMeta}>
            <DepotChart scenarios={props.results} bare />
          </Disclosure>
          {d.withdrawal.strategy === 'percent' && (
            <Disclosure title={de.withdrawal.chart.title}>
              <WithdrawalChart
                bare
                start={d.planCapital}
                years={{
                  pessimistic: props.results.pessimistic.details.withdrawalYears,
                  neutral: d.withdrawalYears,
                  optimistic: props.results.optimistic.details.withdrawalYears,
                }}
              />
            </Disclosure>
          )}
          <Disclosure title={t.allowanceTable.title} meta={t.allowanceTable.meta(d.yearly.length)}>
            <AllowanceTable details={d} />
          </Disclosure>
          <Disclosure title={t.steps.title}>
            <StepsTable result={r} assumptions={props.assumptions} input={props.input} />
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
