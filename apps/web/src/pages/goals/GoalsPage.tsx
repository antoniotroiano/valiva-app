import { useState } from 'react';
import { PageShell } from '../../components/layout/PageShell';
import { de } from '../../i18n/de';
import { type GoalsApi } from '../../state/useGoals';
import { GoalListItem } from './GoalList';
import { AllowanceCard, BudgetCard } from './GoalCards';
import { GoalForm } from './GoalForm';
import { GoalResults } from './GoalResults';

type Props = {
  api: GoalsApi;
  etfMonthly: number;
  goToAssumptions: () => void;
};

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
