/**
 * First-start state (review 13, U-1). `pathwise.onboarding` is `new` from the first visit until the user
 * edits something, loads example data or imports a file; then it is `done`. Existing users have no key.
 */
export const ONBOARDING_KEY = 'pathwise.onboarding';
export const LOCAL_NOTICE_KEY = 'pathwise.localNoticeDismissed';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
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

export function isLocalNoticeDismissed(): boolean {
  return read(LOCAL_NOTICE_KEY) === '1';
}

export function dismissLocalNotice(): void {
  write(LOCAL_NOTICE_KEY, '1');
}
