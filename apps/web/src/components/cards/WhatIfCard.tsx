import { SCENARIO_NAMES } from '@valiva/core';
import type { OverviewApi } from '../../state/useOverview';
import { useId, useMemo, useState } from 'react';
import { formatEur, formatNumber } from '../../lib/format';
import { de } from '../../i18n/de';
import { Disclosure } from './Disclosure';
import { ScrollTable } from './ScrollTable';

const signed = (v: number, unit: string) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatNumber(Math.abs(v))}${unit}`;
const signedEur = (v: number) => {
  const r = Math.round(v);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${formatEur(Math.abs(r))}`;
};

/** Sensitivity sliders (review 13, F-9): the overview recomputed with shifted inputs, never saved. */
export function WhatIfCard({ api }: { api: OverviewApi }) {
  const t = de.overview.retirement.whatIf;
  const sc = de.overview.retirement.scenarios;
  const returnId = useId();
  const rateId = useId();
  const [returnDelta, setReturnDelta] = useState(0);
  const [rateDelta, setRateDelta] = useState(0);
  const etfOn = api.state.enabled.etf;
  const rate = etfOn ? rateDelta : 0;

  const changed = useMemo(
    () => (api.whatIf ? api.whatIf(returnDelta, rate) : undefined),
    [api.whatIf, returnDelta, rate],
  );
  const base = api.outcome;
  if (!base?.ok) return null;
  const same = returnDelta === 0 && rate === 0;

  return (
    <Disclosure title={t.title} meta={t.hint}>
      <div className="slider">
        <label htmlFor={returnId}>{t.returnLabel}</label>
        <output>{t.returnValue(signed(returnDelta, ''))}</output>
        <input
          id={returnId}
          type="range"
          min={-3}
          max={3}
          step={0.5}
          value={returnDelta}
          onChange={(e) => setReturnDelta(Number(e.target.value))}
        />
      </div>
      <div className="slider">
        <label htmlFor={rateId}>{t.rateLabel}</label>
        <output>{t.rateValue(signed(rateDelta, ''))}</output>
        <input
          id={rateId}
          type="range"
          min={-200}
          max={500}
          step={50}
          value={rateDelta}
          disabled={!etfOn}
          onChange={(e) => setRateDelta(Number(e.target.value))}
        />
      </div>
      {!etfOn && <p className="hint">{t.rateOff}</p>}
      {changed && !changed.ok ? (
        <p className="error" role="alert">
          {t.invalid}
        </p>
      ) : (
        changed?.ok && (
          <>
            <ScrollTable label={t.caption(base.result.targetRetirementAge)}>
              <table>
                <caption>{t.caption(base.result.targetRetirementAge)}</caption>
                <thead>
                  <tr>
                    <th scope="col">{de.overview.retirement.row}</th>
                    {SCENARIO_NAMES.map((s) => (
                      <th key={s} scope="col">
                        {sc[s]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">{t.current}</th>
                    {SCENARIO_NAMES.map((s) => (
                      <td key={s} className="num">
                        {formatEur(base.result.scenarios[s].snapshot.netMonthlyPensionReal)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">{t.changed}</th>
                    {SCENARIO_NAMES.map((s) => (
                      <td key={s} className="num">
                        {formatEur(changed.result.scenarios[s].snapshot.netMonthlyPensionReal)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">{t.difference}</th>
                    {SCENARIO_NAMES.map((s) => {
                      const d =
                        changed.result.scenarios[s].snapshot.netMonthlyPensionReal -
                        base.result.scenarios[s].snapshot.netMonthlyPensionReal;
                      return (
                        <td
                          key={s}
                          className={`num ${Math.round(d) < 0 ? 'gap-text' : Math.round(d) > 0 ? 'ok-text' : ''}`}
                        >
                          {signedEur(d)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </ScrollTable>
            {base.result.desiredMonthlyIncomeToday !== undefined && (
              <p>
                {t.gapLine(
                  gapText(base.result.scenarios.neutral.snapshot.gap, t.noGap),
                  gapText(changed.result.scenarios.neutral.snapshot.gap, t.noGap),
                )}
              </p>
            )}
          </>
        )
      )}
      <button
        type="button"
        className="btn"
        disabled={same}
        onClick={() => {
          setReturnDelta(0);
          setRateDelta(0);
        }}
      >
        {t.reset}
      </button>
      <p className="hint">{t.note}</p>
    </Disclosure>
  );
}

const gapText = (gap: number | undefined, none: string) =>
  gap === undefined || gap <= 0 ? none : formatEur(gap);
