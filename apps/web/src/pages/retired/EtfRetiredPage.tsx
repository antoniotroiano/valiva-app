import { projectEtfHolding, withdrawalOf } from '@valiva/core';
import type { LegalResolution, OtherIncome, ScenarioName, ValidationIssue } from '@valiva/core';
import { useId, useMemo } from 'react';
import { EmptyState } from '../../components/cards/EmptyState';
import type { EmptyAction } from '../../components/cards/EmptyState';
import { Disclosure } from '../../components/cards/Disclosure';
import { ResultFrame } from '../../components/cards/ResultFrame';
import { ImportantNotes, InfoNotes, notesFromCodes } from '../../components/cards/WarningList';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { WithdrawalFields } from '../../components/forms/WithdrawalFields';
import { de } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';
import { currentTaxAssumptions } from '../../lib/taxConfig';
import type { EtfPlanApi } from '../../state/useEtfPlan';
import type { ProfileApi } from '../../state/useProfile';
import { RetiredFrame, issueAt, useRetiredContext } from './shared';

/** ETF holding of a person who already draws a pension: value today, sum paid in and the withdrawal (`16` §5.4). */
export function EtfRetiredPage({
  plan,
  profile,
  legal,
  goToProfile,
  nextStep,
  otherIncome,
}: {
  plan: EtfPlanApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  nextStep?: EmptyAction;
  otherIncome?: Record<ScenarioName, OtherIncome>;
}) {
  const t = de.retired.etf;
  const s = de.retired.shared;
  const { payout, setPayout, input, setInput } = plan;
  const taxId = useId();
  const advanceId = useId();
  const ctx = useRetiredContext(profile, legal, otherIncome);
  const committed = plan.committedPayout;
  const own = plan.own;
  const tax = currentTaxAssumptions(profile.committed.assumptions.churchTax);
  const endAge = committed.payoutEndAge ?? profile.committed.profile.lifeExpectancyAge;
  const outcome = useMemo(
    () =>
      ctx
        ? projectEtfHolding(
            {
              holdingValue: committed.holdingValue,
              holdingContributions: committed.holdingContributions,
              payoutEndAge: endAge,
              withdrawal: withdrawalOf(committed),
              tax: tax.assumptions,
              taxUnverified: tax.unverified,
              taxEnabled: own.taxEnabled,
              ...(own.advanceLumpSum === undefined ? {} : { advanceLumpSum: own.advanceLumpSum }),
            },
            ctx,
          )
        : undefined,
    [ctx, committed, endAge, tax.assumptions, tax.unverified, own.taxEnabled, own.advanceLumpSum],
  );
  const empty = payout.holdingValue === undefined && payout.holdingContributions === undefined;
  const issues: ValidationIssue[] = outcome && !outcome.ok && !empty ? outcome.issues : [];
  const err = (f: string) => issueAt(issues, f);

  const inputs = (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.holding} defaultOpen>
        <div id="retired-etf-field">
          <NumberField
            label={t.fields.holdingValue.label}
            hint={t.fields.holdingValue.hint}
            unit="€"
            value={payout.holdingValue}
            onChange={(v) => setPayout({ holdingValue: v })}
            onClear={() => setPayout({ holdingValue: undefined })}
            error={err('holdingValue')}
          />
        </div>
        <NumberField
          label={t.fields.holdingContributions.label}
          hint={t.fields.holdingContributions.hint}
          unit="€"
          value={payout.holdingContributions}
          onChange={(v) => setPayout({ holdingContributions: v })}
          onClear={() => setPayout({ holdingContributions: undefined })}
          error={err('holdingContributions')}
        />
      </FieldGroup>
      <FieldGroup
        title={t.groups.withdrawal}
        defaultOpen
        hasError={err('payoutEndAge') !== undefined || err('withdrawal.percent') !== undefined}
      >
        <NumberField
          plain
          label={t.fields.payoutEndAge.label}
          hint={t.fields.payoutEndAge.hint}
          unit={de.profile.units.years}
          value={payout.payoutEndAge ?? profile.state.profile.lifeExpectancyAge}
          onChange={(v) => setPayout({ payoutEndAge: v })}
          onClear={() => setPayout({ payoutEndAge: undefined })}
          error={err('payoutEndAge')}
        />
        <WithdrawalFields value={payout} onChange={setPayout} error={err('withdrawal.percent')} />
      </FieldGroup>
      <FieldGroup
        title={t.groups.tax}
        summary={input.taxEnabled ? de.etf.rows.taxOn : de.etf.rows.taxOff}
      >
        <div className="check">
          <input
            id={taxId}
            type="checkbox"
            checked={input.taxEnabled}
            onChange={(e) => setInput((i) => ({ ...i, taxEnabled: e.target.checked }))}
          />
          <label htmlFor={taxId}>{t.fields.taxEnabled}</label>
        </div>
        <div className="check">
          <input
            id={advanceId}
            type="checkbox"
            checked={input.advanceLumpSum === true}
            disabled={!input.taxEnabled}
            onChange={(e) =>
              setInput((i) => ({ ...i, advanceLumpSum: e.target.checked ? true : undefined }))
            }
          />
          <label htmlFor={advanceId}>{t.fields.advanceLumpSum}</label>
        </div>
      </FieldGroup>
      <p className="hint">{t.note}</p>
    </form>
  );

  const r = outcome?.ok ? outcome.result : undefined;
  const d = r?.details;
  const notes = r ? notesFromCodes(r.warnings) : [];
  const result = empty ? (
    <EmptyState
      title={t.empty.title}
      primary={{
        label: t.empty.button,
        onClick: () =>
          document.querySelector<HTMLInputElement>('#retired-etf-field input')?.focus(),
      }}
      secondary={nextStep}
    >
      {t.empty.text}
    </EmptyState>
  ) : r && d ? (
    <>
      <ImportantNotes notes={notes} />
      <ResultFrame
        eyebrow={t.heroEyebrow}
        value={formatEur(r.netMonthlyPensionReal)}
        unit={s.perMonth}
        kpis={[
          { label: s.kpiGross, value: formatEur(r.monthlyPensionReal) },
          { label: s.kpiDeductions, value: formatEur(r.taxAndContributions) },
          { label: t.kpi.gainShare, value: `${formatNumber(d.gainShare * 100)} %` },
          { label: t.kpi.months, value: formatNumber(d.planMonths) },
        ]}
      />
    </>
  ) : (
    <div className="notice" role="status">
      {s.invalid}
    </div>
  );

  const calculation = (
    <div className="dts">
      {r && d && (
        <>
          <Disclosure title={t.steps.title} defaultOpen>
            <dl className="facts">
              <dt>{s.kpiGross}</dt>
              <dd>{formatEur(r.monthlyPensionNominal)}</dd>
              <dt>{t.kpi.gainShare}</dt>
              <dd>{formatNumber(d.gainShare * 100)} %</dd>
              <dt>{t.steps.tax}</dt>
              <dd>{formatEur(d.taxMonthly)}</dd>
              <dt>{t.steps.net}</dt>
              <dd>
                <b>{formatEur(r.netMonthlyPensionReal)}</b>
              </dd>
              <dt>{t.kpi.remaining}</dt>
              <dd>{formatEur(d.remainingCapitalAtEnd)}</dd>
            </dl>
          </Disclosure>
          <InfoNotes notes={notes} />
        </>
      )}
    </div>
  );

  return (
    <RetiredFrame
      id="etf"
      title={t.title}
      subtitle={t.subtitle}
      ctx={ctx}
      legal={legal}
      goToProfile={goToProfile}
      inputs={inputs}
      result={result}
      calculation={calculation}
    />
  );
}
