import { DEPOT_VARIANTS, projectDepot, SCENARIO_NAMES, withdrawalOf } from '@valiva/core';
import {
  type DepotInput,
  type LegalResolution,
  type OtherIncome,
  type ScenarioName,
  type ValidationIssue,
} from '@valiva/core';
import { useId, useMemo } from 'react';
import { MonthField } from '../../components/forms/MonthField';
import { NumberField } from '../../components/forms/NumberField';
import { PageShell } from '../../components/layout/PageShell';
import { WithdrawalFields } from '../../components/forms/WithdrawalFields';
import { formatNumber } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { type DepotApi } from '../../state/useDepot';
import { type ProfileApi } from '../../state/useProfile';
import { CURRENT_YEAR } from '../../state/useProfile';
import { ScenarioResults, DepotResults } from './DepotResults';

type Props = {
  api: DepotApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  goToAssumptions: () => void;
  /** Income of the other products when this one pays out; the tax is levied on the sum. */
  otherIncome?: Record<ScenarioName, OtherIncome>;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function DepotPage({
  api,
  profile,
  legal,
  goToProfile,
  goToAssumptions,
  otherIncome,
}: Props) {
  const t = de.depot;
  const variantId = useId();
  const { state } = api;
  const p = profile.state.profile;
  const a = profile.state.assumptions;
  const depotLegal = legal.ok ? legal.legal.depot : undefined;
  const suggestedStart = (age: number) =>
    clamp(age, depotLegal?.payoutStartAgeMin ?? 65, depotLegal?.payoutStartAgeMax ?? 70);
  const payoutStartAge = state.payoutStartAge ?? suggestedStart(p.targetRetirementAge);
  const isGuarantee = state.variant === 'guarantee80' || state.variant === 'guarantee100';

  const input: DepotInput = useMemo(() => {
    const c = api.committed;
    const override = c.returnOverridePercent;
    return {
      ownContributionMonthly: c.ownContributionMonthly,
      startMonth: c.startMonth,
      variant: c.variant,
      costPercentPerYear: c.costPercentPerYear,
      annualContributionIncreasePercent: c.annualContributionIncreasePercent,
      payoutStartAge:
        c.payoutStartAge ?? suggestedStart(profile.committed.profile.targetRetirementAge),
      payoutEndAge: c.payoutEndAge,
      lumpSumSharePercent: c.lumpSumSharePercent,
      withdrawal: withdrawalOf(c),
      returnOverridePercent:
        (c.variant === 'guarantee80' || c.variant === 'guarantee100') &&
        override !== undefined &&
        Number.isFinite(override)
          ? override
          : undefined,
    };
  }, [api.committed, profile.committed.profile.targetRetirementAge, depotLegal]);

  const outcome = useMemo(() => {
    if (!legal.ok || !profile.committedValid) return undefined;
    const ctx = {
      profile: profile.committed.profile,
      assumptions: profile.committed.assumptions,
      legal: legal.legal,
      currentYear: CURRENT_YEAR,
      otherIncome,
    };
    const results = {} as ScenarioResults;
    for (const s of SCENARIO_NAMES) {
      const r = projectDepot(input, ctx, s);
      if (!r.ok) return { ok: false as const, issues: r.issues };
      results[s] = r.result;
    }
    return { ok: true as const, results };
  }, [input, legal, profile.committed, profile.committedValid, otherIncome]);

  const issues: ValidationIssue[] =
    outcome && !outcome.ok && profile.committedValid ? outcome.issues : [];
  const err = (field: string) => {
    const i = issues.find((x) => x.field === field);
    return i ? issueMessage(i) : undefined;
  };

  const empty =
    !(state.ownContributionMonthly > 0) && Number.isFinite(state.ownContributionMonthly);

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="grid">
        <div>
          <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
            <fieldset className="plain">
              <legend>{t.groups.contribution}</legend>
              <div id="depot-contribution-field">
                <NumberField
                  label={t.fields.ownContributionMonthly.label}
                  hint={t.fields.ownContributionMonthly.hint}
                  unit="€"
                  value={state.ownContributionMonthly}
                  onChange={(v) => api.update({ ownContributionMonthly: v })}
                  error={err('ownContributionMonthly')}
                />
              </div>
              <MonthField
                label={t.fields.startMonth.label}
                hint={t.fields.startMonth.hint}
                value={state.startMonth}
                onChange={(v) => api.update({ startMonth: v })}
                error={err('startMonth')}
              />
            </fieldset>
            <fieldset className="plain">
              <legend>{t.groups.variant}</legend>
              <div className="field">
                <label htmlFor={variantId}>{t.fields.variant.label}</label>
                <select
                  id={variantId}
                  value={state.variant}
                  onChange={(e) => api.update({ variant: e.target.value as DepotInput['variant'] })}
                >
                  {DEPOT_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {t.variants[v]}
                    </option>
                  ))}
                </select>
                <p className="hint">{t.fields.variant.hint}</p>
              </div>
              <NumberField
                label={t.fields.annualContributionIncreasePercent.label}
                hint={t.fields.annualContributionIncreasePercent.hint}
                unit="%"
                value={state.annualContributionIncreasePercent}
                onChange={(v) => api.update({ annualContributionIncreasePercent: v })}
                onClear={() => api.update({ annualContributionIncreasePercent: undefined })}
                error={err('annualContributionIncreasePercent')}
              />
              <NumberField
                label={t.fields.costPercentPerYear.label}
                hint={
                  state.variant === 'standard'
                    ? t.fields.costPercentPerYear.hintStandard
                    : t.fields.costPercentPerYear.hint
                }
                unit="%"
                value={state.costPercentPerYear}
                onChange={(v) => api.update({ costPercentPerYear: v })}
                error={err('costPercentPerYear')}
              />
              {isGuarantee && (
                <NumberField
                  label={t.fields.returnOverridePercent.label}
                  hint={t.fields.returnOverridePercent.hint}
                  unit="%"
                  value={state.returnOverridePercent ?? Number.NaN}
                  onChange={(v) =>
                    api.update({ returnOverridePercent: Number.isNaN(v) ? undefined : v })
                  }
                  error={err('returnOverridePercent')}
                />
              )}
            </fieldset>
            <fieldset className="plain">
              <legend>{t.groups.payout}</legend>
              <NumberField
                plain
                label={t.fields.payoutStartAge.label}
                hint={t.fields.payoutStartAge.hint}
                unit={de.profile.units.years}
                value={payoutStartAge}
                onChange={(v) => api.update({ payoutStartAge: v })}
                error={err('payoutStartAge')}
              />
              {state.payoutStartAge !== undefined &&
                state.payoutStartAge !== suggestedStart(p.targetRetirementAge) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => api.update({ payoutStartAge: undefined })}
                  >
                    {t.fromProfile}
                  </button>
                )}
              <NumberField
                plain
                label={t.fields.payoutEndAge.label}
                hint={t.fields.payoutEndAge.hint}
                unit={de.profile.units.years}
                value={state.payoutEndAge}
                onChange={(v) => api.update({ payoutEndAge: v })}
                error={err('payoutEndAge')}
              />
              <NumberField
                label={t.fields.lumpSumSharePercent.label}
                hint={t.fields.lumpSumSharePercent.hint}
                unit="%"
                value={state.lumpSumSharePercent}
                onChange={(v) => api.update({ lumpSumSharePercent: v })}
                error={err('lumpSumSharePercent')}
              />
              <WithdrawalFields
                value={state}
                onChange={(patch) => api.update(patch)}
                error={err('withdrawal.percent')}
              />
            </fieldset>
            <details className="group">
              <summary>{t.profileTitle}</summary>
              <div className="group-body">
                <dl className="facts">
                  <dt>{t.profileRows.scenarios}</dt>
                  <dd>
                    {formatNumber(a.returnScenarios.pessimistic)} % /{' '}
                    {formatNumber(a.returnScenarios.neutral)} % /{' '}
                    {formatNumber(a.returnScenarios.optimistic)} %
                  </dd>
                  <dt>{t.profileRows.payoutReturn}</dt>
                  <dd>{formatNumber(a.payoutPhaseReturnPercent)} %</dd>
                  <dt>{t.profileRows.inflation}</dt>
                  <dd>{formatNumber(a.inflationPercent)} %</dd>
                  <dt>{t.profileRows.tax}</dt>
                  <dd>{t.profileRows.taxValue}</dd>
                  <dt>{t.profileRows.health}</dt>
                  <dd>
                    {a.health.mode === 'other'
                      ? t.profileRows.healthOther
                      : t.profileRows.healthCompulsory}
                  </dd>
                  <dt>{t.profileRows.children}</dt>
                  <dd>
                    {p.childrenBirthYears.length > 0
                      ? p.childrenBirthYears.join(', ')
                      : t.profileRows.noChildren}
                  </dd>
                </dl>
                <p>
                  <button type="button" className="link" onClick={goToProfile}>
                    {t.profileLink}
                  </button>
                </p>
              </div>
            </details>
          </form>

          <div className="card">
            <h2>{t.simplification.title}</h2>
            <p>{t.simplification.text}</p>
          </div>
        </div>

        <section aria-live="polite">
          {!legal.ok ? (
            <div className="notice">{de.profile.configError}</div>
          ) : !profile.committedValid ? (
            <div className="notice" role="status">
              {t.profileInvalid}{' '}
              <button type="button" className="link" onClick={goToProfile}>
                {t.profileLinkInvalid}
              </button>
            </div>
          ) : empty ? (
            <div className="notice" role="status">
              {t.empty}{' '}
              <button
                type="button"
                className="btn inline-btn"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>('#depot-contribution-field input')
                    ?.focus()
                }
              >
                {t.jumpToField}
              </button>
            </div>
          ) : outcome?.ok ? (
            <DepotResults
              results={outcome.results}
              input={input}
              assumptions={profile.committed.assumptions}
              legal={legal.legal}
            />
          ) : (
            <div className="notice" role="status">
              {t.inputInvalid}
            </div>
          )}
          <p>
            <button type="button" className="link" onClick={goToAssumptions}>
              {t.assumptionsLink}
            </button>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
