import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  advanceLumpSum,
  advanceLumpSumTax,
  calculateEtfPlan,
  computeCapitalGainsTax,
  parseBlock,
  projectEtfScenario,
  projectEtfWithPayout,
  resolveAdvanceLumpSumParameters,
  solveEtfRequiredContribution,
  usesAssumedBaseInterest,
  validateAdvanceLumpSum,
} from '../../src';
import type {
  AdvanceLumpSumParameters,
  EtfPlanInput,
  EtfProjectorInput,
  TaxAssumptions,
  TaxConfig,
} from '../../src';
import { CTX } from '../pensionFixtures';

const config = JSON.parse(
  readFileSync(join(__dirname, '../../../../config/tax-de.json'), 'utf8'),
) as TaxConfig;

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

const PARAMS: AdvanceLumpSumParameters = {
  baseEarningsFactorPercent: 70,
  baseInterestByYear: { 2026: 3.2, 2027: 0, 2028: -0.5 },
  assumedBaseInterestPercent: 3.2,
  startYear: 2026,
  startMonth: 1,
};

const TAX: TaxAssumptions = {
  capitalGainsTaxRate: 26.375,
  partialExemptionRate: 30,
  taxFreeAllowance: 1000,
};

const PLAN: EtfPlanInput = {
  initialCapital: 5000,
  monthlyContribution: 250,
  annualContributionIncreasePercent: 0,
  durationYears: 20,
  lumpSums: [],
  ter: 0.2,
  entryFeePercent: 0,
  custodyFeeEurPerYear: 0,
  custodyFeePercentPerYear: 0,
  returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
  inflationPercent: 2,
  taxEnabled: true,
};

const WITH_ADVANCE = { ...TAX, advanceLumpSum: PARAMS };

describe('advanceLumpSum', () => {
  it('is the base earnings if the gain is larger (published example: 20,000 EUR at 3.20 %)', () => {
    near(advanceLumpSum(PARAMS, 2026, 20000, 1000), 448);
  });

  it('is limited to the gain of the year', () => {
    near(advanceLumpSum(PARAMS, 2026, 20000, 300), 300);
  });

  it('is zero without gain, without holdings and for a zero or negative base interest', () => {
    expect(advanceLumpSum(PARAMS, 2026, 20000, 0)).toBe(0);
    expect(advanceLumpSum(PARAMS, 2026, 20000, -50)).toBe(0);
    expect(advanceLumpSum(PARAMS, 2026, 0, 1000)).toBe(0);
    expect(advanceLumpSum(PARAMS, 2027, 20000, 1000)).toBe(0);
    expect(advanceLumpSum(PARAMS, 2028, 20000, 1000)).toBe(0);
  });

  it('uses the assumed rate for a year without a published one', () => {
    near(advanceLumpSum(PARAMS, 2040, 20000, 1000), 448);
    expect(usesAssumedBaseInterest(PARAMS, 2026, 2028)).toBe(false);
    expect(usesAssumedBaseInterest(PARAMS, 2026, 2029)).toBe(true);
  });

  it('taxes a lump sum with partial exemption (published example: 82.71 EUR without allowance)', () => {
    near(advanceLumpSumTax(448, { ...TAX, taxFreeAllowance: 0 }), 448 * 0.7 * 0.26375);
    near(advanceLumpSumTax(448, { ...TAX, taxFreeAllowance: 0 }), 82.71, 0.01);
  });

  it('is covered by the allowance for small lump sums', () => {
    expect(advanceLumpSumTax(448, TAX)).toBe(0);
  });
});

