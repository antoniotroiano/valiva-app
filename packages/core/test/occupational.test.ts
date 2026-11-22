import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  employerSubsidy,
  incomeTax,
  netPension,
  occupationalNetEffort,
  projectOccupational,
  validateOccupational,
} from '../src';
import type { OccupationalInput, ProjectionContext } from '../src';
import { ASSUMPTIONS, CTX, LEGAL } from './pensionFixtures';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

const INPUT: OccupationalInput = {
  employeeContributionMonthlyGross: 200,
  employerSubsidyMode: 'auto15',
  employerContributionMonthly: 0,
  costPercentPerYear: 1,
  startMonth: '2027-01',
  payoutStartAge: 67,
  payoutEndAge: 85,
};

const ctx = (over: Partial<ProjectionContext> = {}): ProjectionContext => ({ ...CTX, ...over });

function project(
  over: Partial<OccupationalInput> = {},
  c = ctx(),
  scenario: 'neutral' | 'pessimistic' | 'optimistic' = 'neutral',
) {
  const r = projectOccupational({ ...INPUT, ...over }, c, scenario);
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
  return r.result;
}

describe('occupational: subsidy and net effort', () => {
  const at = (conv: number) => ({ ...INPUT, employeeContributionMonthlyGross: conv });
  it('subsidy is 15 % of the conversion up to 338 EUR', () => {
    near(employerSubsidy(at(0), LEGAL), 0);
    near(employerSubsidy(at(200), LEGAL), 30);
    near(employerSubsidy(at(338), LEGAL), 50.7);
    near(employerSubsidy(at(339), LEGAL), 50.7);
    near(employerSubsidy(at(676), LEGAL), 50.7);
  });
  it('uses the custom subsidy as entered, without cap', () => {
    const i: OccupationalInput = {
      ...at(600),
      employerSubsidyMode: 'custom',
      employerSubsidyCustomMonthly: 90,
    };
    near(employerSubsidy(i, LEGAL), 90);
  });
  it('net effort at the limits 338 and 676 EUR', () => {
    const e = (c: number) => occupationalNetEffort(c, ASSUMPTIONS, LEGAL);
    near(e(200).net, 200 - 70 - 40);
    // 338: both savings fully used on the SV side
    near(e(338).socialSaving, 67.6);
    near(e(338).taxSaving, 118.3);
    // 339: SV saving stops growing, tax saving still grows
    near(e(339).socialSaving, 67.6);
    near(e(339).taxSaving, 118.65);
    // 676 and above: both capped
    near(e(676).taxSaving, 236.6);
    near(e(676).net, 676 - 236.6 - 67.6);
    near(e(0).net, 0);
  });
  it('rates of 0 mean no saving', () => {
    const a = {
      ...ASSUMPTIONS,
      marginalTaxRateTodayPercent: 0,
      employeeSocialInsuranceRatePercent: 0,
    };
    near(occupationalNetEffort(300, a, LEGAL).net, 300);
  });
});

describe('occupational: savings phase', () => {
  it('ends in December before the year birth year + payout start age', () => {
    const r = project();
    // 2027-01 to 2051-12 = 300 months, payout in 2052
    expect(r.series.length - 1).toBe(300);
    expect(r.details.payoutYear).toBe(2052);
    expect(r.details.yearly.at(-1)?.year).toBe(2051);
    expect(r.details.yearly[0]?.year).toBe(2027);
  });
  it('matches the closed formula for a constant rate', () => {
    const r = project();
    const g = Math.pow(1 + 0.04, 1 / 12);
    const rate = 230;
    near(r.capitalAtRetirement as number, (rate * g * (Math.pow(g, 300) - 1)) / (g - 1), 1e-6);
    near(r.details.intoContractMonthly, 230);
    near(r.details.employeeTotal, 60000);
    near(r.details.subsidyTotal, 9000);
  });
  it('adds the employer extra contribution', () => {
    const r = project({ employerContributionMonthly: 20 });
    near(r.details.intoContractMonthly, 250);
    near(r.details.employerExtraTotal, 6000);
  });
  it('counts a mid-year start correctly', () => {
    expect(project({ startMonth: '2030-07' }).series.length - 1).toBe((2052 - 2030) * 12 - 6);
  });
  it('with zero return and zero costs the capital equals the contributions', () => {
    const c = ctx({
      assumptions: {
        ...ASSUMPTIONS,
        returnScenarios: { pessimistic: 0, neutral: 0, optimistic: 0 },
      },
    });
    const r = project({ costPercentPerYear: 0 }, c);
    near(r.capitalAtRetirement as number, 69000, 1e-6);
  });
});

