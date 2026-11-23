import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  OTHER_INCOME_LIMITS,
  SCENARIO_NAMES,
  otherIncomeProjector,
  projectOtherIncome,
  retirementIncomeTax,
  sharedOccupationalContributions,
} from '../../src';
import type { OtherIncomeEntry, ProjectionContext } from '../../src';
import { ASSUMPTIONS, LEGAL, LEGAL_OI, OI_CTX, oiEntry } from '../pensionFixtures';

const near = (a: number, b: number, eps = 0.005) => expect(Math.abs(a - b)).toBeLessThan(eps);
const project = (entry: OtherIncomeEntry, ctx: ProjectionContext = OI_CTX) => {
  const out = projectOtherIncome(entry, ctx);
  if (!out.ok) throw new Error(JSON.stringify(out.issues));
  return out.result;
};

describe('projectOtherIncome: concept examples (15 section 5.4)', () => {
  it('example 1: Riester from the statement, nominal and fixed', () => {
    const r = project(
      oiEntry({
        kind: 'riester',
        amountMonthly: 150,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 0 },
        start: { mode: 'age', age: 67 },
      }),
    );
    near(r.monthlyPensionNominal, 150);
    near(r.monthlyPensionReal, 107.12);
    // 13 years later (age 80) the fixed amount has lost purchasing power: 150 / 1.02^30
    near(150 / Math.pow(1.02, 30), 82.81);
    expect(r.indexationPercent).toBe(0);
  });

  it('example 2: rent in today purchasing power keeps its real value', () => {
    const r = project(oiEntry({ amountMonthly: 600 }));
    near(r.monthlyPensionReal, 600);
    near(r.monthlyPensionNominal, 840.14);
    expect(r.details.yearsToStart).toBe(17);
    expect(r.details.startYear).toBe(2043);
  });

  it('example 3: pension grows with the statutory adjustment, real above the inflation', () => {
    const r = project(oiEntry({ amountMonthly: 1200, adjustment: { mode: 'pension' } }));
    near(r.monthlyPensionNominal, 1825.94);
    near(r.monthlyPensionReal, 1304.02);
    expect(r.indexationPercent).toBe(2.5);
  });

  it('example 4: basic pension taxed like the statutory pension, tax-free amount fixed', () => {
    const r = project(
      oiEntry({
        kind: 'basisPension',
        amountMonthly: 400,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 1 },
        start: { mode: 'age', age: 67 },
        taxMode: 'pensionShare',
      }),
    );
    const f = Math.pow(1.02, 17);
    near(r.details.taxableSharePercent, 92.5);
    near(r.taxableMonthlyReal * f, 370); // taxable at the start, nominal
    near((r.fixedTaxFreeMonthlyReal ?? NaN) * f, 30); // tax-free amount, nominal, fixed
    near(r.monthlyPensionReal, 285.67);
    expect(r.warnings).toContain('unverified:otherIncome.basisPensionTaxShare');
  });

  it('example 6: a likeOccupational entry alone uses the occupational rules on its own amount', () => {
    const r = project(oiEntry({ amountMonthly: 300, contributions: 'likeOccupational' }));
    // 300 EUR above the allowance 197.75: health 17.5 % of the rest, care 3.6 % of all
    near(r.contributionsMonthlyReal, 0.175 * (300 - 197.75) + 0.036 * 300);
    expect(r.warnings).toContain('unverified:otherIncome.sharedBenefitThreshold');
  });
});

