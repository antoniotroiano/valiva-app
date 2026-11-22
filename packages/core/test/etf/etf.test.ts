import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculateEtfPlan, projectEtfScenario, validateEtfPlanInput } from '../../src';
import type { EtfPlanInput } from '../../src';
import { baseInput, taxAssumptions } from '../fixtures';

function closedForm(start: number, rate: number, annualPercent: number, years: number): number {
  const g = Math.pow(1 + annualPercent / 100, 1 / 12);
  const n = years * 12;
  return start * Math.pow(g, n) + (rate * g * (Math.pow(g, n) - 1)) / (g - 1);
}

describe('projectEtfScenario', () => {
  it('matches the closed-form annuity formula (constant rate, no costs)', () => {
    const input = {
      ...baseInput,
      initialCapital: 5000,
      monthlyContribution: 250,
      durationYears: 20,
    };
    const r = projectEtfScenario(input, 'neutral');
    expect(r.grossFinalValue).toBeCloseTo(closedForm(5000, 250, 5, 20), 2);
  });

  it('applies TER as a subtraction from the gross return', () => {
    const r = projectEtfScenario({ ...baseInput, ter: 0.2 }, 'neutral');
    expect(r.grossFinalValue).toBeCloseTo(closedForm(0, 100, 4.8, 10), 2);
  });

  it('raises the rate once per year', () => {
    const input = {
      ...baseInput,
      annualContributionIncreasePercent: 10,
      durationYears: 2,
      returnScenarios: { pessimistic: 0, neutral: 0, optimistic: 0 },
    };
    const r = projectEtfScenario(input, 'neutral');
    expect(r.totalContributions).toBeCloseTo(12 * 100 + 12 * 110, 6);
  });

  it('deducts entry fee from contributions and lump sums', () => {
    const input: EtfPlanInput = {
      ...baseInput,
      entryFeePercent: 5,
      durationYears: 1,
      monthlyContribution: 0,
      lumpSums: [{ month: 1, amount: 1000 }],
      returnScenarios: { pessimistic: 0, neutral: 0, optimistic: 0 },
    };
    const r = projectEtfScenario(input, 'neutral');
    expect(r.grossFinalValue).toBeCloseTo(950, 6);
    expect(r.totalContributions).toBe(1000);
  });

  it('deducts custody fee in EUR and percent', () => {
    const input: EtfPlanInput = {
      ...baseInput,
      initialCapital: 12000,
      monthlyContribution: 0,
      durationYears: 1,
      custodyFeeEurPerYear: 24,
      returnScenarios: { pessimistic: 0, neutral: 0, optimistic: 0 },
    };
    expect(projectEtfScenario(input, 'neutral').grossFinalValue).toBeCloseTo(11976, 6);
  });

  it('never lets the value go negative', () => {
    const input = {
      ...baseInput,
      initialCapital: 10,
      monthlyContribution: 0,
      custodyFeeEurPerYear: 1000,
    };
    expect(projectEtfScenario(input, 'neutral').grossFinalValue).toBe(0);
  });

  it('produces a yearly summary with real values', () => {
    const r = projectEtfScenario({ ...baseInput, durationYears: 3 }, 'neutral');
    expect(r.yearly).toHaveLength(3);
    expect(r.yearly[2]!.valueReal).toBeCloseTo(r.yearly[2]!.value / Math.pow(1.02, 3), 6);
  });
});

describe('calculateEtfPlan', () => {
  it('returns issues as data instead of throwing', () => {
    const r = calculateEtfPlan(
      { ...baseInput, durationYears: 0, monthlyContribution: -1 },
      taxAssumptions,
    );
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.issues.map((i) => i.field)).toEqual(['monthlyContribution', 'durationYears']);
  });

  it('computes real value from after-tax value', () => {
    const r = calculateEtfPlan(
      { ...baseInput, taxEnabled: true, monthlyContribution: 500 },
      taxAssumptions,
    );
    if (!r.ok) throw new Error('expected ok');
    const n = r.scenarios.neutral;
    expect(n.tax).toBeGreaterThan(0);
    expect(n.finalValueReal).toBeCloseTo(n.finalValueAfterTax / Math.pow(1.02, 10), 6);
  });
});

