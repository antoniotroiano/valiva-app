import { SCENARIO_NAMES, loadBlock, solveEtfRequiredContribution } from '@valiva/core';
import type { ChurchTaxChoice, EtfPlanInput, EtfTargetState } from '@valiva/core';
import { useEffect, useMemo, useState } from 'react';
import { formatEur, formatEur2 } from '../../lib/format';
import { de, issueMessage } from '../../i18n/de';
import { personKey, readBlock } from '../../state/personStorage';
import { CURRENT_YEAR } from '../../state/useProfile';
import { currentTaxAssumptions } from '../../lib/taxConfig';
import { FieldGroup } from './FieldGroup';
import { NumberField } from './NumberField';
import { ScrollTable } from '../cards/ScrollTable';
import { safeSetItem } from '../../state/storageStatus';

type Stored = EtfTargetState;

function load(personId: string): Stored {
  return loadBlock('etfTarget', readBlock(personId, 'etfTarget'), CURRENT_YEAR);
}

/** Reverse calculator: which starting monthly rate reaches a target value per scenario. */
export function EtfTargetSection({
  personId,
  input,
  churchTax,
}: {
  personId: string;
  input: EtfPlanInput;
  churchTax?: ChurchTaxChoice | undefined;
}) {
  const t = de.etf.target;
  const [stored, setStored] = useState<Stored>(() => load(personId));
  const radioName = 'etf-target-basis';

  useEffect(() => {
    if (!Number.isFinite(stored.targetValue)) return;
    safeSetItem(personKey(personId, 'etfTarget'), JSON.stringify(stored));
  }, [stored]);

  const result = useMemo(
    () =>
      solveEtfRequiredContribution(
        input,
        currentTaxAssumptions(churchTax).assumptions,
        stored.targetValue,
        stored.basis,
      ),
    [input, stored, churchTax],
  );
  const valueIssue = !result.ok ? result.issues.find((i) => i.field === 'targetValue') : undefined;

  return (
    <FieldGroup title={t.title}>
      <div className="grid target-grid">
        <div>
          <NumberField
            label={t.valueLabel}
            hint={t.valueHint}
            unit="€"
            value={stored.targetValue}
            onChange={(v) => setStored((s) => ({ ...s, targetValue: v }))}
            error={valueIssue ? issueMessage(valueIssue) : undefined}
          />
          <fieldset className="radios">
            <legend>{t.basisLegend}</legend>
            {(['real', 'nominal'] as const).map((b) => (
              <label key={b}>
                <input
                  type="radio"
                  name={radioName}
                  checked={stored.basis === b}
                  onChange={() => setStored((s) => ({ ...s, basis: b }))}
                />{' '}
                {t[b]}
              </label>
            ))}
          </fieldset>
        </div>
        <div aria-live="polite">
          {result.ok ? (
            <>
              <ScrollTable label={t.tableTitle(formatEur(result.currentMonthly))}>
                <table>
                  <caption>{t.tableTitle(formatEur(result.currentMonthly))}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.cols.scenario}</th>
                      <th scope="col">{t.cols.required}</th>
                      <th scope="col">{t.cols.difference}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCENARIO_NAMES.map((sc) => {
                      const r = result.scenarios[sc];
                      const rate = input.returnScenarios[sc];
                      return (
                        <tr key={sc}>
                          <th scope="row" className="left">
                            {de.etf.chart[sc]} ({rate.toLocaleString('de-DE')} %)
                          </th>
                          {r.status === 'ok' ? (
                            <>
                              <td>{formatEur2(r.monthly)}</td>
                              <td>
                                {r.differenceToCurrent > 0 ? '+' : ''}
                                {formatEur2(r.differenceToCurrent)}
                              </td>
                            </>
                          ) : (
                            <td colSpan={2}>
                              {r.status === 'already_reached' ? t.reached : t.unreachable}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollTable>
              <p className="hint">
                {stored.basis === 'real' ? t.note(formatEur(result.targetNominal)) : t.noteNominal}
              </p>
            </>
          ) : (
            !valueIssue && <p className="error">{de.etf.errors}</p>
          )}
        </div>
      </div>
    </FieldGroup>
  );
}
