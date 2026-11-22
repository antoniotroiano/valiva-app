import { describe, expect, it } from 'vitest';
import { parseNumber } from '../src/lib/format';

describe('parseNumber', () => {
  it('accepts pasted numbers with thousands separators and a decimal comma', () => {
    expect(parseNumber('123.456,7')).toBe(123456.7);
    expect(parseNumber('1.234.567')).toBe(1234567);
    expect(parseNumber(' 2,5 ')).toBe(2.5);
  });

  it('rejects text', () => {
    expect(parseNumber('12a')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
  });
});
