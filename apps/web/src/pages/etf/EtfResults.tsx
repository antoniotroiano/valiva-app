import { type EtfPlanResult, type EtfProjection, type ScenarioName } from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import { Disclosure } from '../../components/cards/Disclosure';
import { ResultFrame, type ResultKpi } from '../../components/cards/ResultFrame';
import { ScenarioTable } from '../../components/cards/ResultTable';
import { YearTable } from '../../components/cards/YearTable';
import { ScenarioChart } from '../../components/charts/ScenarioChart';
import { EtfTargetSection } from '../../components/forms/EtfTargetSection';
import { WithdrawalChart, ageText } from '../../components/forms/WithdrawalFields';
import { de } from '../../i18n/de';
import { type EtfRetirement } from '../../lib/etfRetirement';
import { formatEur } from '../../lib/format';
import type { EtfPlanInput, ChurchTaxChoice } from '@valiva/core';

type PlanOk = Extract<EtfPlanResult, { ok: true }>;

/** Result of the saving phase: hero figure, key figures, notes. */
export function PlanResult({
  result,
  taxEnabled,
  years,
}: {
  result: PlanOk;
  taxEnabled: boolean;
  years: number;
}) {
  const t = de.etf;
  const { pessimistic, neutral, optimistic } = result.scenarios;
  const advance = neutral.advanceTaxPaid !== undefined;
  const kpis: ResultKpi[] = [
    { label: t.kpi.contributions, value: formatEur(neutral.totalContributions) },
    { label: t.kpi.gain, value: formatEur(neutral.gainBeforeTax) },
    { label: advance ? t.kpi.taxSale : t.kpi.tax, value: formatEur(neutral.tax) },
    ...(advance
      ? [
          {
            label: t.kpi.advanceTax,
            value: formatEur(neutral.advanceTaxPaid ?? 0),
            note: t.kpi.advanceTaxNote,
          },
        ]
      : []),
    { label: t.kpi.real, value: formatEur(neutral.finalValueReal) },
  ];
  return (
    <ResultFrame
      eyebrow={taxEnabled ? t.kpi.heroAfterTax(years) : t.kpi.heroNoTax(years)}
      value={formatEur(neutral.finalValueAfterTax)}
      range={t.kpi.range(
        formatEur(pessimistic.finalValueAfterTax),
        formatEur(optimistic.finalValueAfterTax),
      )}
      kpis={kpis}
      {...(advance ? { footnote: t.kpi.advanceNote } : {})}
    />
  );
}

/** Calculation of the saving phase: chart, year table and the reverse calculator as collapsible rows. */
export function PlanCalculation({
  result,
  personId,
  committed,
  churchTax,
}: {
  result: PlanOk | undefined;
  personId: string;
  committed: EtfPlanInput;
  churchTax: ChurchTaxChoice | undefined;
}) {
  const t = de.etf;
  return (
    <div className="dts">
      {result && (
        <>
          <Disclosure title={t.chart.title} meta={t.rows.chart}>
            <ScenarioChart scenarios={result.scenarios} bare />
          </Disclosure>
          <Disclosure title={t.tableToggle(result.scenarios.neutral.yearly.length)}>
            <YearTable result={result.scenarios.neutral} bare />
          </Disclosure>
        </>
      )}
      <Disclosure title={t.target.title} meta={t.rows.target}>
        <EtfTargetSection personId={personId} input={committed} churchTax={churchTax} />
      </Disclosure>
    </div>
  );
}

