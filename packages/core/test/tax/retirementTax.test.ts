import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { incomeTax, lumpSumTax, retirementIncomeTax } from '../../src';
import { LEGAL } from '../pensionFixtures';

const T = LEGAL.incomeTax;

describe('retirementIncomeTax', () => {
  it('gives 0 for no income and for income below the allowances', () => {
    expect(retirementIncomeTax([], T).taxMonthly).toBe(0);
    const r = retirementIncomeTax([{ id: 'a', taxableMonthly: 900, contributionsMonthly: 0 }], T);
    expect(r.taxYearly).toBe(0);
    expect(r.byId.a).toBe(0);
  });

  it('applies lump sum, contributions and special expenses before the tariff', () => {
    // 2.000 EUR/month taxable, 250 EUR/month contributions:
    // 24.000 - 102 - 3.000 - 36 = 20.862 taxable income.
    const r = retirementIncomeTax(
      [{ id: 'a', taxableMonthly: 2000, contributionsMonthly: 250 }],
      T,
    );
    expect(r.taxableIncomeYearly).toBe(20862);
    expect(r.taxYearly).toBe(incomeTax(20862, T));
    expect(r.taxMonthly).toBeCloseTo(incomeTax(20862, T) / 12, 9);
  });

  it('caps the expenses lump sum at the income', () => {
    const r = retirementIncomeTax([{ id: 'a', taxableMonthly: 5, contributionsMonthly: 0 }], T);
    expect(r.taxableIncomeYearly).toBe(0);
  });

  it('does not depend on how the same total is divided across incomes', () => {
    const one = retirementIncomeTax(
      [{ id: 'x', taxableMonthly: 3000, contributionsMonthly: 300 }],
      T,
    );
    const two = retirementIncomeTax(
      [
        { id: 'a', taxableMonthly: 1000, contributionsMonthly: 100 },
        { id: 'b', taxableMonthly: 2000, contributionsMonthly: 200 },
      ],
      T,
    );
    expect(two.taxYearly).toBe(one.taxYearly);
    expect(two.byId.a! + two.byId.b!).toBeCloseTo(one.byId.x!, 9);
    expect(two.byId.b!).toBeCloseTo(2 * two.byId.a!, 9);
  });

  it('taxes the sum less than the separate parts (allowance used once, progression)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6000 }), fc.integer({ min: 0, max: 6000 }), (a, b) => {
        const together = retirementIncomeTax(
          [
            { id: 'a', taxableMonthly: a, contributionsMonthly: 0 },
            { id: 'b', taxableMonthly: b, contributionsMonthly: 0 },
          ],
          T,
        ).taxYearly;
        const apart =
          retirementIncomeTax([{ id: 'a', taxableMonthly: a, contributionsMonthly: 0 }], T)
            .taxYearly +
          retirementIncomeTax([{ id: 'b', taxableMonthly: b, contributionsMonthly: 0 }], T)
            .taxYearly;
        return together >= apart;
      }),
    );
  });

  it('shares sum to the total and are finite for any input', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            taxableMonthly: fc.double({ min: 0, max: 20000, noNaN: true }),
            contributionsMonthly: fc.double({ min: 0, max: 5000, noNaN: true }),
          }),
          { maxLength: 4 },
        ),
        (items) => {
          const incomes = items.map((x, i) => ({ id: `i${i}`, ...x }));
          const r = retirementIncomeTax(incomes, T);
          const shares = Object.values(r.byId);
          const total = shares.reduce((s, v) => s + v, 0);
          const taxable = incomes.reduce((s, i) => s + i.taxableMonthly, 0);
          return (
            shares.every(Number.isFinite) &&
            (taxable === 0 ? total === 0 : Math.abs(total - r.taxMonthly) < 1e-6)
          );
        },
      ),
    );
  });
});

describe('lumpSumTax', () => {
  it('is the difference of the yearly tax with and without the payout', () => {
    const incomes = [{ id: 'a', taxableMonthly: 2000, contributionsMonthly: 250 }];
    const base = retirementIncomeTax(incomes, T).taxableIncomeYearly;
    expect(lumpSumTax(incomes, 10000, T)).toBe(incomeTax(base + 10000, T) - incomeTax(base, T));
  });

  it('is 0 without a payout', () => {
    expect(lumpSumTax([], 0, T)).toBe(0);
  });
});
