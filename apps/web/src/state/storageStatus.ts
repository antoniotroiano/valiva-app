import { useSyncExternalStore } from 'react';
import { STORAGE_PREFIX } from '../app/appConfig';

/**
 * Central write path to `localStorage` (review 14, B-4/B-5). A failed write (full storage, private mode,
 * blocked site data) is remembered here so a notice can tell the user that nothing is saved; before, every
 * hook swallowed the error. Also records whether another tab changed the stored data (B-5).
 */
export type StorageStatus = {
  /** The last write failed. Cleared by the next successful write. */
  writeFailed: boolean;
  /** Another tab changed the household or a person's data after this tab loaded it. */
  changedElsewhere: boolean;
};

let persistenceSuspended = false;
let dataVersion = 0;
const dataListeners = new Set<() => void>();
let status: StorageStatus = { writeFailed: false, changedElsewhere: false };
const listeners = new Set<() => void>();

function update(patch: Partial<StorageStatus>) {
  const next = { ...status, ...patch };
  if (
    next.writeFailed === status.writeFailed &&
    next.changedElsewhere === status.changedElsewhere
  ) {
    return;
  }
  status = next;
  for (const l of listeners) l();
}

/** Writes `value`; returns `false` (and flags the failure) if the browser refuses. Never throws. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    update({ writeFailed: false });
    dataVersion += 1;
    for (const l of dataListeners) l();
    return true;
  } catch {
    update({ writeFailed: true });
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    update({ writeFailed: true });
    return false;
  }
}

/** Counts successful writes; lets derived views (input status in the navigation) refresh after a save. */
export function getDataVersion(): number {
  return dataVersion;
}

export function useDataVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      dataListeners.add(listener);
      return () => dataListeners.delete(listener);
    },
    getDataVersion,
    getDataVersion,
  );
}

export function getStorageStatus(): StorageStatus {
  return status;
}

export function subscribeStorageStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStorageStatus(): StorageStatus {
  return useSyncExternalStore(subscribeStorageStatus, getStorageStatus, getStorageStatus);
}

/** Keys of the household and of per-person blocks; theme and hints are not shared state. */
export function isSharedDataKey(key: string | null): boolean {
  return (
    key === null || key === `${STORAGE_PREFIX}household.v2` || key.startsWith(`${STORAGE_PREFIX}p.`)
  );
}

/** `storage` events fire only in the other tabs, never for this tab's own writes. */
export function watchOtherTabs(): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.storageArea === localStorage && isSharedDataKey(e.key)) {
      update({ changedElsewhere: true });
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/**
 * Import and reset replace the stored data and then reload the page. The pending-edit flush on `pagehide`
 * would write the old in-memory state over the new data, so it is switched off for good until the reload.
 */
export function suspendPersistence(): void {
  persistenceSuspended = true;
}

export function isPersistenceSuspended(): boolean {
  return persistenceSuspended;
}

export function dismissChangedElsewhere(): void {
  update({ changedElsewhere: false });
}

/** Test helper. */
export function resetStorageStatus(): void {
  status = { writeFailed: false, changedElsewhere: false };
  persistenceSuspended = false;
  for (const l of listeners) l();
}
