import { projectDepotRetired } from '@valiva/core';
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
import type { DepotApi } from '../../state/useDepot';
import type { ProfileApi } from '../../state/useProfile';
import { RetiredFrame, issueAt, useRetiredContext } from './shared';

/** Retirement depot of a person who already draws a pension: a rest capital with a payout plan (`16` §5.3). */
export function DepotRetiredPage({
  api,
  profile,
  legal,
  goToProfile,
  nextStep,
  otherIncome,
}: {
  api: DepotApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  nextStep?: EmptyAction;
  otherIncome?: Record<ScenarioName, OtherIncome>;
}) {
  const t = de.retired.depot;
  const s = de.retired.shared;
  const { state } = api;
  const ctx = useRetiredContext(profile, legal, otherIncome);
  const outcome = useMemo(
    () => (ctx ? projectDepotRetired(api.committed, ctx) : undefined),
    [ctx, api.committed],
  );
  const empty = !(state.retiredCapitalToday !== undefined && state.retiredCapitalToday > 0);
  const issues: ValidationIssue[] = outcome && !outcome.ok && !empty ? outcome.issues : [];
  const err = (f: string) => issueAt(issues, f);

  const inputs = (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <p className="hint">{t.hint}</p>
      <FieldGroup title={de.depot.groups.payout} defaultOpen>
        <div id="retired-depot-field">
          <NumberField
            label={t.fields.retiredCapitalToday.label}
            hint={t.fields.retiredCapitalToday.hint}
            unit="€"
            value={state.retiredCapitalToday}
            onChange={(v) => api.update({ retiredCapitalToday: v })}
            onClear={() => api.update({ retiredCapitalToday: undefined })}
            error={err('retiredCapitalToday')}
          />
        </div>
        <NumberField
          plain
          label={t.fields.retiredEndAge.label}
          hint={t.fields.retiredEndAge.hint}
          unit={de.profile.units.years}
          value={state.retiredEndAge}
          onChange={(v) => api.update({ retiredEndAge: v })}
          onClear={() => api.update({ retiredEndAge: undefined })}
          error={err('retiredEndAge')}
        />
      </FieldGroup>
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
          document.querySelector<HTMLInputElement>('#retired-depot-field input')?.focus(),
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

  const calculation = (
    <div className="dts">
      {r && (
        <>
          <Disclosure title={t.calcTitle} defaultOpen>
            <dl className="facts">
              <dt>{s.kpiGross}</dt>
              <dd>{formatEur(r.monthlyPensionNominal)}</dd>
              <dt>{de.retired.occupational.steps.planMonths}</dt>
              <dd>{formatNumber(r.details.planMonths ?? 0)}</dd>
              <dt>{de.retired.statutory.steps.rows.tax}</dt>
              <dd>{formatEur(r.details.nominal.tax)}</dd>
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
      id="depot"
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
