import { projectStatutoryActual } from '@valiva/core';
import type { LegalResolution, OtherIncome, ScenarioName, ValidationIssue } from '@valiva/core';
import { useMemo } from 'react';
import { EmptyState } from '../../components/cards/EmptyState';
import type { EmptyAction } from '../../components/cards/EmptyState';
import { Disclosure } from '../../components/cards/Disclosure';
import { ResultFrame } from '../../components/cards/ResultFrame';
import { ImportantNotes, InfoNotes, notesFromCodes } from '../../components/cards/WarningList';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { de } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';
import type { ProfileApi } from '../../state/useProfile';
import type { StatutoryApi } from '../../state/useStatutory';
import { RetiredFrame, issueAt, useRetiredContext } from './shared';

/** Statutory pension of a person who already draws it: the values of the pension notice (`16` §5.2). */
export function StatutoryRetiredPage({
  api,
  profile,
  legal,
  goToProfile,
  nextStep,
  otherIncome,
}: {
  api: StatutoryApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  nextStep?: EmptyAction;
  otherIncome?: Record<ScenarioName, OtherIncome>;
}) {
  const t = de.retired.statutory;
  const s = de.retired.shared;
  const { state } = api;
  const ctx = useRetiredContext(profile, legal, otherIncome);
  const outcome = useMemo(
    () => (ctx ? projectStatutoryActual(api.committed, ctx) : undefined),
    [ctx, api.committed],
  );
  const empty = !(state.actualMonthlyGross !== undefined && state.actualMonthlyGross > 0);
  const issues: ValidationIssue[] = outcome && !outcome.ok && !empty ? outcome.issues : [];
  const err = (f: string) => issueAt(issues, f);
  const startYear = profile.state.profile.retirementStartYear;

  const inputs = (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.notice} defaultOpen>
        <div id="retired-statutory-field">
          <NumberField
            label={t.fields.actualMonthlyGross.label}
            hint={t.fields.actualMonthlyGross.hint}
            unit="€"
            value={state.actualMonthlyGross}
            onChange={(v) => api.update({ actualMonthlyGross: v, mode: 'actual' })}
            onClear={() => api.update({ actualMonthlyGross: undefined })}
            error={err('actualMonthlyGross')}
          />
        </div>
        <dl className="facts">
          <dt>{t.startRow}</dt>
          <dd>{startYear ?? '–'}</dd>
        </dl>
        <p>
          <button type="button" className="link" onClick={goToProfile}>
            {s.startFromProfile}
          </button>
        </p>
      </FieldGroup>
      <FieldGroup
        title={t.groups.optional}
        defaultOpen={state.firstFullYearAnnual !== undefined}
        hasError={err('firstFullYearAnnual') !== undefined}
      >
        <NumberField
          label={t.fields.firstFullYearAnnual.label}
          hint={t.fields.firstFullYearAnnual.hint}
          more={t.fields.firstFullYearAnnual.more}
          unit="€"
          value={state.firstFullYearAnnual}
          onChange={(v) => api.update({ firstFullYearAnnual: v })}
          onClear={() => api.update({ firstFullYearAnnual: undefined })}
          error={err('firstFullYearAnnual')}
        />
      </FieldGroup>
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
          document.querySelector<HTMLInputElement>('#retired-statutory-field input')?.focus(),
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
          { label: t.kpi.share, value: `${formatNumber(d.taxableSharePercent)} %` },
          { label: t.kpi.taxFree, value: formatEur(d.taxFreeYearly) },
        ]}
      />
    </>
  ) : (
    <div className="notice" role="status">
      {s.invalid}
    </div>
  );

  const rows = t.steps.rows;
  const calculation = (
    <div className="dts">
      {r && d && (
        <>
          <Disclosure title={t.steps.title} defaultOpen>
            <dl className="facts">
              <dt>{rows.start}</dt>
              <dd>{d.startYear}</dd>
              <dt>{rows.share}</dt>
              <dd>{formatNumber(d.taxableSharePercent)} %</dd>
              <dt>{d.referenceEstimated ? rows.referenceEstimated : rows.reference}</dt>
              <dd>{formatEur(d.referenceAnnual)}</dd>
              <dt>{rows.taxFree}</dt>
              <dd>{formatEur(d.taxFreeYearly)}</dd>
              <dt>{rows.taxable}</dt>
              <dd>{formatEur(r.taxableMonthlyReal)}</dd>
              <dt>{rows.health}</dt>
              <dd>{formatEur(d.nominal.health)}</dd>
              <dt>{rows.care}</dt>
              <dd>{formatEur(d.nominal.care)}</dd>
              <dt>{rows.tax}</dt>
              <dd>{formatEur(d.nominal.tax)}</dd>
              <dt>{rows.net}</dt>
              <dd>
                <b>{formatEur(r.netMonthlyPensionReal)}</b>
              </dd>
            </dl>
            {d.startsThisYear && <p className="hint">{rows.startsThisYear}</p>}
          </Disclosure>
          <InfoNotes notes={notes} />
        </>
      )}
    </div>
  );

  return (
    <RetiredFrame
      id="statutory"
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
