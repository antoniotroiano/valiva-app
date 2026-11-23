import {
  type GlobalAssumptions,
  type LegalParameters,
  type OccupationalInput,
  type OccupationalProjection,
  type ScenarioName,
} from '@valiva/core';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import {
  ScenarioTable as ScenarioTableView,
  StepsTable as StepsTableView,
  type ResultRow,
} from '../../components/cards/ResultTable';
import { ScenarioResults } from './OccupationalResults';

export function EffortTable({
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
    <StepsTableView
      title={t.title(formatEur(e.gross), formatEur(e.net))}
      columns={[t.cols.item, t.cols.monthly]}
      rows={[
        { label: t.conversion, values: [formatEur(e.gross)] },
        {
          label: t.taxSaving(
            formatEur(Math.min(e.gross, legal.social.occupationalTaxFreeMonthly)),
            formatNumber(a.marginalTaxRateTodayPercent),
          ),
          values: [`− ${formatEur(e.taxSaving)}`],
        },
        {
          label: t.socialSaving(
            formatEur(Math.min(e.gross, legal.social.occupationalSocialInsuranceFreeMonthly)),
            formatNumber(a.employeeSocialInsuranceRatePercent),
          ),
          values: [`− ${formatEur(e.socialSaving)}`],
        },
        { label: t.net, sum: true, values: [formatEur(e.net)] },
      ]}
      note={t.note(formatEur(result.details.subsidyMonthly))}
    />
  );
}

export function ScenarioTable({
  results,
  assumptions: a,
}: {
  results: ScenarioResults;
  assumptions: GlobalAssumptions;
}) {
  const t = de.occupational.scenarioTable;
  const names: [ScenarioName, string][] = [
    ['pessimistic', t.pessimistic(formatNumber(a.returnScenarios.pessimistic))],
    ['neutral', t.neutral(formatNumber(a.returnScenarios.neutral))],
    ['optimistic', t.optimistic(formatNumber(a.returnScenarios.optimistic))],
  ];
  return (
    <ScenarioTableView
      title={t.title}
      columns={[
        t.scenario,
        t.capital(results.neutral.details.payoutYear),
        t.grossNominal,
        t.grossReal,
        t.netReal,
      ]}
      rows={names.map(([s, label]) => {
        const r = results[s];
        return {
          label,
          emphasis: s === 'neutral',
          values: [
            formatEur(r.capitalAtRetirement ?? 0),
            formatEur(r.monthlyPensionNominal),
            formatEur(r.monthlyPensionReal),
            formatEur(r.netMonthlyPensionReal),
          ],
        };
      })}
    />
  );
}

export function StepsTable({
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
  const row = (label: string, nominal: number, sign: '' | '− ' = '', sum = false): ResultRow => ({
    label,
    values: [`${sign}${formatEur(nominal)}`, `${sign}${real(nominal)}`],
    ...(sum ? { sum: true } : {}),
  });
  const compulsory = a.health.mode === 'statutoryCompulsory';
  const careRate = a.health.childless
    ? legal.social.careRateChildlessPercent
    : legal.social.careRatePercent;
  return (
    <StepsTableView
      title={t.title}
      columns={[t.cols.step, t.cols.nominal, t.cols.real]}
      rows={[
        row(
          t.plan(
            d.payoutYear,
            d.payoutYear - input.payoutStartAge + input.payoutEndAge,
            d.planMonths,
            formatNumber(a.payoutPhaseReturnPercent),
            formatEur(result.capitalAtRetirement ?? 0),
          ),
          n.gross,
        ),
        row(t.tax, n.tax, '− '),
        row(
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
        ),
        ...(compulsory
          ? [row(n.care > 0 ? t.careOver(formatNumber(careRate)) : t.careUnder, n.care, '− ')]
          : []),
        row(t.net, n.net, '', true),
      ]}
      note={t.note}
    />
  );
}
