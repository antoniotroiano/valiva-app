import { OCCUPATIONAL_LIMITS, projectOccupational, SCENARIO_NAMES } from '@pathwise/core';
import type {
  EmployerSubsidyMode,
  GlobalAssumptions,
  LegalParameters,
  LegalResolution,
  OccupationalInput,
  OccupationalProjection,
  OtherIncome,
  ScenarioName,
  ValidationIssue,
} from '@pathwise/core';
import { useId, useMemo } from 'react';
import { KpiTile } from '../components/KpiTile';
import { MonthField } from '../components/MonthField';
import { NumberField } from '../components/NumberField';
import { OccupationalChart } from '../components/OccupationalChart';
import { PageShell } from '../components/PageShell';
import { formatEur, formatNumber } from '../format';
import { de, issueMessage } from '../i18n/de';
import { warningText } from '../warningText';
import type { OccupationalApi } from '../useOccupational';
import type { ProfileApi } from '../useProfile';
import { CURRENT_YEAR } from '../useProfile';
import { ScrollTable } from '../components/ScrollTable';

type Props = {
  api: OccupationalApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  goToAssumptions: () => void;
  /** Income of the other products when this one pays out; the tax is levied on the sum. */
  otherIncome?: Record<ScenarioName, OtherIncome>;
};

