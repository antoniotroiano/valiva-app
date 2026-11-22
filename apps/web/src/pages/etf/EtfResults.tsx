import { type EtfPlanResult, type EtfProjection } from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import { KpiTile } from '../../components/cards/KpiTile';
import { ScenarioChart } from '../../components/charts/ScenarioChart';
import { YearTable } from '../../components/cards/YearTable';
import { formatEur } from '../../lib/format';
import { type EtfRetirement } from '../../lib/etfRetirement';
import { de } from '../../i18n/de';
import { WithdrawalChart, ageText } from '../../components/forms/WithdrawalFields';
import { ScrollTable } from '../../components/cards/ScrollTable';

export function EtfResults({
  result,
  taxEnabled,
  years,
}: {
  result: Extract<EtfPlanResult, { ok: true }>;
  taxEnabled: boolean;
  years: number;
}) {
  const t = de.etf;
  const { pessimistic, neutral, optimistic } = result.scenarios;
  const advance = neutral.advanceTaxPaid !== undefined;
  return (
    <>
      <h2>{t.calculatorTitle}</h2>
      <p className="sub">{t.calculatorSubtitle(years)}</p>
      <div className="kpis">
        <KpiTile
          label={taxEnabled ? t.kpi.finalAfterTax : t.kpi.finalNoTax}
          value={formatEur(neutral.finalValueAfterTax)}
          note={t.kpi.range(
            formatEur(pessimistic.finalValueAfterTax),
            formatEur(optimistic.finalValueAfterTax),
          )}
        />
        <KpiTile label={t.kpi.contributions} value={formatEur(neutral.totalContributions)} />
        <KpiTile label={t.kpi.gain} value={formatEur(neutral.gainBeforeTax)} />
        <KpiTile label={advance ? t.kpi.taxSale : t.kpi.tax} value={formatEur(neutral.tax)} />
        {advance && (
          <KpiTile
            label={t.kpi.advanceTax}
            value={formatEur(neutral.advanceTaxPaid ?? 0)}
            note={t.kpi.advanceTaxNote}
          />
        )}
        <KpiTile
          label={t.kpi.real}
          value={formatEur(neutral.finalValueReal)}
          note={taxEnabled ? t.kpi.realHint : t.kpi.realHintNoTax}
        />
      </div>
      {advance && <p className="hint">{t.kpi.advanceNote}</p>}
      <ScenarioChart scenarios={result.scenarios} />
      <YearTable result={neutral} />
    </>
  );
}

export function RetirementCard({
  retirement,
  ownDuration,
}: {
  retirement: EtfRetirement;
  ownDuration: number;
}) {
  const t = de.etf.retirement;
  const outcome = retirement.outcome;
  const scenarios = de.overview.retirement.scenarios;
  const advance =
    outcome?.ok === true && outcome.results.neutral.details.advanceLumpSumSaving !== undefined;
  const w = de.withdrawal;
  const percent =
    outcome?.ok === true && outcome.results.neutral.details.withdrawal.strategy === 'percent';
  const eur = (pick: (r: EtfProjection) => number) => (r: EtfProjection) => formatEur(pick(r));
  const rows: [string, (r: EtfProjection) => string][] = [
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
  return (
    <section className="card" aria-labelledby="etf-retirement">
      <h2 id="etf-retirement">
        {t.title} <span className="badge">{t.badge}</span>
      </h2>
      {outcome?.ok && (
        <p className="sub">
          {t.subtitle(retirement.payoutStartAge, outcome.results.neutral.details.durationYears)}
        </p>
      )}
      {outcome === undefined && <p>{t.needsProfile}</p>}
      {outcome?.ok && (
        <>
          <p>
            {t.intro(
              retirement.payoutStartAge,
              retirement.payoutEndAge,
              outcome.results.neutral.details.durationYears,
            )}
          </p>
          <ScrollTable label={t.caption}>
            <table>
              <caption>{t.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.row}</th>
                  {SCENARIO_NAMES.map((s) => (
                    <th key={s} scope="col">
                      {scenarios[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, pick]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {SCENARIO_NAMES.map((s) => (
                      <td key={s} className="num">
                        {pick(outcome.results[s])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollTable>
          {outcome.results.neutral.details.savingMonths !== ownDuration * 12 && (
            <p className="hint">
              {t.durationNote(ownDuration, outcome.results.neutral.details.savingMonths)}
            </p>
          )}
          {outcome.results.neutral.details.depletionAge !== undefined && (
            <div className="notice" role="status">
              {w.depleted(ageText(outcome.results.neutral.details.depletionAge))}
            </div>
          )}
          <p className="hint">{t.taxNote}</p>
          {percent && (
            <p className="hint">
              {w.note} {w.noteEtfTax}
            </p>
          )}
          {advance && <p className="hint">{t.taxNoteAdvance}</p>}
          {percent && (
            <WithdrawalChart
              start={outcome.results.neutral.details.grossCapital}
              years={{
                pessimistic: outcome.results.pessimistic.details.withdrawalYears,
                neutral: outcome.results.neutral.details.withdrawalYears,
                optimistic: outcome.results.optimistic.details.withdrawalYears,
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
