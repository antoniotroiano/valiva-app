import { useEffect, useRef, useState } from 'react';
import { de } from '../../i18n/de';
import { BLOCK_OF } from '../../app/pages';
import type { Page } from '../../app/pages';
import { Icon, type IconName } from './Icon';

type Theme = 'system' | 'light' | 'dark';
type Sheet = 'inputs' | 'more';

/** Pages reachable from the "Inputs" sheet; the rest of the sheet pages live under "More". */
const INPUT_PAGES = ['profile', 'etf', 'statutory', 'depot', 'occupational', 'goals'];
const MORE_PAGES = ['assumptions', 'data'];

function TabIcon({ name }: { name: IconName }) {
  return (
    <span className="pill" aria-hidden="true">
      <Icon name={name} size="lg" />
    </span>
  );
}

/**
 * Phone navigation (visible up to 900 px, see styles.css): a slim top bar with the app name (the person
 * switcher sits in the page head), plus a fixed bottom tab bar. "Inputs" and "More" open a sheet above the bar.
 */
export function MobileNav({
  page,
  theme,
  onThemeChange,
}: {
  page: string;
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
        data-block={BLOCK_OF[p as Page]}
        onClick={() => {
          // Same page: no hashchange follows, so the focus goes back to the tab itself.
          if (page === p) dismiss(sheet);
          else setOpen(null);
        }}
      >
        <Icon name={p as Page} />
        {de.nav[p as keyof typeof de.nav] as string}
        {BLOCK_OF[p as Page] && <span className="dot" aria-hidden="true" />}
        <Icon name="next" size="sm" />
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
      <TabIcon name={p} />
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
      <TabIcon name={sheet} />
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
