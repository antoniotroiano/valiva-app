import type { DepotProjection, ScenarioName } from '@pathwise/core';
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

type Scenarios = Record<ScenarioName, DepotProjection>;

export function DepotChart({ scenarios }: { scenarios: Scenarios }) {
  const c = de.depot.chart;
  const neutral = scenarios.neutral;
  const data = neutral.series
    .filter((p) => p.month % 12 === 0)
    .map((p) => ({
      year: p.month / 12,
      contributions: p.contributed,
      pessimistic: scenarios.pessimistic.series[p.month]?.value ?? 0,
      neutral: p.value,
      optimistic: scenarios.optimistic.series[p.month]?.value ?? 0,
    }));
  const last = (r: DepotProjection) => formatEur(r.details.modelCapital);
  const summary = c.summary(
    formatEur(neutral.details.ownTotal + neutral.details.allowanceTotal),
    last(neutral),
    last(scenarios.pessimistic),
    last(scenarios.optimistic),
    neutral.details.payoutYear,
  );
  // Scenarios differ by line style as well as color.
  const lines = [
    {
      key: 'contributions',
      name: c.contributions,
      color: 'var(--c-contrib)',
      dash: undefined,
      width: 2,
    },
    { key: 'pessimistic', name: c.pessimistic, color: 'var(--c-pess)', dash: '8 4', width: 2 },
    { key: 'neutral', name: c.neutral, color: 'var(--c-neutral)', dash: undefined, width: 3 },
    { key: 'optimistic', name: c.optimistic, color: 'var(--c-opt)', dash: '2 4', width: 2.5 },
  ];
  return (
    <div className="card">
      <h2>{c.title}</h2>
      <div role="img" aria-label={`${c.alt} ${summary}`} style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="year" stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} />
            <YAxis
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)' }}
              tickFormatter={(v: number) => formatEur(v)}
              width={90}
            />
            <Tooltip
              formatter={(v) => formatEur(Number(v))}
              labelFormatter={(l) => `${c.year} ${l}`}
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
    </div>
  );
}
