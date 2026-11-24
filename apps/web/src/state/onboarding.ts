import { safeSetItem } from './storageStatus';
import { STORAGE_PREFIX } from '../app/appConfig';

/**
 * First-start state (review 13, U-1). `valiva.onboarding` is `new` from the first visit until the user
 * edits something, loads example data or imports a file; then it is `done`. Existing users have no key.
 */
export const ONBOARDING_KEY = `${STORAGE_PREFIX}onboarding`;

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

/** `new`: first visit (welcome card). `done`: started (next-step card). `hidden`: card dismissed. Absent: existing user. */
export type OnboardingState = 'new' | 'done' | 'hidden' | undefined;

export function readOnboarding(): OnboardingState {
  const v = read(ONBOARDING_KEY);
  return v === 'new' || v === 'done' || v === 'hidden' ? v : undefined;
}

export function isNewStart(): boolean {
  return read(ONBOARDING_KEY) === 'new';
}

/** The user dismissed the "next step" card; it stays away. */
export function hideGuidance(): void {
  write(ONBOARDING_KEY, 'hidden');
}

export function markNewStart(): void {
  write(ONBOARDING_KEY, 'new');
}

export function markStarted(): void {
  if (isNewStart()) write(ONBOARDING_KEY, 'done');
}
