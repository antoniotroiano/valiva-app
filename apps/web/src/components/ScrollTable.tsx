import type { ReactNode } from 'react';

/**
 * Horizontal scroll container for tables. Keeps a wide table inside its card
 * on narrow screens instead of stretching the page. Focusable and labelled so
 * keyboard users can scroll it.
 */
export function ScrollTable({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className ? `table-wrap ${className}` : 'table-wrap'}
      role="region"
      tabIndex={0}
      aria-label={label}
    >
      {children}
    </div>
  );
}
