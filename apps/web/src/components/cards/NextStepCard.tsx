import { de } from '../../i18n/de';
import type { Guidance, StepId } from '../../lib/inputStatus';
import { Icon } from '../layout/Icon';

/**
 * "Next step" card (AP-13): one step, its progress, a button for it and "Ausblenden". Replaces the welcome card
 * after the first input. With only one step left it shrinks to a single line. `who` names the scope (person or
 * household) when the household has several persons; `named` puts the person into the step text (household view).
 */
export function NextStepCard({
  guidance,
  who,
  named,
  onGo,
  onHide,
}: {
  guidance: Guidance;
  who?: string;
  named: boolean;
  onGo: (id: StepId, personId?: string) => void;
  onHide: () => void;
}) {
  const t = de.guidance;
  const { next, steps, perPerson } = guidance;
  if (!next) return null;
  const s = t.steps[next.id];
  const name = named ? next.personName : undefined;
  const title = name && 'titlePerson' in s ? s.titlePerson(name) : s.title;
  const button = name && 'buttonPerson' in s ? s.buttonPerson(name) : s.button;
  const open = steps.filter((x) => !x.done).length;
  const done = steps.length - open;
  const compact = open === 1;
  const actions = (
    <div className="actions">
      <button type="button" className="btn primary" onClick={() => onGo(next.id, next.personId)}>
        {button}
      </button>
      <button type="button" className="btn quiet" onClick={onHide}>
        {t.card.hide}
      </button>
    </div>
  );
  const eyebrow = (
    <p className="eyebrow">
      {t.card.eyebrow}
      {who ? ` · ${who}` : ''}
      {!compact && <span className="muted"> · {t.card.progress(done, steps.length)}</span>}
    </p>
  );

  if (compact) {
    return (
      <section className="card next compact" aria-labelledby="next-step-title">
        <div className="nx-row">
          <div>
            {eyebrow}
            <p className="nx-t">
              <b id="next-step-title">{title}</b> <span className="muted">{s.text}</span>
            </p>
          </div>
          {actions}
        </div>
      </section>
    );
  }
  return (
    <section className="card next" aria-labelledby="next-step-title">
      {eyebrow}
      <h2 id="next-step-title">{title}</h2>
      <p>{s.text}</p>
      {actions}
      <ol className="steps" aria-label={t.card.progressLabel}>
        {steps.map((x) => (
          <li
            key={x.id}
            className={x.done ? 'done' : x.id === next.id ? 'now' : undefined}
            aria-current={x.id === next.id ? 'step' : undefined}
          >
            <Icon name={x.done ? 'ok' : 'open'} size="sm" />
            {t.steps[x.id].label}
            <span className="sr-only">
              , {x.done ? t.card.stepDone : x.id === next.id ? t.card.stepNext : t.card.stepOpen}
            </span>
          </li>
        ))}
      </ol>
      {who === t.card.householdScope && perPerson.length > 1 && (
        <p className="persons">{t.card.persons(perPerson)}</p>
      )}
    </section>
  );
}
