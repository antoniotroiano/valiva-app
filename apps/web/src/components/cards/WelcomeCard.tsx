import { parseWorkspace } from '@valiva/core';
import { useState } from 'react';
import { WORKSPACE_FORMAT } from '../../app/appConfig';
import { createStore } from '../../app/createStore';
import { loadExample } from '../../lib/examples';
import { de } from '../../i18n/de';
import { markStarted } from '../../state/onboarding';
import { CURRENT_YEAR } from '../../state/useHousehold';
import { ConfirmDialog } from '../layout/ConfirmDialog';

const EXAMPLE_ID = 'single';

/** Shown on the first visit (`onboarding.ts`): what the app does, three steps, example data. */
export function WelcomeCard({ goToProfile }: { goToProfile: () => void }) {
  const t = de.overview.welcome;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadExampleData = async () => {
    if (busy) return;
    setBusy(true);
    setConfirming(false);
    const text = await loadExample(EXAMPLE_ID);
    const parsed =
      text === undefined ? undefined : parseWorkspace(text, CURRENT_YEAR, WORKSPACE_FORMAT);
    if (!parsed || parsed.status === 'error' || !createStore().save(parsed.workspace).ok) {
      setBusy(false);
      setError(true);
      return;
    }
    markStarted();
    window.location.reload();
  };

  return (
    <section className="card welcome" aria-labelledby="ov-welcome">
      <h2 id="ov-welcome">{t.title}</h2>
      <p>{t.intro}</p>
      <h3 className="sr-only">{t.stepsTitle}</h3>
      <ol className="steps big">
        {(
          [
            [t.stepProfile, t.stepProfileHint],
            [t.stepStatutory, t.stepStatutoryHint],
            [t.stepWish, t.stepWishHint],
          ] as const
        ).map(([label, hint], i) => (
          <li key={label}>
            <b aria-hidden="true">{i + 1}</b>
            <span>
              {label} <span className="muted">{hint}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="actions">
        <button type="button" className="btn primary" onClick={goToProfile}>
          {t.start}
        </button>
        <button type="button" className="btn" onClick={() => setConfirming(true)}>
          {t.example}
        </button>
      </div>
      <p className="hint">{t.localHint}</p>
      {error && (
        <p className="error" role="alert">
          {t.loadFailed}
        </p>
      )}
      <ConfirmDialog
        open={confirming}
        title={t.confirmTitle}
        onClose={() => setConfirming(false)}
        actions={
          <>
            <button
              type="button"
              className="btn"
              data-autofocus
              onClick={() => setConfirming(false)}
            >
              {t.cancel}
            </button>
            <button type="button" className="btn primary" onClick={() => void loadExampleData()}>
              {t.confirmButton}
            </button>
          </>
        }
      >
        <p>{t.confirmText}</p>
      </ConfirmDialog>
    </section>
  );
}
