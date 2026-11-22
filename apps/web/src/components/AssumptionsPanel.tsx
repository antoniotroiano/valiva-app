import { resolveTaxAssumptions } from '@pathwise/core';
import type { LegalValue } from '@pathwise/core';
import { taxConfig } from '../taxConfig';
import {
  currentLegal,
  depotConfig,
  incomeTaxConfig,
  pensionConfig,
  socialConfig,
} from '../legalConfig';
import { de } from '../i18n/de';
import { formatNumber } from '../format';
import { ScrollTable } from './ScrollTable';

const taxKeys = [
  'capitalGainsTaxRate',
  'partialExemptionRate',
  'taxFreeAllowance',
  'capitalGainsBaseRate',
  'solidaritySurchargeRate',
  'churchTaxRateLow',
  'churchTaxRateHigh',
] as const;

function formatValue(v: LegalValue): string {
  const units = de.assumptions.units as Record<string, string>;
  const unit = units[v.unit] ?? v.unit;
  // Years such as 2026 or 1964 are not grouped like amounts.
  const num = v.unit === 'year' ? String(v.value) : formatNumber(v.value);
  return unit ? `${num} ${unit}` : num;
}

function ConfigTable({
  title,
  keys,
  values,
  names,
}: {
  title: string;
  keys: readonly string[];
  values: Record<string, LegalValue>;
  names: Record<string, string>;
}) {
  const a = de.assumptions;
  const anyUnverified = keys.some((k) => values[k]?.status === 'unverified');
  return (
    <ScrollTable label={title} className="card">
      <table className="assumptions">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{a.cols.name}</th>
            <th scope="col" className="left">
              {a.cols.value}
            </th>
            <th scope="col" className="left">
              {a.cols.validFrom}
            </th>
            <th scope="col" className="left">
              {a.cols.source}
            </th>
            <th scope="col" className="left">
              {a.cols.status}
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const v = values[k];
            if (!v) return null;
            return (
              <tr key={k}>
                <th scope="row">{names[k] ?? k}</th>
                <td className="nowrap">{formatValue(v)}</td>
                <td className="nowrap">{v.validFrom}</td>
                <td className="left">{v.sourceDe}</td>
                <td className="left nowrap">
                  {v.status === 'unverified' ? `⚠ ${a.status.unverified}` : a.status.confirmed}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {anyUnverified && <p className="hint">{a.unverifiedNote}</p>}
    </ScrollTable>
  );
}

/** Base interest by year plus factor and assumed rate as one table; years sorted, assumed rate last. */
function advanceValues(): {
  keys: string[];
  values: Record<string, LegalValue>;
  names: Record<string, string>;
} {
  const config = taxConfig.advanceLumpSum;
  const values: Record<string, LegalValue> = {};
  const names: Record<string, string> = {
    baseEarningsFactor: de.assumptions.names.baseEarningsFactor ?? '',
    baseInterestAssumed: de.assumptions.names.baseInterestAssumed ?? '',
  };
  if (!config) return { keys: [], values, names };
  values.baseEarningsFactor = config.baseEarningsFactor;
  const keys = ['baseEarningsFactor'];
  for (const entry of [...config.baseInterest].sort((x, y) => x.year - y.year)) {
    const key = `baseInterest${entry.year}`;
    values[key] = entry;
    names[key] = de.assumptions.baseInterestName(entry.year);
    keys.push(key);
  }
  values.baseInterestAssumed = config.baseInterestAssumed;
  keys.push('baseInterestAssumed');
  return { keys, values, names };
}

export function AssumptionsPanel() {
  const a = de.assumptions;
  const advance = advanceValues();
  const today = new Date().toISOString().slice(0, 10);
  const taxResolved = resolveTaxAssumptions(taxConfig, today);
  const legalResolved = currentLegal();
  return (
    <>
      {!taxResolved.ok && <p className="error">{a.configError}</p>}
      <ConfigTable title={a.taxTitle} keys={taxKeys} values={taxConfig.values} names={a.names} />
      {advance.keys.length > 0 && (
        <ConfigTable
          title={a.baseInterestTitle}
          keys={advance.keys}
          values={advance.values}
          names={advance.names}
        />
      )}
      {!legalResolved.ok && <p className="error">{de.profile.configError}</p>}
      <ConfigTable
        title={a.pensionTitle}
        keys={Object.keys(pensionConfig.values)}
        values={pensionConfig.values}
        names={a.pensionNames}
      />
      <ConfigTable
        title={a.socialTitle}
        keys={Object.keys(socialConfig.values)}
        values={socialConfig.values}
        names={a.socialNames}
      />
      <ConfigTable
        title={a.depotTitle}
        keys={Object.keys(depotConfig.values)}
        values={depotConfig.values}
        names={a.depotNames}
      />
      <ConfigTable
        title={a.incomeTaxTitle}
        keys={Object.keys(incomeTaxConfig.values)}
        values={incomeTaxConfig.values}
        names={a.incomeTaxNames}
      />
    </>
  );
}
