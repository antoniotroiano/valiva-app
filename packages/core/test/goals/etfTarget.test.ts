import { describe, expect, it } from 'vitest';
import { calculateEtfPlan, solveEtfRequiredContribution, SCENARIO_NAMES } from '../../src';
import { baseInput, taxAssumptions } from '../fixtures';

const input = { ...baseInput, initialCapital: 5000, monthlyContribution: 100, durationYears: 20 };

describe('solveEtfRequiredContribution', () => {
  it('round trip per scenario: required rate reaches the nominal target, one cent less does not', () => {
    const r = solveEtfRequiredContribution(input, taxAssumptions, 200_000, 'nominal');
    if (!r.ok) throw new Error('expected ok');
    for (const sc of SCENARIO_NAMES) {
      const s = r.scenarios[sc];
      expect(s.status).toBe('ok');
      const at = (m: number) => {
        const p = calculateEtfPlan({ ...input, monthlyContribution: m }, taxAssumptions);
        if (!p.ok) throw new Error('expected ok');
        return p.scenarios[sc].finalValueAfterTax;
      };
      expect(at(s.monthly)).toBeGreaterThanOrEqual(200_000 - 1e-6);
      expect(at(s.monthly - 0.01)).toBeLessThan(200_000);
      expect(s.differenceToCurrent).toBeCloseTo(s.monthly - 100, 9);
    }
  });

  it('needs more in the pessimistic than in the optimistic scenario', () => {
    const r = solveEtfRequiredContribution(input, taxAssumptions, 200_000, 'nominal');
    if (!r.ok) throw new Error('expected ok');
    expect(r.scenarios.pessimistic.monthly).toBeGreaterThan(r.scenarios.neutral.monthly);
    expect(r.scenarios.neutral.monthly).toBeGreaterThan(r.scenarios.optimistic.monthly);
  });

  it('inflates a real target to nominal terms', () => {
    const real = solveEtfRequiredContribution(input, taxAssumptions, 100_000, 'real');
    if (!real.ok) throw new Error('expected ok');
    expect(real.targetNominal).toBeCloseTo(100_000 * 1.02 ** 20, 6);
    const nominal = solveEtfRequiredContribution(
      input,
      taxAssumptions,
      real.targetNominal,
      'nominal',
    );
    if (!nominal.ok) throw new Error('expected ok');
    expect(nominal.scenarios.neutral.monthly).toBe(real.scenarios.neutral.monthly);
  });

  it('reports already_reached when the start capital grows to the target on its own', () => {
    const r = solveEtfRequiredContribution(input, taxAssumptions, 8000, 'nominal');
    if (!r.ok) throw new Error('expected ok');
    expect(r.scenarios.neutral.status).toBe('already_reached');
    expect(r.scenarios.neutral.differenceToCurrent).toBe(-100);
  });

  it('reports unreachable above the monthly cap', () => {
    const r = solveEtfRequiredContribution(input, taxAssumptions, 1e12, 'nominal');
    if (!r.ok) throw new Error('expected ok');
    expect(r.scenarios.neutral.status).toBe('unreachable');
  });

  it('returns issues as data for invalid input', () => {
    const r = solveEtfRequiredContribution(input, taxAssumptions, 0, 'nominal');
    expect(r.ok).toBe(false);
    const r2 = solveEtfRequiredContribution(
      { ...input, durationYears: 0 },
      taxAssumptions,
      1000,
      'real',
    );
    expect(r2.ok).toBe(false);
  });
});
