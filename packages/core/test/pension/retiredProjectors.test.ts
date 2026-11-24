import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  careRatePercentFor,
  netPension,
  payoutPlan,
  projectDepotRetired,
  projectEtfHolding,
  projectOccupationalRetired,
  projectStatutoryActual,
  sharedOccupationalContributions,
  taxableShareForStartYear,
} from '../../src';
import type { EtfHoldingInput, GlobalAssumptions } from '../../src';
import { ASSUMPTIONS, LEGAL, LEGAL_R, RET_CTX, retCtx } from '../pensionFixtures';

const near = (a: number, b: number, eps = 0.005) => expect(Math.abs(a - b)).toBeLessThan(eps);
const TAX = { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 };

function ok<T>(r: { ok: true; result: T } | { ok: false; issues: unknown[] }): T {
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
  return r.result;
}
const stat = (monthly: number, over: Record<string, number> = {}, ctx = RET_CTX) =>
  ok(projectStatutoryActual({ actualMonthlyGross: monthly, ...over }, ctx));

describe('statutory pension from the notice: example 1 (Marta, start 2019)', () => {
  const r = stat(1650);

  it('uses the share of the start year, not the share of today', () => {
    expect(r.details.taxableSharePercent).toBe(78);
    near(r.details.referenceAnnual, (1650 * 12) / Math.pow(1.025, 6));
    near(r.details.taxFreeYearly, 0.22 * r.details.referenceAnnual);
    near(r.details.taxFreeYearly, 3756.17);
    // taxable part of the year 2026: 19,800 - 3,756.17 = 16,043.83 (81.0 %), not 84 % of the pension
    near(r.taxableMonthlyReal * 12, 16043.83);
    near((r.taxableMonthlyReal * 12) / 19800, 0.81, 0.001);
  });

  it('gives the contributions, the tax and the net amount of the concept', () => {
    near(r.details.nominal.health, 144.375);
    near(r.details.nominal.care, 59.4);
    near(r.details.nominal.contributions * 12, 2445.3);
    near(r.details.nominal.tax, 166 / 12);
    near(r.netMonthlyPensionReal, 1432.39);
  });

  it('would be taxed much higher with the share of 2026 (the old behaviour for everyone)', () => {
    const wrong = netPension(
      1650,
      'statutory',
      { retirementYear: 2026, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    near(wrong.tax * 12, 264, 1);
  });

  it('marks the approximation, and not the entered annual amount', () => {
    expect(r.warnings).toContain('first_full_year_estimated');
    const entered = stat(1650, { firstFullYearAnnual: 17073.48 });
    expect(entered.warnings).not.toContain('first_full_year_estimated');
    near(entered.details.taxFreeYearly, r.details.taxFreeYearly, 0.01);
    const other = stat(1650, { firstFullYearAnnual: 16000 });
    expect(other.details.taxFreeYearly).toBeCloseTo(0.22 * 16000, 8);
    expect(other.details.referenceEstimated).toBe(false);
  });

  it('carries the fixed tax-free amount for the overview and no start-year flag', () => {
    near(r.fixedTaxFreeMonthlyReal as number, r.details.taxFreeYearly / 12);
    expect(r.fixedTaxFreeFromNextYear).toBeUndefined();
    expect(r.fixedTaxMonthlyReal).toBe(0);
    expect(r.monthlyPensionReal).toBe(1650);
  });
});

describe('statutory pension from the notice: start years and limits', () => {
  const at = (year: number, birthYear = 1955, over: Record<string, number> = {}) =>
    stat(1500, over, retCtx({ birthYear, retirementStartYear: year }));

  it('takes the share from the table for 2005, 2020, 2025 and 2026 and the formula up to 2058', () => {
    const birth = 1950;
    expect(at(2005, birth).details.taxableSharePercent).toBe(50);
    expect(at(2020, birth + 5).details.taxableSharePercent).toBe(80);
    expect(at(2025, birth + 20).details.taxableSharePercent).toBe(83.5);
    expect(at(2026, 1959).details.taxableSharePercent).toBe(84);
    expect(taxableShareForStartYear(2058, LEGAL_R)).toBe(100);
  });

  it('never goes below 50 % for an early start', () => {
    expect(at(1990, 1930).details.taxableSharePercent).toBe(50);
  });

  it('start in the current year: the share applies this year and the fixed amount flag is set (example 6)', () => {
    const r = stat(1800, {}, retCtx({ birthYear: 1959, retirementStartYear: 2026 }));
    expect(r.details.startsThisYear).toBe(true);
    expect(r.fixedTaxFreeFromNextYear).toBe(true);
    near(r.taxableMonthlyReal * 12, 0.84 * 21600);
    near(r.details.referenceAnnual, 21600 * 1.025);
    near(r.details.taxFreeYearly, 3542.4);
    // the approximation is a projection here, but still marked as not entered
    expect(r.warnings).toContain('first_full_year_estimated');
  });

  it('start in the year before: the approximation is exact and not flagged', () => {
    const r = stat(1500, {}, retCtx({ birthYear: 1959, retirementStartYear: 2025 }));
    near(r.details.referenceAnnual, 18000);
    expect(r.warnings).not.toContain('first_full_year_estimated');
  });

  it('a pension of 0 gives 0 everywhere', () => {
    const r = stat(0);
    expect(r.netMonthlyPensionReal).toBe(0);
    expect(r.taxableMonthlyReal).toBe(0);
    expect(r.details.nominal.tax).toBe(0);
  });

  it('is an issue for a start after today, for a missing amount and for missing legal values', () => {
    const future = projectStatutoryActual(
      { actualMonthlyGross: 1000 },
      retCtx({ birthYear: 1962, retirementStartYear: 2029 }),
    );
    expect(future.ok === false && future.issues.map((i) => i.code)).toEqual([
      'retired_start_in_future',
    ]);
    const none = projectStatutoryActual({}, RET_CTX);
    expect(none.ok === false && none.issues.map((i) => i.code)).toEqual(['required']);
    const legal = projectStatutoryActual({ actualMonthlyGross: 1 }, { ...RET_CTX, legal: LEGAL });
    expect(legal.ok === false && legal.issues.map((i) => i.code)).toEqual(['legal_values_missing']);
  });

  it('other health insurance uses the entered rate and no care rate', () => {
    const a = {
      ...ASSUMPTIONS,
      health: {
        mode: 'other' as const,
        otherRatePercent: 11,
        additionalRatePercent: 2.9,
        childless: false,
      },
    };
    const r = stat(1650, {}, retCtx({}, a));
    near(r.details.nominal.health, 181.5);
    expect(r.details.nominal.care).toBe(0);
  });

  it('property: all values are finite at the extremes and net never exceeds gross', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1900, max: 1976 }),
        fc.integer({ min: 50, max: 75 }),
        fc.double({ min: 0, max: 20000, noNaN: true }),
        fc.option(fc.double({ min: 0, max: 240000, noNaN: true }), { nil: undefined }),
        (birthYear, startAge, monthly, annual) => {
          const retirementStartYear = birthYear + startAge;
          fc.pre(retirementStartYear <= 2026);
          const r = stat(
            monthly,
            annual === undefined ? {} : { firstFullYearAnnual: annual },
            retCtx({ birthYear, retirementStartYear, lifeExpectancyAge: 120 }),
          );
          for (const v of [
            r.netMonthlyPensionReal,
            r.taxableMonthlyReal,
            r.contributionsMonthlyReal,
            r.details.taxFreeYearly,
          ]) {
            expect(Number.isFinite(v)).toBe(true);
          }
          expect(r.netMonthlyPensionReal).toBeLessThanOrEqual(monthly + 1e-9);
          expect(r.netMonthlyPensionReal).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it('property: net is monotone in the gross pension (up to the full-euro rounding of the tariff)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 19000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (a, d) => {
          expect(stat(a + d).netMonthlyPensionReal).toBeGreaterThanOrEqual(
            stat(a).netMonthlyPensionReal - 0.09,
          );
        },
      ),
    );
  });

  it('property: a later start year (same amounts) never lowers the share and never lowers the tax', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2005, max: 2025 }),
        fc.integer({ min: 0, max: 20 }),
        fc.double({ min: 500, max: 6000, noNaN: true }),
        (first, gap, monthly) => {
          const second = Math.min(2026, first + gap);
          const run = (y: number) =>
            stat(
              monthly,
              { firstFullYearAnnual: 12 * monthly * 0.97 },
              retCtx({ birthYear: 1940, retirementStartYear: y, lifeExpectancyAge: 100 }),
            );
          const a = run(first);
          const b = run(second);
          expect(b.details.taxableSharePercent).toBeGreaterThanOrEqual(
            a.details.taxableSharePercent,
          );
          expect(b.details.nominal.tax).toBeGreaterThanOrEqual(a.details.nominal.tax - 1e-9);
        },
      ),
    );
  });
});