describe('validateEtfPlanInput', () => {
  it('accepts the base input', () => {
    expect(validateEtfPlanInput(baseInput)).toEqual([]);
  });
  it('rejects lump sums outside the duration and unordered scenarios', () => {
    const issues = validateEtfPlanInput({
      ...baseInput,
      lumpSums: [{ month: 121, amount: 10 }],
      returnScenarios: { pessimistic: 6, neutral: 5, optimistic: 7 },
    });
    expect(issues.map((i) => i.code).sort()).toEqual(['out_of_range', 'scenario_order']);
  });
  it('rejects NaN and non-integer durations', () => {
    const codes = validateEtfPlanInput({
      ...baseInput,
      initialCapital: NaN,
      durationYears: 2.5,
    }).map((i) => i.code);
    expect(codes).toEqual(['not_finite', 'not_integer']);
  });
});

describe('properties', () => {
  const arbInput = fc.record({
    initialCapital: fc.integer({ min: 0, max: 100000 }),
    monthlyContribution: fc.integer({ min: 0, max: 5000 }),
    durationYears: fc.integer({ min: 1, max: 40 }),
    r: fc.integer({ min: 0, max: 10 }),
  });

  it('return 0 and no costs: final value equals contributions', () => {
    fc.assert(
      fc.property(arbInput, ({ initialCapital, monthlyContribution, durationYears }) => {
        const r = projectEtfScenario(
          {
            ...baseInput,
            initialCapital,
            monthlyContribution,
            durationYears,
            returnScenarios: { pessimistic: 0, neutral: 0, optimistic: 0 },
          },
          'neutral',
        );
        expect(r.grossFinalValue).toBeCloseTo(r.totalContributions, 6);
      }),
    );
  });

  it('is monotonic in contribution and return', () => {
    fc.assert(
      fc.property(arbInput, ({ initialCapital, monthlyContribution, durationYears, r }) => {
        const base = {
          ...baseInput,
          initialCapital,
          monthlyContribution,
          durationYears,
          returnScenarios: { pessimistic: r, neutral: r, optimistic: r },
        };
        const v = projectEtfScenario(base, 'neutral').grossFinalValue;
        const more = projectEtfScenario(
          { ...base, monthlyContribution: monthlyContribution + 1 },
          'neutral',
        ).grossFinalValue;
        const higher = projectEtfScenario(
          { ...base, returnScenarios: { pessimistic: r + 1, neutral: r + 1, optimistic: r + 1 } },
          'neutral',
        ).grossFinalValue;
        expect(more).toBeGreaterThan(v);
        expect(higher).toBeGreaterThanOrEqual(v);
      }),
    );
  });

  it('scenarios are ordered pessimistic <= neutral <= optimistic', () => {
    fc.assert(
      fc.property(arbInput, ({ initialCapital, monthlyContribution, durationYears }) => {
        const res = calculateEtfPlan(
          { ...baseInput, initialCapital, monthlyContribution, durationYears },
          taxAssumptions,
        );
        if (!res.ok) throw new Error('expected ok');
        const s = res.scenarios;
        expect(s.pessimistic.grossFinalValue).toBeLessThanOrEqual(s.neutral.grossFinalValue + 1e-9);
        expect(s.neutral.grossFinalValue).toBeLessThanOrEqual(s.optimistic.grossFinalValue + 1e-9);
      }),
    );
  });
});

describe('net return of -100 % or less', () => {
  const extreme: EtfPlanInput = {
    ...baseInput,
    ter: 100,
    returnScenarios: { pessimistic: -50, neutral: -50, optimistic: -50 },
  };

  it('is a validation issue, never NaN', () => {
    expect(validateEtfPlanInput(extreme).some((i) => i.field === 'ter')).toBe(true);
    const r = calculateEtfPlan(extreme, taxAssumptions);
    expect(r.ok).toBe(false);
  });

  it('keeps all valid results finite', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: -50, max: 100, noNaN: true }),
        (ter, ret) => {
          const input = {
            ...baseInput,
            ter,
            returnScenarios: { pessimistic: ret, neutral: ret, optimistic: ret },
          };
          const r = calculateEtfPlan(input, taxAssumptions);
          if (!r.ok) return true;
          return Object.values(r.scenarios).every(
            (s) =>
              Number.isFinite(s.finalValueAfterTax) &&
              s.series.every((p) => Number.isFinite(p.value)),
          );
        },
      ),
    );
  });
});
