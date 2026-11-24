// Release consistency check: used by CI (`npm run check:release`) and by the release workflow.
// No dependencies; plain Node. The pure functions are unit-tested in `tools/test/releaseCheck.test.ts`.
//
// Rules (see docs/releasing.md):
//   - the root package.json version is a plain `x.y.z` (no pre-release suffix)
//   - CHANGELOG.md has a `## [Unreleased]` section
//   - CHANGELOG.md has a non-empty `## [x.y.z] - YYYY-MM-DD` section for that version
//   - no changelog section is newer than the package.json version (catches "forgot to bump")
//
// CLI: `node tools/release-check.mjs [--notes <file>]`
//   exit 1 with a list of problems, otherwise exit 0; `--notes` writes the section body for the GitHub release.
//   When $GITHUB_OUTPUT is set, `version=x.y.z` is appended to it.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { argv, env, exit, stderr, stdout } from 'node:process';
import { URL, fileURLToPath } from 'node:url';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const UNRELEASED_HEADING = /^## \[Unreleased\]\s*$/;
const VERSION_HEADING = /^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})\s*$/;
const ANY_SECTION_HEADING = /^## /;
const LINK_REFERENCE = /^\[[^\]]+\]:\s/;

/** True for a release version: `x.y.z` without leading zeros and without a suffix. */
export function isReleaseVersion(value) {
  return typeof value === 'string' && SEMVER.test(value);
}

/** Compares two `x.y.z` versions numerically: negative, 0 or positive. */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/**
 * Reads the changelog: whether an Unreleased section exists, and the version sections with date and body.
 * A section ends at the next `## ` heading or at the link reference block at the end of the file.
 */
export function parseChangelog(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries = [];
  const problems = [];
  let hasUnreleased = false;
  let current;
  const close = () => {
    if (current) {
      current.body = current.lines.join('\n').trim();
      delete current.lines;
      entries.push(current);
      current = undefined;
    }
  };
  for (const line of lines) {
    if (UNRELEASED_HEADING.test(line)) {
      close();
      hasUnreleased = true;
      continue;
    }
    const heading = VERSION_HEADING.exec(line);
    if (heading) {
      close();
      if (isReleaseVersion(heading[1])) {
        current = { version: heading[1], date: heading[2], lines: [] };
      } else {
        problems.push(
          `Changelog heading "${line.trim()}" does not have a version of the form x.y.z.`,
        );
      }
      continue;
    }
    if (ANY_SECTION_HEADING.test(line) || LINK_REFERENCE.test(line)) {
      close();
      continue;
    }
    if (current) current.lines.push(line);
  }
  close();
  return { hasUnreleased, entries, problems };
}

/** Checks version and changelog together. Returns the problems found and, if fine, the release notes. */
export function checkRelease(version, changelogText) {
  const problems = [];
  if (!isReleaseVersion(version)) {
    problems.push(
      `package.json version "${version}" is not of the form x.y.z (no suffix, no leading zeros).`,
    );
  }
  const changelog = parseChangelog(changelogText);
  problems.push(...changelog.problems);
  if (!changelog.hasUnreleased) problems.push('CHANGELOG.md has no "## [Unreleased]" section.');

  const seen = new Set();
  for (const entry of changelog.entries) {
    if (seen.has(entry.version))
      problems.push(`CHANGELOG.md has two sections for ${entry.version}.`);
    seen.add(entry.version);
  }

  let notes;
  if (isReleaseVersion(version)) {
    const entry = changelog.entries.find((e) => e.version === version);
    if (!entry) {
      problems.push(`CHANGELOG.md has no section "## [${version}] - YYYY-MM-DD".`);
    } else if (entry.body === '') {
      problems.push(`The changelog section for ${version} is empty.`);
    } else {
      notes = entry.body;
    }
    for (const e of changelog.entries) {
      if (compareVersions(e.version, version) > 0) {
        problems.push(
          `CHANGELOG.md has a section for ${e.version}, which is newer than package.json (${version}). Raise the version or remove the section.`,
        );
      }
    }
  }
  return { problems, notes };
}

function main() {
  const root = new URL('../', import.meta.url);
  const notesIndex = argv.indexOf('--notes');
  const notesFile = notesIndex >= 0 ? argv[notesIndex + 1] : undefined;
  if (notesIndex >= 0 && !notesFile) {
    stderr.write('--notes needs a file name.\n');
    exit(2);
  }
  const version = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).version;
  const changelog = readFileSync(new URL('CHANGELOG.md', root), 'utf8');
  const { problems, notes } = checkRelease(version, changelog);
  if (problems.length > 0) {
    stderr.write(`Release check failed:\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
    exit(1);
  }
  if (notesFile) writeFileSync(notesFile, `${notes}\n`);
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `version=${version}\n`);
  stdout.write(`Release check OK: ${version} has a changelog section.\n`);
}

if (argv[1] === fileURLToPath(import.meta.url)) main();
