import {
  PERSON_BLOCKS,
  buildWorkspace,
  applyWorkspace,
  parseHouseholdState,
  defaultHouseholdState,
} from '@valiva/core';
import type {
  GlobalAssumptions,
  HouseholdState,
  PersonBlock,
  Workspace,
  WorkspaceInfo,
} from '@valiva/core';
import { personKey } from './personStorage';

export const HOUSEHOLD_KEY = 'valiva.household.v2';
export const LAST_EXPORT_KEY = 'valiva.lastExport';
const PERSON_KEY_PREFIX = 'valiva.p.';
/** Keys of the single-person storage before Phase 4b; `boot` would migrate them again after a reset. */
const LEGACY_KEYS = ['valiva.profile.v1', ...PERSON_BLOCKS.map((b) => `valiva.${b}.v1`)];

export type StoreResult = { ok: true } | { ok: false };

/** `06` §7: where a workspace comes from and goes to. */
export interface WorkspaceStore {
  load(): Workspace;
  save(workspace: Workspace): StoreResult;
}

type StoreOptions = {
  storage: Storage;
  currentYear: number;
  /** Fixed export info; `exportedAt` is set per call. */
  format: string;
  appVersion: string;
  defaults: GlobalAssumptions;
  defaultPersonName: string;
  now?: () => Date;
};

/** Bundles `valiva.household.v2` and `valiva.p.<id>.<block>.v1` of the browser's `localStorage`. */
export class BrowserWorkspaceStore implements WorkspaceStore {
  constructor(private readonly o: StoreOptions) {}

  private read(key: string): string | null {
    try {
      return this.o.storage.getItem(key);
    } catch {
      return null;
    }
  }

  private ownKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.o.storage.length; i++) {
      const key = this.o.storage.key(i);
      if (key === HOUSEHOLD_KEY || key?.startsWith(PERSON_KEY_PREFIX)) keys.push(key);
    }
    return keys;
  }

  private householdState(): HouseholdState {
    return (
      parseHouseholdState(this.read(HOUSEHOLD_KEY), this.o.currentYear) ??
      defaultHouseholdState(this.o.currentYear, this.o.defaults, this.o.defaultPersonName)
    );
  }

  /** The stored data as a workspace. Pass the live state to include edits not yet written. */
  load(state: HouseholdState = this.householdState()): Workspace {
    const blocks: Record<string, Partial<Record<PersonBlock, unknown>>> = {};
    for (const person of state.household.persons) {
      const own: Partial<Record<PersonBlock, unknown>> = {};
      for (const block of PERSON_BLOCKS) {
        const raw = this.read(personKey(person.id, block));
        if (raw === null) continue;
        try {
          own[block] = JSON.parse(raw) as unknown;
        } catch {
          /* unreadable block: left out */
        }
      }
      blocks[person.id] = own;
    }
    const info: WorkspaceInfo = {
      format: this.o.format,
      appVersion: this.o.appVersion,
      exportedAt: (this.o.now?.() ?? new Date()).toISOString(),
    };
    return buildWorkspace(state, blocks, info, this.o.currentYear);
  }

  /**
   * Replaces all stored workspace data. If any write fails (quota), the previous values are restored
   * and `{ ok: false }` is returned.
   */
  save(workspace: Workspace): StoreResult {
    const { state, blocks } = applyWorkspace(workspace);
    const before = new Map<string, string>();
    for (const key of this.ownKeys()) {
      const value = this.read(key);
      if (value !== null) before.set(key, value);
    }
    try {
      for (const key of before.keys()) this.o.storage.removeItem(key);
      for (const person of state.household.persons) {
        const own = blocks[person.id] ?? {};
        for (const block of PERSON_BLOCKS) {
          if (own[block] !== undefined) {
            this.o.storage.setItem(personKey(person.id, block), JSON.stringify(own[block]));
          }
        }
      }
      this.o.storage.setItem(HOUSEHOLD_KEY, JSON.stringify(state));
      return { ok: true };
    } catch {
      this.restore(before);
      return { ok: false };
    }
  }

  private restore(before: Map<string, string>) {
    try {
      for (const key of this.ownKeys()) this.o.storage.removeItem(key);
      for (const [key, value] of before) this.o.storage.setItem(key, value);
    } catch {
      /* nothing more can be done */
    }
  }

  /** Removes all workspace data including the pre-household keys. Theme and export date stay. */
  clear(): StoreResult {
    try {
      for (const key of [...this.ownKeys(), ...LEGACY_KEYS]) this.o.storage.removeItem(key);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  lastExport(): string | undefined {
    return this.read(LAST_EXPORT_KEY) ?? undefined;
  }

  markExported(at: string): void {
    try {
      this.o.storage.setItem(LAST_EXPORT_KEY, at);
    } catch {
      /* ignore */
    }
  }
}
