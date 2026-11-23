/**
 * Splits the review log out of a German source text from `config/` (`sourceDe`), e.g.
 * "…(§20 Abs. 1 InvStG), geprüft am 19.11.2026 auf gesetze-im-internet.de". The legal reference stays
 * as it is; the log becomes a date. A text that matches no known pattern is returned unchanged.
 */
export type SourceText = {
  text: string;
  /** Date as written in the source (DD.MM.YYYY), if the text carried a review log. */
  date?: string;
  /** `checked`: "geprüft am"; `read`: "am … gelesen" (the text was read, not verified against a law site). */
  kind?: 'checked' | 'read';
};

const D = String.raw`(\d{1,2}\.\d{1,2}\.\d{4})`;

const RULES: { pattern: RegExp; replacement: string; kind: 'checked' | 'read' }[] = [
  // "X, gesetze-im-internet.de, geprüft am D - rest"
  {
    pattern: new RegExp(String.raw`,\s*gesetze-im-internet\.de,\s*geprüft am ${D}\s+-\s+`),
    replacement: ' – ',
    kind: 'checked',
  },
  // ", geprüft am D auf gesetze-im-internet.de", also inside parentheses and without the site
  {
    pattern: new RegExp(
      String.raw`,\s*(?:gesetze-im-internet\.de,\s*)?geprüft am ${D}(?: auf gesetze-im-internet\.de)?(?=\s*[);:]|\s*$)`,
    ),
    replacement: '',
    kind: 'checked',
  },
  // " (am D gelesen)"
  { pattern: new RegExp(String.raw`\s*\(am ${D} gelesen\)`), replacement: '', kind: 'read' },
  // ", am D im BMF-Schreiben gelesen"
  {
    pattern: new RegExp(String.raw`,\s*am ${D} im BMF-Schreiben gelesen`),
    replacement: '',
    kind: 'read',
  },
];

export function splitSourceText(source: string): SourceText {
  for (const rule of RULES) {
    const match = rule.pattern.exec(source);
    if (!match) continue;
    const text = source.replace(rule.pattern, rule.replacement).trim();
    return { text, date: match[1], kind: rule.kind };
  }
  return { text: source };
}
