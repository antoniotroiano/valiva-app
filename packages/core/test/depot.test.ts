import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { allowanceForYear, netPension, payoutPlan, projectDepot, validateDepot } from '../src';
import type { AllowanceContext, DepotInput, ProjectionContext } from '../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE } from './pensionFixtures';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

const KIDS: AllowanceContext = {
  year: 2030,
  birthYear: 1985,
  childrenBirthYears: [2015, 2018],
  isFirstContributionYear: false,
};
const NO_KIDS: AllowanceContext = { ...KIDS, childrenBirthYears: [] };

const INPUT: DepotInput = {
  ownContributionMonthly: 150,
  startMonth: '2027-01',
  variant: 'standard',
  costPercentPerYear: 1,
  payoutStartAge: 67,
  payoutEndAge: 85,
  lumpSumSharePercent: 0,
};

const ctx = (over: Partial<ProjectionContext> = {}): ProjectionContext => ({ ...CTX, ...over });

function project(
  over: Partial<DepotInput> = {},
  c = ctx(),
  scenario: 'neutral' | 'pessimistic' | 'optimistic' = 'neutral',
) {
  const r = projectDepot({ ...INPUT, ...over }, c, scenario);
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
  return r.result;
}

describe('allowance table', () => {
  const cases: [number, number, number][] = [
    // contribution per year, basic grant, child grant per child
    [0, 0, 0],
    [119, 0, 0],
    [120, 60, 120],
    [359, 179.5, 300],
    [360, 180, 300],
    [1800, 540, 300],
    [2400, 540, 300],
  ];
  for (const [a, basic, child] of cases) {
    it(`A = ${a}: basic ${basic}, child ${child} per child`, () => {
      const noKids = allowanceForYear(a, NO_KIDS, LEGAL);
      near(noKids.basic, basic);
      near(noKids.child, 0);
      near(noKids.total, basic);
      const kids = allowanceForYear(a, KIDS, LEGAL);
      near(kids.child, child * 2);
      near(kids.total, basic + child * 2);
    });
  }
  it('jumps from 0 to 60 + children between 119 and 120', () => {
    expect(allowanceForYear(119, KIDS, LEGAL).total).toBe(0);
    expect(allowanceForYear(120, KIDS, LEGAL).total).toBe(60 + 240);
    expect(allowanceForYear(119, KIDS, LEGAL).belowMinimum).toBe(true);
  });
  it('reports the unclaimed basic grant', () => {
    near(allowanceForYear(600, NO_KIDS, LEGAL).basicGrantMissed, 300);
    near(allowanceForYear(1800, NO_KIDS, LEGAL).basicGrantMissed, 0);
    near(allowanceForYear(0, NO_KIDS, LEGAL).basicGrantMissed, 540);
  });
  it('pays the bonus only in the first year and only under 25', () => {
    const young = { ...NO_KIDS, birthYear: 2005, year: 2027, isFirstContributionYear: true };
    expect(allowanceForYear(1800, young, LEGAL).bonus).toBe(200);
    expect(allowanceForYear(1800, { ...young, isFirstContributionYear: false }, LEGAL).bonus).toBe(
      0,
    );
    // age 25 at the start of the year: 2027 - 2002
    expect(allowanceForYear(1800, { ...young, birthYear: 2002 }, LEGAL).bonus).toBe(0);
    expect(allowanceForYear(1800, { ...young, birthYear: 2003 }, LEGAL).bonus).toBe(200);
    expect(allowanceForYear(100, young, LEGAL).bonus).toBe(0);
  });
  it('pays the child grant only while the child is under 18', () => {
    const k = (year: number) => allowanceForYear(1800, { ...KIDS, year }, LEGAL).child;
    expect(k(2032)).toBe(600);
    expect(k(2033)).toBe(300);
    expect(k(2035)).toBe(300);
    expect(k(2036)).toBe(0);
    expect(k(2014)).toBe(0);
  });
});

