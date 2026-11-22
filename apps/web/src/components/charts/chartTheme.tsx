import type { OverviewProductKind } from '@valiva/core';
import { formatEur } from '../../lib/format';

/** Shared look of all charts: every colour is a token from styles/tokens.css (docs/design.md). */
export const AXIS = {
  stroke: 'var(--field-border)',
  tick: { fill: 'var(--muted)', fontSize: 13 },
} as const;

export const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--field-border)',
  borderRadius: 8,
  fontSize: 14,
} as const;

/** One fixed colour per building block (same everywhere: sidebar dot, chips, charts). */
export const BLOCK_COLOR: Record<OverviewProductKind, string> = {
  statutory: 'var(--b-stat)',
  etf: 'var(--b-etf)',
  retirementDepot: 'var(--b-dep)',
  occupational: 'var(--b-bav)',
};

/** Segments are separated by a 2 px gap in card colour (colours alone cannot be told apart). */
export const SEGMENT_GAP = { stroke: 'var(--surface)', strokeWidth: 2 } as const;

/** In-bar labels only where they fit; narrower segments rely on legend and table. */
const MIN_LABEL_WIDTH = 64;

type LabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
};

/**
 * `amount` is the segment's own value: in stacked bars Recharts hands the label the running total.
 */
export function segmentLabel(contrast: 'block' | 'accent' | 'surface', amount: number) {
  return function SegmentLabel(props: LabelProps) {
    const [x, y, width, height] = [props.x, props.y, props.width, props.height].map(Number);
    if (!(width! >= MIN_LABEL_WIDTH) || !amount) return null;
    return (
      <text
        x={x! + width! / 2}
        y={y! + height! / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        fill={
          contrast === 'block'
            ? 'var(--on-block)'
            : contrast === 'accent'
              ? 'var(--on-accent)'
              : 'var(--text)'
        }
        stroke={contrast === 'surface' ? 'var(--surface)' : undefined}
        strokeWidth={contrast === 'surface' ? 4 : undefined}
        paintOrder="stroke"
      >
        {formatEur(amount)}
      </text>
    );
  };
}

/**
 * Person variants in one base colour: person 1 filled, 2 diagonal hatch, 3 dots, 4 cross-hatch.
 * Together with the name in legend and tooltip, colour is never the only carrier.
 */
const BASE = 'var(--accent)';
const VARIANTS = 4;

export function personFill(prefix: string, index: number): string {
  const v = index % VARIANTS;
  return v === 0 ? BASE : `url(#${prefix}-${v})`;
}

export function personStroke(): string {
  return BASE;
}

/** Pattern definitions for `personFill`; render once inside the chart's svg (`<defs>`). */
export function PersonPatterns({ prefix }: { prefix: string }) {
  return (
    <defs>
      <pattern
        id={`${prefix}-1`}
        width="7"
        height="7"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="7" height="7" fill="var(--surface)" />
        <rect width="3" height="7" fill={BASE} />
      </pattern>
      <pattern id={`${prefix}-2`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="var(--surface)" />
        <circle cx="4" cy="4" r="2" fill={BASE} />
      </pattern>
      <pattern
        id={`${prefix}-3`}
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill="var(--surface)" />
        <rect width="2.5" height="8" fill={BASE} />
        <rect width="8" height="2.5" fill={BASE} />
      </pattern>
    </defs>
  );
}