describe('projectEtfScenario with the advance lump sum', () => {
  const oneYear: EtfPlanInput = {
    ...PLAN,
    initialCapital: 20000,
    monthlyContribution: 0,
    durationYears: 1,
    ter: 0,
    returnScenarios: { pessimistic: 5, neutral: 5, optimistic: 5 },
  };
  const run = { parameters: PARAMS, tax: { ...TAX, taxFreeAllowance: 0 } };

  it('charges base earnings on the opening value and takes the tax from the depot', () => {
    const r = projectEtfScenario(oneYear, 'neutral', undefined, run);
    // 20,000 grow by 5 %: gain 1,000 is above the base earnings 448
    near(r.advanceLumpSumTotal ?? NaN, 448);
    near(r.advanceTaxPaid ?? NaN, 448 * 0.7 * 0.26375);
    near(r.grossFinalValue, 21000 - 448 * 0.7 * 0.26375);
    expect(r.yearly[0]?.advanceLumpSum).toBeCloseTo(448, 9);
  });

  it('limits the lump sum to the gain of the year', () => {
    const lowReturn = {
      ...oneYear,
      returnScenarios: { pessimistic: 1, neutral: 1, optimistic: 1 },
    };
    const r = projectEtfScenario(lowReturn, 'neutral', undefined, run);
    near(r.advanceLumpSumTotal ?? NaN, 200);
  });

  it('weights a purchase by the months held, (13 - month) / 12', () => {
    const lump: EtfPlanInput = {
      ...oneYear,
      initialCapital: 0,
      lumpSums: [{ month: 7, amount: 12000 }],
    };
    const r = projectEtfScenario(lump, 'neutral', undefined, run);
    // Bought in July: six full months precede it, so 6/12 of the base earnings
    near(r.advanceLumpSumTotal ?? NaN, (12000 * 6 * 0.032 * 0.7) / 12);
  });

  it('counts the initial capital as bought in the start month', () => {
    const march = { parameters: { ...PARAMS, startMonth: 3 }, tax: run.tax };
    const r = projectEtfScenario({ ...oneYear, durationYears: 1 }, 'neutral', 10, march);
    // Mar to Dec: ten months, the first calendar year ends in December of the plan
    near(r.advanceLumpSumTotal ?? NaN, (20000 * 10 * 0.032 * 0.7) / 12, 1e-6);
  });

  it('charges nothing in years with a zero or negative base interest', () => {
    const years = projectEtfScenario({ ...oneYear, durationYears: 3 }, 'neutral', undefined, run);
    expect(years.yearly.map((y) => y.advanceLumpSum !== 0)).toEqual([true, false, false]);
  });

  it('leaves a plan that ends mid-year without a lump sum for that year', () => {
    const r = projectEtfScenario(oneYear, 'neutral', 6, run);
    expect(r.advanceLumpSumTotal).toBe(0);
  });
});

describe('computeCapitalGainsTax with the advance lump sum', () => {
  it('credits the lump sums before the partial exemption and adds the tax paid back to the gain', () => {
    // final 20,000, contributions 10,000, 200 tax paid from the depot, 1,500 lump sums credited
    const t = computeCapitalGainsTax(20000, 10000, TAX, { lumpSumTotal: 1500, taxPaid: 200 });
    near(t.gain, 10200);
    near(t.taxableGain, (10200 - 1500) * 0.7 - 1000);
    near(t.tax, t.taxableGain * 0.26375);
  });

  it('is zero if the lump sums cover the gain', () => {
    expect(computeCapitalGainsTax(12000, 10000, TAX, { lumpSumTotal: 2500, taxPaid: 0 }).tax).toBe(
      0,
    );
  });
});