describe('care surcharge for the childless born before 1940 (§55 Abs. 3 Satz 2 SGB XI)', () => {
  const childless: GlobalAssumptions = {
    ...ASSUMPTIONS,
    health: { mode: 'statutoryCompulsory' as const, additionalRatePercent: 2.9, childless: true },
  };
  const parent = ASSUMPTIONS;
  const careOf = (birthYear: number, a = childless) =>
    stat(1500, {}, retCtx({ birthYear, retirementStartYear: Math.max(birthYear + 66, 2005) }, a))
      .details.nominal.care;

  it('pays 3.6 % for 1939 and 4.2 % from 1940 on; parents always 3.6 %', () => {
    near(careOf(1939), 54);
    near(careOf(1940), 63);
    near(careOf(1941), 63);
    near(careOf(1939, parent), 54);
    near(careOf(1940, parent), 54);
  });

  it('applies to the company pension above the threshold and to the shared threshold group', () => {
    const occ = (birthYear: number) =>
      ok(
        projectOccupationalRetired(
          { retiredForm: 'annuity', annuityMonthlyGross: 1000 },
          retCtx({ birthYear, retirementStartYear: birthYear + 66 }, childless),
        ),
      );
    near(occ(1939).details.nominal.care, 36);
    near(occ(1940).details.nominal.care, 42);
    const social = { ...LEGAL.social, careChildlessExemptBeforeBirthYear: 1940 };
    const shared = (birthYear: number) =>
      sharedOccupationalContributions([{ id: 'a', amount: 1000 }], social, childless, birthYear);
    expect(shared(1939).a).toBeLessThan(shared(1940).a as number);
  });

  it('without the exemption year (older callers) nothing changes', () => {
    expect(careRatePercentFor(true, LEGAL.social, 1900)).toBe(4.2);
    expect(careRatePercentFor(true, LEGAL.social, 1900, 1940)).toBe(3.6);
    expect(careRatePercentFor(true, LEGAL.social, undefined, 1940)).toBe(4.2);
    expect(careRatePercentFor(false, LEGAL.social, 1990, 1940)).toBe(3.6);
  });
});

