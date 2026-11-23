import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_COLOR, themeColorTags } from '../src/lib/themeColor';

describe('themeColorTags', () => {
  it('system: one tag per colour scheme, chosen by the browser', () => {
    expect(themeColorTags('system')).toEqual([
      { content: THEME_COLOR.light, media: '(prefers-color-scheme: light)' },
      { content: THEME_COLOR.dark, media: '(prefers-color-scheme: dark)' },
    ]);
  });

  it('manual choice: a single tag that always applies', () => {
    expect(themeColorTags('dark')).toEqual([{ content: THEME_COLOR.dark, media: 'all' }]);
    expect(themeColorTags('light')).toEqual([{ content: THEME_COLOR.light, media: 'all' }]);
  });

  it('matches --nav-bg in tokens.css and the tags in index.html', () => {
    const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    expect(tokens).toContain(`--nav-bg: light-dark(${THEME_COLOR.light}, ${THEME_COLOR.dark})`);
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`content="${THEME_COLOR.light}" media="(prefers-color-scheme: light)"`);
    expect(html).toContain(`content="${THEME_COLOR.dark}" media="(prefers-color-scheme: dark)"`);
  });
});
