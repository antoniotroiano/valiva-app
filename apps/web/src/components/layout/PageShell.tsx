import type { ReactNode } from 'react';
import { de } from '../../i18n/de';
import { Disclaimer } from './Disclaimer';
import { usePageHead } from './PageHead';

/**
 * Page frame: optional important notices above the head, the head (title, one-line purpose, badge and
 * the person switcher), then the content. The active person is part of the title on person pages.
 */
export function PageShell({
  title,
  subtitle,
  badge = true,
  above,
  tools,
  personInTitle = true,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: boolean;
  /** Important notices: shown above the page head. */
  above?: ReactNode;
  /** Extra buttons in the page head, before the person switcher. */
  tools?: ReactNode;
  /** Overview pages show the person in the sub line instead of the title. */
  personInTitle?: boolean;
  children: ReactNode;
}) {
  const { person, switcher, note } = usePageHead();
  return (
    <>
      {above}
      <header className="page-head">
        <div>
          <h1>{person && personInTitle ? de.nav.titleWithPerson(title, person) : title}</h1>
          <p className="sub">{subtitle}</p>
          {note}
        </div>
        {(badge || switcher || tools) && (
          <div className="head-tools">
            {badge && <span className="badge">{de.badge}</span>}
            {tools}
            {switcher}
          </div>
        )}
      </header>
      {children}
      <Disclaimer />
    </>
  );
}