describe('company pension of a retired person', () => {
  const annuity = (monthly: number, over = {}, ctx = RET_CTX) =>
    ok(
      projectOccupationalRetired(
        { retiredForm: 'annuity', annuityMonthlyGross: monthly, ...over },
        ctx,
      ),
    );

  it('example 3: 250 EUR pays health on the part above the allowance and care on everything', () => {
    const r = annuity(250);
    near(r.details.nominal.health, 9.14, 0.005);
    near(r.details.nominal.care, 9, 0.005);
    expect(annuity(180).details.nominal.contributions).toBe(0);
  });

  it('jumps at the threshold: 197.75 pays nothing, 197.76 pays care on the whole amount', () => {
    expect(annuity(197.75).details.nominal.contributions).toBe(0);
    const above = annuity(197.76);
    near(above.details.nominal.care, 197.76 * 0.036, 1e-9);
    near(above.details.nominal.health, 0.01 * 0.175, 1e-9);
  });

  it('adjustment: fixed percent, like the pension, and none by default', () => {
    expect(annuity(300).indexationPercent).toBe(0);
    expect(
      annuity(300, { annuityAdjustment: { mode: 'fixed', percent: 1.5 } }).indexationPercent,
    ).toBe(1.5);
    expect(annuity(300, { annuityAdjustment: { mode: 'pension' } }).indexationPercent).toBe(2.5);
    expect(
      annuity(300, { annuityAdjustment: { mode: 'fixed', percent: -50 } }).indexationPercent,
    ).toBe(-50);
  });

  it('example 4: a rest capital of 20,000 EUR to age 85 pays 136.42 EUR per month', () => {
    const r = ok(
      projectOccupationalRetired(
        { retiredForm: 'capital', capitalToday: 20000, capitalEndAge: 85 },
        RET_CTX,
      ),
    );
    near(r.monthlyPensionNominal, 136.42, 0.005);
    expect(r.details.planMonths).toBe(168);
    const plan = payoutPlan(20000, 71, 85, 2);
    expect(plan.ok && plan.plan.monthly).toBeCloseTo(r.monthlyPensionNominal, 10);
    // closed formula
    const i = Math.pow(1.02, 1 / 12) - 1;
    near(r.monthlyPensionNominal, (20000 * i) / (1 - Math.pow(1 + i, -168)), 1e-9);
    expect(r.indexationPercent).toBeUndefined();
    expect(r.capitalAtRetirement).toBe(20000);
  });

  it('a capital of 0 pays 0; zero return divides evenly', () => {
    const zero = ok(
      projectOccupationalRetired(
        { retiredForm: 'capital', capitalToday: 0, capitalEndAge: 85 },
        RET_CTX,
      ),
    );
    expect(zero.monthlyPensionNominal).toBe(0);
    const flat = ok(
      projectOccupationalRetired(
        { retiredForm: 'capital', capitalToday: 16800, capitalEndAge: 85 },
        retCtx({}, { ...ASSUMPTIONS, payoutPhaseReturnPercent: 0 }),
      ),
    );
    near(flat.monthlyPensionNominal, 100, 1e-9);
  });

  it('is an issue for an end age that is not after today', () => {
    const r = projectOccupationalRetired(
      { retiredForm: 'capital', capitalToday: 1, capitalEndAge: 71 },
      RET_CTX,
    );
    expect(r.ok).toBe(false);
  });
});

