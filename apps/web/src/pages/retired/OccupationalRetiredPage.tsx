import { projectOccupationalRetired } from '@valiva/core';
import type { LegalResolution, OtherIncome, ScenarioName, ValidationIssue } from '@valiva/core';
import { useId, useMemo } from 'react';
import { EmptyState } from '../../components/cards/EmptyState';
import type { EmptyAction } from '../../components/cards/EmptyState';
import { Disclosure } from '../../components/cards/Disclosure';
import { ResultFrame } from '../../components/cards/ResultFrame';
import { ImportantNotes, InfoNotes, notesFromCodes } from '../../components/cards/WarningList';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { de } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';
import type { OccupationalApi } from '../../state/useOccupational';
import type { ProfileApi } from '../../state/useProfile';
import { RetiredFrame, issueAt, useRetiredContext } from './shared';

/** Company pension of a person who already draws it: a running pension or a rest capital (`16` §5.3). */
export function OccupationalRetiredPage({
  api,
  profile,
  legal,
  goToProfile,
  nextStep,
  otherIncome,
}: {
  api: OccupationalApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  nextStep?: EmptyAction;
  otherIncome?: Record<ScenarioName, OtherIncome>;
}) {
  const t = de.retired.occupational;
  const s = de.retired.shared;
  const { state } = api;
  const formName = useId();
  const adjName = useId();
  const endName = useId();
  const ctx = useRetiredContext(profile, legal, otherIncome);
  const outcome = useMemo(
    () => (ctx ? projectOccupationalRetired(api.committed, ctx) : undefined),
    [ctx, api.committed],
  );
  const capital = state.retiredForm === 'capital';
  const entered = capital ? state.capitalToday : state.annuityMonthlyGross;
  const empty = !(entered !== undefined && entered > 0);
  const issues: ValidationIssue[] = outcome && !outcome.ok && !empty ? outcome.issues : [];
  const err = (f: string) => issueAt(issues, f);

  const adj = state.annuityAdjustment ?? { mode: 'fixed' as const, percent: 0 };
  const lifelong = state.annuityEndAge === undefined || state.annuityEndAge === 'lifelong';

  const inputs = (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.form} defaultOpen>
        <fieldset className="radios">
          <legend>{t.form.legend}</legend>
          <label>
            <input
              type="radio"
              name={formName}
              checked={!capital}
              onChange={() => api.update({ retiredForm: 'annuity' })}
            />{' '}
            {t.form.annuity}
          </label>
          <label>
            <input
              type="radio"
              name={formName}
              checked={capital}
              onChange={() => api.update({ retiredForm: 'capital' })}
            />{' '}
            {t.form.capital}
          </label>
        </fieldset>
      </FieldGroup>
      {capital ? (
        <FieldGroup title={t.groups.capital} defaultOpen>
          <NumberField
            label={t.fields.capitalToday.label}
            hint={t.fields.capitalToday.hint}
            unit="€"
            value={state.capitalToday}
            onChange={(v) => api.update({ capitalToday: v })}
            onClear={() => api.update({ capitalToday: undefined })}
            error={err('capitalToday')}
          />
          <NumberField
            plain
            label={t.fields.capitalEndAge.label}
            hint={t.fields.capitalEndAge.hint}
            unit={de.profile.units.years}
            value={state.capitalEndAge}
            onChange={(v) => api.update({ capitalEndAge: v })}
            onClear={() => api.update({ capitalEndAge: undefined })}
            error={err('capitalEndAge')}
          />
        </FieldGroup>
      ) : (
        <FieldGroup title={t.groups.annuity} defaultOpen>
          <div id="retired-occupational-field">
            <NumberField
              label={t.fields.annuityMonthlyGross.label}
              hint={t.fields.annuityMonthlyGross.hint}
              unit="€"
              value={state.annuityMonthlyGross}
              onChange={(v) => api.update({ annuityMonthlyGross: v })}
              onClear={() => api.update({ annuityMonthlyGross: undefined })}
              error={err('annuityMonthlyGross')}
            />
          </div>
          <fieldset className="radios">
            <legend>{t.fields.adjustment.legend}</legend>
            <label>
              <input
                type="radio"
                name={adjName}
                checked={adj.mode === 'fixed'}
                onChange={() =>
                  api.update({
                    annuityAdjustment: {
                      mode: 'fixed',
                      percent: adj.mode === 'fixed' ? adj.percent : 0,
                    },
                  })
                }
              />{' '}
              {t.fields.adjustment.fixed}
            </label>
            <label>
              <input
                type="radio"
                name={adjName}
                checked={adj.mode === 'pension'}
                onChange={() => api.update({ annuityAdjustment: { mode: 'pension' } })}
              />{' '}
              {t.fields.adjustment.pension}
            </label>
          </fieldset>
          {adj.mode === 'fixed' && (
            <NumberField
              label={t.fields.adjustment.percent.label}
              hint={t.fields.adjustment.percent.hint}
              unit="%"
              value={adj.percent}
              onChange={(v) => api.update({ annuityAdjustment: { mode: 'fixed', percent: v } })}
              error={err('annuityAdjustment.percent')}
            />
          )}
          <fieldset className="radios">
            <legend>{t.fields.end.legend}</legend>
            <label>
              <input
                type="radio"
                name={endName}
                checked={lifelong}
                onChange={() => api.update({ annuityEndAge: 'lifelong' })}
              />{' '}
              {t.fields.end.lifelong}
            </label>
            <label>
              <input
                type="radio"
                name={endName}
                checked={!lifelong}
                onChange={() =>
                  api.update({
                    annuityEndAge: Math.max(90, profile.state.profile.lifeExpectancyAge),
                  })
                }
              />{' '}
              {t.fields.end.age}
            </label>
          </fieldset>
          {!lifelong && (
            <NumberField
              plain
              label={t.fields.end.ageField.label}
              hint={t.fields.end.ageField.hint}
              unit={de.profile.units.years}
              value={typeof state.annuityEndAge === 'number' ? state.annuityEndAge : undefined}
              onChange={(v) => api.update({ annuityEndAge: v })}
              error={err('annuityEndAge')}
            />
          )}
        </FieldGroup>
      )}
    </form>
  );

  const r = outcome?.ok ? outcome.result : undefined;
  const notes = r ? notesFromCodes(r.warnings) : [];
  const result = empty ? (
    <EmptyState
      title={t.empty.title}
      primary={{
        label: de.retired.statutory.empty.button,
        onClick: () =>
          document.querySelector<HTMLInputElement>('#retired-occupational-field input')?.focus(),
      }}
      secondary={nextStep}
    >
      {t.empty.text}
    </EmptyState>
  ) : r ? (
    <>
      <ImportantNotes notes={notes} />
      <ResultFrame
        eyebrow={t.heroEyebrow}
        value={formatEur(r.netMonthlyPensionReal)}
        unit={s.perMonth}
        kpis={[
          { label: s.kpiGross, value: formatEur(r.monthlyPensionReal) },
          { label: s.kpiDeductions, value: formatEur(r.taxAndContributions) },
        ]}
      />
    </>
  ) : (
    <div className="notice" role="status">
      {s.invalid}
    </div>
  );

  const legalValues = ctx?.legal.social;
  const calculation = (
    <div className="dts">
      {r && legalValues && (
        <>
          <Disclosure title={t.steps.title} defaultOpen>
            <dl className="facts">
              <dt>{s.kpiGross}</dt>
              <dd>{formatEur(r.details.nominal.gross)}</dd>
              <dt>{t.steps.healthAllowance}</dt>
              <dd>{formatEur(legalValues.occupationalHealthAllowanceMonthly)}</dd>
              <dt>{t.steps.careThreshold}</dt>
              <dd>{formatEur(legalValues.occupationalCareThresholdMonthly)}</dd>
              <dt>{de.retired.statutory.steps.rows.health}</dt>
              <dd>{formatEur(r.details.nominal.health)}</dd>
              <dt>{de.retired.statutory.steps.rows.care}</dt>
              <dd>{formatEur(r.details.nominal.care)}</dd>
              <dt>{de.retired.statutory.steps.rows.tax}</dt>
              <dd>{formatEur(r.details.nominal.tax)}</dd>
              {r.details.planMonths !== undefined && (
                <>
                  <dt>{t.steps.planMonths}</dt>
                  <dd>{formatNumber(r.details.planMonths)}</dd>
                </>
              )}
              <dt>{s.kpiNet}</dt>
              <dd>
                <b>{formatEur(r.netMonthlyPensionReal)}</b>
              </dd>
            </dl>
          </Disclosure>
          <InfoNotes notes={notes} />
        </>
      )}
    </div>
  );

  return (
    <RetiredFrame
      id="occupational"
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
