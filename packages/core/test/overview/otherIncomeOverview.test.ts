import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, buildOtherIncomeProducts, overview, retirementIncomeTax } from '../../src';
import type {
  OtherIncomeEntry,
  OverviewProductInput,
  OverviewResult,
  ProjectionResult,
  ScenarioName,
} from '../../src';
import { LEGAL_OI, OI_CTX, oiEntry } from '../pensionFixtures';

const near = (a: number, b: number, eps = 0.005) => expect(Math.abs(a - b)).toBeLessThan(eps);

/**
 * The tariff rounds the yearly tax down to full euros, so the monthly net can fall by up to 1/12 EUR when a tiny
 * extra amount crosses a rounding step. Monotonicity holds up to this step.
 */
const ROUNDING_STEP = 1 / 12 + 1e-6;

const profile = (desired?: number) => ({
  ...OI_CTX.profile,
  ...(desired === undefined ? {} : { desiredMonthlyIncomeToday: desired }),
});

/** An invented company pension (raw projection result, 150 EUR real at the start, fully taxable). */
function rawOccupational(
  gross: number,
  over: Partial<OverviewProductInput> = {},
): OverviewProductInput {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    results[s] = {
      productId: 'occupational',
      scenario: s,
      series: [],
      monthlyPensionNominal: gross,
      monthlyPensionReal: gross,
      taxAndContributions: 0,
      netMonthlyPensionReal: 0,
      taxableMonthlyReal: gross,
      contributionsMonthlyReal: 0,
      fixedTaxMonthlyReal: 0,
      warnings: [],
    };
  }
  return {
    productId: 'occupational',
    enabled: true,
    payoutStartAge: 67,
    outcome: { ok: true, results },
    ...over,
  };
}

function run(
  entries: OtherIncomeEntry[],
  extra: OverviewProductInput[] = [],
  desired?: number,
): OverviewResult {
  const out = overview(
    [...extra, ...buildOtherIncomeProducts(entries, OI_CTX)],
    profile(desired),
    OI_CTX.assumptions,
    OI_CTX.currentYear,
    LEGAL_OI.incomeTax,
  );
  if (!out.ok) throw new Error(JSON.stringify(out.issues));
  return out.result;
}
const neutral = (r: OverviewResult) => r.scenarios.neutral;
const statusOf = (r: OverviewResult, id: string) =>
  r.products.find((p) => p.productId === `otherIncome:${id}`);

describe('overview with entries: status per entry', () => {
  const r = run([
    oiEntry({ id: 'now' }),
    oiEntry({ id: 'later', start: { mode: 'age', age: 70 } }),
    oiEntry({ id: 'ended', start: { mode: 'age', age: 60 }, end: { mode: 'age', age: 65 } }),
    oiEntry({ id: 'endsAtStart', start: { mode: 'age', age: 60 }, end: { mode: 'age', age: 67 } }),
    oiEntry({ id: 'off', enabled: false }),
    oiEntry({ id: 'bad', amountMonthly: -1 }),
    oiEntry({ id: 'zero', amountMonthly: 0 }),
    oiEntry({ id: 'early', start: { mode: 'age', age: 60 }, end: { mode: 'age', age: 80 } }),
  ]);

  it('classifies included, later, ended, disabled, invalid and empty', () => {
    expect(statusOf(r, 'now')?.status).toBe('included');
    expect(statusOf(r, 'later')?.status).toBe('later');
    expect(statusOf(r, 'ended')?.status).toBe('ended');
    expect(statusOf(r, 'endsAtStart')?.status).toBe('ended');
    expect(statusOf(r, 'off')?.status).toBe('disabled');
    expect(statusOf(r, 'bad')?.status).toBe('invalid');
    expect(statusOf(r, 'bad')?.issues).toEqual([
      { field: 'amountMonthly', code: 'out_of_range', min: 0, max: 100_000 },
    ]);
    expect(statusOf(r, 'zero')?.empty).toBe(true);
    expect(statusOf(r, 'early')?.status).toBe('included');
  });

  it('counts only the included entries, later and ended carry 0 at the target age', () => {
    const snap = neutral(r).snapshot;
    const net = (id: string) => snap.byProduct.find((p) => p.productId === `otherIncome:${id}`);
    expect(net('later')?.grossReal).toBe(0);
    expect(net('ended')?.grossReal).toBe(0);
    expect(net('endsAtStart')?.grossReal).toBe(0);
    expect(net('off')).toBeUndefined();
    expect(net('bad')).toBeUndefined();
    expect(net('now')?.grossReal).toBeGreaterThan(0);
  });

  it('the first end age is the earliest end after the target age that pays something', () => {
    expect(r.firstPayoutEndAge).toBe(80);
  });

  it('an entry that starts before the retirement counts with its factor from its own start', () => {
    // 500 EUR nominal at the start (age 60 = 2036), fixed: at age 67 seven years of inflation have passed.
    const one = run([
      oiEntry({
        amountMonthly: 500,
        amountBasis: 'nominalAtStart',
        adjustment: { mode: 'fixed', percent: 0 },
        start: { mode: 'age', age: 60 },
        taxMode: 'none',
      }),
    ]);
    const startReal = 500 / Math.pow(1.02, 10);
    near(neutral(one).snapshot.netMonthlyPensionReal, startReal / Math.pow(1.02, 7));
  });
});

