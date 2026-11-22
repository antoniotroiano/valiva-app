import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  capitalGainsRateWithChurchTax,
  computeCapitalGainsTax,
  resolveChurchTaxParameters,
  resolveTaxAssumptions,
} from '../../src';
import type { TaxConfig } from '../../src';
import { taxAssumptions } from '../fixtures';

const config = JSON.parse(
  readFileSync(join(__dirname, '../../../../config/tax-de.json'), 'utf8'),
) as TaxConfig;

describe('computeCapitalGainsTax', () => {
  it('applies partial exemption, allowance and rate', () => {
    // gain 10000 -> 7000 after exemption -> 6000 after allowance -> 1582.50
    const t = computeCapitalGainsTax(20000, 10000, taxAssumptions);
    expect(t.taxableGain).toBeCloseTo(6000, 6);
    expect(t.tax).toBeCloseTo(1582.5, 6);
  });

  it('is zero exactly at the allowance boundary', () => {
    // gain * 0.7 = 1000 -> gain = 1428.571...
    const gain = 1000 / 0.7;
    expect(computeCapitalGainsTax(10000 + gain, 10000, taxAssumptions).tax).toBeCloseTo(0, 9);
  });

  it('is zero below the allowance', () => {
    expect(computeCapitalGainsTax(10500, 10000, taxAssumptions).tax).toBe(0);
  });

  it('is zero for losses and zero gain', () => {
    expect(computeCapitalGainsTax(9000, 10000, taxAssumptions).tax).toBe(0);
    expect(computeCapitalGainsTax(10000, 10000, taxAssumptions).tax).toBe(0);
  });

  it('is positive just above the boundary', () => {
    expect(
      computeCapitalGainsTax(10000 + 1000 / 0.7 + 1, 10000, taxAssumptions).tax,
    ).toBeGreaterThan(0);
  });
});

describe('resolveTaxAssumptions', () => {
  it('reads config/tax-de.json (all values checked against the law)', () => {
    const r = resolveTaxAssumptions(config, '2026-11-10');
    if (!r.ok) throw new Error('expected ok');
    expect(r.assumptions).toEqual(taxAssumptions);
    expect(r.unverified).toEqual([]);
  });

  it('flags a value with status unverified', () => {
    const changed = structuredClone(config);
    changed.values.taxFreeAllowance.status = 'unverified';
    const r = resolveTaxAssumptions(changed, '2026-11-10');
    if (!r.ok) throw new Error('expected ok');
    expect(r.unverified).toEqual(['taxFreeAllowance']);
  });

  it('rejects dates outside the validity period', () => {
    const r = resolveTaxAssumptions(config, '2000-01-01');
    expect(r.ok).toBe(false);
  });
});

describe('capitalGainsRateWithChurchTax', () => {
  const params = { baseRate: 25, solidarityRate: 5.5, rateLow: 8, rateHigh: 9 };

  it('is the combined rate without church tax', () => {
    expect(capitalGainsRateWithChurchTax(params, undefined)).toBeCloseTo(26.375, 9);
  });

  it('gives the published total rates 27.995 % (9 %) and 27.819 % (8 %)', () => {
    expect(capitalGainsRateWithChurchTax(params, 'high')).toBeCloseTo(27.995, 3);
    expect(capitalGainsRateWithChurchTax(params, 'low')).toBeCloseTo(27.819, 3);
  });

  it('follows the formula income tax = e / (4 + k) with solidarity and church tax on top', () => {
    const k = 0.09;
    const incomeTax = 1 / (4 + k);
    expect(capitalGainsRateWithChurchTax(params, 'high')).toBeCloseTo(
      incomeTax * (1 + 0.055 + k) * 100,
      9,
    );
  });

  it('raises the tax on a gain by the rate difference', () => {
    const base = computeCapitalGainsTax(20000, 10000, taxAssumptions).tax;
    const withChurch = computeCapitalGainsTax(20000, 10000, {
      ...taxAssumptions,
      capitalGainsTaxRate: capitalGainsRateWithChurchTax(params, 'high'),
    }).tax;
    expect(withChurch - base).toBeCloseTo(
      (6000 * (capitalGainsRateWithChurchTax(params, 'high') - 26.375)) / 100,
      6,
    );
  });
});

describe('resolveChurchTaxParameters', () => {
  it('reads config/tax-de.json and flags the church rates as unverified', () => {
    const r = resolveChurchTaxParameters(config, '2026-11-20');
    if (!r.ok) throw new Error('expected ok');
    expect(r.parameters).toEqual({ baseRate: 25, solidarityRate: 5.5, rateLow: 8, rateHigh: 9 });
    expect(r.unverified).toEqual(['churchTaxRateLow', 'churchTaxRateHigh']);
  });

  it('keeps the base rate and the surcharge consistent with the combined capital gains rate', () => {
    const v = config.values;
    expect(v.capitalGainsBaseRate.value * (1 + v.solidaritySurchargeRate.value / 100)).toBeCloseTo(
      v.capitalGainsTaxRate.value,
      9,
    );
  });

  it('reports missing or expired values', () => {
    const r = resolveChurchTaxParameters(config, '2000-01-01');
    expect(r.ok).toBe(false);
  });
});
