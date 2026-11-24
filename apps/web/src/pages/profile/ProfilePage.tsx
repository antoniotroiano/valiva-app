import {
  capitalGainsRateWithChurchTax,
  regularRetirementAgeFor,
  taxableShare,
  taxableShareForStartYear,
} from '@valiva/core';
import { type ChurchTaxChoice, type GlobalAssumptions, type LegalResolution } from '@valiva/core';
import { useId, useState } from 'react';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { withTerms } from '../../components/cards/Terms';
import { PageShell } from '../../components/layout/PageShell';
import { formatAge, formatNumber } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { churchTaxParameters } from '../../lib/taxConfig';
import { defaultRetirementStartYear } from '../../lib/retired';
import { CURRENT_YEAR } from '../../state/useProfile';
import { type ProfileApi } from '../../state/useProfile';
import { ChildrenField } from './ProfileChildren';

type Props = {
  api: ProfileApi;
  legal: LegalResolution;
  goToAssumptions: () => void;
  /** The wish is a household value; with several persons it is edited on the household page. */
  hideWish?: boolean;
};

type AssumptionKey = {
  [K in keyof GlobalAssumptions]-?: GlobalAssumptions[K] extends number ? K : never;
}[keyof GlobalAssumptions];

const startsWithAny = (field: string, prefixes: string[]) =>
  prefixes.some((p) => field.startsWith(p));

