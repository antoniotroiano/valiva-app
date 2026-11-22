import { type GlobalAssumptions, type LegalParameters, type StatutoryDetails } from '@valiva/core';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { ScrollTable } from '../../components/cards/ScrollTable';

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
  const row = (label: string, nominal: number, sign: '' | '− ' = '', sum = false) => (
    <tr className={sum ? 'sum' : undefined} key={label}>
      <th scope="row" className="left">
        {label}
      </th>
      <td>
        {sign}
        {formatEur(nominal)}
      </td>
      <td>
        {sign}
        {real(nominal)}
      </td>
    </tr>
  );
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.cols.step}</th>
            <th scope="col">{t.cols.nominal}</th>
            <th scope="col">{t.cols.real}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="left">
              {t.statement}
            </th>
            <td>{formatEur(d.path[0]?.nominal ?? 0)}</td>
            <td>{formatEur(d.path[0]?.real ?? 0)}</td>
          </tr>
          {row(
            t.adjusted(formatNumber(a.pensionAdjustmentPercent), d.yearsToRetirement),
            d.nominalBeforeFactor,
          )}
          {row(factorLabel, n.gross)}
          {row(t.tax(formatNumber(n.taxableSharePercent)), n.tax, '− ')}
          {h.mode === 'statutoryCompulsory' ? (
            <>
              {row(
                t.health(
                  formatNumber(
                    (legal.social.healthGeneralRatePercent + h.additionalRatePercent) / 2,
                  ),
                ),
                n.health,
                '− ',
              )}
              {row(
                t.care(
                  formatNumber(
                    h.childless
                      ? legal.social.careRateChildlessPercent
                      : legal.social.careRatePercent,
                  ),
                  h.childless,
                ),
                n.care,
                '− ',
              )}
            </>
          ) : (
            row(t.healthOther(formatNumber(h.otherRatePercent ?? 0)), n.health, '− ')
          )}
          {row(t.net, n.net, '', true)}
        </tbody>
      </table>
      <p className="hint">{t.note}</p>
    </ScrollTable>
  );
}

export function PathTable({ details }: { details: StatutoryDetails }) {
  const t = de.statutory.table;
  const path = details.path;
  const rows = path.filter((_, i) => i % 5 === 0 || i === path.length - 1);
  return (
    <ScrollTable label={t.title} className="card">
      <table>
        <caption>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col">{t.year}</th>
            <th scope="col">{t.age}</th>
            <th scope="col">{t.nominal}</th>
            <th scope="col">{t.real}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.year} className={i === rows.length - 1 ? 'sum' : undefined}>
              <th scope="row">{i === rows.length - 1 ? t.start(r.year) : r.year}</th>
              <td>{r.age}</td>
              <td>{formatEur(r.nominal)}</td>
              <td>{formatEur(r.real)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}