describe('overview with entries: sums, gap, composition', () => {
  it('the snapshot is the sum of the products and the composition lists every entry', () => {
    const r = run(
      [
        oiEntry({ id: 'a', taxMode: 'none' }),
        oiEntry({ id: 'b', amountMonthly: 250, taxMode: 'none' }),
      ],
      [],
      1000,
    );
    const snap = neutral(r).snapshot;
    expect(snap.byProduct.map((p) => p.productId)).toEqual(['otherIncome:a', 'otherIncome:b']);
    near(snap.netMonthlyPensionReal, 850);
    near(snap.gap!, 150);
    expect(snap.surplus).toBe(0);
    for (const point of neutral(r).path) {
      near(
        point.total,
        Object.values(point.byProduct).reduce((s: number, v) => s + (v ?? 0), 0),
        1e-9,
      );
    }
  });

  it('a surplus has no gap', () => {
    const snap = neutral(run([oiEntry({ taxMode: 'none' })], [], 400)).snapshot;
    expect(snap.gap).toBe(0);
    near(snap.surplus!, 200);
  });

  it('the path ends when an entry ends and a later one starts', () => {
    const r = run(
      [
        oiEntry({ id: 'e', taxMode: 'none', end: { mode: 'age', age: 75 } }),
        oiEntry({ id: 'l', taxMode: 'none', amountMonthly: 100, start: { mode: 'age', age: 70 } }),
      ],
      [],
      700,
    );
    const at = (age: number) => neutral(r).path.find((p) => p.age === age)!;
    near(at(74).byProduct['otherIncome:e']!, 600);
    expect(at(75).byProduct['otherIncome:e']).toBe(0);
    expect(at(69).byProduct['otherIncome:l']).toBe(0);
    near(at(70).byProduct['otherIncome:l']!, 100);
    near(at(70).gap!, 0);
    near(at(75).gap!, 600);
  });

  it('ten entries calculate, the eleventh and a repeated id are invalid with a reason', () => {
    const ten = Array.from({ length: 10 }, (_, i) =>
      oiEntry({ id: `e${i}`, amountMonthly: 100, taxMode: 'none' }),
    );
    const r10 = run(ten);
    near(neutral(r10).snapshot.netMonthlyPensionReal, 1000);
    const r11 = run([...ten, oiEntry({ id: 'e10', amountMonthly: 100, taxMode: 'none' })]);
    expect(statusOf(r11, 'e10')?.status).toBe('invalid');
    expect(statusOf(r11, 'e10')?.issues).toEqual([
      { field: 'entries', code: 'too_many_entries', max: 10 },
    ]);
    near(neutral(r11).snapshot.netMonthlyPensionReal, 1000);
    const dup = run([oiEntry({ id: 'x' }), oiEntry({ id: 'x', amountMonthly: 50 })]);
    expect(dup.products.map((p) => p.status)).toEqual(['included', 'invalid']);
  });
});

