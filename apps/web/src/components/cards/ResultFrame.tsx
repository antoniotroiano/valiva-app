import type { ReactNode } from 'react';

export type ResultKpi = { label: string; value: string; note?: string };

/**
 * The result of a building block: one hero figure with a short range line, the key figures below,
 * optional footnote. Notices and further content go in `children` (above the figures).
 */
export function ResultFrame({
  eyebrow,
  value,
  unit,
  range,
  kpis,
  footnote,
  children,
}: {
  eyebrow: string;
  value: string;
  unit?: string;
  range?: string;
  kpis?: readonly ResultKpi[];
  footnote?: string;
  children?: ReactNode;
}) {
  return (
    <article className="card kpi-hero hero result-frame">
      <p className="eyebrow">{eyebrow}</p>
      <div className="hero-num">
        <b className="kpi-value">{value}</b>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {range && <p className="range">{range}</p>}
      {children}
      {kpis && kpis.length > 0 && (
        <dl className="result-kpis">
          {kpis.map((k) => (
            <div key={k.label}>
              <dt>{k.label}</dt>
              <dd>{k.value}</dd>
              {k.note && <dd className="note">{k.note}</dd>}
            </div>
          ))}
        </dl>
      )}
      {footnote && <p className="foot-note">{footnote}</p>}
    </article>
  );
}
