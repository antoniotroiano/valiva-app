import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, buildOtherIncomeProducts, overview, projectOtherIncome } from '../../src';
import type {
  GlobalAssumptions,
  OtherIncomeEntry,
  OverviewProductId,
  OverviewProductInput,
  Profile,
  ProjectionResult,
  ScenarioName,
} from '../../src';
import { LEGAL_OI } from '../pensionFixtures';

/** Golden vectors oi01 to oi06 (`tools/generate_golden.py`): the expected values come from an independent Python implementation. */
type RawResult = {
  monthlyPensionReal: number;
  taxableMonthlyReal: number;
  contributionsMonthlyReal: number;
  fixedTaxMonthlyReal: number;
};
type RawProduct = {
  productId: OverviewProductId;
  enabled: boolean;
  payoutStartAge: number;
  payoutEndAge?: number;
  valid: boolean;
  results: Record<ScenarioName, RawResult>;
};
type EntryExpectation = {
  startAge: number;
  startYear: number;
  yearsToStart: number;
  adjustmentPercent: number;
  nominalAtStart: number;
  realAtStart: number;
  taxableSharePercent: number;
  taxableRealAtStart: number;
  fixedTaxFreeReal: number | null;
  contributionsRealStandalone: number;
};
type Vector = {
  name: string;
  profile: Profile;
  assumptions: GlobalAssumptions;
  currentYear: number;
  entries: OtherIncomeEntry[];
  extraProducts: RawProduct[];
  expected: {
    firstPayoutEndAge: number | null;
    statuses: { productId: string; status: string; empty: boolean }[];
    entries: Record<string, EntryExpectation>;
    scenarios: Record<
      ScenarioName,
      {
        net: number;
        gross: number;
        taxAndContributions: number;
        gap: number | null;
        surplus: number | null;
        totalGapReal: number | null;
        byProduct: {
          productId: string;
          netReal: number;
          grossReal: number;
          taxAndContributionsReal: number;
        }[];
        path: {
          age: number;
          total: number;
          gap?: number | null;
          byProduct: Record<string, number>;
        }[];
      }
    >;
  };
};

const dir = join(__dirname, '..', 'golden-vectors', 'other-income');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector)
  // oi07 is a household vector (see otherIncomeHouseholdGolden.test.ts)
  .filter((v) => Array.isArray(v.entries));

const TOL = 0.005;
const close = (actual: number | undefined, expected: number | null, label = '') => {
  if (expected === null) expect(actual, label).toBeUndefined();
  else expect(Math.abs((actual ?? NaN) - expected), label).toBeLessThan(TOL);
};

/** An invented projection result as the overview input (like in the overview vectors). */
function rawInput(p: RawProduct): OverviewProductInput {
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
      warnings: [],
    };
  }
  return {
    productId: p.productId,
    enabled: p.enabled,
    payoutStartAge: p.payoutStartAge,
    ...(p.payoutEndAge !== undefined ? { payoutEndAge: p.payoutEndAge } : {}),
    // The raw company pension takes part in the shared threshold group by its product id.
    outcome: { ok: true, results },
  };
}

describe('golden vectors: other income (oi01 to oi06, oi08)', () => {
  it('has the seven person vectors', () => {
    expect(vectors.map((v) => v.name.slice(0, 4))).toEqual([
      'oi01',
      'oi02',
      'oi03',
      'oi04',
      'oi05',
      'oi06',
      'oi08',
    ]);
  });

  for (const v of vectors) {
    describe(v.name, () => {
      const ctx = {
        profile: v.profile,
        assumptions: v.assumptions,
        legal: LEGAL_OI,
        currentYear: v.currentYear,
      };

      it('projects every entry to the expected amounts at the start', () => {
        for (const entry of v.entries) {
          const out = projectOtherIncome(entry, ctx);
          const e = v.expected.entries[entry.id];
          // An entry without expected amounts is invalid in the vector (oi08).
          expect(out.ok).toBe(e !== undefined);
          if (!out.ok || e === undefined) continue;
          const r = out.result;
          expect(r.details.startAge).toBe(e.startAge);
          expect(r.details.startYear).toBe(e.startYear);
          expect(r.details.yearsToStart).toBe(e.yearsToStart);
          expect(r.details.adjustmentPercent).toBe(e.adjustmentPercent);
          close(r.monthlyPensionNominal, e.nominalAtStart, 'nominal');
          close(r.monthlyPensionReal, e.realAtStart, 'real');
          close(r.taxableMonthlyReal, e.taxableRealAtStart, 'taxable');
          close(r.details.taxableSharePercent, e.taxableSharePercent, 'share');
          close(r.fixedTaxFreeMonthlyReal ?? undefined, e.fixedTaxFreeReal, 'fixed tax-free');
          close(r.contributionsMonthlyReal, e.contributionsRealStandalone, 'contributions');
        }
      });

      it('gives the expected overview in all scenarios', () => {
        const products = [
          ...v.extraProducts.map(rawInput),
          ...buildOtherIncomeProducts(v.entries, ctx),
        ];
        const outcome = overview(
          products,
          v.profile,
          v.assumptions,
          v.currentYear,
          LEGAL_OI.incomeTax,
        );
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        const r = outcome.result;
        expect(r.firstPayoutEndAge ?? null).toBe(v.expected.firstPayoutEndAge);
        expect(
          r.products.map((p) => ({
            productId: p.productId,
            status: p.status,
            empty: p.empty === true,
          })),
        ).toEqual(v.expected.statuses);
        for (const s of SCENARIO_NAMES) {
          const e = v.expected.scenarios[s];
          const a = r.scenarios[s];
          close(a.snapshot.netMonthlyPensionReal, e.net, `${s} net`);
          close(a.snapshot.grossMonthlyPensionReal, e.gross, `${s} gross`);
          close(a.snapshot.taxAndContributionsReal, e.taxAndContributions, `${s} deductions`);
          close(a.snapshot.gap, e.gap, `${s} gap`);
          close(a.snapshot.surplus, e.surplus, `${s} surplus`);
          close(a.totalGapReal, e.totalGapReal, `${s} total gap`);
          expect(a.snapshot.byProduct.length).toBe(e.byProduct.length);
          for (const ep of e.byProduct) {
            const ap = a.snapshot.byProduct.find((x) => x.productId === ep.productId);
            close(ap?.netReal, ep.netReal, `${s} ${ep.productId} net`);
            close(ap?.grossReal, ep.grossReal, `${s} ${ep.productId} gross`);
            close(ap?.taxAndContributionsReal, ep.taxAndContributionsReal, `${s} ${ep.productId}`);
          }
          expect(a.path.length).toBe(e.path.length);
          e.path.forEach((ep, i) => {
            const ap = a.path[i]!;
            expect(ap.age).toBe(ep.age);
            close(ap.total, ep.total, `${s} age ${ep.age}`);
            close(ap.gap, ep.gap ?? null, `${s} gap at ${ep.age}`);
            for (const [k, val] of Object.entries(ep.byProduct)) {
              close(ap.byProduct[k as OverviewProductId], val, `${s} ${k} at ${ep.age}`);
            }
          });
        }
      });
    });
  }
});
