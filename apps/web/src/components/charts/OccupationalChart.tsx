import type { OccupationalProjection, ScenarioName } from '@valiva/core';
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
import { formatEur } from '../../lib/format';
import { de } from '../../i18n/de';
import { AXIS, TOOLTIP_STYLE } from './chartTheme';

type Scenarios = Record<ScenarioName, OccupationalProjection>;

/** `bare`: no own card and heading, for use inside a collapsible row that carries the title. */
export function OccupationalChart({
  scenarios,
  bare = false,
}: {
  scenarios: Scenarios;
  bare?: boolean;
}) {
  const c = de.occupational.chart;
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
  const last = (r: OccupationalProjection) => formatEur(r.capitalAtRetirement ?? 0);
  const summary = c.summary(
    formatEur(neutral.series.at(-1)?.contributed ?? 0),
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
    <div className={bare ? undefined : 'card'}>
      {!bare && <h2>{c.title}</h2>}
      <div role="img" aria-label={`${c.alt} ${summary}`} style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="year" {...AXIS} />
            <YAxis {...AXIS} tickFormatter={(v: number) => formatEur(v)} width={90} />
            <Tooltip
              formatter={(v) => formatEur(Number(v))}
              labelFormatter={(l) => `${c.year} ${l}`}
              contentStyle={TOOLTIP_STYLE}
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
