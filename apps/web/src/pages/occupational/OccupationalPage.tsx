import { OCCUPATIONAL_LIMITS, projectOccupational, SCENARIO_NAMES } from '@valiva/core';
import {
  type EmployerSubsidyMode,
  type LegalResolution,
  type OccupationalInput,
  type OtherIncome,
  type ScenarioName,
  type ValidationIssue,
} from '@valiva/core';
import { useId, useMemo } from 'react';
import { MonthField } from '../../components/forms/MonthField';
import { NumberField } from '../../components/forms/NumberField';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { BlockPage, BlockSection } from '../../components/layout/BlockPage';
import { formatEur, formatNumber } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { type OccupationalApi } from '../../state/useOccupational';
import { type ProfileApi } from '../../state/useProfile';
import { CURRENT_YEAR } from '../../state/useProfile';
import {
  OccupationalCalculation,
  OccupationalResult,
  ProfileFacts,
  type ScenarioResults,
} from './OccupationalResults';

type Props = {
  api: OccupationalApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  goToAssumptions: () => void;
  /** Income of the other products when this one pays out; the tax is levied on the sum. */
  otherIncome?: Record<ScenarioName, OtherIncome>;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const suggestedStart = (age: number) =>
  clamp(age, OCCUPATIONAL_LIMITS.payoutStartAge.min, OCCUPATIONAL_LIMITS.payoutStartAge.max);

export function OccupationalPage({
  api,
  profile,
  legal,
  goToProfile,
  goToAssumptions,
  otherIncome,
}: Props) {
  const t = de.occupational;
  const modeId = useId();
  const { state } = api;
  const p = profile.state.profile;
  const a = profile.state.assumptions;
  const suggestedStartAge = suggestedStart(p.targetRetirementAge);
  const payoutStartAge = state.payoutStartAge ?? suggestedStartAge;
  const payoutEndAge = state.payoutEndAge ?? p.lifeExpectancyAge;
  const custom = state.employerSubsidyMode === 'custom';

  const input: OccupationalInput = useMemo(() => {
    const c = api.committed;
    const g = c.guaranteedRatePercent;
    return {
      employeeContributionMonthlyGross: c.employeeContributionMonthlyGross,
      employerSubsidyMode: c.employerSubsidyMode,
      employerSubsidyCustomMonthly:
        c.employerSubsidyMode === 'custom' ? c.employerSubsidyCustomMonthly : undefined,
      employerContributionMonthly: c.employerContributionMonthly,
      costPercentPerYear: c.costPercentPerYear,
      annualContributionIncreasePercent: c.annualContributionIncreasePercent,
      startMonth: c.startMonth,
      payoutStartAge:
        c.payoutStartAge ?? suggestedStart(profile.committed.profile.targetRetirementAge),
      payoutEndAge: c.payoutEndAge ?? profile.committed.profile.lifeExpectancyAge,
      guaranteedRatePercent: g !== undefined && Number.isFinite(g) ? g : undefined,
    };
  }, [api.committed, profile.committed.profile]);

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
      const r = projectOccupational(input, ctx, s);
      if (!r.ok) return { ok: false as const, issues: r.issues };
      results[s] = r.result;
    }
    return { ok: true as const, results };
  }, [input, legal, profile.committed, profile.committedValid, otherIncome]);

  const issues: ValidationIssue[] =
    outcome && !outcome.ok && profile.committedValid ? outcome.issues : [];
  const err = (field: string): string | undefined => {
    const i = issues.find((x) => x.field === field);
    if (!i) return undefined;
    if (field === 'employeeContributionMonthlyGross' && i.code === 'out_of_range' && i.max) {
      return t.errors.conversionMax(formatEur(i.max));
    }
    if (field === 'payoutEndAge' && i.code === 'out_of_range' && i.min !== undefined) {
      if (i.min > payoutStartAge) return t.errors.payoutEnd;
    }
    if (field === 'startMonth' && i.code === 'not_after_start') {
      return t.errors.startAfterPayout(p.birthYear + payoutStartAge);
    }
    return issueMessage(i);
  };

  const empty =
    !(state.employeeContributionMonthlyGross > 0) &&
    Number.isFinite(state.employeeContributionMonthlyGross);

  const profileFacts = (
    <>
      <ProfileFacts a={a} legal={legal.ok ? legal.legal : undefined} />
      <p>
        <button type="button" className="link" onClick={goToProfile}>
          {t.profileLink}
        </button>
      </p>
    </>
  );

  const inputs = (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.contribution} defaultOpen>
        <div id="occupational-contribution-field">
          <NumberField
            label={t.fields.employeeContributionMonthlyGross.label}
            hint={t.fields.employeeContributionMonthlyGross.hint}
            more={t.fields.employeeContributionMonthlyGross.more}
            unit="€"
            value={state.employeeContributionMonthlyGross}
            onChange={(v) => api.update({ employeeContributionMonthlyGross: v })}
            error={err('employeeContributionMonthlyGross')}
          />
        </div>
        <div className="field">
          <label htmlFor={modeId}>{t.fields.employerSubsidyMode.label}</label>
          <select
            id={modeId}
            value={state.employerSubsidyMode}
            onChange={(e) =>
              api.update({ employerSubsidyMode: e.target.value as EmployerSubsidyMode })
            }
          >
            <option value="auto15">{t.fields.employerSubsidyMode.auto15}</option>
            <option value="custom">{t.fields.employerSubsidyMode.custom}</option>
          </select>
          <p className="hint">{t.fields.employerSubsidyMode.hint}</p>
        </div>
        {custom && (
          <NumberField
            label={t.fields.employerSubsidyCustomMonthly.label}
            hint={t.fields.employerSubsidyCustomMonthly.hint}
            unit="€"
            value={state.employerSubsidyCustomMonthly}
            onChange={(v) => api.update({ employerSubsidyCustomMonthly: v })}
            error={err('employerSubsidyCustomMonthly')}
          />
        )}
        <NumberField
          label={t.fields.employerContributionMonthly.label}
          hint={t.fields.employerContributionMonthly.hint}
          unit="€"
          value={state.employerContributionMonthly}
          onChange={(v) => api.update({ employerContributionMonthly: v })}
          error={err('employerContributionMonthly')}
        />
        <MonthField
          label={t.fields.startMonth.label}
          hint={t.fields.startMonth.hint}
          value={state.startMonth}
          onChange={(v) => api.update({ startMonth: v })}
          error={err('startMonth')}
        />
      </FieldGroup>
      <FieldGroup
        title={t.groups.costs}
        summary={t.rows.costs(formatNumber(state.costPercentPerYear))}
        hasError={[
          'annualContributionIncreasePercent',
          'costPercentPerYear',
          'guaranteedRatePercent',
        ].some((f) => err(f) !== undefined)}
      >
        <NumberField
          label={t.fields.annualContributionIncreasePercent.label}
          hint={t.fields.annualContributionIncreasePercent.hint}
          more={t.fields.annualContributionIncreasePercent.more}
          unit="%"
          value={state.annualContributionIncreasePercent}
          onChange={(v) => api.update({ annualContributionIncreasePercent: v })}
          onClear={() => api.update({ annualContributionIncreasePercent: undefined })}
          error={err('annualContributionIncreasePercent')}
        />
        <NumberField
          label={t.fields.costPercentPerYear.label}
          hint={t.fields.costPercentPerYear.hint}
          more={t.fields.costPercentPerYear.more}
          unit="%"
          value={state.costPercentPerYear}
          onChange={(v) => api.update({ costPercentPerYear: v })}
          error={err('costPercentPerYear')}
        />
        <NumberField
          label={t.fields.guaranteedRatePercent.label}
          hint={t.fields.guaranteedRatePercent.hint}
          more={t.fields.guaranteedRatePercent.more}
          unit="%"
          value={state.guaranteedRatePercent ?? Number.NaN}
          onChange={(v) => api.update({ guaranteedRatePercent: Number.isNaN(v) ? undefined : v })}
          error={err('guaranteedRatePercent')}
        />
      </FieldGroup>
      <FieldGroup
        title={t.groups.payout}
        summary={t.rows.payout(payoutStartAge, payoutEndAge)}
        hasError={['payoutStartAge', 'payoutEndAge'].some((f) => err(f) !== undefined)}
      >
        <NumberField
          plain
          label={t.fields.payoutStartAge.label}
          hint={t.fields.payoutStartAge.hint}
          unit={de.profile.units.years}
          value={payoutStartAge}
          onChange={(v) => api.update({ payoutStartAge: v })}
          error={err('payoutStartAge')}
        />
        {state.payoutStartAge !== undefined && state.payoutStartAge !== suggestedStartAge && (
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
          more={t.fields.payoutEndAge.more}
          unit={de.profile.units.years}
          value={payoutEndAge}
          onChange={(v) => api.update({ payoutEndAge: v })}
          error={err('payoutEndAge')}
        />
        {state.payoutEndAge !== undefined && state.payoutEndAge !== p.lifeExpectancyAge && (
          <button
            type="button"
            className="btn"
            onClick={() => api.update({ payoutEndAge: undefined })}
          >
            {t.fromProfile}
          </button>
        )}
      </FieldGroup>
    </form>
  );

  const result = !legal.ok ? (
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
            .querySelector<HTMLInputElement>('#occupational-contribution-field input')
            ?.focus()
        }
      >
        {t.jumpToField}
      </button>
    </div>
  ) : outcome?.ok ? (
    <OccupationalResult
      results={outcome.results}
      input={input}
      assumptions={profile.committed.assumptions}
      legal={legal.legal}
    />
  ) : (
    <div className="notice" role="status">
      {t.inputInvalid}
    </div>
  );

  return (
    <BlockPage title={t.title} subtitle={t.subtitle}>
      <BlockSection
        id="occupational"
        inputs={inputs}
        result={result}
        calculation={
          <OccupationalCalculation
            props={
              legal.ok && profile.committedValid && !empty && outcome?.ok
                ? {
                    results: outcome.results,
                    input,
                    assumptions: profile.committed.assumptions,
                    legal: legal.legal,
                  }
                : undefined
            }
            profileFacts={profileFacts}
            simplification={t.simplification.text}
          />
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
