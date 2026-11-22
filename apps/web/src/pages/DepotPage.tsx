import { DEPOT_VARIANTS, projectDepot, SCENARIO_NAMES, withdrawalOf } from '@valiva/core';
import type {
  DepotInput,
  DepotProjection,
  GlobalAssumptions,
  LegalParameters,
  LegalResolution,
  OtherIncome,
  ScenarioName,
  ValidationIssue,
} from '@valiva/core';
import { useId, useMemo } from 'react';
import { DepotChart } from '../components/DepotChart';
import { KpiTile } from '../components/KpiTile';
import { MonthField } from '../components/MonthField';
import { NumberField } from '../components/NumberField';
import { PageShell } from '../components/PageShell';
import { WithdrawalChart, WithdrawalFields, ageText } from '../components/WithdrawalFields';
import { formatEur, formatNumber } from '../format';
import { de, issueMessage } from '../i18n/de';
import { warningText } from '../warningText';
import type { DepotApi } from '../useDepot';
import type { ProfileApi } from '../useProfile';
import { CURRENT_YEAR } from '../useProfile';
import { ScrollTable } from '../components/ScrollTable';

type Props = {
  api: DepotApi;
  profile: ProfileApi;
  legal: LegalResolution;
  goToProfile: () => void;
  goToAssumptions: () => void;
  /** Income of the other products when this one pays out; the tax is levied on the sum. */
  otherIncome?: Record<ScenarioName, OtherIncome>;
};

type ScenarioResults = Record<ScenarioName, DepotProjection>;

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

function Results({
  results,
  input,
  assumptions,
  legal,
}: {
  results: ScenarioResults;
  input: DepotInput;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.depot;
  const r = results.neutral;
  const d = r.details;
  const firstGrantRow = d.yearly.find((y) => !y.belowMinimum);
  const monthly = input.ownContributionMonthly;
  const fullYear =
    (legal.depot.basicGrantTier1Limit * legal.depot.basicGrantTier1RatePercent) / 100 +
    ((legal.depot.basicGrantTier2Limit - legal.depot.basicGrantTier1Limit) *
      legal.depot.basicGrantTier2RatePercent) /
      100;
  const guaranteeLevel =
    input.variant === 'guarantee100'
      ? legal.depot.guaranteeLevelHighPercent
      : legal.depot.guaranteeLevelLowPercent;
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
      {d.yearly.length > 0 && d.yearly.every((y) => y.belowMinimum) && (
        <div className="notice" role="status">
          {t.notices.belowMinimum(formatEur(legal.depot.minOwnContributionYearly))}
        </div>
      )}
      {firstGrantRow && d.basicGrantMissedPerYear > 0.005 && (
        <div className="notice" role="status">
          {t.notices.missed(
            formatEur(monthly),
            formatEur(monthly * 12),
            formatEur(firstGrantRow.basic),
            formatEur(legal.depot.basicGrantTier2Limit / 12),
            formatEur(fullYear),
            formatEur(d.basicGrantMissedPerYear),
          )}
        </div>
      )}
      {d.guaranteeActive && (
        <div className="notice info" role="status">
          {t.notices.guarantee(
            formatEur(d.modelCapital),
            formatEur(d.guaranteeFloor),
            `${formatNumber(guaranteeLevel)} %`,
          )}
        </div>
      )}
      <p className="hint">{t.scenarioNote(t.scenarioNames.neutral)}</p>
      <div className="kpis">
        <KpiTile
          label={t.kpi.capital(d.payoutYear)}
          value={formatEur(r.capitalAtRetirement ?? 0)}
        />
        <KpiTile label={t.kpi.own} value={formatEur(d.ownTotal)} />
        <KpiTile label={t.kpi.allowances} value={formatEur(d.allowanceTotal)} />
        <KpiTile label={t.kpi.grossNominal} value={formatEur(r.monthlyPensionNominal)} />
        <KpiTile label={t.kpi.grossReal} value={formatEur(r.monthlyPensionReal)} />
        <KpiTile label={t.kpi.tax} value={formatEur(r.taxAndContributions)} />
        <KpiTile label={t.kpi.netReal} value={formatEur(r.netMonthlyPensionReal)} />
        {r.lumpSum && (
          <>
            <KpiTile label={t.kpi.lumpGross} value={formatEur(r.lumpSum.gross)} />
            <KpiTile
              label={t.kpi.lumpNet}
              value={formatEur(r.lumpSum.net)}
              note={`${t.kpi.lumpReal}: ${formatEur(r.lumpSum.netReal)}`}
            />
          </>
        )}
      </div>
      {d.withdrawal.strategy === 'percent' && (
        <div className="kpis">
          <KpiTile
            label={de.withdrawal.lasts}
            value={
              d.depletionAge === undefined
                ? de.withdrawal.lastsEnd(input.payoutEndAge)
                : ageText(d.depletionAge)
            }
          />
          <KpiTile label={de.withdrawal.remaining} value={formatEur(d.remainingCapitalAtEnd)} />
        </div>
      )}
      <ScenarioTable results={results} input={input} assumptions={assumptions} />
      <DepotChart scenarios={results} />
      {d.withdrawal.strategy === 'percent' && (
        <>
          <p className="hint">{de.withdrawal.note}</p>
          <WithdrawalChart
            start={d.planCapital}
            years={{
              pessimistic: results.pessimistic.details.withdrawalYears,
              neutral: d.withdrawalYears,
              optimistic: results.optimistic.details.withdrawalYears,
            }}
          />
        </>
      )}
      <AllowanceTable details={d} />
      <StepsTable result={r} assumptions={assumptions} input={input} />
      {r.lumpSum && <p className="hint">{t.notices.lump}</p>}
    </>
  );
}

