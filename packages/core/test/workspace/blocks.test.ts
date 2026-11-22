import { describe, expect, it } from 'vitest';
import { PERSON_BLOCKS, defaultBlock, loadBlock, parseBlock, withdrawalOf } from '../../src';

const YEAR = 2026;

describe('defaultBlock / parseBlock', () => {
  it('accepts every default block without problems', () => {
    for (const block of PERSON_BLOCKS) {
      const result = parseBlock(block, defaultBlock(block, YEAR), YEAR);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.problems).toEqual([]);
        expect(result.value).toEqual(defaultBlock(block, YEAR));
      }
    }
  });

  it('rejects data that is not an object', () => {
    for (const block of PERSON_BLOCKS) {
      for (const raw of [null, 5, 'x', [], undefined]) {
        expect(parseBlock(block, raw, YEAR)).toEqual({ ok: false });
      }
    }
  });

  it('rejects a wrong schemaVersion for versioned blocks', () => {
    const depot = { ...defaultBlock('depot', YEAR), schemaVersion: 2 };
    expect(parseBlock('depot', depot, YEAR)).toEqual({ ok: false });
  });

  it('drops unknown fields', () => {
    const result = parseBlock('depot', { ...defaultBlock('depot', YEAR), evil: 1 }, YEAR);
    expect(result.ok && 'evil' in result.value).toBe(false);
  });

  it('reports unusable fields and falls back to the default', () => {
    const result = parseBlock(
      'depot',
      { ...defaultBlock('depot', YEAR), ownContributionMonthly: 'abc', variant: 'nope' },
      YEAR,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.problems).toEqual(['ownContributionMonthly', 'variant']);
      expect(result.value.ownContributionMonthly).toBe(0);
      expect(result.value.variant).toBe('standard');
    }
  });

  it('treats Infinity and huge numbers as unusable', () => {
    const raw = JSON.parse('{"initialCapital": 1e999, "monthlyContribution": 1e15}');
    const result = parseBlock('etfPlan', raw, YEAR);
    expect(result.ok && result.problems).toEqual(['initialCapital', 'monthlyContribution']);
  });

  it('rejects invalid months', () => {
    const result = parseBlock(
      'depot',
      { ...defaultBlock('depot', YEAR), startMonth: '2027-13' },
      YEAR,
    );
    expect(result.ok && result.problems).toEqual(['startMonth']);
  });

  it('drops invalid goals and reports them', () => {
    const goal = {
      id: 'g1',
      name: 'Bike',
      targetAmount: 1000,
      currentAmount: 0,
      monthlyContribution: 50,
      accountInterestPercent: 2,
      priority: 1,
      taxEnabled: true,
      taxFreeAllowancePerYear: 0,
      startMonth: '2026-01',
    };
    const result = parseBlock(
      'goals',
      {
        schemaVersion: 1,
        goals: [goal, { ...goal, id: 'g2', targetAmount: -1 }, { ...goal, id: 'g1' }],
      },
      YEAR,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goals).toEqual([goal]);
      expect(result.problems).toEqual(['goals.1', 'goals.2']);
    }
  });

  it('keeps optional overrides only when set', () => {
    const result = parseBlock(
      'statutory',
      {
        schemaVersion: 1,
        projectedMonthlyPensionToday: 1500,
        statementYear: 2025,
        retirementAge: 65,
      },
      YEAR,
    );
    expect(result.ok && result.value).toMatchObject({ retirementAge: 65 });
    expect(result.ok && result.value.regularRetirementAge).toBeUndefined();
  });

  it('fills missing fields of the ETF plan with defaults (data from before later fields)', () => {
    const result = parseBlock('etfPlan', { monthlyContribution: 300 }, YEAR);
    expect(result.ok && result.value).toEqual({
      ...defaultBlock('etfPlan', YEAR),
      monthlyContribution: 300,
    });
  });
});

describe('loadBlock', () => {
  it('returns defaults for missing, corrupt and foreign data', () => {
    expect(loadBlock('depot', null, YEAR)).toEqual(defaultBlock('depot', YEAR));
    expect(loadBlock('depot', '{not json', YEAR)).toEqual(defaultBlock('depot', YEAR));
    expect(loadBlock('depot', '{"schemaVersion":9}', YEAR)).toEqual(defaultBlock('depot', YEAR));
  });

  it('loads old payout blocks as annuity and keeps the withdrawal choice', () => {
    const old = loadBlock('etfPayout', '{"schemaVersion":1,"useGlobalAssumptions":true}', YEAR);
    expect(old.withdrawalStrategy).toBeUndefined();
    expect(withdrawalOf(old)).toEqual({ strategy: 'annuity' });
    const stored = { ...old, withdrawalStrategy: 'percent', withdrawalPercent: 5 };
    const back = loadBlock('etfPayout', JSON.stringify(stored), YEAR);
    expect(withdrawalOf(back)).toEqual({ strategy: 'percent', percent: 5 });
    const depot = loadBlock(
      'depot',
      JSON.stringify({ schemaVersion: 1, withdrawalStrategy: 'percent' }),
      YEAR,
    );
    expect(withdrawalOf(depot)).toEqual({ strategy: 'percent', percent: 4 });
    const bad = parseBlock('depot', { schemaVersion: 1, withdrawalStrategy: 'weird' }, YEAR);
    expect(bad.ok && bad.problems).toContain('withdrawalStrategy');
  });

  it('returns the stored value', () => {
    const stored = {
      ...defaultBlock('overview', YEAR),
      enabled: { etf: false, statutory: true, retirementDepot: true, occupational: false },
    };
    expect(loadBlock('overview', JSON.stringify(stored), YEAR)).toEqual(stored);
  });
});

describe('statutory block: pension for the retirement age', () => {
  it('is optional and survives parsing', () => {
    const base = defaultBlock('statutory', YEAR);
    const without = parseBlock('statutory', base, YEAR);
    expect(without.ok && without.value.projectedMonthlyPensionAtRetirementAgeToday).toBeUndefined();
    const withValue = parseBlock(
      'statutory',
      { ...base, projectedMonthlyPensionAtRetirementAgeToday: 1450 },
      YEAR,
    );
    expect(withValue.ok && withValue.value.projectedMonthlyPensionAtRetirementAgeToday).toBe(1450);
    const bad = parseBlock(
      'statutory',
      { ...base, projectedMonthlyPensionAtRetirementAgeToday: 'x' },
      YEAR,
    );
    expect(bad.ok && bad.problems).toContain('projectedMonthlyPensionAtRetirementAgeToday');
  });
});
