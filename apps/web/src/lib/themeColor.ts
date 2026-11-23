export type ThemeChoice = 'system' | 'light' | 'dark';

/** Browser bar colours; the same values as `--nav-bg` in `styles/tokens.css` (checked by a test). */
export const THEME_COLOR = { light: '#fbfcfc', dark: '#111918' } as const;

export interface ThemeColorTag {
  content: string;
  media: string;
}

/**
 * `<meta name="theme-color">` tags for a theme choice. With "system" the browser picks by its own colour
 * scheme (as in `index.html`); a manual choice has one tag that applies always, so the bar follows the
 * switch of the app and not the system setting.
 */
export function themeColorTags(theme: ThemeChoice): ThemeColorTag[] {
  if (theme === 'system') {
    return [
      { content: THEME_COLOR.light, media: '(prefers-color-scheme: light)' },
      { content: THEME_COLOR.dark, media: '(prefers-color-scheme: dark)' },
    ];
  }
  return [{ content: THEME_COLOR[theme], media: 'all' }];
}

/** Replaces the theme-color tags of the document. */
export function applyThemeColor(theme: ThemeChoice, doc: Document = document): void {
  for (const old of doc.querySelectorAll('meta[name="theme-color"]')) old.remove();
  for (const tag of themeColorTags(theme)) {
    const meta = doc.createElement('meta');
    meta.name = 'theme-color';
    meta.content = tag.content;
    meta.media = tag.media;
    doc.head.append(meta);
  }
}