describe('retirement depot of a retired person', () => {
  const depot = (capital: number, endAge: number, ctx = RET_CTX) =>
    ok(projectDepotRetired({ retiredCapitalToday: capital, retiredEndAge: endAge }, ctx));

  it('pays the payout plan fully taxable, without health contributions for compulsory members', () => {
    const r = depot(30000, 90);
    near(r.monthlyPensionNominal, 158.01, 0.005);
    expect(r.details.nominal.contributions).toBe(0);
    expect(r.taxableMonthlyReal).toBe(r.monthlyPensionReal);
    expect(r.warnings).toContain('unverified:depot.payoutTaxation');
  });

  it('hints, but does not block, a calculation before the first possible contract year (2027)', () => {
    expect(depot(10000, 90).warnings).toContain('depot_before_first_contribution_year');
    const later = depot(10000, 90, { ...RET_CTX, currentYear: 2027 });
    expect(later.warnings).not.toContain('depot_before_first_contribution_year');
  });

  it('needs an end age of at least 85 (law) and after today', () => {
    expect(projectDepotRetired({ retiredCapitalToday: 1, retiredEndAge: 84 }, RET_CTX).ok).toBe(
      false,
    );
    expect(depot(1, 85).monthlyPensionNominal).toBeGreaterThan(0);
  });
});

