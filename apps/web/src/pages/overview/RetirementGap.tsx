import {
  type GapSolveResult,
  type OverviewProductId,
  type OverviewResult,
  type ScenarioName,
  type ValidationIssue,
} from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import { formatEur } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { ScrollTable } from '../../components/cards/ScrollTable';

export type BudgetInfo = { budget?: number; otherSavingsMonthly: number };

/** Name of a product; an entry of "other income" shows its own name when `names` has it. */
export function productName(id: OverviewProductId, names?: Record<string, string>): string {
  const n = de.overview.retirement.productNames;
  return id.startsWith('otherIncome:') ? (names?.[id] ?? n.otherIncome) : n[id as keyof typeof n];
}

export function GapTile({
  gap,
  budget,
  etfEnabled,
  hasWish,
}: {
  gap: GapSolveResult;
  budget: BudgetInfo;
  etfEnabled: boolean;
  hasWish: boolean;
}) {
  const t = de.overview.retirement.closeGap;
  if (!hasWish) return null;
  return (
    <>
      {!gap.ok && <p>{gap.issues.map((i: ValidationIssue) => issueMessage(i)).join(' ')}</p>}
      {gap.ok && (
        <>
          <p>{t.intro(formatEur(gap.desiredMonthlyIncomeToday), formatEur(gap.currentMonthly))}</p>
          {!etfEnabled && <p className="hint">{t.etfOff}</p>}
          <ScrollTable label={t.caption}>
            <table>
              <caption>{t.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{de.overview.retirement.row}</th>
                  {SCENARIO_NAMES.map((s) => (
                    <th key={s} scope="col">
                      {de.overview.retirement.scenarios[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{t.row}</th>
                  {SCENARIO_NAMES.map((s) => {
                    const r = gap.scenarios[s];
                    return (
                      <td key={s} className="num">
                        {r.status === 'ok' ? <b>{formatEur(r.monthly)}</b> : t.status[r.status]}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th scope="row">{t.newRow}</th>
                  {SCENARIO_NAMES.map((s) => {
                    const r = gap.scenarios[s];
                    return (
                      <td key={s} className="num">
                        {r.status === 'unreachable' ? '–' : formatEur(r.newMonthly)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </ScrollTable>
          <BudgetHint gap={gap} budget={budget} />
        </>
      )}
    </>
  );
}

/** Short grey summary of the gap solver for the collapsed row (neutral scenario). */
export function gapMeta(gap: GapSolveResult | undefined): string | undefined {
  if (!gap?.ok) return undefined;
  const x = gap.scenarios.neutral;
  const t = de.overview.retirement;
  if (x.status === 'ok') return t.sections.closeGapMeta(formatEur(x.monthly));
  if (x.status === 'unreachable') return t.closeGap.status.unreachable;
  return t.sections.closeGapNone;
}

export function BudgetHint({
  gap,
  budget,
}: {
  gap: Extract<GapSolveResult, { ok: true }>;
  budget: BudgetInfo;
}) {
  const t = de.overview.retirement.closeGap;
  const neutral = gap.scenarios.neutral;
  if (budget.budget === undefined || neutral.status === 'unreachable') return null;
  const rest = budget.budget - budget.otherSavingsMonthly - neutral.newMonthly;
  return (
    <p className="hint">
      {rest >= 0 ? t.budgetRest(formatEur(rest)) : t.budgetOver(formatEur(-rest))}
    </p>
  );
}

export function Row({
  label,
  values,
  strong,
}: {
  label: string;
  values: (number | undefined)[];
  strong?: boolean;
}) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {values.map((v, i) => (
        <td key={i} className="num">
          {v === undefined ? '–' : strong ? <b>{formatEur(v)}</b> : formatEur(v)}
        </td>
      ))}
    </tr>
  );
}

export function PathTable({
  result,
  scenario,
  names,
}: {
  result: OverviewResult;
  scenario: ScenarioName;
  names?: Record<string, string>;
}) {
  const t = de.overview.retirement;
  const hasWish = result.desiredMonthlyIncomeToday !== undefined;
  const kinds = result.products.filter((p) => p.status !== 'disabled' && p.status !== 'invalid');
  return (
    <ScrollTable label={t.pathCaption(t.scenarios[scenario])}>
      <table>
        <caption>{t.pathCaption(t.scenarios[scenario])}</caption>
        <thead>
          <tr>
            <th scope="col">{t.age}</th>
            {kinds.map((k) => (
              <th key={k.productId} scope="col">
                {productName(k.productId, names)}
              </th>
            ))}
            <th scope="col">{t.net}</th>
            {hasWish && <th scope="col">{t.gap}</th>}
          </tr>
        </thead>
        <tbody>
          {result.scenarios[scenario].path.map((pt) => (
            <tr key={pt.age}>
              <th scope="row">{pt.age}</th>
              {kinds.map((k) => (
                <td key={k.productId} className="num">
                  {formatEur(pt.byProduct[k.productId] ?? 0)}
                </td>
              ))}
              <td className="num">{formatEur(pt.total)}</td>
              {hasWish && <td className="num">{pt.gap === undefined ? '–' : formatEur(pt.gap)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}
