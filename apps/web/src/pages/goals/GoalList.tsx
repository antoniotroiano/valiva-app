import { type SavingsGoal } from '@valiva/core';
import { formatEur, formatMonth } from '../../lib/format';
import { de } from '../../i18n/de';

export function percentOf(goal: SavingsGoal): number {
  if (!(goal.targetAmount > 0) || !Number.isFinite(goal.currentAmount)) return 0;
  return Math.min(100, Math.floor((goal.currentAmount / goal.targetAmount) * 100));
}

export function GoalListItem({
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
          aria-label={t.progressLabel(goal.name)}
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