describe('occupational: payout and deductions', () => {
  it('pays the plan rate; nominal and real differ by the inflation factor', () => {
    const r = project();
    near(r.monthlyPensionReal, r.monthlyPensionNominal / r.details.inflationFactor);
    near(r.details.inflationFactor, Math.pow(1.02, 26));
  });
  const at = (gross: number) =>
    netPension(gross, 'occupational', { retirementYear: 2030, realFactor: 1 }, ASSUMPTIONS, LEGAL);
  it('health allowance: nothing at 197.75, full rate on the excess above', () => {
    near(at(197.75).health, 0);
    near(at(197.76).health, 0.01 * 0.175, 1e-9);
    near(at(1000).health, (1000 - 197.75) * 0.175);
  });
  it('care threshold is all or nothing at 197.75 / 197.76', () => {
    expect(at(197.75).care).toBe(0);
    near(at(197.76).care, 197.76 * 0.036, 1e-9);
    near(at(500).care, 500 * 0.036);
  });
  it('childless people pay the higher care rate', () => {
    const a = { ...ASSUMPTIONS, health: { ...ASSUMPTIONS.health, childless: true } };
    near(
      netPension(500, 'occupational', { retirementYear: 2030, realFactor: 1 }, a, LEGAL).care,
      500 * 0.042,
    );
  });
  it('other insurance pays its rate on the whole pension and no separate care', () => {
    const a = {
      ...ASSUMPTIONS,
      health: {
        mode: 'other' as const,
        otherRatePercent: 11,
        additionalRatePercent: 2.9,
        childless: false,
      },
    };
    const n = netPension(300, 'occupational', { retirementYear: 2030, realFactor: 1 }, a, LEGAL);
    near(n.health, 33);
    expect(n.care).toBe(0);
  });
  it('scales allowance and threshold with thresholdScale', () => {
    const n = netPension(
      300,
      'occupational',
      { retirementYear: 2030, thresholdScale: 2, realFactor: 2 },
      ASSUMPTIONS,
      LEGAL,
    );
    expect(n.care).toBe(0); // 300 < 395.5
    expect(n.health).toBe(0);
  });
  it('taxes the pension in full with the tariff on the sum', () => {
    const n = at(3000);
    const taxable = 36000 - 102 - n.contributions * 12 - 36;
    near(n.tax, incomeTax(taxable, LEGAL.incomeTax) / 12, 1e-9);
    expect(n.taxableSharePercent).toBe(100);
    expect(n.taxable).toBe(3000);
    near(n.net, 3000 - n.tax - n.health - n.care);
  });
});

describe('occupational: guarantee', () => {
  const stress = ctx({
    assumptions: {
      ...ASSUMPTIONS,
      returnScenarios: { pessimistic: -2, neutral: 1, optimistic: 3 },
    },
  });
  it('floor applies with weak returns', () => {
    const without = project({}, stress, 'pessimistic');
    const withG = project({ guaranteedRatePercent: 2 }, stress, 'pessimistic');
    expect(withG.details.guaranteeActive).toBe(true);
    near(withG.details.netReturnPercentUsed, 2);
    expect(withG.capitalAtRetirement as number).toBeGreaterThan(
      without.capitalAtRetirement as number,
    );
    expect(without.details.guaranteeActive).toBe(false);
  });
  it('does not apply with a normal return', () => {
    const r = project({ guaranteedRatePercent: 2 });
    expect(r.details.guaranteeActive).toBe(false);
    near(r.details.netReturnPercentUsed, 4);
    near(r.capitalAtRetirement as number, project().capitalAtRetirement as number);
  });
});

