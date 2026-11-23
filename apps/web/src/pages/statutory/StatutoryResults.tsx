import {
  type GlobalAssumptions,
  type LegalParameters,
  type StatutoryProjection,
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
import { PensionChart } from '../../components/charts/PensionChart';
import { de } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';
import { PathTable, StepsTable } from './StatutoryTables';

const notesOf = (result: StatutoryProjection): Note[] => {
  const t = de.statutory;
  const d = result.details;
  return [
    ...notesFromCodes(result.warnings),
    ...(d.adjustmentPercent < 0
      ? [
          {
            id: 'early',
            weight: 'important' as const,
            text: t.early(formatNumber(-d.adjustmentPercent), -d.monthsFromRegularAge),
          },
        ]
      : []),
    ...(d.adjustmentPercent > 0
      ? [
          {
            id: 'late',
            weight: 'info' as const,
            text: t.late(formatNumber(d.adjustmentPercent), d.monthsFromRegularAge),
          },
        ]
      : []),
  ];
};

/** Result: important notes, then the hero figure (net per month) with the key figures. */
export function StatutoryResult({ result }: { result: StatutoryProjection }) {
  const t = de.statutory;
  const d = result.details;
  const kpis: ResultKpi[] = [
    { label: t.kpi.start, value: String(d.retirementYear) },
    { label: t.kpi.grossNominal, value: formatEur(result.monthlyPensionNominal) },
    { label: t.kpi.grossReal, value: formatEur(result.monthlyPensionReal) },
    { label: t.kpi.deductions, value: formatEur(result.taxAndContributions) },
  ];
  return (
    <>
      <ImportantNotes notes={notesOf(result)} />
      <ResultFrame
        eyebrow={t.heroEyebrow(d.retirementYear)}
        value={formatEur(result.netMonthlyPensionReal)}
        unit={t.perMonth}
        kpis={kpis}
      />
    </>
  );
}

/** Calculation as collapsible rows. Without a result only the rows that do not need one are shown. */
export function StatutoryCalculation({
  result,
  assumptions,
  legal,
  profileFacts,
  showSimplification,
}: {
  result: StatutoryProjection | undefined;
  assumptions: GlobalAssumptions;
  legal: LegalParameters | undefined;
  profileFacts: ReactNode;
  showSimplification: boolean;
}) {
  const t = de.statutory;
  const b = de.blocks;
  return (
    <div className="dts">
      {result && legal && (
        <>
          <Disclosure title={t.steps.title}>
            <StepsTable details={result.details} assumptions={assumptions} legal={legal} />
          </Disclosure>
          <Disclosure title={t.chart.title}>
            <PensionChart details={result.details} bare />
          </Disclosure>
          <Disclosure title={t.rows.table} meta={t.rows.tableMeta}>
            <PathTable details={result.details} />
          </Disclosure>
          <InfoNotes notes={notesOf(result)} />
        </>
      )}
      {showSimplification && (
        <Disclosure title={t.simplification.title}>
          <p className="hint">{t.simplification.text}</p>
        </Disclosure>
      )}
      <Disclosure title={b.assumptions} meta={b.assumptionsMeta}>
        {profileFacts}
      </Disclosure>
    </div>
  );
}
