import type { ReactNode } from 'react';
import { de } from '../i18n/de';

const TERMS = Object.keys(de.glossary.terms);
const PATTERN = new RegExp(`\\b(${TERMS.map((t) => t.replace(/ /g, '\\s')).join('|')})\\b`, 'g');

/** Wraps known technical terms (`de.glossary`) in a focusable `<abbr>` with the explanation as title. */
export function withTerms(text: string): ReactNode {
  const parts = text.split(PATTERN);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const explanation = i % 2 === 1 ? de.glossary.terms[part] : undefined;
    return explanation ? (
      <abbr key={i} title={explanation} tabIndex={0}>
        {part}
      </abbr>
    ) : (
      part
    );
  });
}
