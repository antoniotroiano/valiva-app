import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateEtfPlan, SCENARIO_NAMES } from '../../src';
import type { EtfPlanInput, ScenarioName, TaxAssumptions } from '../../src';

type Expected = Record<string, number>;
type Vector = {
  name: string;
  input: EtfPlanInput;
  tax: TaxAssumptions;
  expected: Record<ScenarioName, Expected>;
};

const dir = join(__dirname, '..', 'golden-vectors');
const vectors: Vector[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Vector);

describe('golden vectors', () => {
  it('has at least 8 vectors', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(8);
  });

  for (const v of vectors) {
    it(v.name, () => {
      const r = calculateEtfPlan(v.input, v.tax);
      if (!r.ok) throw new Error('expected ok');
      for (const sc of SCENARIO_NAMES) {
        for (const [key, value] of Object.entries(v.expected[sc])) {
          const actual = r.scenarios[sc][key as keyof (typeof r.scenarios)[ScenarioName]] as number;
          expect(Math.abs(actual - value), `${sc}.${key}`).toBeLessThan(0.01);
        }
      }
    });
  }
});