type ScenarioResults = Record<ScenarioName, OccupationalProjection>;

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

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="grid">
        <div>
          <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
            <fieldset className="plain">
              <legend>{t.groups.contribution}</legend>
              <div id="occupational-contribution-field">
                <NumberField
                  label={t.fields.employeeContributionMonthlyGross.label}
                  hint={t.fields.employeeContributionMonthlyGross.hint}
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
            </fieldset>
            <fieldset className="plain">
              <legend>{t.groups.costs}</legend>
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
                hint={t.fields.costPercentPerYear.hint}
                unit="%"
                value={state.costPercentPerYear}
                onChange={(v) => api.update({ costPercentPerYear: v })}
                error={err('costPercentPerYear')}
              />
              <NumberField
                label={t.fields.guaranteedRatePercent.label}
                hint={t.fields.guaranteedRatePercent.hint}
                unit="%"
                value={state.guaranteedRatePercent ?? Number.NaN}
                onChange={(v) =>
                  api.update({ guaranteedRatePercent: Number.isNaN(v) ? undefined : v })
                }
                error={err('guaranteedRatePercent')}
              />
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
            </fieldset>
            <details className="group">
              <summary>{t.profileTitle}</summary>
              <div className="group-body">
                <ProfileFacts a={a} legal={legal.ok ? legal.legal : undefined} />
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
                    .querySelector<HTMLInputElement>('#occupational-contribution-field input')
                    ?.focus()
                }
              >
                {t.jumpToField}
              </button>
            </div>
          ) : outcome?.ok ? (
            <Results
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

function ProfileFacts({ a, legal }: { a: GlobalAssumptions; legal?: LegalParameters }) {
  const r = de.occupational.profileRows;
  const health =
    a.health.mode === 'other'
      ? r.healthOther(formatNumber(a.health.otherRatePercent ?? 0))
      : r.healthCompulsory(
          formatNumber(a.health.additionalRatePercent),
          formatNumber(
            a.health.childless
              ? (legal?.social.careRateChildlessPercent ?? 4.2)
              : (legal?.social.careRatePercent ?? 3.6),
          ),
        );
  return (
    <dl className="facts">
      <dt>{r.scenarios}</dt>
      <dd>
        {formatNumber(a.returnScenarios.pessimistic)} % / {formatNumber(a.returnScenarios.neutral)}{' '}
        % / {formatNumber(a.returnScenarios.optimistic)} %
      </dd>
      <dt>{r.payoutReturn}</dt>
      <dd>{formatNumber(a.payoutPhaseReturnPercent)} %</dd>
      <dt>{r.inflation}</dt>
      <dd>{formatNumber(a.inflationPercent)} %</dd>
      <dt>{r.marginalTax}</dt>
      <dd>{formatNumber(a.marginalTaxRateTodayPercent)} %</dd>
      <dt>{r.socialInsurance}</dt>
      <dd>{formatNumber(a.employeeSocialInsuranceRatePercent)} %</dd>
      <dt>{r.tax}</dt>
      <dd>{r.taxValue}</dd>
      <dt>{r.health}</dt>
      <dd>{health}</dd>
    </dl>
  );
}

function Results({
  results,
  input,
  assumptions,
  legal,
}: {
  results: ScenarioResults;
  input: OccupationalInput;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.occupational;
  const r = results.neutral;
  const d = r.details;
  const cappedAt = legal.social.occupationalSocialInsuranceFreeMonthly;
  return (
    <>
      {r.warnings.length > 0 && (
        <div className="notice" role="status">
          <ul>
            {r.warnings.map((w) => (
              <li key={w}>{warningText(w)}</li>
            ))}
          </ul>
        </div>
      )}
      {input.employerSubsidyMode === 'auto15' &&
        input.employeeContributionMonthlyGross > cappedAt && (
          <div className="notice info" role="status">
            {t.notices.subsidyCapped(formatEur(cappedAt), formatEur(d.subsidyMonthly))}
          </div>
        )}
      {d.statutoryLossMonthlyToday > 0 && (
        <div className="notice info" role="status">
          {t.notices.statutoryLoss(formatEur(d.statutoryLossMonthlyToday))}
        </div>
      )}
      {d.guaranteeActive && (
        <div className="notice info" role="status">
          {t.notices.guarantee(
            `${formatNumber(d.grossReturnPercent - input.costPercentPerYear)} %`,
            `${formatNumber(d.netReturnPercentUsed)} %`,
          )}
        </div>
      )}
      {d.nominal.care === 0 && d.nominal.health === 0 && assumptions.health.mode !== 'other' && (
        <div className="notice info" role="status">
          {t.notices.belowThreshold(formatEur(d.careThresholdReal))}
        </div>
      )}
      <p className="hint">{t.scenarioNote(t.scenarioNames.neutral)}</p>
      <div className="kpis">
        <KpiTile
          label={t.kpi.netEffort}
          value={formatEur(d.netEffort.net)}
          note={t.kpi.netEffortNote(formatEur(d.netEffort.gross))}
        />
        <KpiTile
          label={t.kpi.intoContract}
          value={formatEur(d.intoContractMonthly)}
          note={t.kpi.intoContractNote(formatEur(d.netEffort.gross), formatEur(d.subsidyMonthly))}
        />
        <KpiTile
          label={t.kpi.capital(d.payoutYear)}
          value={formatEur(r.capitalAtRetirement ?? 0)}
        />
        <KpiTile
          label={t.kpi.parts}
          value={`${formatEur(d.employeeTotal)} / ${formatEur(d.subsidyTotal + d.employerExtraTotal)}`}
        />
        <KpiTile label={t.kpi.grossNominal} value={formatEur(r.monthlyPensionNominal)} />
        <KpiTile label={t.kpi.grossReal} value={formatEur(r.monthlyPensionReal)} />
        <KpiTile label={t.kpi.tax} value={formatEur(r.taxAndContributions)} />
        <KpiTile label={t.kpi.netReal} value={formatEur(r.netMonthlyPensionReal)} />
      </div>
      <EffortTable result={r} assumptions={assumptions} legal={legal} />
      <ScenarioTable results={results} assumptions={assumptions} />
      <OccupationalChart scenarios={results} />
      <StepsTable result={r} assumptions={assumptions} input={input} legal={legal} />
    </>
  );
}

function EffortTable({
  result,
  assumptions: a,
  legal,
}: {
  result: OccupationalProjection;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.occupational.effort;
  const e = result.details.netEffort;
  return (
    <ScrollTable label={t.title(formatEur(e.gross), formatEur(e.net))} className="card">
      <table>
        <caption>{t.title(formatEur(e.gross), formatEur(e.net))}</caption>
        <thead>
          <tr>
            <th scope="col">{t.cols.item}</th>
            <th scope="col">{t.cols.monthly}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="left">
              {t.conversion}
            </th>
            <td>{formatEur(e.gross)}</td>
          </tr>
          <tr>
            <th scope="row" className="left">
              {t.taxSaving(
                formatEur(Math.min(e.gross, legal.social.occupationalTaxFreeMonthly)),
                formatNumber(a.marginalTaxRateTodayPercent),
              )}
            </th>
            <td>− {formatEur(e.taxSaving)}</td>
          </tr>
          <tr>
            <th scope="row" className="left">
              {t.socialSaving(
                formatEur(Math.min(e.gross, legal.social.occupationalSocialInsuranceFreeMonthly)),
                formatNumber(a.employeeSocialInsuranceRatePercent),
              )}
            </th>
            <td>− {formatEur(e.socialSaving)}</td>
          </tr>
          <tr className="sum">
            <th scope="row" className="left">
              {t.net}
            </th>
            <td>{formatEur(e.net)}</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">{t.note(formatEur(result.details.subsidyMonthly))}</p>
    </ScrollTable>
  );
}

function ScenarioTable({
  results,
  assumptions: a,
}: {
  results: ScenarioResults;
  assumptions: GlobalAssumptions;
}) {
  const t = de.occupational.scenarioTable;
  const rows: [ScenarioName, string][] = [
    ['pessimistic', t.pessimistic(formatNumber(a.returnScenarios.pessimistic))],
    ['neutral', t.neutral(formatNumber(a.returnScenarios.neutral))],
    ['optimistic', t.optimistic(formatNumber(a.returnScenarios.optimistic))],
  ];
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.scenario}</th>
            <th scope="col">{t.capital(results.neutral.details.payoutYear)}</th>
            <th scope="col">{t.grossNominal}</th>
            <th scope="col">{t.grossReal}</th>
            <th scope="col">{t.netReal}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([s, label]) => {
            const r = results[s];
            return (
              <tr key={s} className={s === 'neutral' ? 'sum' : undefined}>
                <th scope="row" className="left">
                  {label}
                </th>
                <td>{formatEur(r.capitalAtRetirement ?? 0)}</td>
                <td>{formatEur(r.monthlyPensionNominal)}</td>
                <td>{formatEur(r.monthlyPensionReal)}</td>
                <td>{formatEur(r.netMonthlyPensionReal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollTable>
  );
}

function StepsTable({
  result,
  assumptions: a,
  input,
  legal,
}: {
  result: OccupationalProjection;
  assumptions: GlobalAssumptions;
  input: OccupationalInput;
  legal: LegalParameters;
}) {
  const t = de.occupational.steps;
  const d = result.details;
  const n = d.nominal;
  const real = (v: number) => formatEur(v / d.inflationFactor);
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
  const compulsory = a.health.mode === 'statutoryCompulsory';
  const careRate = a.health.childless
    ? legal.social.careRateChildlessPercent
    : legal.social.careRatePercent;
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
          {row(
            t.plan(
              d.payoutYear,
              d.payoutYear - input.payoutStartAge + input.payoutEndAge,
              d.planMonths,
              formatNumber(a.payoutPhaseReturnPercent),
              formatEur(result.capitalAtRetirement ?? 0),
            ),
            n.gross,
          )}
          {row(t.tax, n.tax, '− ')}
          {row(
            compulsory
              ? t.healthCompulsory(
                  formatNumber(
                    legal.social.healthGeneralRatePercent + a.health.additionalRatePercent,
                  ),
                  formatEur(d.healthAllowanceReal),
                )
              : t.healthOther(formatNumber(a.health.otherRatePercent ?? 0)),
            n.health,
            '− ',
          )}
          {compulsory &&
            row(n.care > 0 ? t.careOver(formatNumber(careRate)) : t.careUnder, n.care, '− ')}
          {row(t.net, n.net, '', true)}
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}
