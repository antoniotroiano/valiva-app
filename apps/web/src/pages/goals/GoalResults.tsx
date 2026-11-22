import { type GoalProjection, type GoalResult, type SavingsGoal } from '@valiva/core';
import { GoalChart } from '../../components/charts/GoalChart';
import { KpiTile } from '../../components/cards/KpiTile';
import { formatEur, formatEur2, formatMonth } from '../../lib/format';
import { de } from '../../i18n/de';
import { HORIZON_YEARS } from '../../state/useGoals';
import { ScrollTable } from '../../components/cards/ScrollTable';

export function GoalResults({
  goal,
  result,
}: {
  goal: SavingsGoal;
  result: GoalResult | undefined;
}) {
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

export function ResultsView({
  goal,
  projection,
}: {
  goal: SavingsGoal;
  projection: GoalProjection;
}) {
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
