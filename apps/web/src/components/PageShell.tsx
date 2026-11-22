import type { ReactNode } from 'react';
import { de } from '../i18n/de';
import { Disclaimer } from './Disclaimer';

export function PageShell({
  title,
  subtitle,
  badge = true,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <h1>{title}</h1>
      <p className="sub">
        {subtitle} {badge && <span className="badge">{de.badge}</span>}
      </p>
      {children}
      <Disclaimer />
    </>
  );
}