describe('depot: savings phase and grants', () => {
  it('matches the mockup values (150 EUR, two children, neutral)', () => {
    const r = project({}, ctx({ profile: { ...PROFILE, childrenBirthYears: [2015, 2018] } }));
    near(r.details.ownTotal, 45000);
    near(r.details.allowanceTotal, 18000);
    expect(Math.round(r.capitalAtRetirement as number)).toBe(109205);
    expect(Math.round(r.monthlyPensionNominal)).toBe(602);
    expect(Math.round(r.netMonthlyPensionReal)).toBe(359); // 359 real gross, below the allowances: no income tax
  });
  it('credits the grant at year end and compounds it afterwards', () => {
    const zero = ctx({
      assumptions: {
        ...ASSUMPTIONS,
        returnScenarios: { pessimistic: 0, neutral: 0, optimistic: 0 },
      },
    });
    const r = project({ ownContributionMonthly: 150, costPercentPerYear: 0 }, zero);
    expect(r.series[11]!.value).toBe(1650);
    expect(r.series[12]!.value).toBe(1800 + 540);
    near(r.details.yearly[0]!.valueEnd, 1800 + 540);
  });
  it('starts mid-year with a partial first year', () => {
    const r = project({ startMonth: '2027-07', ownContributionMonthly: 100 });
    near(r.details.yearly[0]!.contributions, 600);
    near(r.details.yearly[0]!.basic, 0.5 * 360 + 0.25 * 240);
    near(r.details.ownTotal, 100 * (6 + 24 * 12));
  });
  it('caps the cost of the standard depot at the config value and warns', () => {
    const capped = project({ costPercentPerYear: 2 });
    expect(capped.details.costPercentUsed).toBe(1);
    expect(capped.warnings).toContain('cost_capped');
    near(
      capped.capitalAtRetirement as number,
      project({ costPercentPerYear: 1 }).capitalAtRetirement as number,
    );
    const free = project({ variant: 'noGuarantee', costPercentPerYear: 2 });
    expect(free.details.costPercentUsed).toBe(2);
  });
  it('warns about unverified assumptions', () => {
    const r = project({}, ctx({ profile: { ...PROFILE, childrenBirthYears: [2018] } }));
    expect(r.warnings).toContain('unverified:depot.childGrantMaxAge');
    expect(r.warnings).toContain('unverified:depot.payoutTaxation');
    expect(r.warnings).toContain('unverified:depot.noHealthContributions');
  });
});

describe('depot: guarantee', () => {
  it('lifts the capital to 80 % of contributions plus grants at -2 % return', () => {
    const r = project({ variant: 'guarantee80', returnOverridePercent: -2 });
    near(r.details.guaranteeFloor, 0.8 * (r.details.ownTotal + r.details.allowanceTotal));
    expect(r.details.guaranteeActive).toBe(true);
    near(r.capitalAtRetirement as number, r.details.guaranteeFloor);
    expect(r.details.modelCapital).toBeLessThan(r.details.guaranteeFloor);
  });
  it('does not apply at a normal return', () => {
    const r = project({ variant: 'guarantee80', returnOverridePercent: 5 });
    expect(r.details.guaranteeActive).toBe(false);
    near(r.capitalAtRetirement as number, r.details.modelCapital);
  });
  it('guarantee 100 % at 0 % return covers contributions and grants', () => {
    const r = project({ variant: 'guarantee100', returnOverridePercent: 0, costPercentPerYear: 1 });
    near(r.capitalAtRetirement as number, r.details.ownTotal + r.details.allowanceTotal);
  });
  it('ignores the override for variants without guarantee', () => {
    const a = project({ variant: 'noGuarantee', returnOverridePercent: -2 });
    const b = project({ variant: 'noGuarantee' });
    near(a.capitalAtRetirement as number, b.capitalAtRetirement as number);
  });
});

