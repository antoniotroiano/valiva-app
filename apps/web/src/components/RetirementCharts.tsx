import type { OverviewProductKind, OverviewResult, ScenarioName } from '@valiva/core';
import { SCENARIO_NAMES } from '@valiva/core';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatEur } from '../format';
import { de } from '../i18n/de';

const KINDS: OverviewProductKind[] = ['statutory', 'etf', 'retirementDepot', 'occupational'];
const COLOR: Record<OverviewProductKind, string> = {
  statutory: 'var(--c-contrib)',
  etf: 'var(--c-neutral)',
  retirementDepot: 'var(--c-opt)',
  occupational: 'var(--c-pess)',
};

export function ScenarioSwitch({
  value,
  onChange,
}: {
  value: ScenarioName;
  onChange: (s: ScenarioName) => void;
}) {
  const t = de.overview.retirement;
  return (
    <div role="radiogroup" aria-label={t.charts.scenario} className="seg">
      {SCENARIO_NAMES.map((s) => (
        <label key={s} className={value === s ? 'seg-on' : undefined}>
          <input
            type="radio"
            name="overview-scenario"
            checked={value === s}
            onChange={() => onChange(s)}
          />{' '}
          {t.scenarios[s]}
        </label>
      ))}
    </div>
  );
}

/** Share of the desired income that the net pension covers, as a bar with a text equivalent. */
export function GapBar({ net, desired }: { net: number; desired: number }) {
  const t = de.overview.retirement.charts;
  const percent = desired > 0 ? Math.min(100, Math.round((net / desired) * 100)) : 100;
  const gap = Math.max(0, desired - net);
  const covered = gap <= 0;
  return (
    <div>
      <div
        className={covered ? 'gapbar covered' : 'gapbar'}
        role="img"
        aria-label={t.gapBarAlt(formatEur(net), formatEur(desired), percent)}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <p>
        <b>{t.covered(percent)}</b>{' '}
        {covered ? (
          <span className="ok-text">
            {net > desired ? t.surplus(formatEur(net - desired)) : t.noGap}
          </span>
        ) : (
          <span className="gap-text">{t.gapText(formatEur(gap))}</span>
        )}
      </p>
    </div>
  );
}

export function CompositionChart({
  result,
  scenario,
}: {
  result: OverviewResult;
  scenario: ScenarioName;
}) {
  const t = de.overview.retirement;
  const amounts = result.scenarios[scenario].snapshot.byProduct;
  const row: Record<string, number | string> = { name: 'net' };
  for (const k of KINDS) row[k] = amounts.find((a) => a.productId === k)?.netReal ?? 0;
  const alt = t.charts.compositionAlt(
    KINDS.filter((k) => (row[k] as number) > 0).map(
      (k) => `${t.productNames[k]} ${formatEur(row[k] as number)}`,
    ),
  );
  const present = KINDS.filter((k) => (row[k] as number) > 0);
  if (present.length === 1) {
    const only = present[0]!;
    return <p>{t.charts.singleSource(t.productNames[only], formatEur(row[only] as number))}</p>;
  }
  return (
    <div>
      <div role="img" aria-label={alt} style={{ width: '100%', height: 90 }}>
        <ResponsiveContainer>
          <BarChart
            data={[row]}
            layout="vertical"
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(v, n) => [formatEur(Number(v)), t.productNames[n as OverviewProductKind]]}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            />
            {KINDS.map((k) => (
              <Bar key={k} dataKey={k} stackId="a" fill={COLOR[k]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend kinds={KINDS.filter((k) => (row[k] as number) > 0)} amounts={row} />
    </div>
  );
}

function Legend({
  kinds,
  amounts,
}: {
  kinds: OverviewProductKind[];
  amounts?: Record<string, number | string>;
}) {
  const t = de.overview.retirement;
  return (
    <ul className="legend">
      {kinds.map((k) => (
        <li key={k}>
          <span className="swatch" style={{ background: COLOR[k] }} aria-hidden="true" />
          {t.productNames[k]}
          {amounts ? ` ${formatEur(amounts[k] as number)}` : ''}
        </li>
      ))}
    </ul>
  );
}

export function PathChart({
  result,
  scenario,
}: {
  result: OverviewResult;
  scenario: ScenarioName;
}) {
  const t = de.overview.retirement;
  const desired = result.desiredMonthlyIncomeToday;
  const path = result.scenarios[scenario].path;
  const used = KINDS.filter((k) => path.some((p) => (p.byProduct[k] ?? 0) > 0));
  const data = path.map((p) => ({
    age: p.age,
    ...Object.fromEntries(used.map((k) => [k, p.byProduct[k] ?? 0])),
  }));
  const end = result.firstPayoutEndAge;
  return (
    <div>
      <div
        role="img"
        aria-label={t.charts.pathAlt(t.scenarios[scenario])}
        style={{ width: '100%', height: 300 }}
      >
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 28, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="age" stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} />
            <YAxis
              stroke="var(--muted)"
              tick={{ fill: 'var(--muted)' }}
              tickFormatter={(v: number) => formatEur(v)}
              width={90}
              domain={[0, (max: number) => Math.max(max, desired ?? 0) * 1.05]}
            />
            <Tooltip
              formatter={(v, n) => [formatEur(Number(v)), t.productNames[n as OverviewProductKind]]}
              labelFormatter={(l) => `${t.age} ${l}`}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            />
            {used.map((k) => (
              <Area
                key={k}
                dataKey={k}
                stackId="a"
                type="stepAfter"
                stroke={COLOR[k]}
                fill={COLOR[k]}
                fillOpacity={0.85}
                isAnimationActive={false}
              />
            ))}
            {desired !== undefined && (
              <ReferenceLine
                y={desired}
                stroke="var(--danger)"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            {end !== undefined && (
              <ReferenceLine
                x={end}
                stroke="var(--text)"
                strokeDasharray="2 3"
                label={{
                  value: t.charts.endMarker(end),
                  position: 'top',
                  fill: 'var(--text)',
                  fontSize: 12,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ul className="legend">
        {used.map((k) => (
          <li key={k}>
            <span className="swatch" style={{ background: COLOR[k] }} aria-hidden="true" />
            {t.productNames[k]}
          </li>
        ))}
        {desired !== undefined && (
          <li>
            <span className="swatch dashed" aria-hidden="true" />
            {t.desired}
          </li>
        )}
      </ul>
    </div>
  );
}
