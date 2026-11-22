import type {
  EtfPlanInput,
  EtfPlanResult,
  EtfProjection,
  GlobalAssumptions,
  ValidationIssue,
} from '@valiva/core';
import { SCENARIO_NAMES, usesAssumedBaseInterest } from '@valiva/core';
import type { Dispatch, SetStateAction } from 'react';
import { EtfTargetSection } from '../components/EtfTargetSection';
import { FieldGroup } from '../components/FieldGroup';
import { KpiTile } from '../components/KpiTile';
import { NumberField } from '../components/NumberField';
import { PageShell } from '../components/PageShell';
import { ScenarioChart } from '../components/ScenarioChart';
import { YearTable } from '../components/YearTable';
import { formatEur, formatNumber } from '../format';
import type { EtfPayoutState, EtfRetirement } from '../etfRetirement';
import { de, issueMessage } from '../i18n/de';
import { WithdrawalChart, WithdrawalFields, ageText } from '../components/WithdrawalFields';
import { advanceLumpSumParameters } from '../taxConfig';
import { ScrollTable } from '../components/ScrollTable';

type Props = {
  personId: string;
  input: EtfPlanInput;
  committed: EtfPlanInput;
  setInput: Dispatch<SetStateAction<EtfPlanInput>>;
  own: EtfPlanInput;
  result: EtfPlanResult;
  payout: EtfPayoutState;
  setPayout: (patch: Partial<EtfPayoutState>) => void;
  retirement: EtfRetirement;
  assumptions: GlobalAssumptions;
  reset: () => void;
  goToAssumptions: () => void;
};

type NumericKey = {
  [K in keyof EtfPlanInput]-?: EtfPlanInput[K] extends number ? K : never;
}[keyof EtfPlanInput];

