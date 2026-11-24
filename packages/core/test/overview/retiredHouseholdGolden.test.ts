import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, defaultAssumptions, householdOverview, splitAssumptions } from '../../src';
import type { Household, OverviewProductInput, ProjectionResult, ScenarioName } from '../../src';
import { JOINT, LEGAL } from '../pensionFixtures';

type VectorResult = {
  monthlyPensionReal: number;
  taxableMonthlyReal: number;
  contributionsMonthlyReal: number;
  fixedTaxMonthlyReal: number;
};
type VectorProduct = {
  productId: 'statutory';
  enabled: boolean;
  payoutStartAge: number;
  valid: boolean;
  fixedTaxFree?: number;
  fixedTaxFreeFromNextYear?: boolean;
  results: Record<ScenarioName, VectorResult>;
};
type Vector = {
  name: string;
  persons: {
    id: string;
    name: string;
    birthYear: number;
    targetRetirementAge: number;
    lifeExpectancyAge: number;
    childrenBirthYears: number[];
    retired?: boolean;
    retirementStartYear?: number;
  }[];
  assumptions: ReturnType<typeof defaultAssumptions>;
  desiredMonthlyIncomeToday: number;
  currentYear: number;
  jointAssessment: boolean;
  survivorPension?: 'new' | 'old';
  products: Record<string, VectorProduct[]>;
  expected: {
    firstYear: number;
    snapshotYear: number;
    lastYear: number;
    survivor?: { deceasedId: string; survivorId: string; deathYear: number };
    scenarios: Record<
      ScenarioName,
      {
        net: number;
        byPerson: Record<string, number>;
        gap: number;
        surplus: number;
        totalGapReal: number;
        retiredToday: Record<string, number>;
        path: {
          year: number;
          total: number;
          byPerson: Record<string, number>;
          gap?: number;
          desired?: number;
          transition?: boolean;
          survivor?: Record<string, number>;
        }[];
      }
    >;
  };
};

const dir = join(__dirname, '..', 'golden-vectors', 'retired-household');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

const TOL = 0.005;
const close = (actual: number | undefined, expected: number | null | undefined) => {
  if (expected === null || expected === undefined) expect(actual).toBeUndefined();
  else expect(Math.abs((actual ?? NaN) - expected)).toBeLessThan(TOL);
};

function toInput(p: VectorProduct): OverviewProductInput {
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = p.results[s];
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
      ...(p.fixedTaxFree === undefined ? {} : { fixedTaxFreeMonthlyReal: p.fixedTaxFree }),
      ...(p.fixedTaxFreeFromNextYear ? { fixedTaxFreeFromNextYear: true } : {}),
      warnings: [],
    };
  }
  return {
    productId: p.productId,
    enabled: p.enabled,
    payoutStartAge: p.payoutStartAge,
    outcome: { ok: true, results },
  };
}

describe('golden vectors: household with one retired person (rh01, rh02)', () => {
  it('has the vectors rh01 and rh02', () => {
    expect(vectors.map((v) => v.name.slice(0, 4))).toEqual(['rh01', 'rh02']);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const { household: shared, personal } = splitAssumptions(v.assumptions);
      const household: Household = {
        id: 'h',
        desiredMonthlyIncomeToday: v.desiredMonthlyIncomeToday,
        ...(v.survivorPension === undefined ? {} : { survivorPension: v.survivorPension }),
        jointAssessment: v.jointAssessment,
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
      const r = out.result;
      expect([r.firstYear, r.snapshotYear, r.lastYear]).toEqual([
        v.expected.firstYear,
        v.expected.snapshotYear,
        v.expected.lastYear,
      ]);
      expect(r.survivor).toEqual(v.expected.survivor);
      for (const s of SCENARIO_NAMES) {
        const e = v.expected.scenarios[s];
        const a = r.scenarios[s];
        close(a.snapshot.netMonthlyPensionReal, e.net);
        close(a.snapshot.gap, e.gap);
        close(a.snapshot.surplus, e.surplus);
        close(a.totalGapReal, e.totalGapReal);
        for (const [id, val] of Object.entries(e.byPerson)) close(a.snapshot.byPerson[id], val);
        expect(a.retiredToday?.map((t) => t.personId)).toEqual(Object.keys(e.retiredToday));
        for (const t of a.retiredToday ?? []) close(t.netMonthlyReal, e.retiredToday[t.personId]);
        expect(a.path.length).toBe(e.path.length);
        e.path.forEach((ep, i) => {
          const ap = a.path[i]!;
          expect(ap.year).toBe(ep.year);
          expect(ap.transition).toBe(ep.transition);
          close(ap.total, ep.total);
          close(ap.gap, ep.gap ?? null);
          close(ap.desired, ep.desired ?? null);
          for (const [id, val] of Object.entries(ep.survivor ?? {})) {
            close(ap.survivorPension?.[id], val);
          }
          if (!ep.survivor) expect(ap.survivorPension).toBeUndefined();
          for (const [id, val] of Object.entries(ep.byPerson)) close(ap.byPerson[id], val);
        });
      }
    });
  }

  it('example 5 of the concept: Marta nets 1,447.26 EUR (real) in the snapshot year 2029', () => {
    const v = vectors[0]!;
    close(v.expected.scenarios.neutral.byPerson.marta, 1447.26);
    close(v.expected.scenarios.neutral.retiredToday.marta, 1432.39);
  });
});
