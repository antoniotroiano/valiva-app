import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_SCHEMA_VERSION,
  applyWorkspace,
  buildWorkspace,
  defaultHouseholdState,
  defaultPerson,
  parseWorkspace,
  serializeWorkspace,
} from '../../src';
import type { Workspace } from '../../src';
import { ASSUMPTIONS } from '../pensionFixtures';

const YEAR = 2026;
const FORMAT = 'valiva-workspace';
const INFO = { format: FORMAT, appVersion: '0.0.0', exportedAt: '2026-11-23T10:00:00.000Z' };
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function couple(joint?: boolean): Workspace {
  const state = defaultHouseholdState(YEAR, ASSUMPTIONS, 'Anna');
  state.household.persons.push(defaultPerson('p2', 'Ben', YEAR, ASSUMPTIONS));
  if (joint !== undefined) state.household.jointAssessment = joint;
  return buildWorkspace(state, {}, INFO, YEAR);
}

const text = (edit: (w: Loose) => void, joint?: boolean): string => {
  const w = JSON.parse(serializeWorkspace(couple(joint))) as Loose;
  edit(w);
  return JSON.stringify(w);
};
const parse = (raw: string) => parseWorkspace(raw, YEAR, FORMAT);
const errors = (raw: string) => {
  const r = parse(raw);
  return r.status === 'error' ? r.issues : [];
};

describe('household field jointAssessment in the workspace file', () => {
  it('stays on format version 2 (no new version for an optional field)', () => {
    expect(WORKSPACE_SCHEMA_VERSION).toBe(2);
  });

  it.each([true, false])('round-trips %s and stays byte-stable', (value) => {
    const raw = serializeWorkspace(couple(value));
    expect(JSON.parse(raw).household.jointAssessment).toBe(value);
    const r = parse(raw);
    expect(r.status).not.toBe('error');
    if (r.status === 'error') return;
    expect(r.workspace.household.jointAssessment).toBe(value);
    expect(applyWorkspace(r.workspace).state.household.jointAssessment).toBe(value);
    expect(serializeWorkspace(r.workspace)).toBe(raw);
  });

  it('an older file without the field loads unchanged, the field stays absent', () => {
    const raw = serializeWorkspace(couple());
    expect('jointAssessment' in JSON.parse(raw).household).toBe(false);
    const r = parse(raw);
    expect(r.status).not.toBe('error');
    if (r.status === 'error') return;
    expect('jointAssessment' in r.workspace.household).toBe(false);
    expect(serializeWorkspace(r.workspace)).toBe(raw);
  });

  it.each([
    ['yes', 'yes'],
    ['the number 1', 1],
    ['the number 0', 0],
    ['the text true', 'true'],
    ['null', null],
    ['an array', [true]],
    ['an object', { value: true }],
  ])('rejects %s', (_name, value) => {
    const issues = errors(text((w) => (w.household.jointAssessment = value)));
    expect(issues).toContainEqual({ code: 'invalid_field', field: 'household.jointAssessment' });
  });

  it('rejects forbidden keys inside the household next to the field', () => {
    const raw = text((w) => (w.household.jointAssessment = true)).replace(
      '"jointAssessment":true',
      '"jointAssessment":true,"__proto__":{"x":1}',
    );
    expect(errors(raw).map((i) => i.code)).toContain('forbidden_key');
  });

  it('is ignored by the file for another household size (the field is read, the core ignores it)', () => {
    const state = defaultHouseholdState(YEAR, ASSUMPTIONS, 'Anna');
    state.household.jointAssessment = true;
    const raw = serializeWorkspace(buildWorkspace(state, {}, INFO, YEAR));
    const r = parse(raw);
    expect(r.status).not.toBe('error');
  });
});
