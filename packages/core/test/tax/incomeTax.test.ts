import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { incomeTax } from '../../src';
import { LEGAL } from '../pensionFixtures';

const T = LEGAL.incomeTax;

describe('incomeTax (§32a EStG, 2026)', () => {
  it.each([
    [-5000, 0],
    [0, 0],
    [12348, 0],
    [12349, 0],
    [17799, 1034],
    [17800, 1035],
    [30000, 4217],
    [50000, 10548],
    [69878, 18213],
    [100000, 30864],
    [277825, 105550],
    [277826, 105551],
    [300000, 115529],
  ])('taxable income %d gives %d', (income, expected) => {
    expect(incomeTax(income, T)).toBe(expected);
  });

  it('rounds the income down to full euros', () => {
    expect(incomeTax(30000.99, T)).toBe(incomeTax(30000, T));
  });

  it('returns 0 for non-finite input', () => {
    expect(incomeTax(Number.NaN, T)).toBe(0);
    expect(incomeTax(Number.POSITIVE_INFINITY, T)).toBe(0);
  });

  it('is monotonic and never exceeds the top rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 0, max: 5000 }),
        (income, extra) => {
          const a = incomeTax(income, T);
          const b = incomeTax(income + extra, T);
          return b >= a && b - a <= Math.ceil(0.45 * extra) + 1 && Number.isFinite(b);
        },
      ),
    );
  });
});
