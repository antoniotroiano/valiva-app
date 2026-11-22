import { safeSetItem } from './storageStatus';

/**
 * Export reminder (review 14, B-10). Safari's tracking prevention deletes script-writable storage (including
 * `localStorage`) after seven days of Safari use without interaction on the site, see
 * https://webkit.org/tracking-prevention/ . Home-screen web apps are exempt. The app's only store is
 * `localStorage`, so it asks for an export when there is none or the last one is old.
 */
export const EXPORT_REMINDER_DAYS = 90;
export const SNOOZE_DAYS = 7;
export const SNOOZE_KEY = 'pathwise.exportReminderUntil';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ExportReminder = { kind: 'never' } | { kind: 'stale'; days: number };

/**
 * What to remind about, or `undefined`. `lastExport` is the ISO timestamp of the last export, `snoozedUntil`
 * the epoch milliseconds until which the reminder is hidden. An unreadable date counts as "never".
 */
export function exportReminder(
  lastExport: string | undefined,
  now: number,
  snoozedUntil: number | undefined,
): ExportReminder | undefined {
  if (snoozedUntil !== undefined && now < snoozedUntil) return undefined;
  const last = lastExport === undefined ? Number.NaN : new Date(lastExport).getTime();
  if (Number.isNaN(last)) return { kind: 'never' };
  const days = Math.floor((now - last) / DAY_MS);
  return days >= EXPORT_REMINDER_DAYS ? { kind: 'stale', days } : undefined;
}

export function readSnoozedUntil(): number | undefined {
  try {
    const n = Number(localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

/** Hides the reminder for `SNOOZE_DAYS`; returns the end of the snooze. */
export function snoozeExportReminder(now: number): number {
  const until = now + SNOOZE_DAYS * DAY_MS;
  safeSetItem(SNOOZE_KEY, String(until));
  return until;
}
