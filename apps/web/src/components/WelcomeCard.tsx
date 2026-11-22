import { parseWorkspace } from '@pathwise/core';
import { useState } from 'react';
import { WORKSPACE_FORMAT } from '../appConfig';
import { createStore } from '../createStore';
import { loadExample } from '../examples';
import { de } from '../i18n/de';
import { markStarted } from '../onboarding';
import { CURRENT_YEAR } from '../useHousehold';
import { ConfirmDialog } from './ConfirmDialog';

const EXAMPLE_ID = 'single';

/** Shown on the first visit (`onboarding.ts`): what the app does, three steps, example data. */
export function WelcomeCard({
  goToProfile,
  goToBlocks,
}: {
  goToProfile: () => void;
  goToBlocks: () => void;
}) {
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
      <ul>
        {t.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <h3>{t.stepsTitle}</h3>
      <ol>
        <li>
          <button type="button" className="link" onClick={goToProfile}>
            {t.stepProfile}
          </button>
        </li>
        <li>
          <button type="button" className="link" onClick={goToBlocks}>
            {t.stepBlocks}
          </button>
        </li>
        <li>{t.stepGap}</li>
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
            <button type="button" className="btn" autoFocus onClick={() => setConfirming(false)}>
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
