import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function FieldGroup({
  title,
  children,
  defaultOpen = false,
  bare = false,
  summary,
  hasError = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** No own separator line or padding, for a group that is the only content of a card. */
  bare?: boolean;
  /** Short text of the current values, shown next to the title (useful while collapsed). */
  summary?: string;
  /** Opens a collapsed group when a field inside it has an error; it never closes it again. */
  hasError?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (hasError && ref.current) ref.current.open = true;
  }, [hasError]);
  return (
    <details ref={ref} className={bare ? 'group group-bare' : 'group'} open={defaultOpen}>
      <summary>
        {title}
        {summary && <small className="group-summary">{summary}</small>}
      </summary>
      <div className="group-body">{children}</div>
    </details>
  );
}
