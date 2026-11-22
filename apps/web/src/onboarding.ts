import { safeSetItem } from './storageStatus';

/**
 * First-start state (review 13, U-1). `valiva.onboarding` is `new` from the first visit until the user
 * edits something, loads example data or imports a file; then it is `done`. Existing users have no key.
 */
export const ONBOARDING_KEY = 'valiva.onboarding';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  safeSetItem(key, value);
}

export function isNewStart(): boolean {
  return read(ONBOARDING_KEY) === 'new';
}

export function markNewStart(): void {
  write(ONBOARDING_KEY, 'new');
}

export function markStarted(): void {
  if (isNewStart()) write(ONBOARDING_KEY, 'done');
}
