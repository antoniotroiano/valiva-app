import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ES module without type declarations
import {
  checkRelease,
  compareVersions,
  isReleaseVersion,
  parseChangelog,
} from '../release-check.mjs';

const CHANGELOG = `# Changelog

Intro text.

## [Unreleased]

### Added

- something pending

## [0.2.0] - 2026-12-01

### Fixed

- a bug

## [0.1.0] - 2026-11-24

First version.

[Unreleased]: https://example.invalid/compare/v0.2.0...HEAD
[0.2.0]: https://example.invalid/releases/tag/v0.2.0
[0.1.0]: https://example.invalid/releases/tag/v0.1.0
`;

const problemsOf = (version: string, changelog: string): string[] =>
  checkRelease(version, changelog).problems;

describe('isReleaseVersion', () => {
  it('accepts x.y.z only', () => {
    for (const v of ['0.1.0', '1.0.0', '10.20.30']) expect(isReleaseVersion(v)).toBe(true);
    for (const v of [
      '1',
      '1.0',
      'v1.0.0',
      '01.0.0',
      '1.0.0-beta.1',
      '1.0.0+build',
      '1.0.0 ',
      '',
      'x.y.z',
    ]) {
      expect(isReleaseVersion(v)).toBe(false);
    }
    expect(isReleaseVersion(undefined)).toBe(false);
    expect(isReleaseVersion(1)).toBe(false);
  });
});

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareVersions('0.1.0', '0.1.1')).toBeLessThan(0);
    expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
  });
});

describe('parseChangelog', () => {
  it('finds Unreleased and the version sections and cuts the link references off', () => {
    const parsed = parseChangelog(CHANGELOG);
    expect(parsed.hasUnreleased).toBe(true);
    expect(parsed.entries.map((e: { version: string }) => e.version)).toEqual(['0.2.0', '0.1.0']);
    expect(parsed.entries[1].body).toBe('First version.');
    expect(parsed.entries[0].body).toBe('### Fixed\n\n- a bug');
    expect(parsed.entries[0].date).toBe('2026-12-01');
  });

  it('handles Windows line endings', () => {
    const parsed = parseChangelog(CHANGELOG.replace(/\n/g, '\r\n'));
    expect(parsed.entries[1].body).toBe('First version.');
  });

  it('reports a version heading that is not x.y.z', () => {
    const parsed = parseChangelog('## [Unreleased]\n\n## [1.0] - 2026-01-01\n\ntext\n');
    expect(parsed.problems).toHaveLength(1);
    expect(parsed.entries).toEqual([]);
  });
});

describe('checkRelease', () => {
  it('passes when the newest section matches the version and returns its notes', () => {
    const result = checkRelease('0.2.0', CHANGELOG);
    expect(result.problems).toEqual([]);
    expect(result.notes).toBe('### Fixed\n\n- a bug');
  });

  it('fails for an invalid version', () => {
    expect(problemsOf('0.2', CHANGELOG)[0]).toMatch(/not of the form x\.y\.z/);
    expect(problemsOf('0.2.0-rc.1', CHANGELOG)[0]).toMatch(/not of the form x\.y\.z/);
  });

  it('fails without a changelog section for the version', () => {
    expect(problemsOf('0.3.0', CHANGELOG).join('\n')).toMatch(/no section "## \[0\.3\.0\]/);
  });

  it('fails when the changelog has a section newer than the version (version not raised)', () => {
    expect(problemsOf('0.1.0', CHANGELOG).join('\n')).toMatch(/0\.2\.0, which is newer/);
  });

  it('fails without an Unreleased section', () => {
    expect(
      problemsOf('0.1.0', CHANGELOG.replace('## [Unreleased]', '## Pending')).join('\n'),
    ).toMatch(/Unreleased/);
  });

  it('fails for an empty section and for a duplicate section', () => {
    expect(
      problemsOf('0.1.0', '## [Unreleased]\n\n## [0.1.0] - 2026-11-24\n\n').join('\n'),
    ).toMatch(/empty/);
    const twice =
      '## [Unreleased]\n\n## [0.1.0] - 2026-11-24\n\na\n\n## [0.1.0] - 2026-11-25\n\nb\n';
    expect(problemsOf('0.1.0', twice).join('\n')).toMatch(/two sections for 0\.1\.0/);
  });
});

describe('this repository', () => {
  it('has a valid version, an Unreleased section and a changelog section for the version', () => {
    const root = new URL('../../', import.meta.url);
    const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as {
      version: string;
    };
    const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf8');
    expect(problemsOf(version, changelog)).toEqual([]);
  });
});
