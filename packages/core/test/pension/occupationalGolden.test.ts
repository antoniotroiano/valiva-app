import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectOccupational } from '../../src';
import type {
  GlobalAssumptions,
  LegalParameters,
  OccupationalInput,
  Profile,
  ProjectionContext,
  ScenarioName,
} from '../../src';

type Vector = {
  name: string;
  scenario: ScenarioName;
  input: OccupationalInput;
  profile: Profile;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
  currentYear: number;
  expected: Record<string, number>;
};

const dir = join(__dirname, '..', 'golden-vectors', 'occupational');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

describe('golden vectors: occupational pension', () => {
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
      const r = projectOccupational(v.input, ctx, v.scenario);
      if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
      const d = r.result.details;
      const last = r.result.series.at(-1);
      const actual: Record<string, number> = {
        subsidyMonthly: d.subsidyMonthly,
        intoContractMonthly: d.intoContractMonthly,
        taxSaving: d.netEffort.taxSaving,
        socialSaving: d.netEffort.socialSaving,
        netEffort: d.netEffort.net,
        capitalAtPayout: r.result.capitalAtRetirement as number,
        contributedTotal: last?.contributed ?? Number.NaN,
        monthlyNominal: d.nominal.gross,
        grossReal: r.result.monthlyPensionReal,
        tax: d.nominal.tax,
        health: d.nominal.health,
        care: d.nominal.care,
        netNominal: d.nominal.net,
        netReal: r.result.netMonthlyPensionReal,
        taxAndContributionsReal: r.result.taxAndContributions,
        statutoryLossMonthlyToday: d.statutoryLossMonthlyToday,
      };
      for (const [key, value] of Object.entries(v.expected)) {
        expect(Math.abs((actual[key] as number) - value), key).toBeLessThan(0.005);
      }
    });
  }
});
