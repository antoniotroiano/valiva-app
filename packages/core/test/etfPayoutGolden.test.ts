import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCENARIO_NAMES, projectEtfWithPayout } from '../src';
import type {
  EtfPlanInput,
  GlobalAssumptions,
  Profile,
  ProjectionContext,
  ScenarioName,
  TaxAssumptions,
} from '../src';
import { LEGAL } from './pensionFixtures';

type Vector = {
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
  currentMonth?: number;
  expected: Record<
    ScenarioName,
    {
      durationYears: number;
      savingMonths: number;
      grossCapital: number;
      totalContributions: number;
      gainShare: number;
      monthlyNominal: number;
      taxMonthlyNominal: number;
      grossReal: number;
      taxReal: number;
      netReal: number;
    }
  >;
};

const dir = join(__dirname, 'golden-vectors', 'etf-payout');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

const TOL = 0.005;
const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThan(TOL);

describe('golden vectors: ETF with payout', () => {
  it('has at least 3 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(3);
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
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const e = v.expected[s];
        const d = r.result.details;
        expect(d.durationYears).toBe(e.durationYears);
        expect(d.savingMonths).toBe(e.savingMonths);
        close(d.grossCapital, e.grossCapital);
        close(d.totalContributions, e.totalContributions);
        close(d.gainShare, e.gainShare);
        close(r.result.monthlyPensionNominal, e.monthlyNominal);
        close(d.taxMonthlyNominal, e.taxMonthlyNominal);
        close(r.result.monthlyPensionReal, e.grossReal);
        close(r.result.taxAndContributions, e.taxReal);
        close(r.result.netMonthlyPensionReal, e.netReal);
      }
    });
  }
});
