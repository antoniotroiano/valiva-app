import type { ReactNode } from 'react';
import { de } from '../../i18n/de';
import { PageShell } from './PageShell';

export type ResultBarItem = { id: string; label: string; value: string };
export type SectionLink = { id: string; label: string };

const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start' });

/**
 * Template of a building-block page: page head (title, person, purpose), then one or more
 * `BlockSection`s. With several sections `sections` adds a jump list and `resultBar` a result strip
 * that sticks below the phone top bar, so the figures stay visible while typing.
 * Mockup: docs/mockups/etf-ap10.html.
 */
export function BlockPage({
  title,
  subtitle,
  above,
  sections,
  resultBar,
  children,
}: {
  title: string;
  subtitle: string;
  above?: ReactNode;
  sections?: readonly SectionLink[];
  resultBar?: readonly ResultBarItem[];
  children: ReactNode;
}) {
  return (
    <PageShell title={title} subtitle={subtitle} above={above}>
      {resultBar && resultBar.length > 0 && (
        <div className="result-bar" role="group" aria-label={de.blocks.resultBar}>
          {resultBar.map((r) => (
            <button key={r.id} type="button" onClick={() => jumpTo(r.id)}>
              <small>{r.label}</small>
              <b>{r.value}</b>
            </button>
          ))}
        </div>
      )}
      {sections && sections.length > 1 && (
        <nav className="section-jump" aria-label={de.blocks.sections}>
          {sections.map((s) => (
            <button key={s.id} type="button" className="btn" onClick={() => jumpTo(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
      )}
      <div className="block-page">{children}</div>
    </PageShell>
  );
}

/**
 * One block: inputs left, result right (sticky on desktop) with the calculation below it. On a phone:
 * result, inputs, calculation. Without `title` the section has no own heading (single-block pages).
 */
export function BlockSection({
  id,
  title,
  purpose,
  badge,
  inputs,
  result,
  calculation,
}: {
  id: string;
  title?: string;
  purpose?: string;
  badge?: string;
  inputs: ReactNode;
  result: ReactNode;
  calculation?: ReactNode;
}) {
  const t = de.blocks;
  return (
    <section className="bp" id={id} aria-labelledby={title ? `${id}-h` : undefined}>
      {title && (
        <header className="bp-head">
          <h2 id={`${id}-h`}>
            {title}
            {badge && <span className="badge">{badge}</span>}
          </h2>
          {purpose && <p className="sub">{purpose}</p>}
        </header>
      )}
      <div className="bp-grid">
        <div className="bp-in">
          <p className="col-h">{t.inputs}</p>
          {inputs}
        </div>
        <div className="bp-res">
          <div className="bp-result" aria-live="polite">
            <p className="col-h">{t.result}</p>
            {result}
          </div>
          {calculation && (
            <div className="bp-calc">
              <p className="col-h">{t.calculation}</p>
              {calculation}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
