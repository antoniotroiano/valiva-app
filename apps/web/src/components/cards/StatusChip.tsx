import type { ReactNode } from 'react';
import { Icon, type IconName } from '../layout/Icon';

export type StatusKind = 'ok' | 'hint' | 'warn' | 'error';

const ICON: Record<StatusKind, IconName> = { ok: 'ok', hint: 'info', warn: 'warn', error: 'error' };

/** Status as icon + text + colour, never colour alone. The text comes from the caller (i18n). */
export function StatusChip({
  kind,
  children,
  size,
}: {
  kind: StatusKind;
  children: ReactNode;
  size?: 'sm' | 'lg';
}) {
  return (
    <span className={`chip ${kind}${size ? ` ${size}` : ''}`}>
      <Icon name={ICON[kind]} size="sm" />
      {children}
    </span>
  );
}
