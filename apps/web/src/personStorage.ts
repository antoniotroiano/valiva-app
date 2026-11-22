import type { PersonBlock } from '@pathwise/core';

/** Per-person block storage: `pathwise.p.<personId>.<block>.v1`. */
export function personKey(personId: string, block: PersonBlock): string {
  return `pathwise.p.${personId}.${block}.v1`;
}

/** Raw stored JSON of a block, or `null` if missing or storage is unavailable. */
export function readBlock(personId: string, block: PersonBlock): string | null {
  try {
    return localStorage.getItem(personKey(personId, block));
  } catch {
    return null;
  }
}
