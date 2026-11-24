import { describe, expect, it } from 'vitest';
import { APP_FILE_PREFIX, APP_NAME, IS_BETA, STORAGE_PREFIX } from '../src/app/appConfig';
import { personKey } from '../src/state/personStorage';
import { HOUSEHOLD_KEY, LAST_EXPORT_KEY } from '../src/state/workspaceStore';
import { isSharedDataKey } from '../src/state/storageStatus';

// Unit tests run as the release channel (vitest.config.ts); the beta channel is the build with
// `VALIVA_CHANNEL=beta`, whose prefix `valiva-beta.` shares no key with the release app on the same origin.
describe('storage prefix (release channel)', () => {
  it('uses valiva. and the plain app name', () => {
    expect(IS_BETA).toBe(false);
    expect(STORAGE_PREFIX).toBe('valiva.');
    expect(APP_NAME).toBe('Valiva');
    expect(APP_FILE_PREFIX).toBe('valiva');
  });

  it('derives every shared key from the prefix', () => {
    expect(HOUSEHOLD_KEY).toBe(`${STORAGE_PREFIX}household.v2`);
    expect(LAST_EXPORT_KEY).toBe(`${STORAGE_PREFIX}lastExport`);
    expect(personKey('p1', 'etfPlan')).toBe(`${STORAGE_PREFIX}p.p1.etfPlan.v1`);
    expect(isSharedDataKey(HOUSEHOLD_KEY)).toBe(true);
    expect(isSharedDataKey('valiva-beta.household.v2')).toBe(false);
  });
});