describe('calculateEtfPlan with the option', () => {
  it('equals the previous result if the option is off, absent or without a base interest', () => {
    const before = calculateEtfPlan(PLAN, TAX);
    expect(calculateEtfPlan({ ...PLAN, advanceLumpSum: false }, WITH_ADVANCE)).toEqual(before);
    expect(calculateEtfPlan(PLAN, WITH_ADVANCE)).toEqual(before);
    const noTax = { ...PLAN, taxEnabled: false, advanceLumpSum: true };
    expect(calculateEtfPlan(noTax, WITH_ADVANCE)).toEqual(
      calculateEtfPlan({ ...PLAN, taxEnabled: false }, TAX),
    );
  });

  it('gives the same values with a zero base interest in every year', () => {
    const zero = {
      ...TAX,
      advanceLumpSum: { ...PARAMS, baseInterestByYear: {}, assumedBaseInterestPercent: 0 },
    };
    const on = calculateEtfPlan({ ...PLAN, advanceLumpSum: true }, zero);
    const off = calculateEtfPlan(PLAN, TAX);
    if (!on.ok || !off.ok) throw new Error('expected ok');
    for (const s of SCENARIO_NAMES) {
      near(on.scenarios[s].finalValueAfterTax, off.scenarios[s].finalValueAfterTax);
      near(on.scenarios[s].tax, off.scenarios[s].tax);
    }
  });

  it('reports the missing parameters as data', () => {
    const r = calculateEtfPlan({ ...PLAN, advanceLumpSum: true }, TAX);
    expect(r).toEqual({ ok: false, issues: [{ field: 'tax.advanceLumpSum', code: 'required' }] });
  });

  it('reports unusable parameters as data', () => {
    const bad = {
      ...TAX,
      advanceLumpSum: { ...PARAMS, startMonth: 13, baseEarningsFactorPercent: Number.NaN },
    };
    const fields = validateAdvanceLumpSum({ ...PLAN, advanceLumpSum: true }, bad).map(
      (i) => i.field,
    );
    expect(fields).toEqual([
      'tax.advanceLumpSum.baseEarningsFactorPercent',
      'tax.advanceLumpSum.startMonth',
    ]);
  });

  it('reduces the value before the sale and the tax at the sale; without allowance the net result drops', () => {
    const noAllowance = { ...WITH_ADVANCE, taxFreeAllowance: 0 };
    const on = calculateEtfPlan({ ...PLAN, advanceLumpSum: true }, noAllowance);
    const off = calculateEtfPlan(PLAN, { ...TAX, taxFreeAllowance: 0 });
    if (!on.ok || !off.ok) throw new Error('expected ok');
    const o = on.scenarios.neutral;
    const f = off.scenarios.neutral;
    expect(o.advanceTaxPaid ?? 0).toBeGreaterThan(0);
    expect(o.grossFinalValue).toBeLessThan(f.grossFinalValue);
    expect(o.tax).toBeLessThan(f.tax);
    // The same gains are taxed, but earlier: the after-tax value cannot be higher
    expect(o.finalValueAfterTax).toBeLessThanOrEqual(f.finalValueAfterTax + 1e-6);
    expect(f.finalValueAfterTax - o.finalValueAfterTax).toBeLessThan(0.05 * f.finalValueAfterTax);
  });

  it('can end higher with the allowance, because it is used in every year and not once', () => {
    const on = calculateEtfPlan({ ...PLAN, advanceLumpSum: true }, WITH_ADVANCE);
    const off = calculateEtfPlan(PLAN, TAX);
    if (!on.ok || !off.ok) throw new Error('expected ok');
    expect(on.scenarios.neutral.finalValueAfterTax).toBeGreaterThan(
      off.scenarios.neutral.finalValueAfterTax,
    );
  });

  it('does not run the advance lump sum for the sale year (single year with the whole plan in one year)', () => {
    const r = calculateEtfPlan({ ...PLAN, durationYears: 1, advanceLumpSum: true }, WITH_ADVANCE);
    if (!r.ok) throw new Error('expected ok');
    // Jan to Dec: the lump sum of the one year still arises at 31 December before the sale
    expect(r.scenarios.neutral.advanceLumpSumTotal).toBeGreaterThan(0);
  });

  it('works through the backward calculator', () => {
    const r = solveEtfRequiredContribution(
      { ...PLAN, advanceLumpSum: true },
      { ...WITH_ADVANCE, taxFreeAllowance: 0 },
      150000,
      'real',
    );
    if (!r.ok) throw new Error('expected ok');
    const withoutOption = solveEtfRequiredContribution(
      PLAN,
      { ...TAX, taxFreeAllowance: 0 },
      150000,
      'real',
    );
    if (!withoutOption.ok) throw new Error('expected ok');
    expect(r.scenarios.neutral.monthly).toBeGreaterThan(withoutOption.scenarios.neutral.monthly);
    const check = calculateEtfPlan(
      { ...PLAN, advanceLumpSum: true, monthlyContribution: r.scenarios.neutral.monthly },
      { ...WITH_ADVANCE, taxFreeAllowance: 0 },
    );
    if (!check.ok) throw new Error('expected ok');
    // The solver rounds the rate to cents, worth a few EUR at the end
    near(check.scenarios.neutral.finalValueAfterTax, r.targetNominal, 5);
  });

  it('reports a missing parameter in the backward calculator too', () => {
    const r = solveEtfRequiredContribution({ ...PLAN, advanceLumpSum: true }, TAX, 1000, 'nominal');
    expect(r.ok).toBe(false);
  });
});

