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
  percent: number;
  profile: Profile;
  assumptions: GlobalAssumptions;
  currentYear: number;
  expected: Record<
    ScenarioName,
    {
      grossCapital: number;
      gainShare: number;
      monthlyNominal: number;
      taxMonthlyNominal: number;
      grossReal: number;
      netReal: number;
      depletionAge: number | null;
      remainingAtEnd: number;
    }
  >;
};

const dir = join(__dirname, 'golden-vectors', 'withdrawal');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

const close = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThan(0.005);

describe('golden vectors: percent withdrawal of the ETF', () => {
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
            withdrawal: { strategy: 'percent', percent: v.percent },
          },
          ctx,
          s,
        );
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const e = v.expected[s];
        const d = r.result.details;
        close(d.grossCapital, e.grossCapital);
        close(d.gainShare, e.gainShare);
        close(r.result.monthlyPensionNominal, e.monthlyNominal);
        close(d.taxMonthlyNominal, e.taxMonthlyNominal);
        close(r.result.monthlyPensionReal, e.grossReal);
        close(r.result.netMonthlyPensionReal, e.netReal);
        close(d.remainingCapitalAtEnd, e.remainingAtEnd);
        if (e.depletionAge === null) expect(d.depletionAge).toBeUndefined();
        else close(d.depletionAge as number, e.depletionAge);
      }
    });
  }
});