/** Result of the retirement part (withdrawal for the retirement plan), or the reason there is none. */
export function RetirementResult({ retirement }: { retirement: EtfRetirement }) {
  const t = de.etf.retirement;
  const w = de.withdrawal;
  const outcome = retirement.outcome;
  if (outcome === undefined) return <div className="card">{t.needsProfile}</div>;
  if (!outcome.ok) return <div className="card">{de.etf.errors}</div>;
  const r = outcome.results;
  const d = r.neutral.details;
  const percent = d.withdrawal.strategy === 'percent';
  const kpis: ResultKpi[] = [
    { label: t.capitalShort, value: formatEur(d.grossCapital) },
    { label: percent ? w.gross : t.gross, value: formatEur(r.neutral.monthlyPensionReal) },
    { label: t.tax, value: formatEur(r.neutral.taxAndContributions) },
    ...(percent
      ? [
          {
            label: w.lasts,
            value:
              d.depletionAge === undefined
                ? w.lastsEnd(retirement.payoutEndAge)
                : ageText(d.depletionAge),
          },
          { label: w.remaining, value: formatEur(d.remainingCapitalAtEnd) },
        ]
      : []),
  ];
  return (
    <>
      {d.depletionAge !== undefined && (
        <div className="notice" role="status">
          {w.depleted(ageText(d.depletionAge))}
        </div>
      )}
      <ResultFrame
        eyebrow={
          percent
            ? t.heroEyebrowPercent(retirement.payoutStartAge)
            : t.heroEyebrow(retirement.payoutStartAge)
        }
        value={formatEur(r.neutral.netMonthlyPensionReal)}
        unit={t.perMonth}
        range={t.range(
          formatEur(r.pessimistic.netMonthlyPensionReal),
          formatEur(r.optimistic.netMonthlyPensionReal),
        )}
        kpis={kpis}
      />
    </>
  );
}

/** Calculation of the retirement part: scenario table, remaining-capital chart, notes. */
export function RetirementCalculation({
  retirement,
  ownDuration,
}: {
  retirement: EtfRetirement;
  ownDuration: number;
}) {
  const t = de.etf.retirement;
  const w = de.withdrawal;
  const outcome = retirement.outcome;
  if (!outcome?.ok) return null;
  const scenarios = de.overview.retirement.scenarios;
  const d = outcome.results.neutral.details;
  const advance = d.advanceLumpSumSaving !== undefined;
  const percent = d.withdrawal.strategy === 'percent';
  const eur = (pick: (r: EtfProjection) => number) => (r: EtfProjection) => formatEur(pick(r));
  const lines: [string, (r: EtfProjection) => string][] = [
    [t.capital, eur((r) => r.details.grossCapital)],
    [percent ? w.gross : t.gross, eur((r) => r.monthlyPensionReal)],
    [t.tax, eur((r) => r.taxAndContributions)],
    [percent ? w.net : t.net, eur((r) => r.netMonthlyPensionReal)],
    ...(percent
      ? ([
          [
            w.lasts,
            (r) =>
              r.details.depletionAge === undefined
                ? w.lastsEnd(retirement.payoutEndAge)
                : ageText(r.details.depletionAge),
          ],
          [w.remaining, eur((r) => r.details.remainingCapitalAtEnd)],
        ] as [string, (r: EtfProjection) => string][])
      : []),
    ...(advance
      ? ([
          [t.advanceSaving, eur((r) => r.details.advanceLumpSumSaving ?? 0)],
          [t.advanceSavingTax, eur((r) => r.details.advanceTaxSaving ?? 0)],
          [t.advancePayout, eur((r) => r.details.advanceLumpSumPayout ?? 0)],
        ] as [string, (r: EtfProjection) => string][])
      : []),
  ];
  const names: ScenarioName[] = [...SCENARIO_NAMES];
  return (
    <div className="dts">
      <Disclosure title={de.etf.rows.scenarios}>
        <ScenarioTable
          title={t.caption}
          columns={[t.row, ...names.map((s) => scenarios[s])]}
          rows={lines.map(([label, pick]) => ({
            label,
            values: names.map((s) => pick(outcome.results[s])),
          }))}
        />
      </Disclosure>
      {percent && (
        <Disclosure title={w.chart.title}>
          <WithdrawalChart
            bare
            start={d.grossCapital}
            years={{
              pessimistic: outcome.results.pessimistic.details.withdrawalYears,
              neutral: d.withdrawalYears,
              optimistic: outcome.results.optimistic.details.withdrawalYears,
            }}
          />
        </Disclosure>
      )}
      <Disclosure title={de.etf.rows.notes}>
        <p className="hint">
          {t.intro(retirement.payoutStartAge, retirement.payoutEndAge, d.durationYears)}
        </p>
        {d.savingMonths !== ownDuration * 12 && (
          <p className="hint">{t.durationNote(ownDuration, d.savingMonths)}</p>
        )}
        <p className="hint">{t.taxNote}</p>
        {percent && (
          <p className="hint">
            {w.note} {w.noteEtfTax}
          </p>
        )}
        {advance && <p className="hint">{t.taxNoteAdvance}</p>}
      </Disclosure>
    </div>
  );
}