describe('depot: payout', () => {
  it('splits a lump sum and pays the rest as a plan', () => {
    const r = project({ lumpSumSharePercent: 30 });
    near(r.details.lumpSumGross, 0.3 * (r.capitalAtRetirement as number));
    near(r.details.planCapital, 0.7 * (r.capitalAtRetirement as number));
    const plan = payoutPlan(r.details.planCapital, 67, 85, ASSUMPTIONS.payoutPhaseReturnPercent);
    if (!plan.ok) throw new Error('plan');
    near(r.monthlyPensionNominal, plan.plan.monthly);
    near(plan.plan.remaining[plan.plan.months]!, 0, 1e-6);
    expect(r.lumpSum).toBeDefined();
  });
  it('has no lump sum object at 0 %', () => {
    expect(project().lumpSum).toBeUndefined();
  });
  it('taxes the depot in full and charges no contributions to compulsory members', () => {
    const n = netPension(
      3000,
      'retirementDepot',
      { retirementYear: 2052, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    // 36.000 - 102 - 36 = 35.862 taxable income; tariff zone 3 gives 5.929 per year.
    near(n.tax, 5929 / 12, 1e-9);
    near(n.contributions, 0);
    near(n.net, 3000 - 5929 / 12, 1e-9);
  });
  it('charges no income tax below the allowances', () => {
    const n = netPension(
      1000,
      'retirementDepot',
      { retirementYear: 2052, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    expect(n.tax).toBe(0);
    near(n.net, 1000);
  });
  it('charges the own rate for other health insurance', () => {
    const a = {
      ...ASSUMPTIONS,
      health: {
        mode: 'other' as const,
        otherRatePercent: 11,
        additionalRatePercent: 2.9,
        childless: false,
      },
    };
    const n = netPension(
      1000,
      'retirementDepot',
      { retirementYear: 2052, realFactor: 1 },
      a,
      LEGAL,
    );
    near(n.health, 110);
    near(n.net, 890);
  });
});

describe('depot: validation', () => {
  const issues = (over: Partial<DepotInput>, c = CTX) => validateDepot({ ...INPUT, ...over }, c);
  it('accepts the base input', () => expect(issues({})).toEqual([]));
  it('limits the contribution to 6,840 per year', () => {
    expect(issues({ ownContributionMonthly: 570 })).toEqual([]);
    expect(issues({ ownContributionMonthly: 570.01 }).map((i) => i.field)).toContain(
      'ownContributionMonthly',
    );
    expect(issues({ ownContributionMonthly: -1 })[0]!.code).toBe('negative');
  });
  it('rejects a start before 2027', () => {
    expect(issues({ startMonth: '2026-12' })[0]!.code).toBe('before_first_contribution_year');
    expect(issues({ startMonth: '2027-1' })[0]!.code).toBe('invalid_month');
    expect(issues({ startMonth: '2027-01' })).toEqual([]);
  });
  it('limits the payout start to 65-70 and the end to 85+', () => {
    expect(issues({ payoutStartAge: 64 })[0]!.field).toBe('payoutStartAge');
    expect(issues({ payoutStartAge: 71 })[0]!.field).toBe('payoutStartAge');
    expect(issues({ payoutEndAge: 84 })[0]!.field).toBe('payoutEndAge');
    expect(issues({ payoutStartAge: 70, payoutEndAge: 85 })).toEqual([]);
  });
  it('limits the lump sum to 0-30 %', () => {
    expect(issues({ lumpSumSharePercent: 31 })[0]!.field).toBe('lumpSumSharePercent');
    expect(issues({ lumpSumSharePercent: -1 })[0]!.field).toBe('lumpSumSharePercent');
  });
  it('rejects a start at or after the payout', () => {
    const late = issues({ startMonth: '2052-01' });
    expect(late.map((i) => i.code)).toContain('not_after_start');
  });
  it('returns issues instead of throwing', () => {
    const r = projectDepot({ ...INPUT, ownContributionMonthly: Number.NaN }, CTX);
    expect(r.ok).toBe(false);
  });
});

describe('depot: properties', () => {
  const scenarios = fc.record({
    monthly: fc.integer({ min: 0, max: 570 }),
    cost: fc.double({ min: 0, max: 1, noNaN: true }),
  });
  it('capital grows with the contribution', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 560 }), fc.integer({ min: 1, max: 10 }), (m, d) => {
        const lo = project({ ownContributionMonthly: m, variant: 'noGuarantee' });
        const hi = project({ ownContributionMonthly: m + d, variant: 'noGuarantee' });
        expect(hi.capitalAtRetirement as number).toBeGreaterThanOrEqual(
          lo.capitalAtRetirement as number,
        );
      }),
    );
  });
  it('capital grows with the return', () => {
    const p = project({}, ctx(), 'pessimistic').capitalAtRetirement as number;
    const n = project({}, ctx(), 'neutral').capitalAtRetirement as number;
    const o = project({}, ctx(), 'optimistic').capitalAtRetirement as number;
    expect(p).toBeLessThan(n);
    expect(n).toBeLessThan(o);
  });
  it('higher costs lower the pension; net never exceeds gross', () => {
    fc.assert(
      fc.property(scenarios, ({ monthly, cost }) => {
        const a = project({
          ownContributionMonthly: monthly,
          variant: 'noGuarantee',
          costPercentPerYear: cost,
        });
        const b = project({
          ownContributionMonthly: monthly,
          variant: 'noGuarantee',
          costPercentPerYear: cost + 0.5,
        });
        expect(b.monthlyPensionNominal).toBeLessThanOrEqual(a.monthlyPensionNominal + 1e-9);
        expect(a.netMonthlyPensionReal).toBeLessThanOrEqual(a.monthlyPensionReal + 1e-9);
      }),
    );
  });
  it('plan capital plus lump sum equals the capital', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (share) => {
        const r = project({ lumpSumSharePercent: share });
        near(r.details.planCapital + r.details.lumpSumGross, r.capitalAtRetirement as number, 1e-6);
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

  it('is a validation issue for a guarantee variant with extreme costs', () => {
    const issues = validateDepot(
      { ...INPUT, variant: 'guarantee80', costPercentPerYear: 100 },
      low,
    );
    expect(issues.some((i) => i.field === 'costPercentPerYear')).toBe(true);
    expect(
      projectDepot({ ...INPUT, variant: 'guarantee80', costPercentPerYear: 100 }, low).ok,
    ).toBe(false);
  });

  it('accepts the standard variant because its costs are capped', () => {
    expect(validateDepot({ ...INPUT, costPercentPerYear: 100 }, low)).toEqual([]);
  });
});

describe('depot: rising contribution', () => {
  it('a rise of 0 or none changes nothing', () => {
    const base = project();
    near(project({ annualContributionIncreasePercent: 0 }).details.ownTotal, base.details.ownTotal);
    expect(project({ annualContributionIncreasePercent: 0 }).capitalAtRetirement).toBeCloseTo(
      base.capitalAtRetirement as number,
      9,
    );
  });
  it('raises the contribution every January after the start', () => {
    // Start 2027-01 with 100 EUR: 2027 = 100, 2028 = 102, 2029 = 104,04 (never reaches the maximum here).
    const r = project({ ownContributionMonthly: 100, annualContributionIncreasePercent: 2 });
    const years = r.details.yearly;
    near(years[1]!.valueEnd > years[0]!.valueEnd ? 1 : 0, 1);
    const own = (n: number) =>
      Array.from({ length: n }, (_, k) => 1200 * Math.pow(1.02, k)).reduce((s, v) => s + v, 0);
    near(r.details.ownTotal, own(r.details.yearly.length), 1e-6);
  });
  it('caps the contribution at the yearly maximum and warns', () => {
    const r = project({ ownContributionMonthly: 500, annualContributionIncreasePercent: 20 });
    expect(r.warnings).toContain('contribution_capped_at_maximum');
    const maxOwn = 6840 * r.details.yearly.length;
    expect(r.details.ownTotal).toBeLessThanOrEqual(maxOwn + 1e-6);
    expect(project().warnings).not.toContain('contribution_capped_at_maximum');
  });
  it('rejects a negative or absurd rise', () => {
    for (const v of [-1, 51, Number.NaN]) {
      const fields = validateDepot({ ...INPUT, annualContributionIncreasePercent: v }, CTX).map(
        (i) => i.field,
      );
      expect(fields).toContain('annualContributionIncreasePercent');
    }
  });
});

describe('depot with the percent withdrawal', () => {
  it('annuity setting equals no setting', () => {
    const a = project();
    const b = project({ withdrawal: { strategy: 'annuity' } });
    expect(b.monthlyPensionNominal).toBe(a.monthlyPensionNominal);
    expect(b.netMonthlyPensionReal).toBe(a.netMonthlyPensionReal);
    expect(a.indexationPercent).toBeUndefined();
  });

  it('pays the percentage of the plan capital after the lump sum, indexed with the inflation', () => {
    const r = project({ lumpSumSharePercent: 20, withdrawal: { strategy: 'percent', percent: 4 } });
    const planCapital = r.details.planCapital;
    near(r.monthlyPensionNominal, (planCapital * 0.04) / 12, 1e-6);
    expect(r.indexationPercent).toBe(ASSUMPTIONS.inflationPercent);
    expect(r.details.remainingCapitalAtEnd).toBeGreaterThan(0);
  });

  it('warns and sets the end age if the capital is used up', () => {
    const r = project({ withdrawal: { strategy: 'percent', percent: 12 } });
    expect(r.warnings).toContain('depot_withdrawal_depleted');
    expect(r.payoutEndAge).toBeGreaterThan(67);
    expect(r.payoutEndAge).toBeLessThan(85);
    expect(r.details.remainingCapitalAtEnd).toBe(0);
  });

  it('reports an invalid percentage as data', () => {
    const issues = validateDepot(
      { ...INPUT, withdrawal: { strategy: 'percent', percent: 0 } },
      ctx(),
    );
    expect(issues.map((i) => i.field)).toContain('withdrawal.percent');
  });
});
