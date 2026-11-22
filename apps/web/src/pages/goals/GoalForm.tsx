import { type GoalResult, type SavingsGoal, type ValidationIssue } from '@valiva/core';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { MonthField } from '../../components/forms/MonthField';
import { NumberField } from '../../components/forms/NumberField';
import { de, issueMessage } from '../../i18n/de';
import { type GoalsApi } from '../../state/useGoals';
import { AllowanceUsage } from './GoalCards';

export type NumericGoalKey =
  'targetAmount' | 'currentAmount' | 'monthlyContribution' | 'priority' | 'accountInterestPercent';

export function GoalForm({
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
