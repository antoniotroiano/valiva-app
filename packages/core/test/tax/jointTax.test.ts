import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  JOINT_ASSESSMENT_KEYS,
  resolveLegalParameters,
  incomeTax,
  jointLumpSumTax,
  jointRetirementIncomeTax,
  lumpSumTax,
  retirementIncomeTax,
  validateJointAssessmentParameters,
} from '../../src';
import type {
  DepotKey,
  IncomeTaxKey,
  LegalConfig,
  PensionKey,
  SocialKey,
  TaxableIncome,
} from '../../src';
import { JOINT, LEGAL } from '../pensionFixtures';

const T = LEGAL.incomeTax;
const inc = (id: string, taxableMonthly: number, contributionsMonthly = 0): TaxableIncome => ({
  id,
  taxableMonthly,
  contributionsMonthly,
});
const separate = (a: TaxableIncome[], b: TaxableIncome[]) =>
  retirementIncomeTax(a, T).taxYearly + retirementIncomeTax(b, T).taxYearly;

describe('jointRetirementIncomeTax: worked examples (hand calculation, see docs/assumptions.md)', () => {
  it('unequal pensions: splitting is cheaper by 1.533 EUR a year', () => {
    // A: 3.000/month taxable, 300 contributions; B: 800/month taxable, 80 contributions.
    // Separate: A 36.000 - 102 - 3.600 - 36 = 32.262 -> 4.863; B 9.600 - 102 - 960 - 36 = 8.502 -> 0.
    // Joint: 35.898 + 9.498 - 3.600 - 960 - 72 = 40.764; half 20.382 -> 1.665; twice 3.330.
    const a = [inc('a', 3000, 300)];
    const b = [inc('b', 800, 80)];
    expect(separate(a, b)).toBe(4863);
    const r = jointRetirementIncomeTax(a, b, T, JOINT);
    expect(r.taxableIncomeYearly).toBe(40764);
    expect(r.taxYearly).toBe(3330);
    expect(r.taxMonthly).toBeCloseTo(277.5, 9);
    expect(separate(a, b) - r.taxYearly).toBe(1533);
  });

  it('equal pensions: the same as taxing each alone', () => {
    const a = [inc('a', 1900, 190)];
    const b = [inc('b', 1900, 190)];
    const r = jointRetirementIncomeTax(a, b, T, JOINT);
    expect(r.taxYearly).toBe(3330);
    expect(r.taxYearly).toBe(separate(a, b));
    expect(r.shareA).toBeCloseTo(r.shareB, 9);
  });

  it('one person without income: the whole tax falls on the other, joint income uses both allowances', () => {
    const r = jointRetirementIncomeTax([inc('a', 2500, 250)], [], T, JOINT);
    // 30.000 - 102 - 3.000 - 72 = 26.826; half 13.413 -> 159; twice 318.
    expect(r.taxableIncomeYearly).toBe(26826);
    expect(r.taxYearly).toBe(318);
    expect(r.shareB).toBe(0);
    expect(r.shareA).toBeCloseTo(318 / 12, 9);
  });

  it('survivor year (partner null): splitting tariff with the single special expenses lump sum', () => {
    const r = jointRetirementIncomeTax([inc('a', 2500, 250)], null, T, JOINT);
    // 30.000 - 102 - 3.000 - 36 = 26.862; half 13.431 -> 162 (162,35 rounded down); twice 324.
    expect(r.taxableIncomeYearly).toBe(26862);
    expect(r.taxYearly).toBe(324);
  });

  it('no income gives 0 tax and 0 shares', () => {
    const r = jointRetirementIncomeTax([], [], T, JOINT);
    expect(r.taxYearly).toBe(0);
    expect(r.shareA).toBe(0);
    expect(r.shareB).toBe(0);
  });

  it('rounds the halved income down to full euros as the tariff does', () => {
    // Joint income 40.765 -> half 20.382,5 -> tariff on 20.382.
    const r = jointRetirementIncomeTax(
      [inc('a', 3000, 300)],
      [inc('b', 800.0833333333333, 80)],
      T,
      {
        ...JOINT,
      },
    );
    expect(r.taxYearly % 2).toBe(0);
    expect(r.taxYearly).toBe(2 * incomeTax(r.taxableIncomeYearly / 2, T));
  });
});