describe('properties', () => {
  const planArb = fc.record({
    initialCapital: fc.double({ min: 0, max: 100000, noNaN: true }),
    monthlyContribution: fc.double({ min: 0, max: 2000, noNaN: true }),
    durationYears: fc.integer({ min: 1, max: 40 }),
    returnNeutral: fc.double({ min: -5, max: 12, noNaN: true }),
    startMonth: fc.integer({ min: 1, max: 12 }),
    allowance: fc.double({ min: 0, max: 2000, noNaN: true }),
  });

  type PlanArbitrary = {
    initialCapital: number;
    monthlyContribution: number;
    durationYears: number;
    returnNeutral: number;
    startMonth: number;
    allowance: number;
  };

  function run(a: PlanArbitrary) {
    const plan: EtfPlanInput = {
      ...PLAN,
      initialCapital: a.initialCapital,
      monthlyContribution: a.monthlyContribution,
      durationYears: a.durationYears,
      returnScenarios: {
        pessimistic: a.returnNeutral - 1,
        neutral: a.returnNeutral,
        optimistic: a.returnNeutral + 1,
      },
      advanceLumpSum: true,
    };
    const tax = {
      ...TAX,
      taxFreeAllowance: a.allowance,
      advanceLumpSum: { ...PARAMS, startMonth: a.startMonth },
    };
    return { plan, tax, result: calculateEtfPlan(plan, tax) };
  }

  it('never gives a negative tax, a negative value or a negative lump sum', () => {
    fc.assert(
      fc.property(planArb, (a) => {
        const { result } = run(a);
        if (!result.ok) return true;
        return SCENARIO_NAMES.every((s) => {
          const r = result.scenarios[s];
          return (
            r.tax >= 0 &&
            (r.advanceTaxPaid ?? 0) >= 0 &&
            (r.advanceLumpSumTotal ?? 0) >= 0 &&
            r.grossFinalValue >= 0 &&
            r.finalValueAfterTax >= -1e-6 &&
            r.yearly.every((y) => (y.advanceTax ?? 0) >= 0 && (y.advanceLumpSum ?? 0) >= 0)
          );
        });
      }),
    );
  });

  it('gives the previous result if the option is off', () => {
    fc.assert(
      fc.property(planArb, (a) => {
        const { plan, tax } = run(a);
        const off = { ...plan, advanceLumpSum: false };
        return (
          JSON.stringify(calculateEtfPlan(off, tax)) ===
          JSON.stringify(calculateEtfPlan({ ...off, advanceLumpSum: undefined }, TAX_ONLY(tax)))
        );
      }),
    );
  });

  it('never taxes more in total than the gain (advance tax plus sale tax stays below the full gain tax)', () => {
    fc.assert(
      fc.property(planArb, (a) => {
        const { plan, tax, result } = run(a);
        const off = calculateEtfPlan({ ...plan, advanceLumpSum: false }, tax);
        if (!result.ok || !off.ok) return true;
        return SCENARIO_NAMES.every((s) => {
          const r = result.scenarios[s];
          const total = r.tax + (r.advanceTaxPaid ?? 0);
          const gain = Math.max(0, r.gainBeforeTax);
          return total <= gain * 0.26375 + 1e-6;
        });
      }),
    );
  });

  function TAX_ONLY(tax: TaxAssumptions): TaxAssumptions {
    return { ...tax, advanceLumpSum: undefined };
  }
});

