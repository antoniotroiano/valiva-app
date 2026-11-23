import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  defaultAssumptions,
  householdOverview,
  jointLumpSumTax,
  jointRetirementIncomeTax,
  splitAssumptions,
} from '../../src';
import type {
  Household,
  OverviewProductInput,
  OverviewProductKind,
  ProjectionResult,
  ScenarioName,
  TaxableIncome,
} from '../../src';
import { JOINT, LEGAL } from '../pensionFixtures';

const TOL = 0.005;
const root = join(__dirname, '..', 'golden-vectors');
const load = <T>(dir: string): T[] =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(root, dir, f), 'utf8')) as T);

type TaxVector = {
  name: string;
  incomesA: [number, number][];
  incomesB: [number, number][] | null;
  lumpSumTaxable: number;
  expected: {
    taxableIncomeYearly: number;
    taxYearly: number;
    taxMonthly: number;
    sharesA: number[];
    sharesB: number[];
    shareA: number;
    shareB: number;
    separateTaxYearly: number;
    lumpSumTaxYearly?: number;
  };
};

const incomes = (list: [number, number][], prefix: string): TaxableIncome[] =>
  list.map(([taxableMonthly, contributionsMonthly], i) => ({
    id: `${prefix}${i}`,
    taxableMonthly,
    contributionsMonthly,
  }));

describe('golden vectors: joint tax (Python and Excel sheets j01 to j08)', () => {
  const vectors = load<TaxVector>('joint-tax');
  it('has at least 6 vectors', () => expect(vectors.length).toBeGreaterThanOrEqual(6));

  for (const v of vectors) {
    it(v.name, () => {
      const a = incomes(v.incomesA, 'a');
      const b = v.incomesB === null ? null : incomes(v.incomesB, 'b');
      const r = jointRetirementIncomeTax(a, b, LEGAL.incomeTax, JOINT);
      expect(Math.abs(r.taxableIncomeYearly - v.expected.taxableIncomeYearly)).toBeLessThan(TOL);
      expect(r.taxYearly).toBe(v.expected.taxYearly);
      expect(r.taxMonthly).toBeCloseTo(v.expected.taxMonthly, 9);
      expect(r.shareA).toBeCloseTo(v.expected.shareA, 9);
      expect(r.shareB).toBeCloseTo(v.expected.shareB, 9);
      a.forEach((x, i) => expect(r.byIdA[x.id]).toBeCloseTo(v.expected.sharesA[i]!, 9));
      (b ?? []).forEach((x, i) => expect(r.byIdB[x.id]).toBeCloseTo(v.expected.sharesB[i]!, 9));
      expect(r.shareA + r.shareB).toBeCloseTo(r.taxMonthly, 9);
      if (v.lumpSumTaxable > 0) {
        expect(jointLumpSumTax(a, b, v.lumpSumTaxable, LEGAL.incomeTax, JOINT)).toBe(
          v.expected.lumpSumTaxYearly,
        );
      }
    });
  }
});

type VectorResult = {
  monthlyPensionReal: number;
  taxableMonthlyReal: number;
  contributionsMonthlyReal: number;
  fixedTaxMonthlyReal: number;
  lumpSum?: { grossReal: number };
};
type VectorProduct = {
  productId: OverviewProductKind;
  enabled: boolean;
  payoutStartAge: number;
  payoutEndAge?: number;
  valid: boolean;
  results?: Record<ScenarioName, VectorResult>;
};
type Run = {
  firstYear: number;
  snapshotYear: number;
  lastYear: number;
  scenarios: Record<
    ScenarioName,
    {
      net: number;
      byPerson: Record<string, number>;
      gap: number | null;
      totalGapReal: number | null;
      lumpSumNetReal: Record<string, number>;
      path: { year: number; total: number; byPerson: Record<string, number>; gap?: number }[];
    }
  >;
};
type HouseholdVector = {
  name: string;
  persons: {
    id: string;
    name: string;
    birthYear: number;
    targetRetirementAge: number;
    lifeExpectancyAge: number;
    childrenBirthYears: number[];
  }[];
  assumptions: ReturnType<typeof defaultAssumptions>;
  desiredMonthlyIncomeToday: number | null;
  currentYear: number;
  products: Record<string, VectorProduct[]>;
  expected: Run;
  expectedSeparate: Run;
};

