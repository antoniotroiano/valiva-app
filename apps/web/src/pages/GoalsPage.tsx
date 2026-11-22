import type { GoalProjection, GoalResult, SavingsGoal, ValidationIssue } from '@valiva/core';
import { useState } from 'react';
import { FieldGroup } from '../components/FieldGroup';
import { GoalChart } from '../components/GoalChart';
import { KpiTile } from '../components/KpiTile';
import { MonthField } from '../components/MonthField';
import { NumberField } from '../components/NumberField';
import { PageShell } from '../components/PageShell';
import { formatEur, formatEur2, formatMonth, formatNumber } from '../format';
import { de, issueMessage } from '../i18n/de';
import { useNarrowScreen } from '../useNarrowScreen';
import { HORIZON_YEARS } from '../useGoals';
import type { GoalsApi } from '../useGoals';
import { ScrollTable } from '../components/ScrollTable';

type Props = {
  api: GoalsApi;
  etfMonthly: number;
  goToAssumptions: () => void;
};

type NumericGoalKey =
  'targetAmount' | 'currentAmount' | 'monthlyContribution' | 'priority' | 'accountInterestPercent';

export function GoalsPage({ api, etfMonthly, goToAssumptions }: Props) {
  const t = de.goals;
  const { goals, results, state } = api;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = state.goals.find((g) => g.id === selectedId) ?? goals[0];

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="grid">
        <div>
          <section className="card" aria-labelledby="goals-list-h">
            <h2 id="goals-list-h">{t.listTitle}</h2>
            {goals.length === 0 && <p className="hint">{t.empty}</p>}
            <ul className="goal-list">
              {goals.map((g) => (
                <GoalListItem
                  key={g.id}
                  goal={g}
                  current={g.id === selected?.id}
                  onSelect={() => setSelectedId(g.id)}
                />
              ))}
            </ul>
            <button
              type="button"
              className="btn"
              onClick={() => setSelectedId(api.addGoal(t.newName))}
            >
              {t.add}
            </button>
            {goals.length > 1 && <p className="hint">{t.sortHint}</p>}
          </section>

          <AllowanceCard api={api} />

          <BudgetCard api={api} etfMonthly={etfMonthly} />

          {selected && (
            <GoalForm
              key={selected.id}
              goal={selected}
              result={results.get(selected.id)}
              api={api}
              onRemoved={() => setSelectedId(undefined)}
            />
          )}
        </div>

        <section aria-live="polite">
          {selected ? (
            <GoalResults goal={selected} result={results.get(selected.id)} />
          ) : (
            <div className="card">{t.empty}</div>
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

function percentOf(goal: SavingsGoal): number {
  if (!(goal.targetAmount > 0) || !Number.isFinite(goal.currentAmount)) return 0;
  return Math.min(100, Math.floor((goal.currentAmount / goal.targetAmount) * 100));
}

function GoalListItem({
  goal,
  current,
  onSelect,
}: {
  goal: SavingsGoal;
  current: boolean;
  onSelect: () => void;
}) {
  const t = de.goals;
  const percent = percentOf(goal);
  return (
    <li className={current ? 'current' : undefined}>
      <button
        type="button"
        className="goal-btn"
        aria-pressed={current}
        aria-label={t.select(goal.name)}
        onClick={onSelect}
      >
        <span className="row">
          <strong>{goal.name}</strong>
          <span>
            {formatEur(goal.currentAmount)} / {formatEur(goal.targetAmount)}
          </span>
        </span>
        <span
          className="progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={de.overview.goalProgressLabel(goal.name)}
        >
          <span style={{ width: `${percent}%` }} />
        </span>
        <span className="hint">
          {t.perMonth(formatEur(goal.monthlyContribution))}
          {goal.targetMonth ? ` · ${t.desired(formatMonth(goal.targetMonth))}` : ''}
        </span>
      </button>
    </li>
  );
}

function AllowanceCard({ api }: { api: GoalsApi }) {
  const t = de.goals.allowance;
  const value = api.state.taxFreeAllowanceYearly;
  return (
    <section className="card" aria-labelledby="allowance-h">
      <h2 id="allowance-h">{t.title}</h2>
      <NumberField
        label={t.label}
        hint={t.hint}
        unit={de.goals.units.eur}
        value={value ?? api.defaultAllowance}
        onChange={(v) => api.setAllowance(v)}
        onClear={() => api.setAllowance(undefined)}
        error={
          value !== undefined && (!Number.isFinite(value) || value < 0)
            ? issueMessage({
                field: 'taxFreeAllowanceYearly',
                code: Number.isFinite(value) ? 'negative' : 'not_finite',
              })
            : undefined
        }
      />
      <p className="hint">{t.standard(formatNumber(api.defaultAllowance))}</p>
    </section>
  );
}

function AllowanceUsage({ goal, api }: { goal: SavingsGoal; api: GoalsApi }) {
  const t = de.goals.allowance;
  const result = api.results.get(goal.id);
  if (!result?.ok) return null;
  const used = result.yearly.filter((y) => y.allowanceUsed > 0.005);
  const shown = used
    .slice(0, 3)
    .map((y) => t.usageYear(y.calendarYear, formatEur(y.allowanceUsed)));
  if (used.length > 3) shown.push(t.usageMore);
  return (
    <>
      <p className="hint">{used.length === 0 ? t.usageNone : t.usage(shown.join(', '))}</p>
      {api.allowanceShort.has(goal.id) && (
        <div className="notice" role="status">
          {t.short}
        </div>
      )}
    </>
  );
}

function BudgetCard({ api, etfMonthly }: { api: GoalsApi; etfMonthly: number }) {
  const t = de.goals.budget;
  const narrow = useNarrowScreen();
  const budget = api.state.savingsBudgetMonthly;
  const finite = (v: number) => (Number.isFinite(v) ? v : 0);
  const goalsSum = api.state.goals.reduce((sum, g) => sum + finite(g.monthlyContribution), 0);
  const total = goalsSum + finite(etfMonthly);
  const rest = budget !== undefined ? budget - total : undefined;
  const body = (
    <>
      <NumberField
        label={t.label}
        hint={t.hint}
        unit={de.goals.units.eur}
        value={budget ?? Number.NaN}
        onChange={(v) => api.setBudget(Number.isFinite(v) && v >= 0 ? v : undefined)}
      />
      <ScrollTable label={t.goalsSum(api.state.goals.length)}>
        <table>
          <tbody>
            <tr>
              <th scope="row" className="left">
                {t.goalsSum(api.state.goals.length)}
              </th>
              <td>{formatEur(goalsSum)}</td>
            </tr>
            <tr>
              <th scope="row" className="left">
                {t.etfRate}
              </th>
              <td>{formatEur(finite(etfMonthly))}</td>
            </tr>
            {rest !== undefined && (
              <tr className="sum">
                <th scope="row" className="left">
                  {t.rest}
                </th>
                <td>{formatEur(rest)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollTable>
    </>
  );
  // On narrow screens the block is collapsed by default so the key facts stay close to the top.
  return (
    <section className="card" aria-labelledby={narrow ? undefined : 'budget-h'}>
      {narrow ? (
        <FieldGroup title={t.title} bare>
          {body}
        </FieldGroup>
      ) : (
        <>
          <h2 id="budget-h">{t.title}</h2>
          {body}
        </>
      )}
      {rest !== undefined && rest < 0 && (
        <div className="notice" role="status">
          {t.over(formatEur(-rest))}
        </div>
      )}
    </section>
  );
}

function GoalForm({
  goal,
  result,
  api,
  onRemoved,
}: {
  goal: SavingsGoal;
  result: GoalResult | undefined;
  api: GoalsApi;
  onRemoved: () => void;
}) {
  const t = de.goals;
  const issues: ValidationIssue[] = result && !result.ok ? result.issues : [];
  const err = (field: string) => {
    const i = issues.find((x) => x.field === field);
    return i ? issueMessage(i) : undefined;
  };
  const patch = (p: Partial<SavingsGoal>) => api.updateGoal(goal.id, p);
  const num = (key: NumericGoalKey, unit: string) => {
    const f = t.fields[key];
    return (
      <NumberField
        label={f.label}
        hint={f.hint}
        unit={unit}
        value={goal[key]}
        onChange={(v) => patch({ [key]: v })}
        error={err(key)}
      />
    );
  };
  const changes = goal.interestChanges ?? [];
  const setChanges = (list: NonNullable<SavingsGoal['interestChanges']>) =>
    patch({ interestChanges: list });
  const nameId = `goal-name-${goal.id}`;
  const taxId = `goal-tax-${goal.id}`;

  return (
    <form className="card" aria-label={t.formLabel} onSubmit={(e) => e.preventDefault()}>
      <FieldGroup title={t.groups.goal} defaultOpen>
        <div className="field">
          <label htmlFor={nameId}>{t.fields.name.label}</label>
          <input id={nameId} value={goal.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        {num('targetAmount', t.units.eur)}
        {num('currentAmount', t.units.eur)}
        {num('monthlyContribution', t.units.eur)}
        <MonthField
          label={t.fields.targetMonth.label}
          hint={t.fields.targetMonth.hint}
          value={goal.targetMonth ?? ''}
          onChange={(v) => patch({ targetMonth: v === '' ? undefined : v })}
          error={err('targetMonth')}
          clearable
        />
        <MonthField
          label={t.fields.startMonth.label}
          hint={t.fields.startMonth.hint}
          value={goal.startMonth}
          onChange={(v) => patch({ startMonth: v })}
          error={err('startMonth')}
        />
        {num('priority', '')}
      </FieldGroup>

      <FieldGroup title={t.groups.interest} defaultOpen>
        {num('accountInterestPercent', t.units.percent)}
        <p>
          <strong>{t.interestChanges.title}</strong>
        </p>
        {changes.length === 0 && <p className="hint">{t.interestChanges.empty}</p>}
        {changes.map((c, i) => (
          <div className="lump" key={i}>
            <MonthField
              label={`${t.interestChanges.from} ${i + 1}`}
              value={c.fromMonth}
              onChange={(v) =>
                setChanges(changes.map((x, j) => (j === i ? { ...x, fromMonth: v } : x)))
              }
              error={err(`interestChanges.${i}.fromMonth`)}
            />
            <NumberField
              label={`${t.interestChanges.percent} ${i + 1}`}
              unit={t.units.percent}
              value={c.percent}
              onChange={(v) =>
                setChanges(changes.map((x, j) => (j === i ? { ...x, percent: v } : x)))
              }
              error={err(`interestChanges.${i}.percent`)}
            />
            <button
              type="button"
              className="btn"
              onClick={() => setChanges(changes.filter((_, j) => j !== i))}
            >
              {t.interestChanges.remove} {i + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() =>
            setChanges([...changes, { fromMonth: '', percent: goal.accountInterestPercent }])
          }
        >
          {t.interestChanges.add}
        </button>
      </FieldGroup>

      <FieldGroup title={t.groups.tax} defaultOpen>
        <div className="check">
          <input
            id={taxId}
            type="checkbox"
            checked={goal.taxEnabled}
            onChange={(e) => patch({ taxEnabled: e.target.checked })}
          />
          <label htmlFor={taxId}>{t.fields.taxEnabled.label}</label>
        </div>
        <p className="hint">{t.fields.taxEnabled.hint}</p>
        {goal.taxEnabled && <AllowanceUsage goal={goal} api={api} />}
      </FieldGroup>

      <button
        type="button"
        className="btn"
        onClick={() => {
          if (window.confirm(t.removeConfirm(goal.name))) {
            api.removeGoal(goal.id);
            onRemoved();
          }
        }}
      >
        {t.remove}
      </button>
    </form>
  );
}

function GoalResults({ goal, result }: { goal: SavingsGoal; result: GoalResult | undefined }) {
  const t = de.goals;
  if (!result || !result.ok) {
    return (
      <div className="card" role="alert">
        {t.errors}
      </div>
    );
  }
  return <ResultsView goal={goal} projection={result} />;
}

function ResultsView({ goal, projection }: { goal: SavingsGoal; projection: GoalProjection }) {
  const t = de.goals;
  const k = t.kpi;
  const req = projection.requiredMonthlyForTargetMonth;
  const notReached = projection.status === 'not_reached';

  let requiredValue = '–';
  let requiredNote: string | undefined = k.requiredNone;
  if (req) {
    requiredNote = undefined;
    if (req.status === 'ok') requiredValue = formatEur2(req.monthly);
    else if (req.status === 'already_reached') {
      requiredValue = formatEur2(0);
      requiredNote = k.requiredNotNeeded;
    } else requiredValue = k.requiredUnreachable;
  }

  let reachedValue = '–';
  if (projection.status === 'reached_at_start') reachedValue = k.atStart;
  else if (projection.reachedMonth) reachedValue = formatMonth(projection.reachedMonth);

  let duration = '–';
  if (projection.monthsToReach !== undefined) {
    const m = projection.monthsToReach;
    duration = m >= 24 ? k.yearsMonths(Math.floor(m / 12), m % 12) : k.months(m);
  }

  const missed = projection.warnings.includes('target_month_missed') && goal.targetMonth;
  const requiredText =
    req?.status === 'ok'
      ? t.missedRequired(formatEur2(req.monthly))
      : req?.status === 'unreachable'
        ? t.missedUnreachable
        : '';

  return (
    <>
      {notReached && (
        <div className="notice" role="alert">
          {t.notReached(HORIZON_YEARS)}
        </div>
      )}
      {missed && !notReached && goal.targetMonth && (
        <div className="notice" role="status">
          {t.missed(
            formatMonth(goal.targetMonth),
            formatEur2(goal.monthlyContribution),
            projection.reachedMonth ? formatMonth(projection.reachedMonth) : undefined,
            requiredText,
          )}
        </div>
      )}
      <div className="kpis">
        <KpiTile label={k.reached} value={reachedValue} />
        <KpiTile label={k.duration} value={duration} />
        <KpiTile label={k.required} value={requiredValue} note={requiredNote} />
        <KpiTile label={k.interestNet} value={formatEur2(projection.interestNet)} />
        <KpiTile label={k.tax} value={formatEur2(projection.tax)} />
      </div>
      <GoalChart projection={projection} targetAmount={goal.targetAmount} />
      <ScrollTable label={t.table.title} className="card">
        <table>
          <caption>{t.table.title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.table.year}</th>
              <th scope="col">{t.table.contributed}</th>
              <th scope="col">{t.table.balance}</th>
              <th scope="col">{t.table.interest}</th>
              <th scope="col">{t.table.tax}</th>
            </tr>
          </thead>
          <tbody>
            {projection.yearly.map((y) => (
              <tr key={y.calendarYear}>
                <th scope="row">{y.calendarYear}</th>
                <td>{formatEur(y.contributed)}</td>
                <td>{formatEur(y.balance)}</td>
                <td>{formatEur2(y.interestGross)}</td>
                <td>{formatEur2(y.tax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollTable>
    </>
  );
}
