import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, defaultAssumptions, householdOverview, splitAssumptions } from '../src';
import { LEGAL } from './pensionFixtures';
import type {
  Household,
  OverviewProductInput,
  OverviewProductKind,
  ProjectionResult,
  ScenarioName,
} from '../src';

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
type Vector = {
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
  survivorPension?: 'new' | 'old';
  survivorWishPercent?: number;
  currentYear: number;
  products: Record<string, VectorProduct[]>;
  expected: {
    firstYear: number;
    snapshotYear: number;
    lastYear: number;
    scenarios: Record<
      ScenarioName,
      {
        net: number;
        byPerson: Record<string, number>;
        gap: number | null;
        surplus: number | null;
        totalGapReal: number | null;
        path: {
          year: number;
          total: number;
          byPerson: Record<string, number>;
          gap?: number;
          desired?: number;
          survivor?: Record<string, number>;
        }[];
      }
    >;
  };
};

const dir = join(__dirname, 'golden-vectors', 'household');
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
  const base = {
    productId: p.productId,
    enabled: p.enabled,
    payoutStartAge: p.payoutStartAge,
    ...(p.payoutEndAge !== undefined ? { payoutEndAge: p.payoutEndAge } : {}),
  };
  if (!p.valid || !p.results) {
    return { ...base, outcome: { ok: false, issues: [{ field: 'x', code: 'negative' }] } };
  }
  const results = {} as Record<ScenarioName, ProjectionResult>;
  for (const s of SCENARIO_NAMES) {
    const r = p.results[s];
    results[s] = {
      productId: p.productId,
      scenario: s,
      series: [],
      monthlyPensionNominal: r.monthlyPensionReal,
      monthlyPensionReal: r.monthlyPensionReal,
      // The overview recomputes tax and net from the parts below; these two are not read.
      taxAndContributions: 0,
      netMonthlyPensionReal: 0,
      taxableMonthlyReal: r.taxableMonthlyReal,
      contributionsMonthlyReal: r.contributionsMonthlyReal,
      fixedTaxMonthlyReal: r.fixedTaxMonthlyReal,
      warnings: [],
    };
  }
  return { ...base, outcome: { ok: true, results } };
}

describe('golden vectors: household', () => {
  it('has at least 4 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(4);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const { household: shared, personal } = splitAssumptions(v.assumptions);
      const household: Household = {
        id: 'h',
        desiredMonthlyIncomeToday: v.desiredMonthlyIncomeToday ?? undefined,
        survivorPension: v.survivorPension,
        survivorWishPercent: v.survivorWishPercent,
        assumptions: shared,
        persons: v.persons.map((p) => ({
          id: p.id,
          name: p.name,
          birthYear: p.birthYear,
          targetRetirementAge: p.targetRetirementAge,
          lifeExpectancyAge: p.lifeExpectancyAge,
          childrenBirthYears: p.childrenBirthYears,
          personalAssumptions: personal,
        })),
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
      );
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      const r = out.result;
      expect([r.firstYear, r.snapshotYear, r.lastYear]).toEqual([
        v.expected.firstYear,
        v.expected.snapshotYear,
        v.expected.lastYear,
      ]);
      for (const s of SCENARIO_NAMES) {
        const e = v.expected.scenarios[s];
        const a = r.scenarios[s];
        close(a.snapshot.netMonthlyPensionReal, e.net);
        close(a.snapshot.gap, e.gap);
        close(a.snapshot.surplus, e.surplus);
        close(a.totalGapReal, e.totalGapReal);
        for (const [id, val] of Object.entries(e.byPerson)) close(a.snapshot.byPerson[id], val);
        expect(a.path.length).toBe(e.path.length);
        e.path.forEach((ep, i) => {
          const ap = a.path[i]!;
          expect(ap.year).toBe(ep.year);
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
});
