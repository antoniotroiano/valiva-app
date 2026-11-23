import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NAMES,
  buildOtherIncomeProducts,
  householdOverview,
  personContext,
  splitAssumptions,
} from '../../src';
import type {
  GlobalAssumptions,
  Household,
  OtherIncomeEntry,
  OverviewProductId,
  OverviewProductInput,
  ProjectionResult,
  ScenarioName,
} from '../../src';
import { LEGAL_OI } from '../pensionFixtures';

/** Golden vector oi07 (`tools/generate_golden.py`): a couple, entries that go on to the partner (example 7). */
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
type PathPoint = {
  year: number;
  total: number;
  byPerson: Record<string, number>;
  gap?: number;
  desired?: number;
  survivor?: Record<string, number>;
  survivorOtherIncome?: Record<string, number>;
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
  assumptions: GlobalAssumptions;
  desiredMonthlyIncomeToday: number;
  survivorPension: 'new' | 'old';
  currentYear: number;
  entries: Record<string, OtherIncomeEntry[]>;
  rawProducts: Record<string, RawProduct[]>;
  expected: {
    firstYear: number;
    snapshotYear: number;
    lastYear: number;
    survivor: { deceasedId: string; survivorId: string; deathYear: number };
    scenarios: Record<
      ScenarioName,
      {
        net: number;
        byPerson: Record<string, number>;
        gap: number;
        surplus: number;
        totalGapReal: number;
        path: PathPoint[];
      }
    >;
  };
};

const v = JSON.parse(
  readFileSync(
    join(__dirname, '..', 'golden-vectors', 'other-income', 'oi07-household-survivor.json'),
    'utf8',
  ),
) as Vector;

const TOL = 0.005;
const close = (actual: number | undefined, expected: number | undefined, label = '') => {
  if (expected === undefined) expect(actual, label).toBeUndefined();
  else expect(Math.abs((actual ?? NaN) - expected), label).toBeLessThan(TOL);
};

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
    outcome: { ok: true, results },
  };
}

describe('golden vector oi07: household with entries that go on to the partner', () => {
  const { household: shared, personal } = splitAssumptions(v.assumptions);
  const household: Household = {
    id: 'h',
    desiredMonthlyIncomeToday: v.desiredMonthlyIncomeToday,
    survivorPension: v.survivorPension,
    assumptions: shared,
    persons: v.persons.map((p) => ({ ...p, personalAssumptions: personal })),
  };
  const products = Object.fromEntries(
    household.persons.map((person) => {
      const c = personContext(household, person);
      return [
        person.id,
        [
          ...(v.rawProducts[person.id] ?? []).map(rawInput),
          ...buildOtherIncomeProducts(v.entries[person.id] ?? [], {
            ...c,
            legal: LEGAL_OI,
            currentYear: v.currentYear,
          }),
        ],
      ];
    }),
  );
  const out = householdOverview(
    household,
    products,
    v.currentYear,
    LEGAL_OI.incomeTax,
    LEGAL_OI.pension,
  );

  it('calculates and finds the survivor', () => {
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.survivor).toEqual(v.expected.survivor);
    expect(out.result.firstYear).toBe(v.expected.firstYear);
    expect(out.result.snapshotYear).toBe(v.expected.snapshotYear);
    expect(out.result.lastYear).toBe(v.expected.lastYear);
  });

  for (const s of SCENARIO_NAMES) {
    it(`matches the independent calculation (${s})`, () => {
      if (!out.ok) throw new Error('not ok');
      const e = v.expected.scenarios[s];
      const a = out.result.scenarios[s];
      close(a.snapshot.netMonthlyPensionReal, e.net, 'net');
      close(a.snapshot.gap, e.gap, 'gap');
      close(a.snapshot.surplus, e.surplus, 'surplus');
      close(a.totalGapReal, e.totalGapReal, 'total gap');
      expect(a.path.length).toBe(e.path.length);
      e.path.forEach((ep, i) => {
        const ap = a.path[i]!;
        expect(ap.year).toBe(ep.year);
        close(ap.total, ep.total, `${s} ${ep.year} total`);
        close(ap.gap, ep.gap, `${s} ${ep.year} gap`);
        for (const [id, value] of Object.entries(ep.byPerson)) {
          close(ap.byPerson[id], value, `${s} ${ep.year} ${id}`);
        }
        for (const id of Object.keys(ep.survivor ?? {})) {
          close(ap.survivorPension?.[id], ep.survivor![id], `${s} ${ep.year} widow`);
        }
        expect(Object.keys(ap.survivorPension ?? {})).toEqual(Object.keys(ep.survivor ?? {}));
        for (const id of Object.keys(ep.survivorOtherIncome ?? {})) {
          close(
            ap.survivorOtherIncome?.[id],
            ep.survivorOtherIncome![id],
            `${s} ${ep.year} continued`,
          );
        }
        expect(Object.keys(ap.survivorOtherIncome ?? {})).toEqual(
          Object.keys(ep.survivorOtherIncome ?? {}),
        );
      });
    });
  }
});
