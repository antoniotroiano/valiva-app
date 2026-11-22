import { useState } from 'react';
import { de } from '../i18n/de';
import { createStore } from '../createStore';
import { exportReminder, readSnoozedUntil, snoozeExportReminder } from '../exportReminder';
import { dismissChangedElsewhere, useStorageStatus } from '../storageStatus';

/**
 * Notices that apply to every page (review 14, B-4, B-5, B-10), stacked above the page content. They reuse
 * the `.notice` style. `hideExportReminder`: the data page has its own text on this.
 */
export function AppNotices({
  goToData,
  hideExportReminder,
  isNewStart,
}: {
  goToData: () => void;
  hideExportReminder: boolean;
  isNewStart: boolean;
}) {
  const t = de.notices;
  const status = useStorageStatus();
  const [snoozedUntil, setSnoozedUntil] = useState(readSnoozedUntil);
  // Read again on every render: a new export on the data page must end the reminder at once.
  const reminder =
    hideExportReminder || isNewStart
      ? undefined
      : exportReminder(createStore().lastExport(), Date.now(), snoozedUntil);

  if (!status.writeFailed && !status.changedElsewhere && !reminder) return null;
  return (
    <div className="app-notices">
      {status.writeFailed && (
        <div className="notice" role="alert">
          <b>{t.storageFailed.text}</b>{' '}
          <button type="button" className="link" onClick={goToData}>
            {t.storageFailed.export}
          </button>
        </div>
      )}
      {status.changedElsewhere && (
        <div className="notice" role="alert">
          <b>{t.changedElsewhere.text}</b> {t.changedElsewhere.hint}{' '}
          <button type="button" className="link" onClick={() => window.location.reload()}>
            {t.changedElsewhere.reload}
          </button>{' '}
          <button type="button" className="link" onClick={dismissChangedElsewhere}>
            {t.changedElsewhere.ignore}
          </button>
        </div>
      )}
      {reminder && (
        <div className="notice info" role="note">
          <b>
            {reminder.kind === 'never'
              ? t.exportReminder.never
              : t.exportReminder.stale(reminder.days)}
          </b>{' '}
          <button type="button" className="link" onClick={goToData}>
            {t.exportReminder.export}
          </button>{' '}
          <button
            type="button"
            className="link"
            onClick={() => setSnoozedUntil(snoozeExportReminder(Date.now()))}
          >
            {t.exportReminder.later}
          </button>
        </div>
      )}
    </div>
  );
}
