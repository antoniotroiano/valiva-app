import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  projectDepotRetired,
  projectEtfHolding,
  projectOccupationalRetired,
  projectStatutoryActual,
} from '../../src';
import type { GlobalAssumptions, Profile } from '../../src';
import { LEGAL_R } from '../pensionFixtures';

type Case = {
  label: string;
  input: Record<string, number | string>;
  profile: Profile;
  assumptions: GlobalAssumptions;
  expected: Record<string, number | boolean | null | Record<string, number>[]>;
};
type Vector = { name: string; kind: string; currentYear: number; cases: Case[] };

const dir = join(__dirname, '..', 'golden-vectors', 'retired');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

const TOL = 0.005;
const close = (actual: number, expected: unknown) =>
  expect(Math.abs(actual - (expected as number))).toBeLessThan(TOL);
const tax = { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 };

function ok<T>(r: { ok: true; result: T } | { ok: false; issues: unknown[] }): T {
  if (!r.ok) throw new Error(`expected ok: ${JSON.stringify(r.issues)}`);
  return r.result;
}

describe('golden vectors: retiree mode, single person (r01 to r08)', () => {
  it('has the vectors r01 to r08', () => {
    expect(vectors.map((v) => v.name.slice(0, 3))).toEqual([
      'r01',
      'r02',
      'r03',
      'r04',
      'r05',
      'r06',
      'r07',
      'r08',
    ]);
  });

  for (const v of vectors) {
    for (const c of v.cases) {
      it(`${v.name} / ${c.label}`, () => {
        const ctx = {
          profile: c.profile,
          assumptions: c.assumptions,
          legal: LEGAL_R,
          currentYear: v.currentYear,
        };
        const e = c.expected;
        if (v.kind === 'statutory') {
          const r = ok(projectStatutoryActual(c.input, ctx));
          expect(r.details.referenceEstimated).toBe(e.referenceEstimated);
          close(r.details.taxableSharePercent, e.taxableSharePercent);
          close(r.details.referenceAnnual, e.referenceAnnual);
          close(r.details.taxFreeYearly, e.taxFreeYearly);
          close(r.taxableMonthlyReal, e.taxableMonthly);
          close(r.details.nominal.health, e.health);
          close(r.details.nominal.care, e.care);
          close(r.details.nominal.tax, e.tax);
          close(r.netMonthlyPensionReal, e.net);
        } else if (v.kind === 'etfHolding') {
          const pct = c.input.withdrawalPercent as number | undefined;
          const r = ok(
            projectEtfHolding(
              {
                holdingValue: c.input.holdingValue as number,
                holdingContributions: c.input.holdingContributions as number,
                payoutEndAge: c.input.payoutEndAge as number,
                tax,
                ...(pct === undefined
                  ? {}
                  : { withdrawal: { strategy: 'percent' as const, percent: pct } }),
              },
              ctx,
            ),
          );
          close(r.details.gainShare, e.gainShare);
          close(r.monthlyPensionNominal, e.monthly);
          close(r.details.taxMonthly, e.taxMonthly);
          close(r.netMonthlyPensionReal, e.net);
          close(r.details.remainingCapitalAtEnd, e.remainingAtEnd);
          if (e.depletionAge === null) expect(r.payoutEndAge).toBeUndefined();
          else close(r.payoutEndAge as number, e.depletionAge);
        } else if (v.kind === 'occupationalAnnuity') {
          const r = ok(projectOccupationalRetired({ retiredForm: 'annuity', ...c.input }, ctx));
          close(r.monthlyPensionReal, e.gross);
          close(r.details.nominal.health, e.health);
          close(r.details.nominal.care, e.care);
          close(r.details.nominal.tax, e.tax);
          close(r.netMonthlyPensionReal, e.net);
        } else {
          const depot = c.input.product === 'retirementDepot';
          const r = ok(
            depot
              ? projectDepotRetired(
                  {
                    retiredCapitalToday: c.input.capitalToday as number,
                    retiredEndAge: c.input.capitalEndAge as number,
                  },
                  ctx,
                )
              : projectOccupationalRetired(
                  {
                    retiredForm: 'capital',
                    capitalToday: c.input.capitalToday as number,
                    capitalEndAge: c.input.capitalEndAge as number,
                  },
                  ctx,
                ),
          );
          close(r.monthlyPensionNominal, e.monthly);
          expect(r.details.planMonths).toBe(e.planMonths);
          close(r.details.nominal.health, e.health);
          close(r.details.nominal.care, e.care);
          close(r.details.nominal.tax, e.tax);
          close(r.netMonthlyPensionReal, e.net);
        }
      });
    }
  }
});
