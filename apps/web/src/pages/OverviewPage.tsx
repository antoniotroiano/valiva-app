import type { EtfPlanResult, GoalResult, SavingsGoal } from '@pathwise/core';
import { PageShell } from '../components/PageShell';
import { WelcomeCard } from '../components/WelcomeCard';
import { KpiTile } from '../components/KpiTile';
import { RetirementOverview } from '../components/RetirementOverview';
import type { BudgetInfo } from '../components/RetirementOverview';
import type { OverviewApi } from '../useOverview';
import { formatEur, formatMonth } from '../format';
import { de } from '../i18n/de';

export function OverviewPage({
  result,
  taxEnabled,
  goals,
  goalResults,
  goToGoals,
  retirement,
  goTo,
  budget,
  wish,
  setWish,
  newStart,
}: {
  result: EtfPlanResult;
  taxEnabled: boolean;
  goals: SavingsGoal[];
  goalResults: Map<string, GoalResult>;
  goToGoals: () => void;
  retirement: OverviewApi;
  budget: BudgetInfo;
  goTo: (
    page: 'profile' | 'etf' | 'statutory' | 'depot' | 'occupational' | 'assumptions' | 'data',
  ) => void;
  wish: number | undefined;
  setWish: (value: number | undefined) => void;
  /** First visit, nothing entered yet: shows the welcome card and marks the values as examples. */
  newStart: boolean;
}) {
  const t = de.overview;
  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      {newStart && (
        <>
          <WelcomeCard goToProfile={() => goTo('profile')} goToBlocks={() => goTo('etf')} />
          <p className="notice info">
            <span className="badge">{t.sampleBadge}</span> {t.sampleNote}
          </p>
        </>
      )}
      <RetirementOverview
        api={retirement}
        goTo={goTo}
        budget={budget}
        wish={wish}
        setWish={setWish}
      />
      {result.ok ? (
        <KpiTile
          label={taxEnabled ? t.headline : t.headlineNoTax}
          value={formatEur(result.scenarios.neutral.finalValueReal)}
          note={t.range(
            formatEur(result.scenarios.pessimistic.finalValueReal),
            formatEur(result.scenarios.optimistic.finalValueReal),
          )}
        />
      ) : (
        <div className="card">{t.invalid}</div>
      )}
      <section className="card" aria-labelledby="ov-goals">
        <h2 id="ov-goals">{t.goalsTitle}</h2>
        {goals.length === 0 ? (
          <p>{t.goalsEmpty}</p>
        ) : (
          <ul className="goal-list">
            {goals.map((g) => (
              <OverviewGoal key={g.id} goal={g} result={goalResults.get(g.id)} />
            ))}
          </ul>
        )}
        <button type="button" className="btn" onClick={goToGoals}>
          {goals.length === 0 ? t.goalsCreate : t.goalsOpen}
        </button>
      </section>
    </PageShell>
  );
}

function OverviewGoal({ goal, result }: { goal: SavingsGoal; result: GoalResult | undefined }) {
  const t = de.overview;
  const percent =
    goal.targetAmount > 0 && Number.isFinite(goal.currentAmount)
      ? Math.min(100, Math.floor((goal.currentAmount / goal.targetAmount) * 100))
      : 0;
  const parts: string[] = [];
  if (!result || !result.ok) parts.push(t.goalInvalid);
  else {
    parts.push(
      result.reachedMonth ? t.goalExpected(formatMonth(result.reachedMonth)) : t.goalNotReached,
    );
    if (goal.targetMonth) {
      parts.push(
        result.warnings.includes('target_month_missed')
          ? t.goalMissed(formatMonth(goal.targetMonth))
          : t.goalDesired(formatMonth(goal.targetMonth)),
      );
    }
  }
  return (
    <li>
      <div className="row">
        <strong>{goal.name}</strong>
        <span>
          {t.goalProgress(formatEur(goal.currentAmount), formatEur(goal.targetAmount), percent)}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.goalProgressLabel(goal.name)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="hint">{parts.join(' · ')}</span>
    </li>
  );
}