describe('projectOtherIncome: bases, adjustments, timing', () => {
  it('basis today grows with the adjustment from today, nominal at start keeps the amount', () => {
    const today = project(
      oiEntry({ amountMonthly: 1000, adjustment: { mode: 'fixed', percent: 3 } }),
    );
    near(today.monthlyPensionNominal, 1000 * Math.pow(1.03, 17));
    near(today.monthlyPensionReal, (1000 * Math.pow(1.03, 17)) / Math.pow(1.02, 17));
    const nominal = project(
      oiEntry({
        amountMonthly: 1000,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 3 },
      }),
    );
    near(nominal.monthlyPensionNominal, 1000);
    near(nominal.monthlyPensionReal, 1000 / Math.pow(1.02, 17));
  });

  it('a start in the past (basis today) projects back; the overview applies the factor from the start', () => {
    // Born 1976, start at 50 = 2026 (n = 0), at 45 = 2021 (n = -5).
    const r = project(
      oiEntry({
        amountMonthly: 800,
        adjustment: { mode: 'fixed', percent: 4 },
        start: { mode: 'age', age: 45 },
      }),
    );
    expect(r.details.yearsToStart).toBe(-5);
    near(r.monthlyPensionNominal, 800 * Math.pow(1.04, -5));
    near(r.monthlyPensionReal, (800 * Math.pow(1.04, -5)) / Math.pow(1.02, -5));
  });

  it('rejects a nominal amount at a start in the past as data', () => {
    const out = projectOtherIncome(
      oiEntry({ amountBasis: 'nominalAtStart', start: { mode: 'age', age: 40 } }),
      OI_CTX,
    );
    expect(out.ok).toBe(false);
    if (!out.ok)
      expect(out.issues).toEqual([{ field: 'amountBasis', code: 'nominal_start_in_past' }]);
  });

  it('lifelong has no end age, a fixed end age is reported', () => {
    expect(project(oiEntry()).details.endAge).toBeUndefined();
    expect(project(oiEntry({ end: { mode: 'age', age: 80 } })).details.endAge).toBe(80);
  });

  it('a start with the retirement follows the profile', () => {
    const ctx: ProjectionContext = {
      ...OI_CTX,
      profile: { ...OI_CTX.profile, targetRetirementAge: 63 },
    };
    const r = project(
      oiEntry({ amountMonthly: 500, adjustment: { mode: 'fixed', percent: 0 } }),
      ctx,
    );
    expect(r.details.startAge).toBe(63);
    expect(r.details.startYear).toBe(2039);
    near(r.monthlyPensionNominal, 500);
  });

  it('all three scenarios give the same entry values', () => {
    const entry = oiEntry({ taxMode: 'pensionShare', amountMonthly: 900 });
    const [a, b, c] = SCENARIO_NAMES.map((s) => {
      const out = projectOtherIncome(entry, OI_CTX, s);
      if (!out.ok) throw new Error('x');
      const { scenario, ...rest } = out.result;
      void scenario;
      return rest;
    });
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('an amount of 0 pays nothing and costs nothing', () => {
    const r = project(oiEntry({ amountMonthly: 0, contributions: 'likeOccupational' }));
    expect(r.monthlyPensionReal).toBe(0);
    expect(r.netMonthlyPensionReal).toBe(0);
    expect(r.taxAndContributions).toBe(0);
  });

  it('has no capital and no lump sum', () => {
    const r = project(oiEntry());
    expect(r.series).toEqual([]);
    expect(r.capitalAtRetirement).toBeUndefined();
    expect(r.lumpSum).toBeUndefined();
    expect(r.fixedTaxMonthlyReal).toBe(0);
  });

  it('follows the product contract', () => {
    expect(otherIncomeProjector.type).toBe('otherIncome');
    expect(otherIncomeProjector.validate(oiEntry(), OI_CTX)).toEqual([]);
    expect(otherIncomeProjector.project(oiEntry({ amountMonthly: -1 }), OI_CTX).ok).toBe(false);
  });
});

describe('projectOtherIncome: tax modes', () => {
  it('none, full and percent', () => {
    expect(project(oiEntry({ taxMode: 'none' })).taxableMonthlyReal).toBe(0);
    near(project(oiEntry({ taxMode: 'full' })).taxableMonthlyReal, 600);
    near(project(oiEntry({ taxMode: 'percent', taxSharePercent: 18 })).taxableMonthlyReal, 108);
  });

  it('pensionShare clamps before the base year and warns', () => {
    const ctx: ProjectionContext = {
      ...OI_CTX,
      profile: { ...OI_CTX.profile, birthYear: 1960, targetRetirementAge: 62 }, // start 2022 < 2026
    };
    const r = project(oiEntry({ taxMode: 'pensionShare', start: { mode: 'age', age: 62 } }), ctx);
    near(r.details.taxableSharePercent, 84);
    expect(r.warnings).toContain('taxable_share_before_base_year');
  });

  it('adds the tax of the sum when other income runs in the same year', () => {
    const alone = project(oiEntry({ amountMonthly: 1500 }));
    const withOther = project(oiEntry({ amountMonthly: 1500 }), {
      ...OI_CTX,
      otherIncome: {
        pessimistic: { taxableMonthlyReal: 1500, contributionsMonthlyReal: 0 },
        neutral: { taxableMonthlyReal: 1500, contributionsMonthlyReal: 0 },
        optimistic: { taxableMonthlyReal: 1500, contributionsMonthlyReal: 0 },
      },
    });
    expect(withOther.taxAndContributions).toBeGreaterThan(alone.taxAndContributions);
    expect(withOther.netMonthlyPensionReal).toBeLessThan(alone.netMonthlyPensionReal);
  });
});

describe('projectOtherIncome: warnings and hints', () => {
  const codes = (e: OtherIncomeEntry, legal = LEGAL_OI) =>
    project(e, { ...OI_CTX, legal }).warnings;

  it('lists the unverified rules an entry rests on, nothing else as unverified', () => {
    expect(codes(oiEntry({ kind: 'riester', taxMode: 'full' }))).toContain(
      'unverified:otherIncome.riesterFullyTaxable',
    );
    expect(
      codes(oiEntry({ kind: 'privateAnnuity', taxMode: 'percent', taxSharePercent: 20 })),
    ).toContain('unverified:otherIncome.privateAnnuityEarningsShare');
    expect(codes(oiEntry({ survivorPercent: 55 }))).toContain(
      'unverified:otherIncome.survivorIncomeCredited',
    );
    expect(codes(oiEntry({ kind: 'other', taxMode: 'none' }))).toEqual([]);
  });

  it('hints that the allowance of the sum may not apply to rent', () => {
    expect(codes(oiEntry({ kind: 'rent' }))).toContain('rent_allowance_not_applicable');
    expect(codes(oiEntry({ kind: 'rent', taxMode: 'none' }))).not.toContain(
      'rent_allowance_not_applicable',
    );
    expect(codes(oiEntry({ kind: 'civilServicePension' }))).not.toContain(
      'rent_allowance_not_applicable',
    );
  });

  it('shows no unverified rule if the config values are not passed', () => {
    expect(codes(oiEntry({ kind: 'riester' }), LEGAL)).not.toContain(
      'unverified:otherIncome.riesterFullyTaxable',
    );
  });
});

describe('sharedOccupationalContributions (15 section 5.2)', () => {
  const social = LEGAL.social;
  const total = (amounts: number[], a = ASSUMPTIONS) =>
    Object.values(
      sharedOccupationalContributions(
        amounts.map((amount, i) => ({ id: `m${i}`, amount })),
        social,
        a,
      ),
    ).reduce((s, x) => s + x, 0);

  it('example 6: 150 + 107.12 = 257.12 gives 10.39 health and 9.26 care, 19.65 together', () => {
    const t = total([150, 150 / Math.pow(1.02, 17)]);
    near(t, 0.175 * (257.1244 - 197.75) + 0.036 * 257.1244);
    near(t, 19.65);
  });

  it('is split by gross: 11.46 and 8.19', () => {
    const by = sharedOccupationalContributions(
      [
        { id: 'bav', amount: 150 },
        { id: 'riester', amount: 150 / Math.pow(1.02, 17) },
      ],
      social,
      ASSUMPTIONS,
    );
    near(by.bav!, 11.46);
    near(by.riester!, 8.19);
  });

  it('at the allowance and threshold of 197.75 EUR nothing is due, one cent above everything flips', () => {
    expect(total([197.75])).toBe(0);
    const above = total([197.76]);
    near(above, 0.175 * 0.01 + 0.036 * 197.76, 1e-9); // health on the cent, care on all (all or nothing)
    expect(above).toBeGreaterThan(7);
    // Two members at 98.875 each equal 197.75 together: still nothing.
    expect(total([98.875, 98.875])).toBe(0);
  });

  it('uses the entered rate for every member if the health insurance is not compulsory', () => {
    const other = {
      ...ASSUMPTIONS,
      health: { ...ASSUMPTIONS.health, mode: 'other' as const, otherRatePercent: 12 },
    };
    const by = sharedOccupationalContributions(
      [
        { id: 'a', amount: 100 },
        { id: 'b', amount: 300 },
      ],
      social,
      other,
    );
    near(by.a!, 12);
    near(by.b!, 36);
  });

  it('gives 0 to everyone for an empty group or zero amounts', () => {
    expect(sharedOccupationalContributions([], social, ASSUMPTIONS)).toEqual({});
    expect(total([0, 0])).toBe(0);
  });
});

describe('property tests: projectOtherIncome', () => {
  const entryArb = fc
    .record({
      amountMonthly: fc.double({ min: 0, max: OTHER_INCOME_LIMITS.amountMonthly.max, noNaN: true }),
      amountBasis: fc.constantFrom('today' as const, 'nominalAtStart' as const),
      percent: fc.double({ min: -50, max: 100, noNaN: true }),
      adjMode: fc.constantFrom('inflation' as const, 'pension' as const, 'fixed' as const),
      startAge: fc.integer({ min: 50, max: 100 }),
      taxMode: fc.constantFrom(
        'none' as const,
        'full' as const,
        'percent' as const,
        'pensionShare' as const,
      ),
      share: fc.double({ min: 0, max: 100, noNaN: true }),
      contributions: fc.constantFrom('none' as const, 'likeOccupational' as const),
    })
    .map((r): OtherIncomeEntry =>
      oiEntry({
        amountMonthly: r.amountMonthly,
        amountBasis: r.amountBasis,
        adjustment:
          r.adjMode === 'fixed' ? { mode: 'fixed', percent: r.percent } : { mode: r.adjMode },
        start: { mode: 'age', age: r.startAge },
        end: { mode: 'age', age: 120 },
        taxMode: r.taxMode,
        taxSharePercent: r.taxMode === 'percent' ? r.share : undefined,
        contributions: r.contributions,
      }),
    );

  it('every result is finite, non-negative in its parts and net does not exceed gross', () => {
    fc.assert(
      fc.property(entryArb, (entry) => {
        const out = projectOtherIncome(entry, OI_CTX);
        if (!out.ok) return true; // e.g. a start in the past with a nominal amount: data, not an exception
        const r = out.result;
        const parts = [
          r.monthlyPensionNominal,
          r.monthlyPensionReal,
          r.taxableMonthlyReal,
          r.contributionsMonthlyReal,
          r.taxAndContributions,
          r.netMonthlyPensionReal,
        ];
        return (
          parts.every(Number.isFinite) &&
          r.monthlyPensionReal >= 0 &&
          r.taxableMonthlyReal >= -1e-9 &&
          r.taxableMonthlyReal <= r.monthlyPensionReal + 1e-6 &&
          r.contributionsMonthlyReal >= 0 &&
          r.taxAndContributions >= -1e-9 &&
          r.netMonthlyPensionReal <= r.monthlyPensionReal + 1e-6
        );
      }),
      { numRuns: 400 },
    );
  });

  it('survives the extremes of the allowed ranges', () => {
    const extremes: Partial<OtherIncomeEntry>[] = [
      {
        amountMonthly: 100_000,
        adjustment: { mode: 'fixed', percent: 100 },
        start: { mode: 'age', age: 100 },
      },
      {
        amountMonthly: 100_000,
        adjustment: { mode: 'fixed', percent: -50 },
        start: { mode: 'age', age: 18 },
      },
      {
        amountMonthly: 100_000,
        adjustment: { mode: 'fixed', percent: 100 },
        start: { mode: 'age', age: 18 },
      },
      {
        amountMonthly: 0.01,
        adjustment: { mode: 'fixed', percent: -50 },
        start: { mode: 'age', age: 100 },
      },
    ];
    for (const over of extremes) {
      const out = projectOtherIncome(oiEntry({ ...over, end: { mode: 'age', age: 120 } }), OI_CTX);
      expect(out.ok).toBe(true);
      if (out.ok) {
        for (const v of [
          out.result.monthlyPensionNominal,
          out.result.monthlyPensionReal,
          out.result.netMonthlyPensionReal,
        ]) {
          expect(Number.isFinite(v)).toBe(true);
        }
      }
    }
  });

  it('a higher adjustment never lowers the amount at the start (basis today)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 20_000, noNaN: true }),
        fc.double({ min: -50, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        (amount, g, extra) => {
          const at = (percent: number) =>
            project(oiEntry({ amountMonthly: amount, adjustment: { mode: 'fixed', percent } }))
              .monthlyPensionNominal;
          return at(Math.min(100, g + extra)) >= at(g) - 1e-9 * at(g);
        },
      ),
    );
  });

  it('retirementIncomeTax of two entries equals the tax of their sum', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 5000, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        (a, b) => {
          const t = LEGAL.incomeTax;
          const split = retirementIncomeTax(
            [
              { id: 'a', taxableMonthly: a / 2, contributionsMonthly: 0 },
              { id: 'a2', taxableMonthly: a / 2, contributionsMonthly: 0 },
              { id: 'b', taxableMonthly: b, contributionsMonthly: 0 },
            ],
            t,
          );
          const whole = retirementIncomeTax(
            [
              { id: 'a', taxableMonthly: a, contributionsMonthly: 0 },
              { id: 'b', taxableMonthly: b, contributionsMonthly: 0 },
            ],
            t,
          );
          return Math.abs(split.taxMonthly - whole.taxMonthly) < 1e-9;
        },
      ),
    );
  });
});