describe('jointRetirementIncomeTax: distribution', () => {
  it('splits the tax in proportion to the taxable amounts of both persons and sums exactly', () => {
    const a = [inc('statutory', 2000, 200), inc('occ', 1000, 90)];
    const b = [inc('statutory', 800, 80)];
    const r = jointRetirementIncomeTax(a, b, T, JOINT);
    const total = r.byIdA.statutory! + r.byIdA.occ! + r.byIdB.statutory!;
    expect(total).toBeCloseTo(r.taxMonthly, 9);
    expect(r.shareA + r.shareB).toBeCloseTo(r.taxMonthly, 9);
    expect(r.byIdA.statutory! / r.byIdB.statutory!).toBeCloseTo(2000 / 800, 9);
    expect(r.byIdA.occ! / r.byIdA.statutory!).toBeCloseTo(0.5, 9);
  });

  it('does not depend on how a person divides the same total across incomes', () => {
    const one = jointRetirementIncomeTax([inc('x', 3000, 300)], [inc('y', 800, 80)], T, JOINT);
    const two = jointRetirementIncomeTax(
      [inc('a', 1000, 100), inc('b', 2000, 200)],
      [inc('y', 800, 80)],
      T,
      JOINT,
    );
    expect(two.taxYearly).toBe(one.taxYearly);
    expect(two.shareA).toBeCloseTo(one.shareA, 9);
  });

  it('ignores negative and non-finite amounts like the single tax', () => {
    const r = jointRetirementIncomeTax(
      [inc('a', Number.NaN, -5), inc('b', -100, 0)],
      [inc('c', Number.POSITIVE_INFINITY, 0)],
      T,
      JOINT,
    );
    expect(r.taxYearly).toBe(0);
    expect(Number.isFinite(r.taxMonthly)).toBe(true);
  });
});

describe('jointRetirementIncomeTax: properties', () => {
  const money = fc.integer({ min: 0, max: 15000 });
  const contribution = fc.integer({ min: 0, max: 1500 });

  it('is finite, not negative and its shares add up to the total', () => {
    fc.assert(
      fc.property(money, money, contribution, contribution, (x, y, cx, cy) => {
        const r = jointRetirementIncomeTax([inc('a', x, cx)], [inc('b', y, cy)], T, JOINT);
        expect(Number.isFinite(r.taxYearly)).toBe(true);
        expect(r.taxYearly).toBeGreaterThanOrEqual(0);
        expect(r.shareA).toBeGreaterThanOrEqual(0);
        expect(r.shareB).toBeGreaterThanOrEqual(0);
        expect(r.shareA + r.shareB).toBeCloseTo(r.taxMonthly, 6);
      }),
    );
  });

  it('is never higher than the separate tax, apart from the rounding to full euros (at most 2 EUR a year)', () => {
    // Without rounding the tariff is convex and splitting never costs more. The law rounds the halved income
    // and the tax down, which can make the joint amount 1 or 2 EUR higher in rare cases (found by search).
    fc.assert(
      fc.property(money, money, contribution, contribution, (x, y, cx, cy) => {
        const a = [inc('a', x, cx)];
        const b = [inc('b', y, cy)];
        const joint = jointRetirementIncomeTax(a, b, T, JOINT).taxYearly;
        expect(joint).toBeLessThanOrEqual(separate(a, b) + 2);
      }),
      { numRuns: 500 },
    );
  });

  it('equals the separate tax for equal pensions', () => {
    fc.assert(
      fc.property(money, contribution, (x, c) => {
        const a = [inc('a', x, c)];
        const b = [inc('b', x, c)];
        expect(jointRetirementIncomeTax(a, b, T, JOINT).taxYearly).toBe(separate(a, b));
      }),
    );
  });

  it('is symmetric in the two persons', () => {
    fc.assert(
      fc.property(money, money, (x, y) => {
        const r1 = jointRetirementIncomeTax([inc('a', x, x / 10)], [inc('b', y, y / 10)], T, JOINT);
        const r2 = jointRetirementIncomeTax([inc('b', y, y / 10)], [inc('a', x, x / 10)], T, JOINT);
        expect(r1.taxYearly).toBe(r2.taxYearly);
        expect(r1.shareA).toBeCloseTo(r2.shareB, 9);
      }),
    );
  });
});

