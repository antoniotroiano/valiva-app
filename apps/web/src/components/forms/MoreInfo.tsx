import { useEffect, useRef } from 'react';
import { de } from '../../i18n/de';
import { withTerms } from '../cards/Terms';

/**
 * Details behind "Mehr erfahren" for a field. Opens by itself when the field has an error (and stays
 * open afterwards), so the rule that explains the error is never hidden.
 */
export function MoreInfo({ text, hasError = false }: { text: string; hasError?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (hasError && ref.current) ref.current.open = true;
  }, [hasError]);
  return (
    <details className="more" ref={ref}>
      <summary>{de.moreLabel}</summary>
      <p className="hint">{withTerms(text)}</p>
    </details>
  );
}
