import {
  type GlobalAssumptions,
  type LegalParameters,
  type StatutoryProjection,
} from '@valiva/core';
import { KpiTile } from '../../components/cards/KpiTile';
import { PensionChart } from '../../components/charts/PensionChart';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { warningText } from '../../lib/warningText';
import { StepsTable, PathTable } from './StatutoryTables';

export function StatutoryResults({
  result,
  assumptions,
  legal,
}: {
  result: StatutoryProjection;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
}) {
  const t = de.statutory;
  const d = result.details;
  return (
    <>
      {result.warnings.map((w) => (
        <div className="notice" role="status" key={w}>
          {warningText(w)}
        </div>
      ))}
      {d.adjustmentPercent < 0 && (
        <div className="notice" role="status">
          {t.early(formatNumber(-d.adjustmentPercent), -d.monthsFromRegularAge)}
        </div>
      )}
      {d.adjustmentPercent > 0 && (
        <div className="notice info" role="status">
          {t.late(formatNumber(d.adjustmentPercent), d.monthsFromRegularAge)}
        </div>
      )}
      <div className="kpis">
        <KpiTile label={t.kpi.start} value={String(d.retirementYear)} />
        <KpiTile label={t.kpi.grossNominal} value={formatEur(result.monthlyPensionNominal)} />
        <KpiTile label={t.kpi.grossReal} value={formatEur(result.monthlyPensionReal)} />
        <KpiTile label={t.kpi.deductions} value={formatEur(result.taxAndContributions)} />
        <KpiTile label={t.kpi.netReal} value={formatEur(result.netMonthlyPensionReal)} />
      </div>
      <PensionChart details={d} />
      <StepsTable details={d} assumptions={assumptions} legal={legal} />
      <PathTable details={d} />
    </>
  );
}
