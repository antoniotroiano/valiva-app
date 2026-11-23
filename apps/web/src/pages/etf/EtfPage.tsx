import {
  type EtfPlanInput,
  type EtfPlanResult,
  type GlobalAssumptions,
  type ValidationIssue,
} from '@valiva/core';
import { usesAssumedBaseInterest } from '@valiva/core';
import { type Dispatch, type SetStateAction } from 'react';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { BlockPage, BlockSection } from '../../components/layout/BlockPage';
import { formatEur, formatNumber } from '../../lib/format';
import { type EtfPayoutState, type EtfRetirement } from '../../lib/etfRetirement';
import { de, issueMessage } from '../../i18n/de';
import { WithdrawalFields } from '../../components/forms/WithdrawalFields';
import { advanceLumpSumParameters } from '../../lib/taxConfig';
import { PlanCalculation, PlanResult, RetirementCalculation, RetirementResult } from './EtfResults';

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
        {...('more' in f ? { more: f.more } : {})}
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

  const planInputs = (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.plan} defaultOpen>
        {num('initialCapital', t.units.eur)}
        {num('monthlyContribution', t.units.eur)}
        {num('annualContributionIncreasePercent', t.units.percent)}
        {num('durationYears', t.units.years)}
      </FieldGroup>

      <FieldGroup
        title={t.groups.lumpSums}
        summary={t.rows.lumpSums(input.lumpSums.length)}
        hasError={issues.some((i) => i.field.startsWith('lumpSums'))}
      >
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

      <FieldGroup
        title={t.groups.costs}
        summary={t.rows.costs(`${formatNumber(input.ter)} %`)}
        hasError={[
          'ter',
          'entryFeePercent',
          'custodyFeeEurPerYear',
          'custodyFeePercentPerYear',
        ].some((f) => err(f) !== undefined)}
      >
        {num('ter', t.units.percent)}
        {num('entryFeePercent', t.units.percent)}
        {num('custodyFeeEurPerYear', t.units.eur)}
        {num('custodyFeePercentPerYear', t.units.percent)}
      </FieldGroup>

      <FieldGroup title={t.groups.tax} summary={input.taxEnabled ? t.rows.taxOn : t.rows.taxOff}>
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
        <details className="more">
          <summary>{de.moreLabel}</summary>
          <p className="hint">{t.fields.taxEnabled.more}</p>
        </details>
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
        <details className="more">
          <summary>{de.moreLabel}</summary>
          <p className="hint">{t.fields.advanceLumpSum.more}</p>
        </details>
        {assumedRateNotice && (
          <p className="notice" role="note">
            {t.fields.advanceLumpSum.assumedRate}
          </p>
        )}
      </FieldGroup>

      <FieldGroup
        title={t.groups.scenarios}
        summary={useGlobal ? t.rows.ratesGlobal : t.rows.ratesOwn}
        hasError={scenarioOrderError !== undefined || err('inflationPercent') !== undefined}
      >
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
            )}{' '}
            <button type="button" className="link" onClick={goToAssumptions}>
              {t.assumptionsLink}
            </button>
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

      <button type="button" className="btn" onClick={reset}>
        {t.reset}
      </button>
    </form>
  );

  const retirementInputs = (
    <form className="card" aria-label={t.formLabelRetirement} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.retirement} defaultOpen bare>
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
        <WithdrawalFields value={payout} onChange={setPayout} error={err('withdrawal.percent')} />
        <p className="hint">{t.taxFollowsPlan}</p>
      </FieldGroup>
    </form>
  );

  const resultBar = [
    ...(result.ok
      ? [
          {
            id: 'etf-plan',
            label: t.sections.plan.title,
            value: formatEur(result.scenarios.neutral.finalValueAfterTax),
          },
        ]
      : []),
    ...(retirement.outcome?.ok
      ? [
          {
            id: 'etf-retirement',
            label: t.sections.retirement.title,
            value: `${formatEur(retirement.outcome.results.neutral.netMonthlyPensionReal)} ${t.retirement.perMonth}`,
          },
        ]
      : []),
  ];

  return (
    <BlockPage
      title={t.title}
      subtitle={t.subtitle}
      sections={[
        { id: 'etf-plan', label: t.sections.plan.title },
        { id: 'etf-retirement', label: t.sections.retirement.title },
      ]}
      resultBar={resultBar}
    >
      <BlockSection
        id="etf-plan"
        title={t.sections.plan.title}
        purpose={t.sections.plan.purpose}
        inputs={planInputs}
        result={
          result.ok ? (
            <PlanResult result={result} taxEnabled={input.taxEnabled} years={input.durationYears} />
          ) : (
            <div className="card" role="alert">
              {t.errors}
            </div>
          )
        }
        calculation={
          <PlanCalculation
            result={result.ok ? result : undefined}
            personId={personId}
            committed={committed}
            churchTax={assumptions.churchTax}
          />
        }
      />
      <BlockSection
        id="etf-retirement"
        title={t.sections.retirement.title}
        purpose={t.sections.retirement.purpose}
        badge={t.retirement.badge}
        inputs={retirementInputs}
        result={<RetirementResult retirement={retirement} />}
        calculation={
          <RetirementCalculation retirement={retirement} ownDuration={own.durationYears} />
        }
      />
      <p className="inline-link">
        <button type="button" className="link" onClick={goToAssumptions}>
          {t.assumptionsLink}
        </button>
      </p>
    </BlockPage>
  );
}