describe('occupational: warnings', () => {
  it('lists unverified thresholds for compulsory members only', () => {
    const unverified = ctx({
      legal: {
        ...LEGAL,
        unverified: [
          'social.occupationalHealthAllowanceMonthly',
          'social.occupationalCareThresholdMonthly',
        ],
      },
    });
    const w = project({}, unverified).warnings;
    expect(project().warnings).not.toContain(
      'unverified:social.occupationalHealthAllowanceMonthly',
    );
    expect(w).toContain('unverified:social.occupationalHealthAllowanceMonthly');
    expect(w).toContain('unverified:social.occupationalCareThresholdMonthly');
    expect(w).toContain('thresholds_indexed');
    const other = ctx({
      legal: unverified.legal,
      assumptions: {
        ...ASSUMPTIONS,
        health: {
          mode: 'other',
          otherRatePercent: 11,
          additionalRatePercent: 2.9,
          childless: false,
        },
      },
    });
    expect(project({}, other).warnings).not.toContain(
      'unverified:social.occupationalCareThresholdMonthly',
    );
  });
});

describe('occupational: validation', () => {
  const codes = (over: Partial<OccupationalInput>) =>
    validateOccupational({ ...INPUT, ...over }, CTX).map((i) => `${i.field}:${i.code}`);
  it('accepts the base input', () => expect(codes({})).toEqual([]));
  it('conversion 0 to 676', () => {
    expect(codes({ employeeContributionMonthlyGross: 676 })).toEqual([]);
    expect(codes({ employeeContributionMonthlyGross: 677 })).toEqual([
      'employeeContributionMonthlyGross:out_of_range',
    ]);
    expect(codes({ employeeContributionMonthlyGross: -1 })).toEqual([
      'employeeContributionMonthlyGross:negative',
    ]);
    expect(codes({ employeeContributionMonthlyGross: Number.NaN })).toEqual([
      'employeeContributionMonthlyGross:not_finite',
    ]);
  });
  it('payout start 62 to 70, end after start', () => {
    expect(codes({ payoutStartAge: 61 })).toEqual(['payoutStartAge:out_of_range']);
    expect(codes({ payoutStartAge: 62 })).toEqual([]);
    expect(codes({ payoutStartAge: 71 })).toEqual(['payoutStartAge:out_of_range']);
    expect(codes({ payoutEndAge: 67 })).toEqual(['payoutEndAge:out_of_range']);
    expect(codes({ payoutEndAge: 121 })).toEqual(['payoutEndAge:out_of_range']);
  });
  it('start month before the payout and valid', () => {
    expect(codes({ startMonth: '2052-01' })).toEqual(['startMonth:not_after_start']);
    expect(codes({ startMonth: '2051-12' })).toEqual([]);
    expect(codes({ startMonth: 'x' })).toEqual(['startMonth:invalid_month']);
  });
  it('custom subsidy, extra contribution, costs and guarantee', () => {
    expect(codes({ employerSubsidyMode: 'custom' })).toEqual([
      'employerSubsidyCustomMonthly:not_finite',
    ]);
    expect(codes({ employerContributionMonthly: -1 })).toEqual([
      'employerContributionMonthly:out_of_range',
    ]);
    expect(codes({ costPercentPerYear: 101 })).toEqual(['costPercentPerYear:out_of_range']);
    expect(codes({ guaranteedRatePercent: -51 })).toEqual(['guaranteedRatePercent:out_of_range']);
  });
  it('returns the issues instead of a result', () => {
    const r = projectOccupational({ ...INPUT, payoutStartAge: 50 }, CTX);
    expect(r.ok).toBe(false);
  });
});

describe('occupational: properties', () => {
  const arb = fc.record({
    conv: fc.integer({ min: 0, max: 675 }),
    cost: fc.double({ min: 0, max: 3, noNaN: true }),
    ret: fc.double({ min: 0, max: 9, noNaN: true }),
  });
  const run = (conv: number, cost: number, ret: number) => {
    const c = ctx({
      assumptions: {
        ...ASSUMPTIONS,
        returnScenarios: { pessimistic: ret, neutral: ret, optimistic: ret },
      },
    });
    return project({ employeeContributionMonthlyGross: conv, costPercentPerYear: cost }, c);
  };
  it('capital is monotone in contribution and return, net never exceeds gross', () => {
    fc.assert(
      fc.property(arb, ({ conv, cost, ret }) => {
        const r = run(conv, cost, ret);
        const more = run(conv + 1, cost, ret);
        const better = run(conv, cost, ret + 0.5);
        expect(more.capitalAtRetirement as number).toBeGreaterThanOrEqual(
          r.capitalAtRetirement as number,
        );
        expect(better.capitalAtRetirement as number).toBeGreaterThanOrEqual(
          r.capitalAtRetirement as number,
        );
        expect(r.netMonthlyPensionReal).toBeLessThanOrEqual(r.monthlyPensionReal + 1e-9);
      }),
    );
  });
  it('higher costs lower the pension', () => {
    fc.assert(
      fc.property(arb, ({ conv, cost, ret }) => {
        fc.pre(conv > 0);
        expect(run(conv, cost + 0.5, ret).monthlyPensionNominal).toBeLessThan(
          run(conv, cost, ret).monthlyPensionNominal,
        );
      }),
    );
  });
});