describe('overview with entries: tax on the sum', () => {
  it('two entries are taxed together, not one by one', () => {
    const one = neutral(run([oiEntry({ id: 'a', amountMonthly: 1500 })])).snapshot;
    const two = neutral(
      run([oiEntry({ id: 'a', amountMonthly: 1500 }), oiEntry({ id: 'b', amountMonthly: 1500 })]),
    ).snapshot;
    // Progression: the second 1,500 EUR is taxed at a higher rate than the first.
    expect(two.taxAndContributionsReal).toBeGreaterThan(2 * one.taxAndContributionsReal);
  });

  it('a lone small entry stays below the basic allowance, the sum with a pension does not', () => {
    const small = neutral(run([oiEntry({ amountMonthly: 600 })])).snapshot;
    expect(small.taxAndContributionsReal).toBe(0);
    const sum = neutral(
      run([oiEntry({ id: 'a', amountMonthly: 600 }), oiEntry({ id: 'b', amountMonthly: 1500 })]),
    ).snapshot;
    const expected = retirementIncomeTax(
      [{ id: 'sum', taxableMonthly: 2100, contributionsMonthly: 0 }],
      LEGAL_OI.incomeTax,
    ).taxMonthly;
    near(sum.taxAndContributionsReal, expected, 1e-9);
    expect(sum.taxAndContributionsReal).toBeGreaterThan(0);
  });

  it('example 5: the sum of four entries is taxed 4,081 EUR a year, without the pension nothing', () => {
    const riester = oiEntry({
      id: 'riester',
      amountMonthly: 150,
      amountBasis: 'nominalAtStart',
      adjustment: { mode: 'fixed', percent: 0 },
      start: { mode: 'age', age: 67 },
    });
    const basis = oiEntry({
      id: 'basis',
      amountMonthly: 400,
      amountBasis: 'nominalAtStart',
      adjustment: { mode: 'fixed', percent: 1 },
      start: { mode: 'age', age: 67 },
      taxMode: 'pensionShare',
    });
    const rent = oiEntry({ id: 'rent', amountMonthly: 600 });
    const pension = oiEntry({ id: 'pension', amountMonthly: 1500 });
    const without = neutral(run([riester, rent, basis])).snapshot;
    near(without.taxAndContributionsReal, 0, 1e-9); // 971.36 EUR a month is below the basic allowance
    const all = neutral(run([riester, rent, basis, pension])).snapshot;
    near(all.taxAndContributionsReal, 4081 / 12);
    const share = (id: string) =>
      all.byProduct.find((p) => p.productId === `otherIncome:${id}`)!.taxAndContributionsReal;
    near(share('riester'), 14.74);
    near(share('rent'), 82.57);
    near(share('basis'), 36.36);
    near(share('pension'), 206.41);
  });

  it('the tax-free part of a pensionShare entry stays fixed, later increases are fully taxable (example 4)', () => {
    const entry = oiEntry({
      id: 'basis',
      kind: 'basisPension',
      amountMonthly: 400,
      amountBasis: 'nominalAtStart',
      adjustment: { mode: 'fixed', percent: 1 },
      start: { mode: 'age', age: 67 },
      taxMode: 'pensionShare',
    });
    const r = run([entry]);
    const point = neutral(r).path.find((p) => p.age === 77)!;
    const grossNominal = 400 * Math.pow(1.01, 10);
    near(grossNominal, 441.85);
    const f = Math.pow(1.02, 27); // 2043 + 10 = 2053, 27 years from today
    const taxableNominal = grossNominal - 30;
    near(taxableNominal, 411.85);
    // Tax on exactly that taxable amount (today purchasing power) gives the net of the overview.
    const tax = retirementIncomeTax(
      [{ id: 'x', taxableMonthly: taxableNominal / f, contributionsMonthly: 0 }],
      LEGAL_OI.incomeTax,
    );
    near(point.total, grossNominal / f - tax.taxMonthly, 1e-9);
  });
});

