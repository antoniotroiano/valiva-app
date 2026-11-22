import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Contrast guard for the design tokens (docs/design.md, "Design v2"): text 4.5:1, controls and
// chart fills 3:1. The values are read from tokens.css, so a changed colour is checked at once.

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function token(name: string, side: 0 | 1): string {
  const m = css.match(
    new RegExp(`--${name}:\\s*light-dark\\(\\s*(#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\s*\\)`),
  );
  if (!m) throw new Error(`token --${name} is not a light-dark(#hex, #hex) pair`);
  return m[side + 1]!;
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const SIDES = [
  [0, 'light'],
  [1, 'dark'],
] as const;

describe.each(SIDES)('token contrast (%#) %s', (side) => {
  const t = (n: string) => token(n, side);
  const check = (fg: string, bg: string, min: number) =>
    expect(ratio(t(fg), t(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);

  it('text colours reach 4.5:1 on every surface', () => {
    for (const bg of ['bg', 'surface', 'surface-2', 'nav-bg']) {
      check('text', bg, 4.5);
      check('muted', bg, 4.5);
    }
    check('accent', 'surface', 4.5);
    check('accent', 'accent-soft', 4.5);
    check('accent', 'nav-bg', 4.5);
    check('on-accent', 'accent', 4.5);
    check('danger', 'surface', 4.5);
  });

  it('input borders, focus ring and wish line reach 3:1', () => {
    check('field-border', 'surface', 3);
    check('field-border', 'surface-2', 3);
    check('focus', 'surface', 3);
    check('wish', 'surface', 3);
  });

  it('building-block colours reach 3:1 on card and track, labels 4.5:1 on the block', () => {
    for (const b of ['b-etf', 'b-stat', 'b-dep', 'b-bav']) {
      check(b, 'surface', 3);
      check(b, 'surface-2', 3);
      check('on-block', b, 4.5);
    }
  });

  it('scenario lines reach 3:1 on the card', () => {
    for (const c of ['c-pess', 'c-neutral', 'c-opt', 'c-contrib']) check(c, 'surface', 3);
  });

  it('status chips reach 4.5:1 for text on their own fill', () => {
    for (const s of ['ok', 'hint', 'warn']) check(`${s}-fg`, `${s}-bg`, 4.5);
    check('bad-fg', 'bad-bg', 4.5);
    // Notices and chips also sit on cards: the text stays readable there
    for (const s of ['ok', 'hint', 'warn']) check(`${s}-fg`, 'surface', 4.5);
  });
});
