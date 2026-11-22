import type { HouseholdResult, ScenarioName } from '@valiva/core';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatEur } from '../../lib/format';
import { de } from '../../i18n/de';
import {
  AXIS,
  PersonPatterns,
  TOOLTIP_STYLE,
  personFill,
  segmentLabel,
  personStroke,
} from './chartTheme';

function nameOf(result: HouseholdResult, personId: string): string {
  return result.persons.find((p) => p.personId === personId)?.name ?? personId;
}

function Legend({
  result,
  withWish,
  withSurvivor = false,
}: {
  result: HouseholdResult;
  withWish: boolean;
  withSurvivor?: boolean;
}) {
  return (
    <ul className="legend">
      {result.persons.map((p, i) => (
        <li key={p.personId}>
          <span className={`swatch person-v${i % 4}`} aria-hidden="true" />
          {p.name}
        </li>
      ))}
      {withSurvivor && result.survivor && (
        <li>
          <span className="swatch hatched" aria-hidden="true" />
          {de.householdView.survivorLegend(nameOf(result, result.survivor.survivorId))}
        </li>
      )}
      {withWish && (
        <li>
          <span className="swatch dashed" aria-hidden="true" />
          {de.overview.retirement.desired}
        </li>
      )}
    </ul>
  );
}

export function PersonCompositionChart({
  result,
  scenario,
}: {
  result: HouseholdResult;
  scenario: ScenarioName;
}) {
  const t = de.householdView;
  const byPerson = result.scenarios[scenario].snapshot.byPerson;
  const row: Record<string, number | string> = { name: 'net' };
  for (const p of result.persons) row[p.personId] = byPerson[p.personId] ?? 0;
  const alt = t.compositionAlt(
    result.persons.map((p) => `${p.name} ${formatEur(byPerson[p.personId] ?? 0)}`),
  );
  return (
    <div>
      <div role="img" aria-label={alt} style={{ width: '100%', height: 90 }}>
        <ResponsiveContainer>
          <BarChart
            data={[row]}
            layout="vertical"
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <PersonPatterns prefix="pc" />
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(v, n) => [formatEur(Number(v)), nameOf(result, String(n))]}
              contentStyle={TOOLTIP_STYLE}
            />
            {result.persons.map((p, i) => (
              <Bar
                key={p.personId}
                dataKey={p.personId}
                stackId="a"
                fill={personFill('pc', i)}
                stroke={personStroke()}
                strokeWidth={1.5}
                label={segmentLabel(i % 4 === 0 ? 'accent' : 'surface', row[p.personId] as number)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend result={result} withWish={false} />
    </div>
  );
}

export function HouseholdPathChart({
  result,
  scenario,
}: {
  result: HouseholdResult;
  scenario: ScenarioName;
}) {
  const t = de.householdView;
  const desired = result.desiredMonthlyIncomeToday;
  const survivorId = result.survivor?.survivorId;
  const data = result.scenarios[scenario].path.map((p) => {
    const w = survivorId ? (p.survivorPension?.[survivorId] ?? 0) : 0;
    return {
      year: p.year,
      ...Object.fromEntries(
        result.persons.map((x) => [
          x.personId,
          (p.byPerson[x.personId] ?? 0) - (x.personId === survivorId ? w : 0),
        ]),
      ),
      survivor: w,
      desired: p.desired,
    };
  });
  const maxDesired = Math.max(desired ?? 0, ...data.map((d) => d.desired ?? 0));
  return (
    <div>
      <div
        role="img"
        aria-label={t.pathAlt(de.overview.retirement.scenarios[scenario])}
        style={{ width: '100%', height: 300 }}
      >
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
            <PersonPatterns prefix="pp" />
            <defs>
              <pattern id="survivor-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M0 6 L6 0" stroke="var(--c-pess)" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="year" {...AXIS} />
            <YAxis
              {...AXIS}
              tickFormatter={(v: number) => formatEur(v)}
              width={90}
              domain={[0, (max: number) => Math.max(max, maxDesired) * 1.05]}
            />
            <Tooltip
              formatter={(v, n) => [
                formatEur(Number(v)),
                n === 'survivor'
                  ? t.survivorTitle
                  : n === 'desired'
                    ? de.overview.retirement.desired
                    : nameOf(result, String(n)),
              ]}
              labelFormatter={(l) => `${t.year} ${l}`}
              contentStyle={TOOLTIP_STYLE}
            />
            {result.persons.map((p, i) => (
              <Area
                key={p.personId}
                dataKey={p.personId}
                stackId="a"
                type="stepAfter"
                stroke={personStroke()}
                strokeWidth={1.5}
                fill={personFill('pp', i)}
                fillOpacity={1}
                isAnimationActive={false}
              />
            ))}
            {survivorId && (
              <Area
                dataKey="survivor"
                stackId="a"
                type="stepAfter"
                stroke="var(--c-pess)"
                fill="url(#survivor-hatch)"
                isAnimationActive={false}
              />
            )}
            {desired !== undefined && (
              <Line
                dataKey="desired"
                type="stepAfter"
                stroke="var(--wish)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend result={result} withWish={desired !== undefined} withSurvivor />
    </div>
  );
}