describe('overview with entries: shared threshold of bAV and entries (15 section 5.2)', () => {
  const social = LEGAL_OI.social.occupationalHealthAllowanceMonthly; // 197.75
  const like = (id: string, amount: number) =>
    oiEntry({
      id,
      amountMonthly: amount,
      adjustment: { mode: 'fixed', percent: 0 },
      amountBasis: 'nominalAtStart',
      start: { mode: 'age', age: 67 },
      contributions: 'likeOccupational',
      taxMode: 'none',
    });
  /** The entry's real amount at 67 for a nominal start amount: divide by the inflation. */
  const nominalFor = (real: number) => real * Math.pow(1.02, 17);
  const deductions = (bav: number, entryReal: number) =>
    neutral(run([like('r', nominalFor(entryReal))], [rawOccupational(bav)])).snapshot
      .taxAndContributionsReal;

  it('each alone below the threshold, together above: contributions appear', () => {
    expect(deductions(150, 0.0001)).toBe(0); // 150.0001 in total: nothing
    near(deductions(150, 107.1244), 0.175 * (257.1244 - social) + 0.036 * 257.1244, 1e-3);
  });

  it('exactly 197.75 EUR together is free, one cent more switches everything on', () => {
    expect(deductions(100, 97.75)).toBeLessThan(1e-9);
    const over = deductions(100, 97.76);
    near(over, 0.175 * 0.01 + 0.036 * 197.76, 1e-6);
  });

  it('flags the shared group as a note and does not without a joining entry', () => {
    const withNote = neutral(run([like('r', nominalFor(100))], [rawOccupational(150)])).snapshot
      .warnings;
    expect(withNote).toContain('shared_occupational_threshold');
    const without = neutral(run([oiEntry({ id: 'x' })], [rawOccupational(150)])).snapshot.warnings;
    expect(without).not.toContain('shared_occupational_threshold');
  });

  it('the company pension alone keeps the contributions its projector computed', () => {
    const base = neutral(run([], [rawOccupational(300)])).snapshot;
    // raw product has contributions 0 in its result: no group, so none appear (no tax either at 300 EUR)
    expect(base.taxAndContributionsReal).toBe(0);
  });

  it('contributions are split by gross between the members', () => {
    const r = run([like('r', nominalFor(100))], [rawOccupational(300)]);
    const snap = neutral(r).snapshot;
    const total = 0.175 * (400 - social) + 0.036 * 400;
    const bav = snap.byProduct.find((p) => p.productId === 'occupational')!;
    const entry = snap.byProduct.find((p) => p.productId === 'otherIncome:r')!;
    near(bav.taxAndContributionsReal, (total * 300) / 400, 1e-3);
    near(entry.taxAndContributionsReal, (total * 100) / 400, 1e-3);
  });

  it('uses the entered rate if the health insurance is not compulsory', () => {
    const out = overview(
      [rawOccupational(300), ...buildOtherIncomeProducts([like('r', nominalFor(100))], OI_CTX)],
      profile(),
      {
        ...OI_CTX.assumptions,
        health: { ...OI_CTX.assumptions.health, mode: 'other', otherRatePercent: 10 },
      },
      OI_CTX.currentYear,
      LEGAL_OI.incomeTax,
    );
    if (!out.ok) throw new Error('x');
    near(out.result.scenarios.neutral.snapshot.taxAndContributionsReal, 40, 1e-3);
  });
});

describe('overview: entries change nothing else', () => {
  it('an empty or fully disabled entry list gives the same snapshot as no entries', () => {
    const none = neutral(run([], [rawOccupational(400)])).snapshot;
    const off = neutral(run([oiEntry({ enabled: false })], [rawOccupational(400)])).snapshot;
    expect(off).toEqual(none);
    expect(neutral(run([], [rawOccupational(400)])).path).toEqual(
      neutral(run([oiEntry({ enabled: false })], [rawOccupational(400)])).path,
    );
  });
});