function toInput(p: VectorProduct): OverviewProductInput {
  const base = {
    productId: p.productId,
    enabled: p.enabled,
    payoutStartAge: p.payoutStartAge,
    ...(p.payoutEndAge !== undefined ? { payoutEndAge: p.payoutEndAge } : {}),
  };
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = p.results![s];
    results[s] = {
      productId: p.productId,
      scenario: s,
      series: [],
      monthlyPensionNominal: r.monthlyPensionReal,
      monthlyPensionReal: r.monthlyPensionReal,
      taxAndContributions: 0,
      netMonthlyPensionReal: 0,
      taxableMonthlyReal: r.taxableMonthlyReal,
      contributionsMonthlyReal: r.contributionsMonthlyReal,
      fixedTaxMonthlyReal: r.fixedTaxMonthlyReal,
      ...(r.lumpSum
        ? {
            lumpSum: {
              gross: r.lumpSum.grossReal,
              grossReal: r.lumpSum.grossReal,
              tax: 0,
              net: r.lumpSum.grossReal,
            },
          }
        : {}),
      warnings: [],
    } as ProjectionResult;
  }
  return { ...base, outcome: { ok: true, results } };
}

describe('golden vectors: household with joint assessment (Python)', () => {
  const vectors = load<HouseholdVector>('joint-household');
  it('has at least 4 vectors', () => expect(vectors.length).toBeGreaterThanOrEqual(4));

  for (const v of vectors) {
    const build = (jointAssessment?: boolean) => {
      const { household: shared, personal } = splitAssumptions(v.assumptions);
      const household: Household = {
        id: 'h',
        desiredMonthlyIncomeToday: v.desiredMonthlyIncomeToday ?? undefined,
        ...(jointAssessment === undefined ? {} : { jointAssessment }),
        assumptions: shared,
        persons: v.persons.map((p) => ({ ...p, personalAssumptions: personal })),
      };
      const products = Object.fromEntries(
        Object.entries(v.products).map(([id, list]) => [id, list.map(toInput)]),
      );
      const out = householdOverview(
        household,
        products,
        v.currentYear,
        LEGAL.incomeTax,
        LEGAL.pension,
        JOINT,
      );
      if (!out.ok) throw new Error(JSON.stringify(out.issues));
      return out.result;
    };
    const close = (actual: number | undefined, expected: number | null | undefined) => {
      if (expected === null || expected === undefined) expect(actual).toBeUndefined();
      else expect(Math.abs((actual ?? NaN) - expected)).toBeLessThan(TOL);
    };
    const compare = (r: ReturnType<typeof build>, e: Run) => {
      expect([r.firstYear, r.snapshotYear, r.lastYear]).toEqual([
        e.firstYear,
        e.snapshotYear,
        e.lastYear,
      ]);
      for (const s of SCENARIO_NAMES) {
        const x = e.scenarios[s];
        const a = r.scenarios[s];
        close(a.snapshot.netMonthlyPensionReal, x.net);
        close(a.snapshot.gap, x.gap);
        close(a.totalGapReal, x.totalGapReal);
        for (const [id, val] of Object.entries(x.byPerson)) close(a.snapshot.byPerson[id], val);
        for (const [id, val] of Object.entries(x.lumpSumNetReal)) {
          close(a.snapshot.lumpSumNetReal[id], val);
        }
        expect(a.path.length).toBe(x.path.length);
        x.path.forEach((xp, i) => {
          const ap = a.path[i]!;
          expect(ap.year).toBe(xp.year);
          close(ap.total, xp.total);
          close(ap.gap, xp.gap ?? null);
          for (const [id, val] of Object.entries(xp.byPerson)) close(ap.byPerson[id], val);
        });
      }
    };

    it(`${v.name}: answer yes`, () => compare(build(true), v.expected));
    it(`${v.name}: answer no and not answered stay as without the feature`, () => {
      compare(build(false), v.expectedSeparate);
      compare(build(), v.expectedSeparate);
    });
  }

  it('unequal pensions give the couple a higher net with yes, equal pensions the same net', () => {
    const by = Object.fromEntries(vectors.map((v) => [v.name.slice(0, 4), v]));
    const net = (v: HouseholdVector, run: 'expected' | 'expectedSeparate') =>
      v[run].scenarios.neutral.net;
    expect(net(by.jh01!, 'expected')).toBeGreaterThan(net(by.jh01!, 'expectedSeparate'));
    expect(net(by.jh02!, 'expected')).toBeCloseTo(net(by.jh02!, 'expectedSeparate'), 9);
  });
});