function ScenarioTable({
  results,
  input,
  assumptions: a,
}: {
  results: ScenarioResults;
  input: DepotInput;
  assumptions: GlobalAssumptions;
}) {
  const t = de.depot.scenarioTable;
  const override = input.returnOverridePercent;
  const rows: [ScenarioName, string][] =
    override !== undefined
      ? [['neutral', t.override(formatNumber(override))]]
      : [
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

function AllowanceTable({ details: d }: { details: DepotProjection['details'] }) {
  const t = de.depot.allowanceTable;
  const sum = (f: (y: (typeof d.yearly)[number]) => number) =>
    d.yearly.reduce((s, y) => s + f(y), 0);
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.year}</th>
            <th scope="col">{t.contribution}</th>
            <th scope="col">{t.basic}</th>
            <th scope="col">{t.child}</th>
            <th scope="col">{t.bonus}</th>
            <th scope="col">{t.total}</th>
            <th scope="col">{t.value}</th>
          </tr>
        </thead>
        <tbody>
          {d.yearly.map((y) => (
            <tr key={y.year}>
              <th scope="row">{y.year}</th>
              <td>{formatEur(y.contributions)}</td>
              <td>{formatEur(y.basic)}</td>
              <td>{formatEur(y.child)}</td>
              <td>{formatEur(y.bonus)}</td>
              <td>{formatEur(y.total)}</td>
              <td>{formatEur(y.valueEnd)}</td>
            </tr>
          ))}
          <tr className="sum">
            <th scope="row">{t.sum}</th>
            <td>{formatEur(sum((y) => y.contributions))}</td>
            <td>{formatEur(sum((y) => y.basic))}</td>
            <td>{formatEur(sum((y) => y.child))}</td>
            <td>{formatEur(sum((y) => y.bonus))}</td>
            <td>{formatEur(sum((y) => y.total))}</td>
            <td>{formatEur(d.modelCapital)}</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}

function StepsTable({
  result,
  assumptions: a,
  input,
}: {
  result: DepotProjection;
  assumptions: GlobalAssumptions;
  input: DepotInput;
}) {
  const t = de.depot.steps;
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
            ),
            n.gross,
          )}
          {row(t.tax, n.tax, '− ')}
          {row(
            a.health.mode === 'other'
              ? t.healthOther(formatNumber(a.health.otherRatePercent ?? 0))
              : t.healthCompulsory,
            n.contributions,
            '− ',
          )}
          {row(t.net, n.net, '', true)}
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}