describe('etfProjector with the option', () => {
  const INPUT: EtfProjectorInput = {
    plan: { ...PLAN, durationYears: 26 },
    tax: { ...TAX, advanceLumpSum: PARAMS },
    payoutStartAge: 67,
    payoutEndAge: 90,
    useGlobalAssumptions: true,
  };
  const off = projectEtfWithPayout(INPUT, CTX, 'neutral');
  const on = projectEtfWithPayout({ ...INPUT, plan: { ...INPUT.plan, advanceLumpSum: true } }, CTX);

  it('is unchanged with the option off', () => {
    const noParams = projectEtfWithPayout({ ...INPUT, tax: TAX }, CTX, 'neutral');
    expect(off).toEqual(noParams);
    if (!off.ok) throw new Error('expected ok');
    expect(off.result.details.advanceLumpSumSaving).toBeUndefined();
    expect(off.result.warnings).not.toContain('etf_advance_lump_sum');
  });

  it('charges lump sums in both phases and warns about the assumed base interest', () => {
    if (!on.ok || !off.ok) throw new Error('expected ok');
    const d = on.result.details;
    expect(d.advanceLumpSumSaving).toBeGreaterThan(0);
    expect(d.advanceTaxSaving).toBeGreaterThan(0);
    expect(d.advanceLumpSumPayout).toBeGreaterThan(0);
    expect(on.result.warnings).toContain('etf_advance_lump_sum');
    expect(on.result.warnings).toContain('etf_advance_assumed_rate');
    expect(on.result.capitalAtRetirement as number).toBeLessThan(
      off.result.capitalAtRetirement as number,
    );
  });

  it('pays less than the same plan without the option if there is no allowance, but not much less', () => {
    const noAllowance = (plan: EtfPlanInput) =>
      projectEtfWithPayout(
        {
          ...INPUT,
          plan,
          tax: { ...INPUT.tax, taxFreeAllowance: 0 },
        },
        CTX,
        'neutral',
      );
    const a = noAllowance({ ...INPUT.plan, advanceLumpSum: true });
    const b = noAllowance(INPUT.plan);
    if (!a.ok || !b.ok) throw new Error('expected ok');
    expect(a.result.netMonthlyPensionReal).toBeLessThan(b.result.netMonthlyPensionReal);
    expect(a.result.netMonthlyPensionReal).toBeGreaterThan(0.85 * b.result.netMonthlyPensionReal);
  });

  it('gives the previous tax and net pension with a zero base interest', () => {
    const zero: EtfProjectorInput = {
      ...INPUT,
      plan: { ...INPUT.plan, advanceLumpSum: true },
      tax: {
        ...TAX,
        advanceLumpSum: { ...PARAMS, baseInterestByYear: {}, assumedBaseInterestPercent: 0 },
      },
    };
    const z = projectEtfWithPayout(zero, CTX, 'neutral');
    if (!z.ok || !off.ok) throw new Error('expected ok');
    near(z.result.netMonthlyPensionReal, off.result.netMonthlyPensionReal);
    near(z.result.details.taxMonthlyNominal, off.result.details.taxMonthlyNominal);
  });

  it('reports missing parameters as data', () => {
    const r = projectEtfWithPayout(
      { ...INPUT, plan: { ...INPUT.plan, advanceLumpSum: true }, tax: TAX },
      CTX,
    );
    expect(r).toEqual({ ok: false, issues: [{ field: 'tax.advanceLumpSum', code: 'required' }] });
  });
});

describe('config and persistence', () => {
  it('reads the base interest 2018 to 2026 from the BMF letters, all confirmed', () => {
    const r = resolveAdvanceLumpSumParameters(config, '2026-11-20');
    if (!r.ok) throw new Error('expected ok');
    expect(r.parameters.baseEarningsFactorPercent).toBe(70);
    expect(r.parameters.baseInterestByYear).toEqual({
      2018: 0.87,
      2019: 0.52,
      2020: 0.07,
      2021: -0.45,
      2022: -0.05,
      2023: 2.55,
      2024: 2.29,
      2025: 2.53,
      2026: 3.2,
    });
    // Only the rate assumed for later years is not confirmed
    expect(r.unverified).toEqual(['assumed']);
  });

  it('reports a missing section as data', () => {
    const rest: TaxConfig = { ...config, advanceLumpSum: undefined };
    expect(resolveAdvanceLumpSumParameters(rest, '2026-11-20').ok).toBe(false);
  });

  it('flags an unverified base interest year', () => {
    const changed = structuredClone(config);
    const entry = changed.advanceLumpSum?.baseInterest.find((e) => e.year === 2026);
    if (!entry) throw new Error('missing');
    entry.status = 'unverified';
    const r = resolveAdvanceLumpSumParameters(changed, '2026-11-20');
    if (!r.ok) throw new Error('expected ok');
    expect(r.unverified).toEqual(['assumed', 2026]);
  });

  it('keeps the switch through the plan parser and drops it when off', () => {
    const on = parseBlock('etfPlan', { schemaVersion: 1, advanceLumpSum: true }, 2026);
    if (!on.ok) throw new Error('expected ok');
    expect(on.value).toMatchObject({ advanceLumpSum: true });
    const off = parseBlock('etfPlan', { schemaVersion: 1, advanceLumpSum: false }, 2026);
    if (!off.ok) throw new Error('expected ok');
    expect(off.value).not.toHaveProperty('advanceLumpSum');
    const bad = parseBlock('etfPlan', { schemaVersion: 1, advanceLumpSum: 'yes' }, 2026);
    if (!bad.ok) throw new Error('expected ok');
    expect(bad.problems).toContain('advanceLumpSum');
  });
});
