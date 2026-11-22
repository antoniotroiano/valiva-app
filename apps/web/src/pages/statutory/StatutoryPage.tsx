import { projectStatutory, regularRetirementAgeFor } from '@valiva/core';
import {
  type LegalResolution,
  type OtherIncome,
  type ScenarioName,
  type StatutoryInput,
  type ValidationIssue,
} from '@valiva/core';
import { useMemo } from 'react';
import { NumberField } from '../../components/forms/NumberField';
import { PageShell } from '../../components/layout/PageShell';
import { formatAge, formatNumber } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { type ProfileApi } from '../../state/useProfile';
import { CURRENT_YEAR } from '../../state/useProfile';
import { type StatutoryApi } from '../../state/useStatutory';
import { StatutoryResults } from './StatutoryResults';

type Props = {
  api: StatutoryApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  goToAssumptions: () => void;
  /** Income of the other products when this one pays out; the tax is levied on the sum. */
  otherIncome?: Record<ScenarioName, OtherIncome>;
};

export function StatutoryPage({
  api,
  profile,
  legal,
  goToProfile,
  goToAssumptions,
  otherIncome,
}: Props) {
  const t = de.statutory;
  const { state } = api;
  const p = profile.state.profile;
  const ownRegularAge = legal.ok && p.birthYear < legal.legal.pension.regularAgeFromBirthYear;
  const retirementAge = state.retirementAge ?? p.targetRetirementAge;
  const lawRegularAge = legal.ok ? regularRetirementAgeFor(p.birthYear, legal.legal.pension) : 67;

  const input: StatutoryInput = useMemo(
    () => ({
      projectedMonthlyPensionToday: api.committed.projectedMonthlyPensionToday,
      projectedMonthlyPensionAtRetirementAgeToday:
        api.committed.projectedMonthlyPensionAtRetirementAgeToday,
      statementYear: api.committed.statementYear,
      retirementAge: api.committed.retirementAge ?? profile.committed.profile.targetRetirementAge,
      regularRetirementAge: api.committed.regularRetirementAge,
    }),
    [api.committed, profile.committed.profile.targetRetirementAge],
  );
  const outcome = useMemo(() => {
    if (!legal.ok || !profile.committedValid) return undefined;
    return projectStatutory(input, {
      profile: profile.committed.profile,
      assumptions: profile.committed.assumptions,
      legal: legal.legal,
      currentYear: CURRENT_YEAR,
      otherIncome,
    });
  }, [input, legal, profile.committed, profile.committedValid, otherIncome]);

  // Errors come from the immediate state so the field message appears while typing.
  const issues: ValidationIssue[] =
    outcome && !outcome.ok && profile.committedValid ? outcome.issues : [];
  const err = (field: string) => {
    const i = issues.find((x) => x.field === field);
    return i ? issueMessage(i) : undefined;
  };

  const empty =
    !(state.projectedMonthlyPensionToday > 0) &&
    Number.isFinite(state.projectedMonthlyPensionToday);
  const a = profile.state.assumptions;

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="grid">
        <div>
          <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
            <fieldset className="plain">
              <legend>{t.groups.statement}</legend>
              <div id="statutory-pension-field">
                <NumberField
                  label={t.fields.projectedMonthlyPensionToday.label}
                  hint={t.fields.projectedMonthlyPensionToday.hint}
                  unit="€"
                  value={state.projectedMonthlyPensionToday}
                  onChange={(v) => api.update({ projectedMonthlyPensionToday: v })}
                  error={err('projectedMonthlyPensionToday')}
                />
              </div>
              <NumberField
                plain
                label={t.fields.statementYear.label}
                hint={t.fields.statementYear.hint}
                value={state.statementYear}
                onChange={(v) => api.update({ statementYear: v })}
                error={err('statementYear')}
              />
            </fieldset>
            <fieldset className="plain">
              <legend>{t.groups.start}</legend>
              <NumberField
                label={t.fields.retirementAge.label}
                hint={t.fields.retirementAge.hint}
                unit={de.profile.units.years}
                value={retirementAge}
                onChange={(v) => api.update({ retirementAge: v })}
                error={err('retirementAge')}
              />
              <NumberField
                label={t.fields.projectedMonthlyPensionAtRetirementAgeToday.label}
                hint={t.fields.projectedMonthlyPensionAtRetirementAgeToday.hint}
                unit="€"
                value={state.projectedMonthlyPensionAtRetirementAgeToday}
                onChange={(v) => api.update({ projectedMonthlyPensionAtRetirementAgeToday: v })}
                onClear={() =>
                  api.update({ projectedMonthlyPensionAtRetirementAgeToday: undefined })
                }
                error={err('projectedMonthlyPensionAtRetirementAgeToday')}
              />
              {state.retirementAge !== undefined &&
                state.retirementAge !== p.targetRetirementAge && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => api.update({ retirementAge: undefined })}
                  >
                    {t.fromProfile}
                  </button>
                )}
              <NumberField
                label={t.fields.regularRetirementAge.label}
                hint={
                  ownRegularAge
                    ? t.fields.regularRetirementAge.hintOverride(formatAge(lawRegularAge))
                    : t.fields.regularRetirementAge.hintConfig(
                        p.birthYear,
                        formatAge(lawRegularAge),
                      )
                }
                unit={de.profile.units.years}
                value={ownRegularAge ? state.regularRetirementAge : lawRegularAge}
                disabled={!ownRegularAge}
                onChange={(v) => api.update({ regularRetirementAge: v })}
                onClear={() => api.update({ regularRetirementAge: undefined })}
                error={err('regularRetirementAge')}
              />
            </fieldset>
            <details className="group">
              <summary>{t.profileTitle}</summary>
              <div className="group-body">
                <dl className="facts">
                  <dt>{t.profileRows.adjustment}</dt>
                  <dd>{formatNumber(a.pensionAdjustmentPercent)} %</dd>
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
                </dl>
                <p>
                  <button type="button" className="link" onClick={goToProfile}>
                    {t.profileLink}
                  </button>
                </p>
              </div>
            </details>
          </form>

          {!(state.projectedMonthlyPensionAtRetirementAgeToday! > 0) && (
            <div className="card">
              <h2>{t.simplification.title}</h2>
              <p>{t.simplification.text}</p>
            </div>
          )}
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
                    .querySelector<HTMLInputElement>('#statutory-pension-field input')
                    ?.focus()
                }
              >
                {t.jumpToField}
              </button>
            </div>
          ) : outcome?.ok ? (
            <StatutoryResults
              result={outcome.result}
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
