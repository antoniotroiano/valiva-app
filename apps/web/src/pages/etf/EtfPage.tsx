import {
  type EtfPlanInput,
  type EtfPlanResult,
  type GlobalAssumptions,
  type ValidationIssue,
} from '@valiva/core';
import { usesAssumedBaseInterest } from '@valiva/core';
import { type Dispatch, type SetStateAction } from 'react';
import { EtfTargetSection } from '../../components/forms/EtfTargetSection';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { PageShell } from '../../components/layout/PageShell';
import { formatNumber } from '../../lib/format';
import { type EtfPayoutState, type EtfRetirement } from '../../lib/etfRetirement';
import { de, issueMessage } from '../../i18n/de';
import { WithdrawalFields } from '../../components/forms/WithdrawalFields';
import { advanceLumpSumParameters } from '../../lib/taxConfig';
import { EtfResults, RetirementCard } from './EtfResults';

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
            <EtfResults result={result} taxEnabled={input.taxEnabled} years={input.durationYears} />
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
