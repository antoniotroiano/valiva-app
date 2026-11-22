import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  defaultAssumptions,
  netPension,
  payoutPlan,
  projectStatutory,
  incomeTax,
  regularRetirementAgeFor,
  resolveLegalParameters,
  taxableShare,
  validateAssumptions,
  validateProfile,
  validateStatutory,
} from '../src';
import type {
  DepotKey,
  IncomeTaxKey,
  LegalConfig,
  PensionKey,
  SocialKey,
  StatutoryInput,
} from '../src';
import { ASSUMPTIONS, CTX, LEGAL, PROFILE, STATUTORY } from './pensionFixtures';

const near = (a: number, b: number, eps = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(eps);

function project(over: Partial<StatutoryInput> = {}, ctx = CTX) {
  const r = projectStatutory({ ...STATUTORY, ...over }, ctx);
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
  return r.result;
}

describe('config files', () => {
  const root = join(__dirname, '../../../config');
  const read = <K extends string>(f: string) =>
    JSON.parse(readFileSync(join(root, f), 'utf8')) as LegalConfig<K>;

  it('resolve for today and match the test fixture', () => {
    const r = resolveLegalParameters(
      read<PensionKey>('pension-de.json'),
      read<SocialKey>('social-de.json'),
      read<DepotKey>('altersvorsorge-de.json'),
      read<IncomeTaxKey>('income-tax-de.json'),
      '2026-11-11',
    );
    if (!r.ok) throw new Error(r.missingOrExpired.join());
    expect(r.legal).toEqual(LEGAL);
  });

  it('report missing or expired values as data', () => {
    const p = read<PensionKey>('pension-de.json');
    const s = read<SocialKey>('social-de.json');
    const r = resolveLegalParameters(
      p,
      s,
      read<DepotKey>('altersvorsorge-de.json'),
      read<IncomeTaxKey>('income-tax-de.json'),
      '2020-01-01',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missingOrExpired).toContain('pension.pensionValue');
  });

  it('every value has source, German source and a status', () => {
    for (const f of [
      'pension-de.json',
      'social-de.json',
      'altersvorsorge-de.json',
      'income-tax-de.json',
    ]) {
      for (const v of Object.values(read<string>(f).values)) {
        expect(v.source.length).toBeGreaterThan(0);
        expect(v.sourceDe.length).toBeGreaterThan(0);
        expect(['confirmed', 'unverified']).toContain(v.status);
      }
    }
  });
});

describe('statutory pension: deduction and supplement', () => {
  it('retirement at the regular age has factor 1', () => {
    const r = project();
    expect(r.details.factor).toBe(1);
    expect(r.details.monthsFromRegularAge).toBe(0);
  });
  it('retirement at 63 deducts the maximum 14.4 %', () => {
    const r = project({ retirementAge: 63 });
    near(r.details.adjustmentPercent, -14.4);
    near(r.details.factor, 0.856);
  });
  it('retirement at 70 adds 18 %', () => {
    const r = project({ retirementAge: 70 });
    near(r.details.adjustmentPercent, 18);
    near(r.details.factor, 1.18);
  });
  it('retirement at 65 deducts 24 months x 0.3 %', () => {
    near(project({ retirementAge: 65 }).details.adjustmentPercent, -7.2);
  });
  it('uses the entered regular age for birth years before 1964', () => {
    const ctx = { ...CTX, profile: { ...PROFILE, birthYear: 1962 } };
    const r = project({ retirementAge: 65, regularRetirementAge: 66 + 8 / 12 }, ctx);
    expect(r.details.monthsFromRegularAge).toBe(-20);
    near(r.details.adjustmentPercent, -6);
  });
  it('derives the regular age of birth years before 1964 from the law', () => {
    const ctx = { ...CTX, profile: { ...PROFILE, birthYear: 1962 } };
    expect(validateStatutory(STATUTORY, ctx)).toEqual([]);
    const r = project({ retirementAge: 65 }, ctx);
    near(r.details.regularRetirementAge, 66 + 8 / 12, 1e-9);
    expect(r.details.monthsFromRegularAge).toBe(-20);
  });
  it('lets an entered regular age override the law and checks its range', () => {
    const ctx = { ...CTX, profile: { ...PROFILE, birthYear: 1962 } };
    const r = project({ retirementAge: 65, regularRetirementAge: 66 }, ctx);
    expect(r.details.regularRetirementAge).toBe(66);
    const bad = validateStatutory({ ...STATUTORY, regularRetirementAge: 70 }, ctx);
    expect(bad.map((i) => i.field)).toContain('regularRetirementAge');
    // For 1964 and later the config value is used, an entered value is ignored.
    expect(project({ regularRetirementAge: 66 }).details.regularRetirementAge).toBe(67);
  });
});

describe('regularRetirementAgeFor (SGB VI 235, table of the law)', () => {
  const law: [number, number, number][] = [
    [1930, 65, 0],
    [1946, 65, 0],
    [1947, 65, 1],
    [1950, 65, 4],
    [1957, 65, 11],
    [1958, 66, 0],
    [1959, 66, 2],
    [1960, 66, 4],
    [1961, 66, 6],
    [1962, 66, 8],
    [1963, 66, 10],
    [1964, 67, 0],
    [1990, 67, 0],
  ];
  it.each(law)('birth year %d: %d years %d months', (year, years, months) => {
    near(regularRetirementAgeFor(year, LEGAL.pension), years + months / 12, 1e-12);
  });
});

describe('statutory pension: growth and purchasing power', () => {
  it('applies the yearly adjustment and the factor', () => {
    const r = project({ retirementAge: 65 });
    const expected = 1800 * Math.pow(1.025, 24) * (1 - 0.072);
    near(r.monthlyPensionNominal, expected, 1e-6);
  });
  it('real = nominal deflated with inflation over the years', () => {
    const r = project();
    near(r.monthlyPensionReal, r.monthlyPensionNominal / Math.pow(1.02, 26), 1e-6);
  });
  it('real equals nominal at zero years to retirement', () => {
    const ctx = { ...CTX, profile: { ...PROFILE, birthYear: 1959 } };
    const r = project(
      { retirementAge: 67, regularRetirementAge: 66 + 2 / 12, statementYear: 2026 },
      ctx,
    );
    expect(r.details.yearsToRetirement).toBe(0);
    near(r.monthlyPensionReal, r.monthlyPensionNominal);
  });
  it('the path starts at the statement amount and ends at the retirement pension', () => {
    const r = project({ retirementAge: 63 });
    const path = r.details.path;
    expect(path[0]).toMatchObject({ year: 2026, age: 41, nominal: 1800, real: 1800 });
    near(path[path.length - 1]!.nominal, r.monthlyPensionNominal, 1e-6);
    expect(path[path.length - 1]!.year).toBe(2048);
  });
  it('deflates from the current year, not the statement year', () => {
    const r = project({ statementYear: 2024 });
    near(r.monthlyPensionReal, r.monthlyPensionNominal / Math.pow(1.02, 26), 1e-6);
    const path = r.details.path;
    near(path[0]!.real, 1800 * Math.pow(1.02, 2), 1e-6);
    near(path[2]!.real, path[2]!.nominal, 1e-9);
  });
  it('gives the same values as before when the statement year is the current year', () => {
    const a = project({ statementYear: 2026 });
    near(a.monthlyPensionReal, a.monthlyPensionNominal / Math.pow(1.02, 26), 1e-6);
  });
  it('rejects a retirement in the past', () => {
    const ctx = { ...CTX, profile: { ...PROFILE, birthYear: 1950 } };
    const i = validateStatutory(
      { ...STATUTORY, statementYear: 2020, retirementAge: 67, regularRetirementAge: 66 },
      ctx,
    );
    expect(i).toContainEqual({ field: 'retirementAge', code: 'before_current_year', min: 76 });
  });
  it('has no savings phase', () => {
    const r = project();
    expect(r.series).toEqual([]);
    expect(r.capitalAtRetirement).toBeUndefined();
  });
});

describe('taxable share', () => {
  it.each([
    [2026, 84],
    [2027, 84.5],
    [2052, 97],
    [2058, 100],
    [2060, 100],
  ])('retirement in %i is %f %%', (year, pct) => {
    near(taxableShare(year, LEGAL).percent, pct);
  });
  it('clamps before the base year and flags it', () => {
    const s = taxableShare(2020, LEGAL);
    expect(s.percent).toBe(84);
    expect(s.beforeBaseYear).toBe(true);
  });
});

describe('net pension', () => {
  const ctx = { retirementYear: 2027, realFactor: 1 };
  it('statutoryCompulsory: half health rate plus half additional rate, full care', () => {
    const n = netPension(1000, 'statutory', ctx, ASSUMPTIONS, LEGAL);
    near(n.health, 1000 * ((14.6 + 2.9) / 2 / 100));
    near(n.care, 36);
    near(n.taxable, 1000 * 0.845);
    near(n.net, 1000 - n.tax - n.health - n.care);
  });
  it('taxes the sum with the tariff: below the allowances nothing is due', () => {
    // 845 * 12 = 10.140 taxable, less 102, less contributions 12 * 123,5, less 36: far below 12.348.
    expect(netPension(1000, 'statutory', ctx, ASSUMPTIONS, LEGAL).tax).toBe(0);
  });
  it('taxes a larger pension with the tariff after deductions', () => {
    const n = netPension(
      3000,
      'statutory',
      { retirementYear: 2052, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    // taxable share 97 % in 2052; contributions 3000 * (0,0875 + 0,036) = 370,5 per month.
    const taxable = n.taxable * 12 - 102 - n.contributions * 12 - 36;
    near(n.tax, incomeTax(taxable, LEGAL.incomeTax) / 12, 1e-9);
    expect(n.tax).toBeGreaterThan(0);
  });
  it('other incomes raise the tax of this pension (progression, allowance used once)', () => {
    const alone = netPension(
      1500,
      'statutory',
      { retirementYear: 2052, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    const withOther = netPension(
      1500,
      'statutory',
      {
        retirementYear: 2052,
        realFactor: 1,
        other: { taxableMonthlyReal: 2000, contributionsMonthlyReal: 0 },
      },
      ASSUMPTIONS,
      LEGAL,
    );
    expect(withOther.tax).toBeGreaterThan(alone.tax);
  });
  it('converts nominal amounts to today before applying the tariff', () => {
    const real = netPension(
      3000,
      'statutory',
      { retirementYear: 2052, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    const nominal = netPension(
      6000,
      'statutory',
      { retirementYear: 2052, realFactor: 2 },
      ASSUMPTIONS,
      LEGAL,
    );
    near(nominal.tax, 2 * real.tax, 1e-9);
  });
  it('childless pays 4.2 % care', () => {
    const a = { ...ASSUMPTIONS, health: { ...ASSUMPTIONS.health, childless: true } };
    near(netPension(1000, 'statutory', ctx, a, LEGAL).care, 42);
  });
  it('other: entered total rate, no separate care', () => {
    const a = {
      ...ASSUMPTIONS,
      health: { ...ASSUMPTIONS.health, mode: 'other' as const, otherRatePercent: 11 },
    };
    const n = netPension(1000, 'statutory', ctx, a, LEGAL);
    near(n.health, 110);
    expect(n.care).toBe(0);
  });
  it('warns when the base year is not covered', () => {
    const n = netPension(
      1000,
      'statutory',
      { retirementYear: 2020, realFactor: 1 },
      ASSUMPTIONS,
      LEGAL,
    );
    expect(n.warnings).toContain('taxable_share_before_base_year');
  });
});

describe('statutory validation', () => {
  it('rejects retirement age outside 63 to 70', () => {
    for (const age of [62, 71]) {
      const i = validateStatutory({ ...STATUTORY, retirementAge: age }, CTX);
      expect(i).toContainEqual({ field: 'retirementAge', code: 'out_of_range', min: 63, max: 70 });
    }
  });
  it('rejects negative pension, NaN and fractional age', () => {
    expect(
      validateStatutory({ ...STATUTORY, projectedMonthlyPensionToday: -1 }, CTX)[0]?.code,
    ).toBe('negative');
    expect(
      validateStatutory({ ...STATUTORY, projectedMonthlyPensionToday: NaN }, CTX)[0]?.code,
    ).toBe('not_finite');
    expect(validateStatutory({ ...STATUTORY, retirementAge: 66.5 }, CTX)[0]?.code).toBe(
      'not_integer',
    );
  });
  it('rejects a retirement before the statement year', () => {
    const ctx = { ...CTX, profile: { ...PROFILE, birthYear: 1959 } };
    const i = validateStatutory(
      { ...STATUTORY, statementYear: 2030, retirementAge: 67, regularRetirementAge: 66 },
      ctx,
    );
    expect(i.map((x) => x.code)).toContain('before_statement_year');
  });
  it('returns issues instead of throwing', () => {
    const r = projectStatutory({ ...STATUTORY, retirementAge: 50 }, CTX);
    expect(r.ok).toBe(false);
  });
  it('reports unverified values only when the projection uses them', () => {
    expect(project().warnings).toEqual([]);
    const legal = { ...LEGAL, unverified: ['pension.taxableShareBasePercent'] };
    expect(project({}, { ...CTX, legal }).warnings).toEqual([
      'unverified:pension.taxableShareBasePercent',
    ]);
  });
});

describe('profile and assumptions validation', () => {
  it('accepts the defaults', () => {
    expect(validateProfile(PROFILE, 2026)).toEqual([]);
    expect(validateAssumptions(defaultAssumptions(2.9))).toEqual([]);
  });
  it('flags birth year, horizon and children', () => {
    const issues = validateProfile(
      {
        birthYear: 2030,
        targetRetirementAge: 67,
        lifeExpectancyAge: 60,
        childrenBirthYears: [2010, NaN],
      },
      2026,
    );
    expect(issues.map((i) => i.field).sort()).toEqual([
      'birthYear',
      'childrenBirthYears.1',
      'lifeExpectancyAge',
    ]);
  });
  it('flags scenario order, out-of-range percent and missing other rate', () => {
    const a = {
      ...ASSUMPTIONS,
      inflationPercent: 150,
      returnScenarios: { pessimistic: 6, neutral: 5, optimistic: 7 },
      health: { ...ASSUMPTIONS.health, mode: 'other' as const },
    };
    const f = validateAssumptions(a).map((i) => i.field);
    expect(f).toContain('inflationPercent');
    expect(f).toContain('returnScenarios');
    expect(f).toContain('health.otherRatePercent');
  });
});

describe('desired income', () => {
  it('is optional and accepts zero and positive values', () => {
    expect(validateProfile(PROFILE, 2026)).toEqual([]);
    for (const v of [0, 2500]) {
      expect(validateProfile({ ...PROFILE, desiredMonthlyIncomeToday: v }, 2026)).toEqual([]);
    }
  });
  it('flags negative and non-finite values', () => {
    expect(validateProfile({ ...PROFILE, desiredMonthlyIncomeToday: -1 }, 2026)).toEqual([
      { field: 'desiredMonthlyIncomeToday', code: 'negative', min: 0 },
    ]);
    expect(
      validateProfile({ ...PROFILE, desiredMonthlyIncomeToday: NaN }, 2026).map((i) => i.code),
    ).toEqual(['not_finite']);
  });
});

describe('payoutPlan', () => {
  it('matches the closed formula', () => {
    const r = payoutPlan(100000, 67, 85, 2);
    if (!r.ok) throw new Error('expected ok');
    const i = Math.pow(1.02, 1 / 12) - 1;
    const n = 18 * 12;
    near(r.plan.monthly, (100000 * i) / (1 - Math.pow(1 + i, -n)), 1e-9);
    expect(r.plan.months).toBe(216);
  });
  it('splits capital evenly at zero return', () => {
    const r = payoutPlan(12000, 65, 66, 0);
    if (!r.ok) throw new Error('expected ok');
    near(r.plan.monthly, 1000);
  });
  it('leaves no capital at the end', () => {
    const r = payoutPlan(250000, 67, 90, 3.5);
    if (!r.ok) throw new Error('expected ok');
    expect(r.plan.remaining).toHaveLength(r.plan.months + 1);
    near(r.plan.remaining[r.plan.months]!, 0, 1e-6);
  });
  it('roundtrip: paying the rate for n months from the present value equals the capital', () => {
    const r = payoutPlan(80000, 67, 85, 2);
    if (!r.ok) throw new Error('expected ok');
    const i = Math.pow(1.02, 1 / 12) - 1;
    let pv = 0;
    for (let m = 1; m <= r.plan.months; m++) pv += r.plan.monthly / Math.pow(1 + i, m);
    near(pv, 80000, 1e-6);
  });
  it('returns issues for bad input', () => {
    expect(payoutPlan(-1, 67, 85, 2).ok).toBe(false);
    expect(payoutPlan(1000, 85, 85, 2).ok).toBe(false);
    expect(payoutPlan(1000, 67, 85, NaN).ok).toBe(false);
  });
});

describe('properties', () => {
  const arb = fc.record({
    pension: fc.double({ min: 0, max: 5000, noNaN: true }),
    age: fc.integer({ min: 63, max: 70 }),
    adj: fc.double({ min: 0, max: 5, noNaN: true }),
  });
  it('net never exceeds gross and tax and contributions are not negative', () => {
    fc.assert(
      fc.property(arb, ({ pension, age, adj }) => {
        const ctx = {
          ...CTX,
          assumptions: {
            ...ASSUMPTIONS,
            pensionAdjustmentPercent: adj,
          },
        };
        const r = project({ projectedMonthlyPensionToday: pension, retirementAge: age }, ctx);
        expect(r.details.nominal.net).toBeLessThanOrEqual(r.details.nominal.gross + 1e-9);
        expect(r.details.nominal.tax).toBeGreaterThanOrEqual(0);
        expect(r.details.nominal.contributions).toBeGreaterThanOrEqual(0);
        expect(r.netMonthlyPensionReal).toBeLessThanOrEqual(r.monthlyPensionReal + 1e-9);
      }),
    );
  });
  it('a later retirement never lowers the gross pension at the same statement', () => {
    fc.assert(
      fc.property(fc.integer({ min: 63, max: 69 }), (age) => {
        const a = project({ retirementAge: age });
        const b = project({ retirementAge: age + 1 });
        expect(b.monthlyPensionNominal).toBeGreaterThan(a.monthlyPensionNominal);
      }),
    );
  });
  it('payout plan: higher return gives a lower payment need, capital is exhausted', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1000, max: 1e6, noNaN: true }),
        fc.integer({ min: 66, max: 80 }),
        fc.double({ min: -5, max: 8, noNaN: true }),
        (capital, end, r) => {
          const p = payoutPlan(capital, 65, end, r);
          if (!p.ok) throw new Error('expected ok');
          expect(Math.abs(p.plan.remaining[p.plan.months]!)).toBeLessThan(1e-3 + capital * 1e-9);
        },
      ),
    );
  });
});

describe('pension for the chosen retirement age (statement amount)', () => {
  it('replaces statement amount x factor and applies no deduction', () => {
    const early = project({ retirementAge: 63 });
    const given = project({ retirementAge: 63, projectedMonthlyPensionAtRetirementAgeToday: 1450 });
    expect(given.details.usedAmountAtRetirementAge).toBe(true);
    expect(given.details.factor).toBe(1);
    expect(given.details.adjustmentPercent).toBe(0);
    expect(given.warnings).toContain('statutory_amount_for_retirement_age');
    const growth = Math.pow(1.025, given.details.yearsToRetirement);
    near(given.details.nominal.gross, 1450 * growth, 1e-6);
    // Without the amount the statement value is reduced by the 14,4 % deduction only.
    near(
      early.details.nominal.gross,
      STATUTORY.projectedMonthlyPensionToday * growth * 0.856,
      1e-6,
    );
  });

  it('ignores 0 and an empty value', () => {
    const base = project({ retirementAge: 65 });
    const zero = project({ retirementAge: 65, projectedMonthlyPensionAtRetirementAgeToday: 0 });
    expect(zero.details.usedAmountAtRetirementAge).toBe(false);
    near(zero.details.nominal.gross, base.details.nominal.gross);
  });

  it('rejects a negative or non-finite amount', () => {
    const fields = (v: number) =>
      validateStatutory({ ...STATUTORY, projectedMonthlyPensionAtRetirementAgeToday: v }, CTX).map(
        (i) => i.field,
      );
    expect(fields(-1)).toContain('projectedMonthlyPensionAtRetirementAgeToday');
    expect(fields(Number.NaN)).toContain('projectedMonthlyPensionAtRetirementAgeToday');
  });

  it('keeps the last path point equal to the gross pension at the start', () => {
    const r = project({ retirementAge: 63, projectedMonthlyPensionAtRetirementAgeToday: 1450 });
    const last = r.details.path[r.details.path.length - 1]!;
    near(last.nominal, r.details.nominal.gross);
  });
});
