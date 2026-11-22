import { DEFAULT_WITHDRAWAL_PERCENT } from '@valiva/core';
import type { WithdrawalFields as Stored, WithdrawalYear } from '@valiva/core';
import { useId } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatEur } from '../format';
import { de } from '../i18n/de';
import { NumberField } from './NumberField';
import { ScrollTable } from './ScrollTable';

type Props = {
  value: Stored;
  onChange: (patch: Stored) => void;
  error?: string;
};

/** Choice between the annuity and the percent withdrawal; the percentage is kept when switching back. */
export function WithdrawalFields({ value, onChange, error }: Props) {
  const t = de.withdrawal;
  const name = useId();
  const percent = value.withdrawalStrategy === 'percent';
  return (
    <>
      <fieldset className="radios">
        <legend>{t.legend}</legend>
        <label>
          <input
            type="radio"
            name={name}
            checked={!percent}
            onChange={() => onChange({ withdrawalStrategy: undefined })}
          />{' '}
          {t.annuity}
        </label>
        <label>
          <input
            type="radio"
            name={name}
            checked={percent}
            onChange={() =>
              onChange({
                withdrawalStrategy: 'percent',
                withdrawalPercent: value.withdrawalPercent ?? DEFAULT_WITHDRAWAL_PERCENT,
              })
            }
          />{' '}
          {t.percent}
        </label>
      </fieldset>
      {percent ? (
        <NumberField
          label={t.percentLabel}
          hint={t.percentHint}
          unit="%"
          value={value.withdrawalPercent ?? DEFAULT_WITHDRAWAL_PERCENT}
          onChange={(v) => onChange({ withdrawalPercent: v })}
          error={error}
        />
      ) : (
        <p className="hint">{t.annuityHint}</p>
      )}
    </>
  );
}

/** Whole years and months of an age such as 83.9166 (months rounded up to the month). */
export function ageText(age: number): string {
  const total = Math.ceil(age * 12 - 1e-9);
  return de.withdrawal.depletedAt(Math.floor(total / 12), total % 12);
}

type Row = { age: number; pessimistic: number; neutral: number; optimistic: number };

/** Remaining capital per payout year in the three scenarios, with a text alternative and a table. */
export function WithdrawalChart({
  start,
  years,
}: {
  start: number;
  years: Record<'pessimistic' | 'neutral' | 'optimistic', WithdrawalYear[] | undefined>;
}) {
  const t = de.withdrawal.chart;
  const c = de.depot.chart;
  const neutral = years.neutral;
  if (!neutral || neutral.length === 0) return null;
  const data: Row[] = neutral.map((y, i) => ({
    age: y.age,
    pessimistic: years.pessimistic?.[i]?.remaining ?? 0,
    neutral: y.remaining,
    optimistic: years.optimistic?.[i]?.remaining ?? 0,
  }));
  const summary = t.summary(formatEur(start), formatEur(neutral.at(-1)?.remaining ?? 0));
  const lines = [
    { key: 'pessimistic', name: c.pessimistic, color: 'var(--c-pess)', dash: '8 4', width: 2 },
    { key: 'neutral', name: c.neutral, color: 'var(--c-neutral)', dash: undefined, width: 3 },
    { key: 'optimistic', name: c.optimistic, color: 'var(--c-opt)', dash: '2 4', width: 2.5 },
  ];
  return (
    <div className="card">
      <h2>{t.title}</h2>
      <div role="img" aria-label={`${t.alt} ${summary}`} style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="age" stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} />
            <YAxis
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)' }}
              tickFormatter={(v: number) => formatEur(v)}
              width={90}
            />
            <Tooltip
              formatter={(v) => formatEur(Number(v))}
              labelFormatter={(l) => `${t.age} ${l}`}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            />
            <Legend />
            {lines.map((l) => (
              <Line
                key={l.key}
                dataKey={l.key}
                name={l.name}
                type="monotone"
                stroke={l.color}
                strokeWidth={l.width}
                strokeDasharray={l.dash}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="hint">{summary}</p>
      <details className="group">
        <summary>{t.details}</summary>
        <ScrollTable label={t.tableCaption} className="group-body">
          <table>
            <caption>{t.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.colAge}</th>
                <th scope="col">{t.colPayment}</th>
                <th scope="col">{t.colRemaining}</th>
              </tr>
            </thead>
            <tbody>
              {neutral.map((y) => (
                <tr key={y.age}>
                  <th scope="row" className="left">
                    {y.age}
                  </th>
                  <td>{formatEur(y.monthlyPayment)}</td>
                  <td>{formatEur(y.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      </details>
    </div>
  );
}