export function ProfilePage({ api, legal, goToAssumptions, hideWish }: Props) {
  const t = de.profile;
  const { profile, assumptions: a } = api.state;
  const issues = [...api.issues.profile, ...api.issues.assumptions];
  const err = (field: string) => {
    const i = issues.find((x) => x.field === field);
    return i ? issueMessage(i) : undefined;
  };
  const radioName = useId();
  const churchRadioName = useId();
  const childlessId = useId();
  const retiredId = useId();
  const [resetKey, setResetKey] = useState(0);

  const setA = (patch: Partial<GlobalAssumptions>) =>
    api.setAssumptions((cur) => ({ ...cur, ...patch }));
  const pct = (key: AssumptionKey, f: { label: string; hint: string }) => (
    <NumberField
      label={f.label}
      hint={f.hint}
      unit={t.units.percent}
      value={a[key]}
      onChange={(v) => setA({ [key]: v })}
      error={err(key)}
    />
  );
  const scenarioErr = err('returnScenarios');
  const sc = (key: 'pessimistic' | 'neutral' | 'optimistic') => (
    <NumberField
      label={t.fields[key]}
      unit={t.units.percent}
      value={a.returnScenarios[key]}
      onChange={(v) => setA({ returnScenarios: { ...a.returnScenarios, [key]: v } })}
      error={err(`returnScenarios.${key}`)}
    />
  );

  const church = churchTaxParameters();
  const churchChoices: { value: ChurchTaxChoice | undefined; label: string }[] = [
    { value: undefined, label: t.fields.churchTaxNone },
    { value: 'low', label: t.fields.churchTaxLow(formatNumber(church.parameters.rateLow)) },
    { value: 'high', label: t.fields.churchTaxHigh(formatNumber(church.parameters.rateHigh)) },
  ];
  const churchSummary = churchChoices.find((c) => c.value === a.churchTax)!.label;

  const retired = profile.retired === true;
  const rt = de.retired.profile;
  const retirementYear = retired
    ? (profile.retirementStartYear ?? Number.NaN)
    : profile.birthYear + profile.targetRetirementAge;
  const retiredShare =
    retired && legal.ok && Number.isFinite(retirementYear)
      ? taxableShareForStartYear(retirementYear, legal.legal)
      : undefined;
  const share = legal.ok && !retired ? taxableShare(retirementYear, legal.legal) : undefined;
  const inPast = !retired && issues.some((i) => i.code === 'retirement_in_past');
  const setRetired = (on: boolean) =>
    api.setProfile(
      on
        ? {
            retired: true,
            retirementStartYear:
              profile.retirementStartYear ?? defaultRetirementStartYear(profile, CURRENT_YEAR),
          }
        : { retired: false },
    );
  const regular = legal.ok
    ? t.consequences.regularAgeValue(
        formatAge(regularRetirementAgeFor(profile.birthYear, legal.legal.pension)),
      )
    : '';
  const healthText =
    a.health.mode === 'other'
      ? t.consequences.healthOther(formatNumber(a.health.otherRatePercent ?? 0))
      : a.health.childless
        ? t.consequences.healthCompulsoryChildless
        : t.consequences.healthCompulsoryChildren;
  const calcOk = api.issues.profile.length === 0;
  const outside =
    !retired &&
    Number.isFinite(profile.targetRetirementAge) &&
    (profile.targetRetirementAge < 63 || profile.targetRetirementAge > 70);

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="grid">
        <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
          <FieldGroup title={t.groups.person} defaultOpen>
            <NumberField
              plain
              label={t.fields.birthYear.label}
              value={profile.birthYear}
              onChange={(v) => api.setProfile({ birthYear: v })}
              error={err('birthYear')}
            />
            <div className="check">
              <input
                id={retiredId}
                type="checkbox"
                checked={retired}
                onChange={(e) => setRetired(e.target.checked)}
              />
              <label htmlFor={retiredId}>{rt.switchLabel}</label>
            </div>
            <p className="hint">{rt.switchHint}</p>
            {retired ? (
              <NumberField
                plain
                label={rt.startYear.label}
                hint={rt.startYear.hint}
                value={profile.retirementStartYear}
                onChange={(v) => api.setProfile({ retirementStartYear: v })}
                error={err('retirementStartYear')}
              />
            ) : (
              <NumberField
                label={t.fields.targetRetirementAge.label}
                hint={t.fields.targetRetirementAge.hint}
                unit={t.units.years}
                value={profile.targetRetirementAge}
                onChange={(v) => api.setProfile({ targetRetirementAge: v })}
                error={err('targetRetirementAge')}
              />
            )}
            {inPast && (
              <div className="notice" role="status" id="as-retired">
                {rt.asRetired.text}{' '}
                <button type="button" className="btn" onClick={() => setRetired(true)}>
                  {rt.asRetired.button}
                </button>
              </div>
            )}
            <NumberField
              label={t.fields.lifeExpectancyAge.label}
              hint={t.fields.lifeExpectancyAge.hint}
              unit={t.units.years}
              value={profile.lifeExpectancyAge}
              onChange={(v) => api.setProfile({ lifeExpectancyAge: v })}
              error={err('lifeExpectancyAge')}
            />
            {!hideWish && (
              <NumberField
                label={t.fields.desiredMonthlyIncomeToday.label}
                hint={t.fields.desiredMonthlyIncomeToday.hint}
                unit={t.units.eurPerMonth}
                value={profile.desiredMonthlyIncomeToday}
                onChange={(v) => api.setProfile({ desiredMonthlyIncomeToday: v })}
                onClear={() => api.setProfile({ desiredMonthlyIncomeToday: undefined })}
                error={err('desiredMonthlyIncomeToday')}
              />
            )}
            <ChildrenField
              key={resetKey}
              api={api}
              error={
                issues.find((i) => i.field.startsWith('childrenBirthYears'))
                  ? issueMessage(issues.find((i) => i.field.startsWith('childrenBirthYears'))!)
                  : undefined
              }
            />
          </FieldGroup>

          <FieldGroup
            title={t.groups.general}
            summary={t.advancedSummary(
              t.summaries.general(
                formatNumber(a.inflationPercent),
                formatNumber(a.returnScenarios.neutral),
              ),
            )}
            hasError={issues.some((i) =>
              startsWithAny(i.field, [
                'inflationPercent',
                'pensionAdjustmentPercent',
                'payoutPhaseReturnPercent',
                'returnScenarios',
              ]),
            )}
          >
            {pct('inflationPercent', t.fields.inflationPercent)}
            {pct('pensionAdjustmentPercent', t.fields.pensionAdjustmentPercent)}
            {pct('payoutPhaseReturnPercent', t.fields.payoutPhaseReturnPercent)}
            <p>
              <strong>{t.fields.scenarios}</strong>
            </p>
            {sc('pessimistic')}
            {sc('neutral')}
            {sc('optimistic')}
            {scenarioErr && <p className="error">{scenarioErr}</p>}
          </FieldGroup>

          <FieldGroup
            title={t.groups.tax}
            summary={
              retired
                ? rt.taxHiddenSummary
                : t.advancedSummary(
                    t.summaries.tax(
                      formatNumber(a.marginalTaxRateTodayPercent),
                      formatNumber(a.employeeSocialInsuranceRatePercent),
                    ),
                  )
            }
            hasError={issues.some((i) => startsWithAny(i.field, ['marginalTax', 'employeeSocial']))}
          >
            <p className="hint">{t.taxNote}</p>
            {!retired && pct('marginalTaxRateTodayPercent', t.fields.marginalTaxRateTodayPercent)}
            {!retired &&
              pct(
                'employeeSocialInsuranceRatePercent',
                t.fields.employeeSocialInsuranceRatePercent,
              )}
          </FieldGroup>

          <FieldGroup
            title={t.groups.churchTax}
            summary={t.advancedSummary(t.summaries.churchTax(churchSummary))}
            hasError={issues.some((i) => i.field.startsWith('churchTax'))}
          >
            <fieldset className="radios">
              <legend>{t.fields.churchTaxLegend}</legend>
              {churchChoices.map((c) => (
                <label key={c.value ?? 'none'}>
                  <input
                    type="radio"
                    name={churchRadioName}
                    checked={a.churchTax === c.value}
                    onChange={() => setA({ churchTax: c.value })}
                  />{' '}
                  {c.label}
                </label>
              ))}
            </fieldset>
            <p className="hint">
              {t.fields.churchTaxHint(
                formatNumber(capitalGainsRateWithChurchTax(church.parameters, undefined)),
                a.churchTax === undefined
                  ? undefined
                  : formatNumber(capitalGainsRateWithChurchTax(church.parameters, a.churchTax)),
              )}
              {church.unverified && ` ${t.fields.churchTaxUnverified}`}
            </p>
          </FieldGroup>

          <FieldGroup
            title={t.groups.health}
            summary={t.advancedSummary(healthText)}
            hasError={issues.some((i) => i.field.startsWith('health'))}
          >
            <fieldset className="radios">
              <legend>{t.fields.healthLegend}</legend>
              <label>
                <input
                  type="radio"
                  name={radioName}
                  checked={a.health.mode === 'statutoryCompulsory'}
                  onChange={() => setA({ health: { ...a.health, mode: 'statutoryCompulsory' } })}
                />{' '}
                {withTerms(t.fields.healthCompulsory)}
              </label>
              <label>
                <input
                  type="radio"
                  name={radioName}
                  checked={a.health.mode === 'other'}
                  onChange={() =>
                    setA({
                      health: {
                        ...a.health,
                        mode: 'other',
                        otherRatePercent: a.health.otherRatePercent ?? 11,
                      },
                    })
                  }
                />{' '}
                {t.fields.healthOther}
              </label>
            </fieldset>
            <NumberField
              label={t.fields.additionalRatePercent.label}
              hint={t.fields.additionalRatePercent.hint}
              unit={t.units.percent}
              value={a.health.additionalRatePercent}
              onChange={(v) => setA({ health: { ...a.health, additionalRatePercent: v } })}
              error={err('health.additionalRatePercent')}
            />
            <div className="check">
              <input
                id={childlessId}
                type="checkbox"
                checked={a.health.childless}
                onChange={(e) => setA({ health: { ...a.health, childless: e.target.checked } })}
              />
              <label htmlFor={childlessId}>{t.fields.childless}</label>
            </div>
            <NumberField
              label={t.fields.otherRatePercent.label}
              hint={t.fields.otherRatePercent.hint}
              unit={t.units.percent}
              value={a.health.otherRatePercent ?? Number.NaN}
              disabled={a.health.mode !== 'other'}
              onChange={(v) => setA({ health: { ...a.health, otherRatePercent: v } })}
              error={err('health.otherRatePercent')}
            />
          </FieldGroup>

          <button
            type="button"
            className="btn"
            onClick={() => {
              api.reset();
              setResetKey((k) => k + 1);
            }}
          >
            {t.reset}
          </button>
        </form>

        <section aria-live="polite">
          {!legal.ok && <div className="notice">{t.configError}</div>}
          {legal.ok && (
            <div className="card">
              <h2>{t.consequences.title}</h2>
              {calcOk ? (
                retired ? (
                  <dl className="facts">
                    <dt>{rt.consequences.startYear}</dt>
                    <dd>{retirementYear}</dd>
                    <dt>{rt.consequences.sinceYears}</dt>
                    <dd>{CURRENT_YEAR - retirementYear}</dd>
                    <dt>{rt.consequences.ageToday}</dt>
                    <dd>{CURRENT_YEAR - profile.birthYear}</dd>
                    <dt>{rt.consequences.taxableShare(retirementYear)}</dt>
                    <dd>{retiredShare === undefined ? '' : `${formatNumber(retiredShare)} %`}</dd>
                    <dt>{t.consequences.health}</dt>
                    <dd>{withTerms(healthText)}</dd>
                  </dl>
                ) : (
                  <dl className="facts">
                    <dt>{t.consequences.retirementYear}</dt>
                    <dd>{retirementYear}</dd>
                    <dt>{t.consequences.yearsToRetirement(CURRENT_YEAR)}</dt>
                    <dd>{retirementYear - CURRENT_YEAR}</dd>
                    <dt>{t.consequences.regularAge(profile.birthYear)}</dt>
                    <dd>{regular}</dd>
                    <dt>{t.consequences.taxableShare(retirementYear)}</dt>
                    <dd>{share ? `${formatNumber(share.percent)} %` : ''}</dd>
                    <dt>{t.consequences.health}</dt>
                    <dd>{withTerms(healthText)}</dd>
                  </dl>
                )
              ) : (
                <p className="hint">{de.statutory.profileInvalid}</p>
              )}
              <p className="hint">{retired ? rt.consequences.note : t.consequences.note}</p>
            </div>
          )}
          {outside && calcOk && (
            <div className="notice" role="status">
              {t.outsideRange(profile.targetRetirementAge)}
            </div>
          )}
          {legal.ok && legal.legal.unverified.length > 0 && (
            <div className="notice" role="status">
              {t.unverifiedNote}{' '}
              <button type="button" className="link" onClick={goToAssumptions}>
                {t.assumptionsLink}
              </button>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
