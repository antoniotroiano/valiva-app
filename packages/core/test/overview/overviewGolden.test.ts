import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, overview } from '../../src';
import { LEGAL } from '../pensionFixtures';
import type {
  GlobalAssumptions,
  OverviewProductInput,
  OverviewProductKind,
  Profile,
  ProjectionResult,
  ScenarioName,
} from '../../src';

type VectorResult = {
  monthlyPensionReal: number;
  taxableMonthlyReal: number;
  contributionsMonthlyReal: number;
  fixedTaxMonthlyReal: number;
  lumpSum?: { grossReal: number };
};

type Vector = {
  name: string;
  profile: Profile;
  assumptions: GlobalAssumptions;
  currentYear: number;
  products: {
    productId: OverviewProductKind;
    enabled: boolean;
    payoutStartAge: number;
    payoutEndAge?: number;
    valid: boolean;
    results?: Record<ScenarioName, VectorResult>;
  }[];
  expected: {
    firstPayoutEndAge: number | null;
    scenarios: Record<
      ScenarioName,
      {
        net: number;
        gross: number;
        taxAndContributions: number;
        gap: number | null;
        surplus: number | null;
        lumpNetReal: number;
        lumpGrossReal: number;
        totalGapReal: number | null;
        byProduct: {
          productId: OverviewProductKind;
          netReal: number;
          grossReal: number;
          taxAndContributionsReal: number;
        }[];
        path: {
          age: number;
          total: number;
          byProduct: Partial<Record<OverviewProductKind, number>>;
          gap?: number | null;
        }[];
      }
    >;
  };
};

const dir = join(__dirname, '..', 'golden-vectors', 'overview');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

const TOL = 0.005;
const close = (actual: number | undefined, expected: number | null) => {
  if (expected === null) expect(actual).toBeUndefined();
  else expect(Math.abs((actual ?? NaN) - expected)).toBeLessThan(TOL);
};

function toInput(p: Vector['products'][number]): OverviewProductInput {
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
      ...(r.lumpSum
        ? {
            lumpSum: {
              gross: r.lumpSum.grossReal,
              tax: 0,
              net: r.lumpSum.grossReal,
              grossReal: r.lumpSum.grossReal,
              netReal: r.lumpSum.grossReal,
            },
          }
        : {}),
      warnings: [],
    };
  }
  return { ...base, outcome: { ok: true, results } };
}

describe('golden vectors: overview', () => {
  it('has at least 5 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(5);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const outcome = overview(
        v.products.map(toInput),
        v.profile,
        v.assumptions,
        v.currentYear,
        LEGAL.incomeTax,
      );
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      const r = outcome.result;
      expect(r.firstPayoutEndAge ?? null).toBe(v.expected.firstPayoutEndAge);
      for (const s of SCENARIO_NAMES) {
        const e = v.expected.scenarios[s];
        const a = r.scenarios[s];
        close(a.snapshot.netMonthlyPensionReal, e.net);
        close(a.snapshot.grossMonthlyPensionReal, e.gross);
        close(a.snapshot.taxAndContributionsReal, e.taxAndContributions);
        close(a.snapshot.gap, e.gap);
        close(a.snapshot.surplus, e.surplus);
        close(a.snapshot.lumpSumNetReal, e.lumpNetReal);
        close(a.snapshot.lumpSumGrossReal, e.lumpGrossReal);
        close(a.totalGapReal, e.totalGapReal);
        expect(a.snapshot.byProduct.length).toBe(e.byProduct.length);
        for (const ep of e.byProduct) {
          const ap = a.snapshot.byProduct.find((x) => x.productId === ep.productId);
          close(ap?.netReal, ep.netReal);
          close(ap?.grossReal, ep.grossReal);
          close(ap?.taxAndContributionsReal, ep.taxAndContributionsReal);
        }
        expect(a.path.length).toBe(e.path.length);
        e.path.forEach((ep, i) => {
          const ap = a.path[i]!;
          expect(ap.age).toBe(ep.age);
          close(ap.total, ep.total);
          close(ap.gap, ep.gap ?? null);
          for (const [k, val] of Object.entries(ep.byProduct)) {
            close(ap.byProduct[k as OverviewProductKind], val);
          }
        });
      }
    });
  }
});
