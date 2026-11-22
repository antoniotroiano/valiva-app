import { describe, expect, it } from 'vitest';
import { migrateStoragePrefix } from '../src/storagePrefixMigration';

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  /** The n-th write from now on (0-based) throws, once; `undefined` = never. */
  failWrite: number | undefined;
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrite !== undefined && this.failWrite-- === 0) {
      throw new Error('QuotaExceededError');
    }
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

describe('migrateStoragePrefix', () => {
  it('does nothing without old keys', () => {
    const s = new MemoryStorage();
    s.setItem('valiva.household.v2', 'new');
    s.setItem('other', 'x');
    expect(migrateStoragePrefix(s)).toBe('none');
    expect([...s.data.keys()].sort()).toEqual(['other', 'valiva.household.v2']);
  });

  it('copies every old key to the new prefix and removes the old ones', () => {
    const s = new MemoryStorage();
    s.setItem('pathwise.household.v2', 'h');
    s.setItem('pathwise.p.p1.depot.v1', 'd');
    s.setItem('pathwise.theme', 'dark');
    s.setItem('pathwise.lastExport', '2026-11-01');
    s.setItem('other', 'x');
    expect(migrateStoragePrefix(s)).toBe('migrated');
    expect(Object.fromEntries(s.data)).toEqual({
      'valiva.household.v2': 'h',
      'valiva.p.p1.depot.v1': 'd',
      'valiva.theme': 'dark',
      'valiva.lastExport': '2026-11-01',
      other: 'x',
    });
  });

  it('migrates the old single-person keys so the household migration can still find them', () => {
    const s = new MemoryStorage();
    s.setItem('pathwise.profile.v1', '{}');
    s.setItem('pathwise.depot.v1', '{}');
    expect(migrateStoragePrefix(s)).toBe('migrated');
    expect([...s.data.keys()].sort()).toEqual(['valiva.depot.v1', 'valiva.profile.v1']);
  });

  it('keeps data that already exists under the new name', () => {
    const s = new MemoryStorage();
    s.setItem('pathwise.household.v2', 'old');
    s.setItem('valiva.household.v2', 'newer');
    expect(migrateStoragePrefix(s)).toBe('migrated');
    expect(s.getItem('valiva.household.v2')).toBe('newer');
    expect(s.getItem('pathwise.household.v2')).toBeNull();
  });

  it('is idempotent', () => {
    const s = new MemoryStorage();
    s.setItem('pathwise.household.v2', 'h');
    migrateStoragePrefix(s);
    expect(migrateStoragePrefix(s)).toBe('none');
    expect(s.getItem('valiva.household.v2')).toBe('h');
  });

  it('loses nothing if a write fails: old keys stay, the next start retries', () => {
    const s = new MemoryStorage();
    s.setItem('pathwise.household.v2', 'h');
    s.setItem('pathwise.p.p1.depot.v1', 'd');
    s.failWrite = 1;
    expect(migrateStoragePrefix(s)).toBe('failed');
    expect(s.getItem('pathwise.household.v2')).toBe('h');
    expect(s.getItem('pathwise.p.p1.depot.v1')).toBe('d');
    expect(migrateStoragePrefix(s)).toBe('migrated');
    expect(s.getItem('valiva.p.p1.depot.v1')).toBe('d');
    expect(s.getItem('pathwise.p.p1.depot.v1')).toBeNull();
  });

  it('never throws if the storage is unavailable', () => {
    const broken = {
      get length(): number {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(migrateStoragePrefix(broken)).toBe('failed');
  });
});
