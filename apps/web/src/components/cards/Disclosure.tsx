import type { ReactNode } from 'react';
import { Icon } from '../layout/Icon';

/**
 * One collapsible row of a "more details" list: title, a short grey summary on the right
 * (hidden on a phone) and a chevron. Use inside `.dts`. Opened while printing (see App).
 */
export function Disclosure({
  title,
  meta,
  defaultOpen,
  id,
  children,
}: {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <details className="dt" id={id} open={defaultOpen}>
      <summary>
        <span className="dt-row">
          <span>{title}</span>
          {meta && <span className="meta">{meta}</span>}
          <Icon name="chevron" size="sm" />
        </span>
      </summary>
      <div className="dt-body">{children}</div>
    </details>
  );
}
