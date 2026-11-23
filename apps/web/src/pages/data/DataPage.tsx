import { WORKSPACE_LIMITS, parseWorkspace, serializeWorkspace } from '@valiva/core';
import { suspendPersistence } from '../../state/storageStatus';
import type { Workspace, WorkspaceWarning } from '@valiva/core';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { WORKSPACE_FILE_SUFFIX, WORKSPACE_FORMAT } from '../../app/appConfig';
import { ConfirmDialog } from '../../components/layout/ConfirmDialog';
import { PageShell } from '../../components/layout/PageShell';
import { exampleIds, loadExample } from '../../lib/examples';
import { de } from '../../i18n/de';
import { createStore } from '../../app/createStore';
import { markStarted } from '../../state/onboarding';
import { CURRENT_YEAR } from '../../state/useHousehold';
import type { HouseholdApi } from '../../state/useHousehold';
import { downloadText, workspaceFileName } from '../../state/workspaceFiles';
import { ScrollTable } from '../../components/cards/ScrollTable';

type Pending = { name: string; workspace: Workspace; warnings: WorkspaceWarning[] };
type Message = { kind: 'ok' | 'error'; text: string };
type Dialog = 'replace' | 'reset' | undefined;

const formatWhen = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
};

export function DataPage({ household }: { household: HouseholdApi }) {
  const t = de.data;
  const store = useMemo(createStore, []);
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState(() => store.lastExport());
  const [pending, setPending] = useState<Pending>();
  const [message, setMessage] = useState<Message>();
  const [dialog, setDialog] = useState<Dialog>();
  const [busy, setBusy] = useState(false);

  const personName = (ws: Workspace, id: string) => {
    const index = ws.household.persons.findIndex((p) => p.id === id);
    const name = ws.household.persons[index]?.name.trim();
    return name || de.household.newPersonName(index + 1);
  };

  const currentExport = useCallback(
    () => serializeWorkspace(store.load(household.state)),
    [store, household.state],
  );

  /** Downloads the file and reports it; a failed save of the export date is shown, not swallowed. */
  const exportNow = () => {
    const now = new Date();
    const fileName = workspaceFileName(now);
    downloadText(fileName, currentExport());
    if (store.markExported(now.toISOString()).ok) {
      setLastExport(now.toISOString());
      setMessage({ kind: 'ok', text: t.exportDone(fileName) });
    } else {
      setMessage({ kind: 'error', text: t.exportDoneNotRemembered(fileName) });
    }
  };

  const onExport = exportNow;

  const preview = (name: string, text: string) => {
    const result = parseWorkspace(text, CURRENT_YEAR, WORKSPACE_FORMAT);
    if (result.status === 'error') {
      const known = result.issues.map((i) => t.problems[i.code] ?? t.problems.invalid_field);
      setPending(undefined);
      setMessage({
        kind: 'error',
        text: `${t.errorPrefix}${[...new Set(known)].join(' ')}${t.errorSuffix}`,
      });
      return;
    }
    setMessage(undefined);
    setPending({ name, workspace: result.workspace, warnings: result.warnings });
  };

  const onFile = async (file: File | undefined) => {
    setPending(undefined);
    setMessage(undefined);
    if (!file) return;
    if (file.size > WORKSPACE_LIMITS.maxChars) {
      setMessage({ kind: 'error', text: t.fileTooLarge });
      return;
    }
    try {
      preview(file.name, await file.text());
    } catch {
      setMessage({ kind: 'error', text: t.readFailed });
    }
  };

  const onExample = async (id: string) => {
    const text = await loadExample(id);
    if (text === undefined) {
      setMessage({ kind: 'error', text: t.readFailed });
      return;
    }
    preview(`${id}${WORKSPACE_FILE_SUFFIX}`, text);
  };

  const reloadSoon = () => setTimeout(() => window.location.reload(), 600);

  const confirmReplace = () => {
    if (!pending || busy) return;
    setBusy(true);
    setDialog(undefined);
    downloadText(workspaceFileName(new Date(), 'backup'), currentExport());
    if (!store.save(pending.workspace).ok) {
      setBusy(false);
      setMessage({ kind: 'error', text: t.importFailedStorage });
      return;
    }
    markStarted();
    suspendPersistence();
    setPending(undefined);
    setMessage({ kind: 'ok', text: t.imported });
    reloadSoon();
  };

  const confirmReset = () => {
    if (busy) return;
    setDialog(undefined);
    if (!store.clear().ok) {
      setMessage({ kind: 'error', text: t.resetFailed });
      return;
    }
    suspendPersistence();
    setBusy(true);
    setMessage({ kind: 'ok', text: t.resetDone });
    reloadSoon();
  };

  const closeDialog = () => setDialog(undefined);
  const examples = exampleIds();

  return (
    <PageShell title={t.title} subtitle={t.subtitle} badge={false}>
      <p>
        <span className="badge">{t.localBadge}</span>
      </p>

      {!lastExport && (
        <div className="notice" role="note">
          {t.neverExported}
        </div>
      )}

      <section className="card">
        <h2>{t.exportTitle}</h2>
        <p>{t.exportText(workspaceFileName(new Date()))}</p>
        <p className="hint">{t.exportWarning}</p>
        <button type="button" className="btn" onClick={onExport}>
          {t.exportButton}
        </button>
        {lastExport && <p className="hint">{t.lastExported(formatWhen(lastExport))}</p>}
      </section>

      <section className="card">
        <h2>{t.importTitle}</h2>
        <p>{t.importText}</p>
        <div className="field">
          <label htmlFor={fileId}>{t.fileLabel}</label>
          <input
            id={fileId}
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        {pending && (
          <div className="preview">
            <h3>{t.previewTitle(pending.name)}</h3>
            <ScrollTable label={t.previewTitle(pending.name)}>
              <table>
                <tbody>
                  <tr>
                    <th scope="row">{t.previewExportedAt}</th>
                    <td>
                      {t.previewExportedValue(
                        formatWhen(pending.workspace.exportedAt),
                        pending.workspace.appVersion,
                      )}
                      {pending.workspace.meta?.synthetic ? ` · ${t.previewSynthetic}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{t.previewPersons}</th>
                    <td>
                      {t.previewPersonsValue(
                        pending.workspace.household.persons.length,
                        pending.workspace.household.persons
                          .map((p) => personName(pending.workspace, p.id))
                          .join(', '),
                      )}
                    </td>
                  </tr>
                  {pending.workspace.household.persons.map((p) => {
                    const blocks = pending.workspace.byPerson[p.id] ?? {};
                    const labels = Object.keys(blocks)
                      .filter((b) => b !== 'etfPayout' && b !== 'etfTarget' && b !== 'overview')
                      .map((b) => {
                        const goals = b === 'goals' ? blocks.goals?.goals.length : undefined;
                        return `${t.blocks[b] ?? b}${goals !== undefined ? ` (${goals})` : ''}`;
                      });
                    return (
                      <tr key={p.id}>
                        <th scope="row">{personName(pending.workspace, p.id)}</th>
                        <td>{labels.length > 0 ? labels.join(', ') : t.previewNothing}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollTable>
            {pending.warnings.length > 0 && (
              <div className="notice">
                <b>{t.warningsTitle}</b>
                <ul>
                  {pending.warnings.map((w, i) => (
                    <li key={i}>
                      {w.code === 'block_replaced'
                        ? t.warnBlockReplaced(
                            personName(pending.workspace, w.personId),
                            t.blocks[w.block] ?? w.block,
                          )
                        : w.code === 'unknown_block'
                          ? t.warnUnknownBlock(personName(pending.workspace, w.personId))
                          : t.warnUnknownPerson}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={() => setDialog('replace')}>
                {t.replaceButton}
              </button>
              <button type="button" className="btn" onClick={() => setPending(undefined)}>
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </section>

      {examples.length > 0 && (
        <section className="card">
          <h2>{t.examplesTitle}</h2>
          <p>{t.examplesText}</p>
          <div className="actions">
            {examples.map((id) => (
              <button key={id} type="button" className="btn" onClick={() => void onExample(id)}>
                {t.examples[id] ?? id}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2>{t.resetTitle}</h2>
        <p>{t.resetText}</p>
        <button type="button" className="btn" onClick={() => setDialog('reset')}>
          {t.resetButton}
        </button>
      </section>

      <div role="status">
        {message && (
          <p className={message.kind === 'error' ? 'notice' : 'notice info'}>{message.text}</p>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'replace'}
        title={t.confirmReplaceTitle}
        onClose={closeDialog}
        actions={
          <>
            <button type="button" className="btn" onClick={confirmReplace}>
              {t.confirmReplaceButton}
            </button>
            <button type="button" className="btn" data-autofocus onClick={closeDialog}>
              {t.cancel}
            </button>
          </>
        }
      >
        <p>{t.confirmReplaceText(pending?.workspace.household.persons.length ?? 0)}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'reset'}
        title={t.confirmResetTitle}
        onClose={closeDialog}
        actions={
          <>
            <button type="button" className="btn" onClick={exportNow}>
              {t.confirmResetExport}
            </button>
            <button type="button" className="btn" onClick={confirmReset}>
              {t.confirmResetButton}
            </button>
            <button type="button" className="btn" data-autofocus onClick={closeDialog}>
              {t.cancel}
            </button>
          </>
        }
      >
        <p>{t.confirmResetText}</p>
      </ConfirmDialog>
    </PageShell>
  );
}
