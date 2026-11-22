import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXPORT_REMINDER_DAYS,
  SNOOZE_DAYS,
  exportReminder,
  snoozeExportReminder,
} from '../src/exportReminder';
import { todayLocal } from '../src/format';
import {
  getStorageStatus,
  isPersistenceSuspended,
  suspendPersistence,
  isSharedDataKey,
  resetStorageStatus,
  safeRemoveItem,
  safeSetItem,
} from '../src/storageStatus';

function stubStorage(failing: boolean) {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failing) throw new DOMException('full', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k: string) => {
      if (failing) throw new DOMException('denied', 'SecurityError');
      data.delete(k);
    },
  };
  vi.stubGlobal('localStorage', storage);
  return { data, setFailing: (f: boolean) => (failing = f) };
}

beforeEach(() => resetStorageStatus());
afterEach(() => vi.unstubAllGlobals());

describe('safeSetItem (B-4)', () => {
  it('writes and reports success', () => {
    const { data } = stubStorage(false);
    expect(safeSetItem('k', 'v')).toBe(true);
    expect(data.get('k')).toBe('v');
    expect(getStorageStatus().writeFailed).toBe(false);
  });

  it('does not throw when the storage refuses, and flags the failure', () => {
    stubStorage(true);
    expect(() => safeSetItem('k', 'v')).not.toThrow();
    expect(safeSetItem('k', 'v')).toBe(false);
    expect(getStorageStatus().writeFailed).toBe(true);
  });

  it('clears the flag after the next successful write', () => {
    const s = stubStorage(true);
    safeSetItem('k', 'v');
    s.setFailing(false);
    safeSetItem('k', 'v');
    expect(getStorageStatus().writeFailed).toBe(false);
  });

  it('flags a failing removal too', () => {
    stubStorage(true);
    expect(safeRemoveItem('k')).toBe(false);
    expect(getStorageStatus().writeFailed).toBe(true);
  });
});

describe('isSharedDataKey (B-5)', () => {
  it('counts the household, person blocks and a full clear, not theme or hints', () => {
    expect(isSharedDataKey('pathwise.household.v2')).toBe(true);
    expect(isSharedDataKey('pathwise.p.p1.depot.v1')).toBe(true);
    expect(isSharedDataKey(null)).toBe(true);
    expect(isSharedDataKey('pathwise.theme')).toBe(false);
    expect(isSharedDataKey('pathwise.exportReminderUntil')).toBe(false);
  });
});

describe('exportReminder (B-10)', () => {
  const now = Date.parse('2026-11-22T12:00:00Z');
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  it('reminds when there was never an export or the date is unreadable', () => {
    expect(exportReminder(undefined, now, undefined)).toEqual({ kind: 'never' });
    expect(exportReminder('not a date', now, undefined)).toEqual({ kind: 'never' });
  });

  it('stays quiet below the threshold and reminds from it on', () => {
    expect(exportReminder(daysAgo(EXPORT_REMINDER_DAYS - 1), now, undefined)).toBeUndefined();
    expect(exportReminder(daysAgo(EXPORT_REMINDER_DAYS), now, undefined)).toEqual({
      kind: 'stale',
      days: EXPORT_REMINDER_DAYS,
    });
  });

  it('is hidden while snoozed and returns afterwards', () => {
    expect(exportReminder(undefined, now, now + 1)).toBeUndefined();
    expect(exportReminder(undefined, now, now)).toEqual({ kind: 'never' });
  });

  it('snoozes for seven days and stores the end; a failing store only flags it', () => {
    const { data } = stubStorage(false);
    const until = snoozeExportReminder(now);
    expect(until).toBe(now + SNOOZE_DAYS * 86_400_000);
    expect(data.get('pathwise.exportReminderUntil')).toBe(String(until));
    stubStorage(true);
    expect(() => snoozeExportReminder(now)).not.toThrow();
  });
});

describe('todayLocal (B-9)', () => {
  it('uses the local calendar day, not the UTC day', () => {
    // Local constructor: 00:30 on 1 March in the machine's own zone. toISOString() could give 28 Feb (UTC).
    expect(todayLocal(new Date(2026, 2, 1, 0, 30))).toBe('2026-03-01');
    expect(todayLocal(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(todayLocal(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});

describe('suspendPersistence', () => {
  it('stays on until reset (the page reloads after an import or reset)', () => {
    expect(isPersistenceSuspended()).toBe(false);
    suspendPersistence();
    expect(isPersistenceSuspended()).toBe(true);
  });
});
