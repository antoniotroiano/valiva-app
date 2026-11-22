import type { ReactNode } from 'react';

export type EmptyAction = { label: string; onClick: () => void };

/**
 * Empty state: what is missing, the next step as one primary button and, optionally, one quiet
 * secondary action. `steps` shows the remaining steps with their progress. All texts come from i18n.
 */
export function EmptyState({
  title,
  children,
  steps,
  primary,
  secondary,
}: {
  title: string;
  children?: ReactNode;
  steps?: { label: string; done: boolean }[];
  primary: EmptyAction;
  secondary?: EmptyAction;
}) {
  return (
    <section className="card empty-state">
      <h2>{title}</h2>
      {children && <p className="empty-text">{children}</p>}
      {steps && (
        <ol className="empty-steps">
          {steps.map((s) => (
            <li key={s.label} data-done={s.done || undefined}>
              {s.label}
            </li>
          ))}
        </ol>
      )}
      <div className="actions">
        <button type="button" className="btn primary" onClick={primary.onClick}>
          {primary.label}
        </button>
        {secondary && (
          <button type="button" className="btn quiet" onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
      </div>
    </section>
  );
}
