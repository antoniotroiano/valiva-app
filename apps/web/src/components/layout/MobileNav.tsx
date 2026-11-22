import { useEffect, useRef, useState, type ReactNode } from 'react';
import { de } from '../../i18n/de';

type Theme = 'system' | 'light' | 'dark';
type Sheet = 'inputs' | 'more';

/** Pages reachable from the "Inputs" sheet; the rest of the sheet pages live under "More". */
const INPUT_PAGES = ['profile', 'etf', 'statutory', 'depot', 'occupational', 'goals'];
const MORE_PAGES = ['assumptions', 'data'];

const ICONS: Record<string, ReactNode> = {
  overview: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  inputs: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  household: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5.5a3 3 0 010 5.5M18 14c2 .7 3 2.6 3 6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
};

function Icon({ name }: { name: string }) {
  return (
    <span className="pill" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {ICONS[name]}
      </svg>
    </span>
  );
}

/**
 * Phone navigation (visible up to 900 px, see styles.css): a slim top bar with the app name and
 * the active person, plus a fixed bottom tab bar. "Inputs" and "More" open a sheet above the bar.
 */
export function MobileNav({
  page,
  persons,
  activePersonId,
  onPersonChange,
  theme,
  onThemeChange,
}: {
  page: string;
  persons: { id: string; label: string }[];
  activePersonId: string;
  onPersonChange: (id: string) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}) {
  const [open, setOpen] = useState<Sheet | null>(null);
  const triggers = useRef<Record<Sheet, HTMLButtonElement | null>>({ inputs: null, more: null });
  const closeBtn = useRef<HTMLButtonElement>(null);

  // A page change closes the sheet; the page itself takes the focus (see App).
  useEffect(() => setOpen(null), [page]);

  // Focus into the sheet when it opens; keep the page behind it out of reach.
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const behind = document.querySelectorAll('#main, .mobile-top');
    behind.forEach((e) => e.setAttribute('inert', ''));
    return () => behind.forEach((e) => e.removeAttribute('inert'));
  }, [open]);

  const dismiss = (sheet: Sheet) => {
    setOpen(null);
    triggers.current[sheet]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(open);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const sheetLink = (sheet: Sheet, p: string) => (
    <li key={p}>
      <a
        href={`#${p}`}
        aria-current={page === p ? 'page' : undefined}
        onClick={() => {
          // Same page: no hashchange follows, so the focus goes back to the tab itself.
          if (page === p) dismiss(sheet);
          else setOpen(null);
        }}
      >
        {de.nav[p as keyof typeof de.nav] as string}
      </a>
    </li>
  );

  const tab = (p: 'overview' | 'household') => (
    <a
      className="tab"
      href={`#${p}`}
      aria-current={page === p ? 'page' : undefined}
      onClick={() => setOpen(null)}
    >
      <Icon name={p} />
      {de.nav[p]}
    </a>
  );

  const sheetTab = (sheet: Sheet, label: string, pages: string[]) => (
    <button
      type="button"
      className="tab"
      ref={(el) => {
        triggers.current[sheet] = el;
      }}
      aria-expanded={open === sheet}
      aria-controls={`sheet-${sheet}`}
      aria-current={pages.includes(page) ? 'true' : undefined}
      onClick={() => (open === sheet ? dismiss(sheet) : setOpen(sheet))}
    >
      <Icon name={sheet} />
      {label}
    </button>
  );

  const heading = (sheet: Sheet) => (
    <div className="sheet-head">
      <h2 id={`sheet-${sheet}-title`}>{sheet === 'inputs' ? de.nav.inputs : de.nav.more}</h2>
      <button type="button" className="sheet-close" ref={closeBtn} onClick={() => dismiss(sheet)}>
        {de.nav.closeSheet}
      </button>
    </div>
  );

  return (
    <>
      <header className="mobile-top">
        <strong>{de.appName}</strong>
        {persons.length > 1 && (
          <label className="person-chip">
            <span>{de.nav.person}</span>
            <select value={activePersonId} onChange={(e) => onPersonChange(e.target.value)}>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {open && <div className="sheet-scrim" aria-hidden="true" onClick={() => dismiss(open)} />}
      {open === 'inputs' && (
        <div className="sheet" id="sheet-inputs" role="dialog" aria-labelledby="sheet-inputs-title">
          {heading('inputs')}
          <ul>{sheetLink('inputs', 'profile')}</ul>
          <p className="sheet-group" id="sheet-blocks">
            {de.nav.blocks}
          </p>
          <ul aria-labelledby="sheet-blocks">
            {['etf', 'statutory', 'depot', 'occupational'].map((p) => sheetLink('inputs', p))}
          </ul>
          <p className="sheet-group" id="sheet-saving">
            {de.nav.saving}
          </p>
          <ul aria-labelledby="sheet-saving">{sheetLink('inputs', 'goals')}</ul>
        </div>
      )}
      {open === 'more' && (
        <div className="sheet" id="sheet-more" role="dialog" aria-labelledby="sheet-more-title">
          {heading('more')}
          <ul>{MORE_PAGES.map((p) => sheetLink('more', p))}</ul>
          <div className="sheet-theme">
            <label htmlFor="mobile-theme">{de.nav.theme}</label>
            <select
              id="mobile-theme"
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as Theme)}
            >
              <option value="system">{de.nav.themeSystem}</option>
              <option value="light">{de.nav.themeLight}</option>
              <option value="dark">{de.nav.themeDark}</option>
            </select>
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label={de.nav.label}>
        {tab('overview')}
        {sheetTab('inputs', de.nav.inputs, INPUT_PAGES)}
        {tab('household')}
        {sheetTab('more', de.nav.more, MORE_PAGES)}
      </nav>
    </>
  );
}
