import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, calculateEtfPlan, projectEtfWithPayout } from '../src';
import type {
  EtfPlanInput,
  GlobalAssumptions,
  Profile,
  ProjectionContext,
  ScenarioName,
  TaxAssumptions,
} from '../src';
import { LEGAL } from './pensionFixtures';

// Golden vectors for the advance lump-sum tax (Vorabpauschale, review 13 F-7b). Python and Excel (formulas)
// computed them independently of the core; see tools/generate_golden.py.

type SavingsVector = {
  name: string;
  plan: EtfPlanInput;
  tax: TaxAssumptions;
  expected: Record<
    ScenarioName,
    Record<string, number | number[]> & { yearlyAdvanceLumpSum: number[] }
  >;
};

type PayoutVector = {
  name: string;
  plan: EtfPlanInput;
  tax: TaxAssumptions;
  taxUnverified: boolean;
  payoutStartAge: number;
  payoutEndAge: number;
  useGlobalAssumptions: boolean;
  profile: Profile;
  assumptions: GlobalAssumptions;
  currentYear: number;
  currentMonth: number;
  expected: Record<ScenarioName, Record<string, number>>;
};

function load<T>(folder: string): T[] {
  const dir = join(__dirname, 'golden-vectors', folder);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as T);
}

const TOL = 0.005;
const close = (actual: number | undefined, expected: number, label: string) =>
  expect(Math.abs((actual ?? Number.NaN) - expected), label).toBeLessThan(TOL);

describe('golden vectors: advance lump sum in the ETF calculator', () => {
  const vectors = load<SavingsVector>('advance');

  it('has at least 5 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(5);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const r = calculateEtfPlan(v.plan, v.tax);
      if (!r.ok) throw new Error(JSON.stringify(r.issues));
      for (const s of SCENARIO_NAMES) {
        const actual = r.scenarios[s];
        const e = v.expected[s];
        close(actual.grossFinalValue, e.grossFinalValue as number, `${s}.grossFinalValue`);
        close(actual.totalContributions, e.totalContributions as number, `${s}.contributions`);
        close(actual.advanceLumpSumTotal, e.advanceLumpSumTotal as number, `${s}.lumpSumTotal`);
        close(actual.advanceTaxPaid, e.advanceTaxPaid as number, `${s}.advanceTaxPaid`);
        close(actual.gainBeforeTax, e.gainBeforeTax as number, `${s}.gainBeforeTax`);
        close(actual.tax, e.tax as number, `${s}.tax`);
        close(actual.finalValueAfterTax, e.finalValueAfterTax as number, `${s}.afterTax`);
        close(actual.finalValueReal, e.finalValueReal as number, `${s}.real`);
        expect(actual.yearly.length).toBe(e.yearlyAdvanceLumpSum.length);
        actual.yearly.forEach((y, i) =>
          close(y.advanceLumpSum, e.yearlyAdvanceLumpSum[i] ?? Number.NaN, `${s}.year${i + 1}`),
        );
      }
    });
  }
});

describe('golden vectors: advance lump sum in the ETF with payout', () => {
  const vectors = load<PayoutVector>('advance-payout');

  it('has at least 5 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(5);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const ctx: ProjectionContext = {
        profile: v.profile,
        assumptions: v.assumptions,
        legal: LEGAL,
        currentYear: v.currentYear,
        currentMonth: v.currentMonth,
      };
      for (const s of SCENARIO_NAMES) {
        const r = projectEtfWithPayout(
          {
            plan: v.plan,
            tax: v.tax,
            taxUnverified: v.taxUnverified,
            payoutStartAge: v.payoutStartAge,
            payoutEndAge: v.payoutEndAge,
            useGlobalAssumptions: v.useGlobalAssumptions,
          },
          ctx,
          s,
        );
        if (!r.ok) throw new Error(JSON.stringify(r.issues));
        const e = v.expected[s];
        const d = r.result.details;
        expect(d.savingMonths).toBe(e.savingMonths);
        close(d.grossCapital, e.grossCapital as number, `${s}.grossCapital`);
        close(d.totalContributions, e.totalContributions as number, `${s}.contributions`);
        close(d.advanceLumpSumSaving, e.advanceLumpSumSaving as number, `${s}.lumpSumSaving`);
        close(d.advanceTaxSaving, e.advanceTaxSaving as number, `${s}.taxSaving`);
        close(d.gainShare, e.gainShare as number, `${s}.gainShare`);
        close(r.result.monthlyPensionNominal, e.monthlyNominal as number, `${s}.monthly`);
        close(d.advanceLumpSumPayout, e.advanceLumpSumPayout as number, `${s}.lumpSumPayout`);
        close(d.taxMonthlyNominal, e.taxMonthlyNominal as number, `${s}.taxMonthly`);
        close(r.result.netMonthlyPensionReal, e.netReal as number, `${s}.netReal`);
      }
    });
  }
});
