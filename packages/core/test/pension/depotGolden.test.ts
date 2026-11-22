import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectDepot } from '../../src';
import type {
  DepotInput,
  GlobalAssumptions,
  LegalParameters,
  Profile,
  ProjectionContext,
  ScenarioName,
} from '../../src';
import { LEGAL } from '../pensionFixtures';

type Vector = {
  name: string;
  scenario: ScenarioName;
  input: DepotInput;
  profile: Profile;
  assumptions: GlobalAssumptions;
  depotLegal: LegalParameters['depot'];
  currentYear: number;
  expected: Record<string, number | unknown>;
};

const dir = join(__dirname, '..', 'golden-vectors', 'depot');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

describe('golden vectors: retirement depot', () => {
  it('has at least 5 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(5);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const ctx: ProjectionContext = {
        profile: v.profile,
        assumptions: v.assumptions,
        legal: { ...LEGAL, depot: v.depotLegal },
        currentYear: v.currentYear,
      };
      const r = projectDepot(v.input, ctx, v.scenario);
      if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
      const d = r.result.details;
      const actual: Record<string, number> = {
        capitalAtPayout: r.result.capitalAtRetirement as number,
        ownTotal: d.ownTotal,
        allowanceTotal: d.allowanceTotal,
        modelCapital: d.modelCapital,
        guaranteeFloor: d.guaranteeFloor,
        lumpSumGross: d.lumpSumGross,
        planCapital: d.planCapital,
        monthlyNominal: d.nominal.gross,
        grossReal: r.result.monthlyPensionReal,
        tax: d.nominal.tax,
        health: d.nominal.health,
        netNominal: d.nominal.net,
        netReal: r.result.netMonthlyPensionReal,
        taxAndContributionsReal: r.result.taxAndContributions,
        lumpNet: r.result.lumpSum?.net ?? 0,
        lumpNetReal: r.result.lumpSum?.netReal ?? 0,
      };
      for (const [key, value] of Object.entries(v.expected)) {
        if (typeof value !== 'number') continue;
        expect(Math.abs((actual[key] as number) - value), key).toBeLessThan(0.005);
      }
      const years = v.expected.allowancesByYear as
        { year: number; basic: number; child: number; bonus: number }[] | undefined;
      expect(d.yearly.length).toBe(years?.length);
      years?.forEach((y, i) => {
        const row = d.yearly[i];
        expect(row?.year).toBe(y.year);
        expect(Math.abs((row?.basic ?? 0) - y.basic), `basic ${y.year}`).toBeLessThan(1e-6);
        expect(Math.abs((row?.child ?? 0) - y.child), `child ${y.year}`).toBeLessThan(1e-6);
        expect(Math.abs((row?.bonus ?? 0) - y.bonus), `bonus ${y.year}`).toBeLessThan(1e-6);
      });
    });
  }
});