describe('ETF holding of a retired person', () => {
  const base: EtfHoldingInput = {
    holdingValue: 80000,
    holdingContributions: 50000,
    payoutEndAge: 90,
    tax: TAX,
  };
  const etf = (over: Partial<EtfHoldingInput> = {}, ctx = RET_CTX) =>
    ok(projectEtfHolding({ ...base, ...over }, ctx));

  it('example 2: rate 421.36, tax 7.19, net 414.17', () => {
    const r = etf();
    near(r.monthlyPensionNominal, 421.36, 0.005);
    near(r.details.gainShare, 0.375, 1e-12);
    near(r.details.taxMonthly, 86.32 / 12, 0.01);
    near(r.netMonthlyPensionReal, 414.17, 0.005);
    expect(r.details.planMonths).toBe(228);
    expect(r.capitalAtRetirement).toBe(80000);
    expect(r.series).toEqual([]);
  });

  it('paid in at or above the value: no gain, no tax; zero holding pays nothing', () => {
    expect(etf({ holdingContributions: 80000 }).details.taxMonthly).toBe(0);
    expect(etf({ holdingContributions: 200000 }).details.gainShare).toBe(0);
    const zero = etf({ holdingValue: 0, holdingContributions: 0 });
    expect(zero.monthlyPensionNominal).toBe(0);
    expect(zero.netMonthlyPensionReal).toBe(0);
  });

  it('tax switched off pays no tax', () => {
    expect(etf({ taxEnabled: false }).details.taxMonthly).toBe(0);
  });

  it('percent strategy: first payment, indexation, depletion age and tax of the first year', () => {
    const r = etf({
      holdingValue: 150000,
      holdingContributions: 60000,
      withdrawal: { strategy: 'percent', percent: 6 },
    });
    near(r.monthlyPensionNominal, 750, 1e-9);
    expect(r.indexationPercent).toBe(2);
    expect(r.payoutEndAge).toBeGreaterThan(71);
    expect(r.payoutEndAge).toBeLessThan(90);
    expect(r.warnings).toContain('etf_withdrawal_depleted');
    expect(r.details.withdrawalYears?.length).toBeGreaterThan(0);
    expect(r.details.taxMonthly).toBeGreaterThan(0);
  });

  it('advance lump sum: needs its parameters and then adds a payout lump sum', () => {
    const params = {
      baseEarningsFactorPercent: 70,
      baseInterestByYear: { 2026: 3.2 },
      assumedBaseInterestPercent: 2.5,
      startYear: 2026,
      startMonth: 1,
    };
    const missing = projectEtfHolding({ ...base, advanceLumpSum: true }, RET_CTX);
    expect(missing.ok === false && missing.issues.map((i) => i.field)).toContain(
      'tax.advanceLumpSum',
    );
    const r = etf({ advanceLumpSum: true, tax: { ...TAX, advanceLumpSum: params } });
    expect(r.warnings).toContain('etf_advance_lump_sum');
    expect(r.details.advanceLumpSumPayout).toBeGreaterThan(0);
    expect(Number.isFinite(r.netMonthlyPensionReal)).toBe(true);
  });

  it('is an issue without the sum paid in (required) and for an end age that is not after today', () => {
    const r = projectEtfHolding({ holdingValue: 1, payoutEndAge: 90, tax: TAX }, RET_CTX);
    expect(r.ok === false && r.issues.map((i) => `${i.field}:${i.code}`)).toEqual([
      'holdingContributions:required',
    ]);
    expect(projectEtfHolding({ ...base, payoutEndAge: 71 }, RET_CTX).ok).toBe(false);
  });

  it('property: finite and non-negative at the extremes; more paid in never raises the tax', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 5e7, noNaN: true }),
        fc.double({ min: 0, max: 5e7, noNaN: true }),
        fc.double({ min: 0, max: 5e7, noNaN: true }),
        fc.integer({ min: 72, max: 120 }),
        (value, paid, extra, end) => {
          const a = etf({ holdingValue: value, holdingContributions: paid, payoutEndAge: end });
          const b = etf({
            holdingValue: value,
            holdingContributions: Math.min(5e7, paid + extra),
            payoutEndAge: end,
          });
          for (const v of [
            a.netMonthlyPensionReal,
            a.details.taxMonthly,
            a.monthlyPensionNominal,
          ]) {
            expect(Number.isFinite(v) && v >= 0).toBe(true);
          }
          expect(b.details.taxMonthly).toBeLessThanOrEqual(a.details.taxMonthly + 1e-9);
        },
      ),
    );
  });
});