describe('jointLumpSumTax', () => {
  it('is the joint tax with the payout minus the joint tax without it', () => {
    const a = [inc('a', 3000, 300)];
    const b = [inc('b', 800, 80)];
    const base = jointRetirementIncomeTax(a, b, T, JOINT);
    const extra = jointLumpSumTax(a, b, 20000, T, JOINT);
    expect(extra).toBe(2 * incomeTax((base.taxableIncomeYearly + 20000) / 2, T) - base.taxYearly);
    expect(extra).toBeGreaterThan(0);
  });

  it('is cheaper than the single payout tax for the same pensions when the partner has little income', () => {
    const a = [inc('a', 3000, 300)];
    expect(jointLumpSumTax(a, [], 20000, T, JOINT)).toBeLessThan(lumpSumTax(a, 20000, T));
  });

  it('is 0 for no payout', () => {
    expect(jointLumpSumTax([inc('a', 1000)], [inc('b', 1000)], 0, T, JOINT)).toBe(0);
    expect(jointLumpSumTax([inc('a', 1000)], [inc('b', 1000)], Number.NaN, T, JOINT)).toBe(0);
  });
});

describe('validateJointAssessmentParameters', () => {
  it('accepts the configured values', () => {
    expect(validateJointAssessmentParameters(JOINT)).toEqual([]);
  });

  it('reports broken values as data', () => {
    expect(
      validateJointAssessmentParameters({
        splittingDivisor: 0,
        specialExpensesLumpSumJointYearly: 72,
      }),
    ).toEqual([{ field: 'jointAssessment.splittingDivisor', code: 'out_of_range', min: 1 }]);
    expect(
      validateJointAssessmentParameters({
        splittingDivisor: Number.NaN,
        specialExpensesLumpSumJointYearly: -1,
      }).map((i) => i.code),
    ).toEqual(['not_finite', 'negative']);
  });
});

describe('config/joint-assessment-de.json', () => {
  const read = <K extends string>(name: string) =>
    JSON.parse(readFileSync(join(__dirname, '../../../../config', name), 'utf8')) as LegalConfig<K>;
  const config = read<(typeof JOINT_ASSESSMENT_KEYS)[number]>('joint-assessment-de.json');

  it('matches the test values and marks the derived 72 EUR as unverified', () => {
    for (const key of JOINT_ASSESSMENT_KEYS) {
      expect(config.values[key].value).toBe(JOINT[key]);
      expect(config.values[key].source.length).toBeGreaterThan(20);
      expect(config.values[key].sourceDe.length).toBeGreaterThan(20);
    }
    expect(config.values.splittingDivisor.status).toBe('confirmed');
    expect(config.values.specialExpensesLumpSumJointYearly.status).toBe('unverified');
  });

  it('resolves with the other legal files; without it the values are absent', () => {
    const four = [
      read<PensionKey>('pension-de.json'),
      read<SocialKey>('social-de.json'),
      read<DepotKey>('altersvorsorge-de.json'),
      read<IncomeTaxKey>('income-tax-de.json'),
    ] as const;
    const withJoint = resolveLegalParameters(...four, '2026-11-23', undefined, config);
    expect(withJoint.ok && withJoint.legal.jointAssessment).toEqual(JOINT);
    expect(withJoint.ok && withJoint.legal.unverified).toContain(
      'jointAssessment.specialExpensesLumpSumJointYearly',
    );
    const without = resolveLegalParameters(...four, '2026-11-23');
    expect(without.ok && without.legal.jointAssessment).toBeUndefined();
    const expired = resolveLegalParameters(...four, '2020-01-01', undefined, config);
    expect(expired.ok).toBe(false);
  });
});
