import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '../src/app/appConfig';
import { de } from '../src/i18n/de';

const rootVersion = (
  JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

describe('app version', () => {
  it('comes from the root package.json and is a release version', () => {
    expect(APP_VERSION).toBe(rootVersion);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('is shown through the German text of the Data page', () => {
    expect(de.data.versionLine(APP_VERSION)).toBe(`Valiva, Version ${rootVersion}`);
  });

  it('is what the export writes into the file header', () => {
    const source = readFileSync(new URL('../src/app/createStore.ts', import.meta.url), 'utf8');
    expect(source).toContain('appVersion: APP_VERSION');
  });
});
