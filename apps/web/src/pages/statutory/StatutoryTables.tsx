import { type GlobalAssumptions, type LegalParameters, type StatutoryDetails } from '@valiva/core';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { StepsTable as StepsTableView, type ResultRow } from '../../components/cards/ResultTable';

export function StepsTable({
  details: d,
  assumptions: a,
  legal,
}: {
  details: StatutoryDetails;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.statutory.steps;
  const real = (n: number) => formatEur(n / d.inflationFactor);
  const n = d.nominal;
  const pct = (v: number) => formatNumber(Math.round(v * 100) / 100);
  const factorLabel = d.usedAmountAtRetirementAge
    ? t.factorStated(d.retirementAge)
    : d.adjustmentPercent < 0
      ? t.factorEarly(d.retirementAge, pct(-d.adjustmentPercent))
      : d.adjustmentPercent > 0
        ? t.factorLate(d.retirementAge, pct(d.adjustmentPercent))
        : t.factorRegular(d.retirementAge);
  const h = a.health;
  const row = (label: string, nominal: number, sign: '' | '− ' = '', sum = false): ResultRow => ({
    label,
    values: [`${sign}${formatEur(nominal)}`, `${sign}${real(nominal)}`],
    ...(sum ? { sum: true } : {}),
  });
  const rows: ResultRow[] = [
    {
      label: t.statement,
      values: [formatEur(d.path[0]?.nominal ?? 0), formatEur(d.path[0]?.real ?? 0)],
    },
    row(
      t.adjusted(formatNumber(a.pensionAdjustmentPercent), d.yearsToRetirement),
      d.nominalBeforeFactor,
    ),
    row(factorLabel, n.gross),
    row(t.tax(formatNumber(n.taxableSharePercent)), n.tax, '− '),
    ...(h.mode === 'statutoryCompulsory'
      ? [
          row(
            t.health(
              formatNumber((legal.social.healthGeneralRatePercent + h.additionalRatePercent) / 2),
            ),
            n.health,
            '− ',
          ),
          row(
            t.care(
              formatNumber(
                h.childless ? legal.social.careRateChildlessPercent : legal.social.careRatePercent,
              ),
              h.childless,
            ),
            n.care,
            '− ',
          ),
        ]
      : [row(t.healthOther(formatNumber(h.otherRatePercent ?? 0)), n.health, '− ')]),
    row(t.net, n.net, '', true),
  ];
  return (
    <StepsTableView
      title={t.title}
      columns={[t.cols.step, t.cols.nominal, t.cols.real]}
      rows={rows}
      note={t.note}
    />
  );
}

export function PathTable({ details }: { details: StatutoryDetails }) {
  const t = de.statutory.table;
  const path = details.path;
  const picked = path.filter((_, i) => i % 5 === 0 || i === path.length - 1);
  const rows: ResultRow[] = picked.map((r, i) => ({
    label: i === picked.length - 1 ? t.start(r.year) : String(r.year),
    values: [String(r.age), formatEur(r.nominal), formatEur(r.real)],
    ...(i === picked.length - 1 ? { sum: true } : {}),
  }));
  return (
    <StepsTableView title={t.title} columns={[t.year, t.age, t.nominal, t.real]} rows={rows} />
  );
}