export function EtfPage({
  personId,
  input,
  committed,
  own,
  setInput,
  result,
  payout,
  setPayout,
  retirement,
  assumptions,
  reset,
  goToAssumptions,
}: Props) {
  const t = de.etf;
  const retirementIssues: ValidationIssue[] =
    retirement.outcome && !retirement.outcome.ok ? retirement.outcome.issues : [];
  const issues: ValidationIssue[] = [...(result.ok ? [] : result.issues), ...retirementIssues];
  const useGlobal = payout.useGlobalAssumptions;
  const err = (field: string) => {
    const i = issues.find((x) => x.field === field);
    return i ? issueMessage(i) : undefined;
  };
  const set = <K extends keyof EtfPlanInput>(key: K, value: EtfPlanInput[K]) =>
    setInput((p) => ({ ...p, [key]: value }));
  const num = (key: NumericKey, unit: string) => {
    const f = t.fields[key];
    return (
      <NumberField
        label={f.label}
        hint={f.hint}
        unit={unit}
        value={input[key]}
        onChange={(v) => set(key, v)}
        error={err(key)}
      />
    );
  };
  const scenario = (key: 'pessimistic' | 'neutral' | 'optimistic') => (
    <NumberField
      label={t.fields[key].label}
      hint={t.fields[key].hint}
      unit="%"
      value={input.returnScenarios[key]}
      onChange={(v) =>
        setInput((p) => ({ ...p, returnScenarios: { ...p.returnScenarios, [key]: v } }))
      }
      error={err(`returnScenarios.${key}`)}
    />
  );

  const taxCheckboxId = 'tax-enabled';
  const advanceCheckboxId = 'advance-lump-sum';
  const advanceParameters = advanceLumpSumParameters();
  const assumedRateNotice =
    input.taxEnabled &&
    input.advanceLumpSum === true &&
    advanceParameters !== undefined &&
    Number.isFinite(input.durationYears) &&
    usesAssumedBaseInterest(
      advanceParameters,
      advanceParameters.startYear,
      advanceParameters.startYear + Math.ceil(input.durationYears) - 1,
    );
  const scenarioOrderError = err('returnScenarios');

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="grid">
        <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
          <FieldGroup title={t.groups.plan} defaultOpen>
            {num('initialCapital', t.units.eur)}
            {num('monthlyContribution', t.units.eur)}
            {num('annualContributionIncreasePercent', t.units.percent)}
            {num('durationYears', t.units.years)}
          </FieldGroup>

          <FieldGroup title={t.groups.lumpSums}>
            {input.lumpSums.length === 0 && <p className="hint">{t.lump.empty}</p>}
            {input.lumpSums.map((l, i) => (
              <div className="lump" key={i}>
                <NumberField
                  label={`${t.lump.month} ${i + 1}`}
                  hint={t.lump.monthHint}
                  value={l.month}
                  onChange={(v) =>
                    setInput((p) => ({
                      ...p,
                      lumpSums: p.lumpSums.map((x, j) => (j === i ? { ...x, month: v } : x)),
                    }))
                  }
                  error={err(`lumpSums.${i}.month`)}
                />
                <NumberField
                  label={`${t.lump.amount} ${i + 1}`}
                  unit={t.units.eur}
                  value={l.amount}
                  onChange={(v) =>
                    setInput((p) => ({
                      ...p,
                      lumpSums: p.lumpSums.map((x, j) => (j === i ? { ...x, amount: v } : x)),
                    }))
                  }
                  error={err(`lumpSums.${i}.amount`)}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setInput((p) => ({ ...p, lumpSums: p.lumpSums.filter((_, j) => j !== i) }))
                  }
                >
                  {t.lump.remove} {i + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() =>
                setInput((p) => ({ ...p, lumpSums: [...p.lumpSums, { month: 1, amount: 1000 }] }))
              }
            >
              {t.lump.add}
            </button>
          </FieldGroup>

          <FieldGroup title={t.groups.costs}>
            {num('ter', t.units.percent)}
            {num('entryFeePercent', t.units.percent)}
            {num('custodyFeeEurPerYear', t.units.eur)}
            {num('custodyFeePercentPerYear', t.units.percent)}
          </FieldGroup>

          <FieldGroup title={t.groups.scenarios} defaultOpen>
            <div className="check">
              <input
                id="etf-use-global"
                type="checkbox"
                checked={useGlobal}
                onChange={(e) => setPayout({ useGlobalAssumptions: e.target.checked })}
              />
              <label htmlFor="etf-use-global">{t.global.label}</label>
            </div>
            <p className="hint">{t.global.hint}</p>
            {useGlobal ? (
              <p>
                {t.global.values(
                  formatNumber(assumptions.returnScenarios.pessimistic) + ' %',
                  formatNumber(assumptions.returnScenarios.neutral) + ' %',
                  formatNumber(assumptions.returnScenarios.optimistic) + ' %',
                  formatNumber(assumptions.inflationPercent) + ' %',
                )}
              </p>
            ) : (
              <>
                {scenario('pessimistic')}
                {scenario('neutral')}
                {scenario('optimistic')}
                {scenarioOrderError && <p className="error">{scenarioOrderError}</p>}
                {num('inflationPercent', t.units.percent)}
              </>
            )}
          </FieldGroup>

          <FieldGroup title={t.groups.retirement} defaultOpen>
            <NumberField
              plain
              label={t.retirement.payoutStartAge.label}
              hint={t.retirement.payoutStartAge.hint}
              unit={t.units.years}
              value={payout.payoutStartAge ?? retirement.payoutStartAge}
              onChange={(v) => setPayout({ payoutStartAge: v })}
              error={err('payoutStartAge')}
            />
            {payout.payoutStartAge !== undefined && (
              <button
                type="button"
                className="btn"
                onClick={() => setPayout({ payoutStartAge: undefined })}
              >
                {t.retirement.fromProfile}
              </button>
            )}
            <NumberField
              plain
              label={t.retirement.payoutEndAge.label}
              hint={t.retirement.payoutEndAge.hint}
              unit={t.units.years}
              value={payout.payoutEndAge ?? retirement.payoutEndAge}
              onChange={(v) => setPayout({ payoutEndAge: v })}
              error={err('payoutEndAge')}
            />
            {payout.payoutEndAge !== undefined && (
              <button
                type="button"
                className="btn"
                onClick={() => setPayout({ payoutEndAge: undefined })}
              >
                {t.retirement.fromProfile}
              </button>
            )}
            <WithdrawalFields
              value={payout}
              onChange={setPayout}
              error={err('withdrawal.percent')}
            />
          </FieldGroup>

          <FieldGroup title={t.groups.tax} defaultOpen>
            <div className="check">
              <input
                id={taxCheckboxId}
                type="checkbox"
                checked={input.taxEnabled}
                onChange={(e) => set('taxEnabled', e.target.checked)}
              />
              <label htmlFor={taxCheckboxId}>{t.fields.taxEnabled.label}</label>
            </div>
            <p className="hint">{t.fields.taxEnabled.hint}</p>
            <div className="check">
              <input
                id={advanceCheckboxId}
                type="checkbox"
                checked={input.advanceLumpSum === true}
                disabled={!input.taxEnabled}
                onChange={(e) => set('advanceLumpSum', e.target.checked ? true : undefined)}
              />
              <label htmlFor={advanceCheckboxId}>{t.fields.advanceLumpSum.label}</label>
            </div>
            <p className="hint">{t.fields.advanceLumpSum.hint}</p>
            {assumedRateNotice && (
              <p className="notice" role="note">
                {t.fields.advanceLumpSum.assumedRate}
              </p>
            )}
          </FieldGroup>

          <button type="button" className="btn" onClick={reset}>
            {t.reset}
          </button>
        </form>

        <section aria-live="polite">
          {result.ok ? (
            <Results result={result} taxEnabled={input.taxEnabled} years={input.durationYears} />
          ) : (
            <div className="card" role="alert">
              {t.errors}
            </div>
          )}
          <p>
            <button type="button" className="link" onClick={goToAssumptions}>
              {t.assumptionsLink}
            </button>
          </p>
        </section>
      </div>
      <RetirementCard retirement={retirement} ownDuration={own.durationYears} />
      <div className="card">
        <EtfTargetSection personId={personId} input={committed} churchTax={assumptions.churchTax} />
      </div>
    </PageShell>
  );
}

function Results({
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

function RetirementCard({
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
