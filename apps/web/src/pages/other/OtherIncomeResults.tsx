import { otherIncomeProductId, otherIncomeStartAge, projectOtherIncome } from '@valiva/core';
import type {
  OtherIncomeEntry,
  OverviewProductStatus,
  OverviewResult,
  ProjectionContext,
  ScenarioName,
} from '@valiva/core';
import type { ReactNode } from 'react';
import { StepsTable } from '../../components/cards/ResultTable';
import { ScrollTable } from '../../components/cards/ScrollTable';
import { Disclosure } from '../../components/cards/Disclosure';
import { ResultFrame, type ResultKpi } from '../../components/cards/ResultFrame';
import { ImportantNotes, InfoNotes, notesFromCodes } from '../../components/cards/WarningList';
import { de } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';

const NEUTRAL: ScenarioName = 'neutral';

/** Net income per month of one entry at an age, from the overview path (0 before the path starts). */
function netAt(result: OverviewResult, id: string, age: number): number {
  const point = result.scenarios[NEUTRAL].path.find((p) => p.age === age);
  return point?.byProduct[otherIncomeProductId(id)] ?? 0;
}

export function statusLabel(s: OverviewProductStatus | undefined): string {
  const t = de.otherIncome.result.status;
  if (!s) return t.invalid;
  if (s.empty && s.status === 'included') return t.empty;
  return t[s.status];
}

type ResultProps = {
  entries: readonly OtherIncomeEntry[];
  result: OverviewResult;
  /** Notes of the entries and of the shared threshold; important ones stay visible. */
  codes: readonly string[];
};

/** Hero figure (net per month at the retirement age) with gross, tax and a table of all entries. */
export function OtherIncomeResult({ entries, result, codes }: ResultProps) {
  const t = de.otherIncome.result;
  const snap = result.scenarios[NEUTRAL].snapshot;
  const mine = snap.byProduct.filter((a) => a.productId.startsWith('otherIncome:'));
  const sum = (pick: (a: (typeof mine)[number]) => number) => mine.reduce((s, a) => s + pick(a), 0);
  const kpis: ResultKpi[] = [
    { label: t.kpi.gross, value: formatEur(sum((a) => a.grossReal)) },
    { label: t.kpi.tax, value: formatEur(sum((a) => a.taxAndContributionsReal)) },
    { label: t.kpi.net, value: formatEur(sum((a) => a.netReal)) },
  ];
  const notes = notesFromCodes(codes);
  return (
    <>
      <ImportantNotes notes={notes} />
      <ResultFrame
        eyebrow={t.eyebrow(result.targetRetirementAge)}
        value={formatEur(sum((a) => a.netReal))}
        unit={t.perMonth}
        range={t.note}
        kpis={kpis}
      />
      <EntriesTable entries={entries} result={result} />
    </>
  );
}

export function EntriesTable({
  entries,
  result,
}: {
  entries: readonly OtherIncomeEntry[];
  result: OverviewResult;
}) {
  const t = de.otherIncome;
  const target = result.targetRetirementAge;
  return (
    <ScrollTable label={t.result.table.title} className="card">
      <table>
        <caption>{t.result.table.title}</caption>
        <thead>
          <tr>
            {t.result.table.columns.map((c, i) => (
              <th key={c} scope="col" className={i === 0 ? 'left' : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const status = result.products.find((p) => p.productId === otherIncomeProductId(e.id));
            const start = status?.payoutStartAge ?? otherIncomeStartAge(e, target);
            return (
              <tr key={e.id}>
                <th scope="row" className="left">
                  {e.name}
                </th>
                <td className="num">
                  {e.start.mode === 'age' ? `${start} ${t.unitYears}` : t.result.retirement}
                </td>
                <td className="num">
                  {e.end.mode === 'age' ? `${e.end.age} ${t.unitYears}` : t.describe.end(undefined)}
                </td>
                <td className="num">
                  {status?.status === 'included' || status?.status === 'later'
                    ? formatEur(netAt(result, e.id, Math.max(start, target)))
                    : formatEur(0)}
                </td>
                <td>{statusLabel(status)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollTable>
  );
}

/** Calculation of the selected entry as collapsible rows, then the simplifications. */
export function OtherIncomeCalculation({
  entry,
  ctx,
  codes,
  profileFacts,
}: {
  entry: OtherIncomeEntry | undefined;
  ctx: ProjectionContext | undefined;
  codes: readonly string[];
  profileFacts: ReactNode;
}) {
  const t = de.otherIncome.calculation;
  const b = de.blocks;
  const out = entry && ctx ? projectOtherIncome(entry, ctx, NEUTRAL) : undefined;
  const r = out?.ok ? out.result : undefined;
  const d = r?.details;
  const notes = notesFromCodes(codes).filter((n) => n.weight === 'info');
  return (
    <div className="dts">
      {entry && r && d && (
        <Disclosure title={t.perEntry(entry.name)}>
          <StepsTable
            title={t.steps.title}
            columns={t.steps.columns}
            rows={[
              { label: t.steps.amountAtStart, values: [formatEur(d.monthlyNominalAtStart)] },
              { label: t.steps.amountAtStartReal, values: [formatEur(r.monthlyPensionReal)] },
              {
                label: t.steps.adjustment,
                values: [`${formatNumber(d.adjustmentPercent)} %`],
              },
              {
                label: t.steps.taxable,
                values: [
                  `${formatEur(r.taxableMonthlyReal)} (${formatNumber(d.taxableSharePercent)} %)`,
                ],
              },
              {
                label: t.steps.tax,
                values: [formatEur(r.taxAndContributions - (r.contributionsMonthlyReal ?? 0))],
              },
              {
                label: t.steps.contributions,
                values: [formatEur(r.contributionsMonthlyReal ?? 0)],
              },
              { label: t.steps.net, values: [formatEur(r.netMonthlyPensionReal)], sum: true },
            ]}
          />
        </Disclosure>
      )}
      {notes.length > 0 && <InfoNotes notes={notes} />}
      <Disclosure title={b.simplification}>
        <p className="hint">{t.simplification}</p>
      </Disclosure>
      <Disclosure title={b.assumptions} meta={b.assumptionsMeta}>
        {profileFacts}
      </Disclosure>
    </div>
  );
}
