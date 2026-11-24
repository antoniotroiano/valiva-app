/** Storage prefix used before the rename to Valiva (2026-11-22). Only read here, never written. */
import { STORAGE_PREFIX } from '../app/appConfig';

const OLD_PREFIX = 'pathwise.';
const NEW_PREFIX = STORAGE_PREFIX;

export type PrefixMigrationResult = 'none' | 'migrated' | 'failed';

/**
 * One-time migration of the browser storage from `pathwise.*` to `valiva.*`. Runs before the app reads
 * anything. A key that already exists under the new name is kept (the newer data wins). Old keys are removed
 * only after every copy succeeded, so a failed write (quota, blocked storage) loses nothing and the next
 * start tries again. Never throws.
 */
export function migrateStoragePrefix(storage: Storage): PrefixMigrationResult {
  try {
    const oldKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null && key.startsWith(OLD_PREFIX)) oldKeys.push(key);
    }
    if (oldKeys.length === 0) return 'none';
    for (const key of oldKeys) {
      const target = NEW_PREFIX + key.slice(OLD_PREFIX.length);
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(target) === null) storage.setItem(target, value);
    }
    for (const key of oldKeys) storage.removeItem(key);
    return 'migrated';
  } catch {
    return 'failed';
  }
}
