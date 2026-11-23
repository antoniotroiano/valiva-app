import { describe, expect, it } from 'vitest';
import { defaultAssumptions, defaultBlock, parseWorkspace, serializeWorkspace } from '@valiva/core';
import { BrowserWorkspaceStore, HOUSEHOLD_KEY, LAST_EXPORT_KEY } from '../src/state/workspaceStore';
import { personKey } from '../src/state/personStorage';

const YEAR = 2026;
const FORMAT = 'test-format';

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

function makeStore(storage: Storage) {
  return new BrowserWorkspaceStore({
    storage,
    currentYear: YEAR,
    format: FORMAT,
    appVersion: '0.0.0',
    defaults: defaultAssumptions(2.9),
    defaultPersonName: 'Person 1',
    now: () => new Date('2026-11-18T10:00:00Z'),
  });
}

function filled() {
  const storage = new MemoryStorage();
  const store = makeStore(storage);
  const ws = store.load();
  ws.household.persons.push({ ...ws.household.persons[0]!, id: 'p2', name: 'Sam' });
  ws.byPerson = {
    p1: { depot: { ...defaultBlock('depot', YEAR), ownContributionMonthly: 90 } },
    p2: { etfPlan: defaultBlock('etfPlan', YEAR) },
  };
  expect(store.save(ws)).toEqual({ ok: true });
  return { storage, store };
}

describe('BrowserWorkspaceStore', () => {
  it('loads defaults from empty storage', () => {
    const ws = makeStore(new MemoryStorage()).load();
    expect(ws.household.persons).toHaveLength(1);
    expect(ws.byPerson).toEqual({ p1: {} });
  });

  it('export, reset and import restore all keys', () => {
    const { storage, store } = filled();
    const snapshot = new Map(storage.data);
    const text = serializeWorkspace(store.load());

    expect(store.clear()).toEqual({ ok: true });
    expect(storage.data.size).toBe(0);

    const parsed = parseWorkspace(text, YEAR, FORMAT);
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    expect(store.save(parsed.workspace)).toEqual({ ok: true });

    expect([...storage.data.keys()].sort()).toEqual([...snapshot.keys()].sort());
    expect(storage.getItem(HOUSEHOLD_KEY)).not.toBeNull();
    expect(storage.getItem(personKey('p1', 'depot'))).not.toBeNull();
    expect(serializeWorkspace(store.load())).toBe(text);
  });

  it('includes the live household state instead of the stored one', () => {
    const { store } = filled();
    const live = store.load().household;
    const ws = store.load({
      schemaVersion: 2,
      household: { ...live, name: 'Live' },
      activePersonId: 'p2',
    });
    expect(ws.household.name).toBe('Live');
    expect(ws.activePersonId).toBe('p2');
  });

  it('removes stale person keys when importing', () => {
    const { storage, store } = filled();
    const ws = makeStore(new MemoryStorage()).load();
    expect(store.save(ws)).toEqual({ ok: true });
    expect([...storage.data.keys()]).toEqual([HOUSEHOLD_KEY]);
  });

  it('keeps unrelated keys such as theme and last export', () => {
    const { storage, store } = filled();
    storage.setItem('valiva.theme', 'dark');
    store.markExported('2026-11-18T10:00:00.000Z');
    store.clear();
    expect(storage.getItem('valiva.theme')).toBe('dark');
    expect(store.lastExport()).toBe('2026-11-18T10:00:00.000Z');
    expect(storage.getItem(LAST_EXPORT_KEY)).not.toBeNull();
  });

  it('markExported reports a refused write instead of swallowing it', () => {
    const storage = new MemoryStorage();
    const store = makeStore(storage);
    expect(store.markExported('2026-11-18T10:00:00.000Z')).toEqual({ ok: true });
    expect(store.lastExport()).toBe('2026-11-18T10:00:00.000Z');
    storage.failWrite = 0;
    expect(store.markExported('2026-11-19T10:00:00.000Z')).toEqual({ ok: false });
    expect(store.lastExport()).toBe('2026-11-18T10:00:00.000Z');
  });

  it('clear also removes the pre-household keys so they are not migrated back', () => {
    const { storage, store } = filled();
    storage.setItem('valiva.profile.v1', '{}');
    storage.setItem('valiva.depot.v1', '{}');
    store.clear();
    expect(storage.data.size).toBe(0);
  });

  it('rolls back to the old values when a write fails', () => {
    const { storage, store } = filled();
    const before = new Map(storage.data);
    const other = makeStore(new MemoryStorage()).load();
    other.byPerson = {
      p1: { etfPlan: defaultBlock('etfPlan', YEAR), depot: defaultBlock('depot', YEAR) },
    };
    storage.failWrite = 1;
    expect(store.save(other)).toEqual({ ok: false });
    expect(new Map(storage.data)).toEqual(before);
  });
});
