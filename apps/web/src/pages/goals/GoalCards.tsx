import { type SavingsGoal } from '@valiva/core';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { formatEur, formatNumber } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { useNarrowScreen } from '../../state/useNarrowScreen';
import { type GoalsApi } from '../../state/useGoals';
import { ScrollTable } from '../../components/cards/ScrollTable';

export function AllowanceCard({ api }: { api: GoalsApi }) {
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

export function AllowanceUsage({ goal, api }: { goal: SavingsGoal; api: GoalsApi }) {
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

export function BudgetCard({ api, etfMonthly }: { api: GoalsApi; etfMonthly: number }) {
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
