import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectStatutory } from '../src';
import type {
  GlobalAssumptions,
  LegalParameters,
  Profile,
  ProjectionContext,
  StatutoryInput,
} from '../src';

type Vector = {
  name: string;
  input: StatutoryInput;
  profile: Profile;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
  currentYear: number;
  expected: Record<string, number>;
};

const dir = join(__dirname, 'golden-vectors', 'statutory');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

describe('golden vectors: statutory pension', () => {
  it('has at least 5 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(5);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const ctx: ProjectionContext = {
        profile: v.profile,
        assumptions: v.assumptions,
        legal: v.legal,
        currentYear: v.currentYear,
      };
      const r = projectStatutory(v.input, ctx);
      if (!r.ok) throw new Error('expected ok');
      const d = r.result.details;
      const actual: Record<string, number> = {
        retirementYear: d.retirementYear,
        yearsToRetirement: d.yearsToRetirement,
        monthsFromRegularAge: d.monthsFromRegularAge,
        adjustmentPercent: d.adjustmentPercent,
        factor: d.factor,
        grossNominal: d.nominal.gross,
        grossReal: r.result.monthlyPensionReal,
        taxableSharePercent: d.nominal.taxableSharePercent,
        tax: d.nominal.tax,
        health: d.nominal.health,
        care: d.nominal.care,
        netNominal: d.nominal.net,
        netReal: r.result.netMonthlyPensionReal,
        taxAndContributionsReal: r.result.taxAndContributions,
        taxableReal: r.result.taxableMonthlyReal,
        contributionsReal: r.result.contributionsMonthlyReal,
      };
      for (const [key, value] of Object.entries(v.expected)) {
        expect(Math.abs((actual[key] as number) - value), key).toBeLessThan(0.005);
      }
    });
  }
});