describe('net return of -100 % or less', () => {
  const low = {
    ...CTX,
    assumptions: {
      ...ASSUMPTIONS,
      returnScenarios: { pessimistic: -50, neutral: -50, optimistic: -50 },
    },
  };

  it('is a validation issue, never NaN', () => {
    const input = { ...INPUT, costPercentPerYear: 100 };
    expect(validateOccupational(input, low).some((i) => i.field === 'costPercentPerYear')).toBe(
      true,
    );
    expect(projectOccupational(input, low).ok).toBe(false);
  });

  it('is fine when a guaranteed rate lifts the net return', () => {
    const input = { ...INPUT, costPercentPerYear: 100, guaranteedRatePercent: 0 };
    expect(validateOccupational(input, low)).toEqual([]);
  });
});

describe('occupational: effects on the statutory pension and the tax-free limit', () => {
  it('estimates the lost entitlement points of the converted pay', () => {
    const r = project();
    // Entitlement points lost = conversion x months / average earnings; each point is worth 42,52 EUR.
    const months = r.series.length - 1;
    near(r.details.statutoryLossMonthlyToday, (200 * months * 42.52) / 51944, 1e-9);
  });
  it('counts only the part below the social-insurance-free limit', () => {
    const capped = project({ employeeContributionMonthlyGross: 676 });
    const atLimit = project({ employeeContributionMonthlyGross: 338 });
    near(capped.details.statutoryLossMonthlyToday, atLimit.details.statutoryLossMonthlyToday, 1e-9);
  });
  it('is 0 without conversion', () => {
    expect(project({ employeeContributionMonthlyGross: 0 }).details.statutoryLossMonthlyToday).toBe(
      0,
    );
  });
  it('warns when conversion, subsidy and employer contribution exceed the tax-free limit', () => {
    expect(project().warnings).not.toContain('contributions_above_tax_free');
    const over = project({
      employeeContributionMonthlyGross: 600,
      employerContributionMonthly: 100,
    });
    expect(over.warnings).toContain('contributions_above_tax_free');
  });
});

describe('occupational: rising conversion', () => {
  it('a rise of 0 or none changes nothing', () => {
    const base = project();
    const zero = project({ annualContributionIncreasePercent: 0 });
    near(zero.capitalAtRetirement as number, base.capitalAtRetirement as number, 1e-9);
    near(zero.details.statutoryLossMonthlyToday, base.details.statutoryLossMonthlyToday, 1e-9);
  });
  it('raises conversion and the automatic subsidy every January, capped at the tax-free limit', () => {
    const r = project({
      employeeContributionMonthlyGross: 300,
      annualContributionIncreasePercent: 50,
    });
    expect(r.warnings).toContain('conversion_capped_at_tax_free_limit');
    expect(r.details.employeeTotal).toBeLessThanOrEqual(676 * (r.series.length - 1) + 1e-6);
    expect(r.details.employeeTotal).toBeGreaterThan(300 * (r.series.length - 1));
    expect(r.details.subsidyTotal).toBeGreaterThan(0.15 * 300 * (r.series.length - 1));
  });
  it('keeps a custom subsidy and the employer contribution constant', () => {
    const r = project({
      employerSubsidyMode: 'custom',
      employerSubsidyCustomMonthly: 25,
      employerContributionMonthly: 20,
      annualContributionIncreasePercent: 10,
    });
    near(r.details.subsidyTotal, 25 * (r.series.length - 1), 1e-9);
    near(r.details.employerExtraTotal, 20 * (r.series.length - 1), 1e-9);
  });
  it('rejects a negative rise', () => {
    const fields = validateOccupational(
      { ...INPUT, annualContributionIncreasePercent: -1 },
      CTX,
    ).map((i) => i.field);
    expect(fields).toContain('annualContributionIncreasePercent');
  });
});
