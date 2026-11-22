import type { GoalProjection } from '@valiva/core';
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
import { formatEur, formatEur2, formatMonth } from '../../lib/format';
import { de } from '../../i18n/de';
import { AXIS, TOOLTIP_STYLE } from './chartTheme';

export function GoalChart({
  projection,
  targetAmount,
}: {
  projection: GoalProjection;
  targetAmount: number;
}) {
  const c = de.goals.chart;
  const { series } = projection;
  const step = Math.max(1, Math.ceil(series.length / 120));
  const data = series
    .filter((p, i) => i % step === 0 || i === series.length - 1)
    .map((p) => ({
      label: formatMonth(p.calendarMonth),
      balance: p.balance,
      target: targetAmount,
    }));
  const first = series[0];
  const last = series[series.length - 1];
  const summary = c.summary(
    formatEur(first?.balance ?? 0),
    formatEur(last?.balance ?? 0),
    formatEur(targetAmount),
    projection.reachedMonth ? formatMonth(projection.reachedMonth) : undefined,
  );

  return (
    <div className="card">
      <h2>{c.title}</h2>
      <div role="img" aria-label={`${c.alt} ${summary}`} style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="label" {...AXIS} minTickGap={32} />
            <YAxis {...AXIS} tickFormatter={(v: number) => formatEur(v)} width={90} />
            <Tooltip formatter={(v) => formatEur2(Number(v))} contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Line
              dataKey="target"
              name={c.target}
              type="linear"
              stroke="var(--c-contrib)"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="balance"
              name={c.balance}
              type="monotone"
              stroke="var(--c-neutral)"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="hint">{summary}</p>
    </div>
  );
}
