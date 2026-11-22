import type { StatutoryDetails } from '@valiva/core';
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
import { formatEur, formatEur2 } from '../format';
import { de } from '../i18n/de';

export function PensionChart({ details }: { details: StatutoryDetails }) {
  const c = de.statutory.chart;
  const data = details.path.map((p) => ({ year: p.year, nominal: p.nominal, real: p.real }));
  const last = details.path[details.path.length - 1];
  const summary = c.summary(
    details.retirementYear,
    formatEur(last?.nominal ?? 0),
    formatEur(last?.real ?? 0),
  );
  return (
    <div className="card">
      <h2>{c.title}</h2>
      <div role="img" aria-label={`${c.alt} ${summary}`} style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)' }}
              minTickGap={24}
            />
            <YAxis
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)' }}
              tickFormatter={(v: number) => formatEur(v)}
              width={90}
            />
            <Tooltip
              formatter={(v) => formatEur2(Number(v))}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            />
            <Legend />
            <Line
              dataKey="nominal"
              name={c.nominal}
              type="monotone"
              stroke="var(--c-neutral)"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="real"
              name={c.real}
              type="monotone"
              stroke="var(--c-contrib)"
              strokeWidth={3}
              strokeDasharray="8 4"
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
