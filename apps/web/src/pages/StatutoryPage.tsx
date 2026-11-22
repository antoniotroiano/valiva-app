import { projectStatutory, regularRetirementAgeFor } from '@valiva/core';
import type {
  GlobalAssumptions,
  LegalParameters,
  LegalResolution,
  StatutoryDetails,
  OtherIncome,
  ScenarioName,
  StatutoryInput,
  StatutoryProjection,
  ValidationIssue,
} from '@valiva/core';
import { useMemo } from 'react';
import { KpiTile } from '../components/KpiTile';
import { NumberField } from '../components/NumberField';
import { PageShell } from '../components/PageShell';
import { PensionChart } from '../components/PensionChart';
import { formatAge, formatEur, formatNumber } from '../format';
import { de, issueMessage } from '../i18n/de';
import { warningText } from '../warningText';
import type { ProfileApi } from '../useProfile';
import { CURRENT_YEAR } from '../useProfile';
import type { StatutoryApi } from '../useStatutory';
import { ScrollTable } from '../components/ScrollTable';

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
            <Results
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

function Results({
  result,
  assumptions,
  legal,
}: {
  result: StatutoryProjection;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.statutory;
  const d = result.details;
  return (
    <>
      {result.warnings.map((w) => (
        <div className="notice" role="status" key={w}>
          {warningText(w)}
        </div>
      ))}
      {d.adjustmentPercent < 0 && (
        <div className="notice" role="status">
          {t.early(formatNumber(-d.adjustmentPercent), -d.monthsFromRegularAge)}
        </div>
      )}
      {d.adjustmentPercent > 0 && (
        <div className="notice info" role="status">
          {t.late(formatNumber(d.adjustmentPercent), d.monthsFromRegularAge)}
        </div>
      )}
      <div className="kpis">
        <KpiTile label={t.kpi.start} value={String(d.retirementYear)} />
        <KpiTile label={t.kpi.grossNominal} value={formatEur(result.monthlyPensionNominal)} />
        <KpiTile label={t.kpi.grossReal} value={formatEur(result.monthlyPensionReal)} />
        <KpiTile label={t.kpi.deductions} value={formatEur(result.taxAndContributions)} />
        <KpiTile label={t.kpi.netReal} value={formatEur(result.netMonthlyPensionReal)} />
      </div>
      <PensionChart details={d} />
      <StepsTable details={d} assumptions={assumptions} legal={legal} />
      <PathTable details={d} />
    </>
  );
}

function StepsTable({
  details: d,
  assumptions: a,
  legal,
}: {
  details: StatutoryDetails;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.statutory.steps;
  const real = (n: number) => formatEur(n / d.inflationFactor);
  const n = d.nominal;
  const pct = (v: number) => formatNumber(Math.round(v * 100) / 100);
  const factorLabel = d.usedAmountAtRetirementAge
    ? t.factorStated(d.retirementAge)
    : d.adjustmentPercent < 0
      ? t.factorEarly(d.retirementAge, pct(-d.adjustmentPercent))
      : d.adjustmentPercent > 0
        ? t.factorLate(d.retirementAge, pct(d.adjustmentPercent))
        : t.factorRegular(d.retirementAge);
  const h = a.health;
  const row = (label: string, nominal: number, sign: '' | '− ' = '', sum = false) => (
    <tr className={sum ? 'sum' : undefined} key={label}>
      <th scope="row" className="left">
        {label}
      </th>
      <td>
        {sign}
        {formatEur(nominal)}
      </td>
      <td>
        {sign}
        {real(nominal)}
      </td>
    </tr>
  );
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.cols.step}</th>
            <th scope="col">{t.cols.nominal}</th>
            <th scope="col">{t.cols.real}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="left">
              {t.statement}
            </th>
            <td>{formatEur(d.path[0]?.nominal ?? 0)}</td>
            <td>{formatEur(d.path[0]?.real ?? 0)}</td>
          </tr>
          {row(
            t.adjusted(formatNumber(a.pensionAdjustmentPercent), d.yearsToRetirement),
            d.nominalBeforeFactor,
          )}
          {row(factorLabel, n.gross)}
          {row(t.tax(formatNumber(n.taxableSharePercent)), n.tax, '− ')}
          {h.mode === 'statutoryCompulsory' ? (
            <>
              {row(
                t.health(
                  formatNumber(
                    (legal.social.healthGeneralRatePercent + h.additionalRatePercent) / 2,
                  ),
                ),
                n.health,
                '− ',
              )}
              {row(
                t.care(
                  formatNumber(
                    h.childless
                      ? legal.social.careRateChildlessPercent
                      : legal.social.careRatePercent,
                  ),
                  h.childless,
                ),
                n.care,
                '− ',
              )}
            </>
          ) : (
            row(t.healthOther(formatNumber(h.otherRatePercent ?? 0)), n.health, '− ')
          )}
          {row(t.net, n.net, '', true)}
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}

function PathTable({ details }: { details: StatutoryDetails }) {
  const t = de.statutory.table;
  const path = details.path;
  const rows = path.filter((_, i) => i % 5 === 0 || i === path.length - 1);
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.year}</th>
            <th scope="col">{t.age}</th>
            <th scope="col">{t.nominal}</th>
            <th scope="col">{t.real}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.year} className={i === rows.length - 1 ? 'sum' : undefined}>
              <th scope="row">{i === rows.length - 1 ? t.start(r.year) : r.year}</th>
              <td>{r.age}</td>
              <td>{formatEur(r.nominal)}</td>
              <td>{formatEur(r.real)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}