describe('property tests: overview with entries', () => {
  const entryArb = (id: string) =>
    fc
      .record({
        amount: fc.double({ min: 0, max: 100_000, noNaN: true }),
        percent: fc.double({ min: -50, max: 100, noNaN: true }),
        startAge: fc.integer({ min: 18, max: 100 }),
        endAge: fc.integer({ min: 19, max: 120 }),
        lifelong: fc.boolean(),
        taxMode: fc.constantFrom(
          'none' as const,
          'full' as const,
          'percent' as const,
          'pensionShare' as const,
        ),
        like: fc.boolean(),
        basis: fc.constantFrom('today' as const, 'nominalAtStart' as const),
      })
      .map((r) =>
        oiEntry({
          id,
          amountMonthly: r.amount,
          adjustment: { mode: 'fixed', percent: r.percent },
          start: { mode: 'age', age: r.startAge },
          end:
            r.lifelong || r.endAge <= r.startAge
              ? { mode: 'lifelong' }
              : { mode: 'age', age: r.endAge },
          taxMode: r.taxMode,
          taxSharePercent: r.taxMode === 'percent' ? 50 : undefined,
          contributions: r.like ? 'likeOccupational' : 'none',
          amountBasis: r.basis,
        }),
      );

  it('all results are finite, also at the extremes', () => {
    fc.assert(
      fc.property(fc.array(entryArb('x'), { maxLength: 4 }), (list) => {
        const entries = list.map((e, i) => ({ ...e, id: `e${i}` }));
        const out = overview(
          [rawOccupational(200), ...buildOtherIncomeProducts(entries, OI_CTX)],
          profile(3000),
          OI_CTX.assumptions,
          OI_CTX.currentYear,
          LEGAL_OI.incomeTax,
        );
        if (!out.ok) return false;
        return SCENARIO_NAMES.every((s) => {
          const sc = out.result.scenarios[s];
          const nums = [
            sc.snapshot.netMonthlyPensionReal,
            sc.snapshot.grossMonthlyPensionReal,
            sc.snapshot.taxAndContributionsReal,
            sc.totalGapReal ?? 0,
            ...sc.path.flatMap((p) => [p.total, p.gap ?? 0]),
          ];
          return nums.every(Number.isFinite);
        });
      }),
      { numRuns: 150 },
    );
  });

  it('net does not exceed gross per entry', () => {
    fc.assert(
      fc.property(entryArb('a'), (entry) => {
        const r = run([entry]);
        return neutral(r).snapshot.byProduct.every(
          (p) => p.netReal <= p.grossReal + 1e-9 && p.taxAndContributionsReal >= -1e-9,
        );
      }),
      { numRuns: 150 },
    );
  });

  it('the order of the entries does not change the result', () => {
    fc.assert(
      fc.property(entryArb('a'), entryArb('b'), entryArb('c'), (a, b, c) => {
        const x = neutral(
          run([
            { ...a, id: 'a' },
            { ...b, id: 'b' },
            { ...c, id: 'c' },
          ]),
        ).snapshot;
        const y = neutral(
          run([
            { ...c, id: 'c' },
            { ...a, id: 'a' },
            { ...b, id: 'b' },
          ]),
        ).snapshot;
        return (
          Math.abs(x.netMonthlyPensionReal - y.netMonthlyPensionReal) < 1e-6 &&
          Math.abs(x.taxAndContributionsReal - y.taxAndContributionsReal) < 1e-6
        );
      }),
      { numRuns: 100 },
    );
  });

  // Net grows with the amount as long as there are no contributions: the marginal tax rate is below 100 %.
  // With `likeOccupational` this is false on purpose: the care contribution is due on the whole sum once it
  // exceeds the threshold, so net drops by about 7 EUR when crossing it (law-like cliff, backlog).
  it('net is monotone in the amount of an entry (without contributions)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 8000, noNaN: true }),
        fc.double({ min: 0, max: 3000, noNaN: true }),
        fc.double({ min: 0, max: 8000, noNaN: true }),
        (base, extra, other) => {
          const net = (amount: number) =>
            neutral(
              run([
                oiEntry({ id: 'a', amountMonthly: amount }),
                oiEntry({ id: 'o', amountMonthly: other }),
              ]),
            ).snapshot.netMonthlyPensionReal;
          return net(base + extra) >= net(base) - ROUNDING_STEP;
        },
      ),
      { numRuns: 150 },
    );
  });

  it('a higher adjustment gives a net that is not smaller (basis today, no contributions)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 8000, noNaN: true }),
        fc.double({ min: -50, max: 90, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        (amount, g, extra) => {
          const net = (percent: number) =>
            neutral(
              run([oiEntry({ amountMonthly: amount, adjustment: { mode: 'fixed', percent } })]),
            ).snapshot.netMonthlyPensionReal;
          return net(g + extra) >= net(g) - ROUNDING_STEP;
        },
      ),
      { numRuns: 150 },
    );
  });

  it('splitting an amount into two equal entries gives the same net and the same tax', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 9000, noNaN: true }),
        fc.constantFrom('full' as const, 'pensionShare' as const, 'none' as const),
        (amount, taxMode) => {
          const whole = neutral(
            run([oiEntry({ id: 'w', amountMonthly: amount, taxMode })]),
          ).snapshot;
          const split = neutral(
            run([
              oiEntry({ id: 'p', amountMonthly: amount / 2, taxMode }),
              oiEntry({ id: 'q', amountMonthly: amount / 2, taxMode }),
            ]),
          ).snapshot;
          return (
            Math.abs(whole.netMonthlyPensionReal - split.netMonthlyPensionReal) < 1e-6 &&
            Math.abs(whole.taxAndContributionsReal - split.taxAndContributionsReal) < 1e-6
          );
        },
      ),
      { numRuns: 150 },
    );
  });

  it('an additional entry never enlarges the gap (no contributions)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 6000, noNaN: true }),
        fc.double({ min: 0, max: 6000, noNaN: true }),
        (base, extra) => {
          const gap = (list: OtherIncomeEntry[]) => neutral(run(list, [], 3500)).snapshot.gap!;
          const a = oiEntry({ id: 'a', amountMonthly: base });
          return gap([a, oiEntry({ id: 'b', amountMonthly: extra })]) <= gap([a]) + ROUNDING_STEP;
        },
      ),
      { numRuns: 150 },
    );
  });
});
