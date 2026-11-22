import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { de } from '../i18n/de';
import { useHousehold } from '../state/useHousehold';
import { safeSetItem, watchOtherTabs } from '../state/storageStatus';
import { isNewStart, markStarted } from '../state/onboarding';
import { MobileNav } from '../components/layout/MobileNav';
import { AppNotices } from '../components/layout/AppNotices';
import { useNarrowScreen } from '../state/useNarrowScreen';
import { HouseholdOverviewPage } from './HouseholdOverviewPage';
import { Icon } from '../components/layout/Icon';
import { BLOCK_OF, NAV, PAGES } from './pages';
import type { Page } from './pages';
import { PersonWorkspace } from './PersonWorkspace';
import { PageHeadProvider, type PageHeadValue } from '../components/layout/PageHead';
import { PersonTabs } from '../components/layout/PersonTabs';

const HouseholdPage = lazy(() =>
  import('../pages/household/HouseholdPage').then((m) => ({ default: m.HouseholdPage })),
);
const DataPage = lazy(() =>
  import('../pages/data/DataPage').then((m) => ({ default: m.DataPage })),
);

type Theme = 'system' | 'light' | 'dark';

const PERSON_PAGES: Page[] = ['profile', 'etf', 'statutory', 'depot', 'occupational', 'goals'];

function pageFromHash(): Page {
  const h = window.location.hash.slice(1) as Page;
  return PAGES.includes(h) ? h : 'overview';
}

export function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const narrow = useNarrowScreen();
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('valiva.theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });
  const household = useHousehold();
  const personId = household.state.activePersonId;
  const [view, setView] = useState<'household' | 'person'>('household');
  const multi = household.state.household.persons.length > 1;

  const [newStart, setNewStart] = useState(isNewStart);

  useEffect(() => watchOtherTabs(), []);

  useEffect(() => {
    // The first edit in a page (not in the navigation) ends the first-start state.
    const onEdit = (e: Event) => {
      if (!e.isTrusted || !(e.target instanceof Element) || !e.target.closest('main')) return;
      markStarted();
      setNewStart(false);
    };
    document.addEventListener('input', onEdit);
    document.addEventListener('change', onEdit);
    return () => {
      document.removeEventListener('input', onEdit);
      document.removeEventListener('change', onEdit);
    };
  }, []);

  useEffect(() => {
    // Collapsed sections would be missing in the printout, so they are opened while printing.
    let opened: HTMLDetailsElement[] = [];
    const beforePrint = () => {
      opened = [...document.querySelectorAll<HTMLDetailsElement>('main details:not([open])')];
      for (const d of opened) d.open = true;
    };
    const afterPrint = () => {
      for (const d of opened) d.open = false;
      opened = [];
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Page change: back to the top, focus on the new heading (screen readers announce it), page title.
  const firstPage = useRef(true);
  useEffect(() => {
    document.title = de.nav.pageTitle(de.nav[page]);
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    window.scrollTo(0, 0); // instant on purpose: no smooth scrolling, also with reduced motion
    const focusHeading = () => {
      // While a lazy page loads, React keeps the old page hidden in the DOM: skip hidden headings.
      const h1 = [...document.querySelectorAll<HTMLElement>('main h1')].find(
        (e) => e.getClientRects().length > 0,
      );
      if (!h1) return false;
      h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
      return document.activeElement === h1;
    };
    if (focusHeading()) return;
    // The page is loaded lazily: wait until its heading exists.
    const main = document.getElementById('main');
    if (!main) return;
    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const stop = window.setTimeout(() => observer.disconnect(), 3000);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [page]);

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    safeSetItem('valiva.theme', theme);
  }, [theme]);

  const go = (p: Page) => {
    window.location.hash = p;
  };

  // The one person switcher sits in the page head; building-block pages carry the person in the title.
  const persons = household.state.household.persons.map((p, i) => ({
    id: p.id,
    label: p.name.trim() || de.household.newPersonName(i + 1),
  }));
  const activeLabel = persons.find((p) => p.id === personId)?.label;
  let head: PageHeadValue = {};
  if (multi && page === 'overview') {
    head = {
      person: view === 'person' ? activeLabel : undefined,
      switcher: (
        <PersonTabs
          withHousehold
          persons={persons}
          selected={view === 'household' ? 'household' : personId}
          onSelect={(id) => {
            if (id === 'household') setView('household');
            else {
              household.setActivePerson(id);
              setView('person');
            }
          }}
        />
      ),
    };
  } else if (multi && PERSON_PAGES.includes(page)) {
    head = {
      person: activeLabel,
      switcher: (
        <PersonTabs persons={persons} selected={personId} onSelect={household.setActivePerson} />
      ),
    };
  }

  const navLink = (p: Page) => (
    <a
      className="nl"
      href={`#${p}`}
      aria-current={page === p ? 'page' : undefined}
      data-block={BLOCK_OF[p]}
    >
      <Icon name={p} />
      {de.nav[p]}
      {BLOCK_OF[p] && <span className="dot" aria-hidden="true" />}
    </a>
  );

  return (
    <div className="layout">
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          // "#main" would be read as a page name by the hash router.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {de.nav.skip}
      </a>
      {narrow ? (
        <MobileNav page={page} theme={theme} onThemeChange={setTheme} />
      ) : (
        <nav className="sidebar" aria-label={de.nav.label}>
          <div className="nav-head">
            <strong>{de.appName}</strong>
          </div>
          <ul className="nav-list">
            {NAV.map((entry) =>
              typeof entry === 'string' ? (
                <li key={entry}>{navLink(entry)}</li>
              ) : (
                <li key={entry.group}>
                  <span className="nav-group" id={`nav-${entry.group}`}>
                    {de.nav[entry.group]}
                  </span>
                  <ul className="nav-sub" aria-labelledby={`nav-${entry.group}`}>
                    {entry.items.map((p) => (
                      <li key={p}>{navLink(p)}</li>
                    ))}
                  </ul>
                </li>
              ),
            )}
          </ul>
          <div className="theme">
            <label htmlFor="theme">{de.nav.theme}</label>
            <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              <option value="system">{de.nav.themeSystem}</option>
              <option value="light">{de.nav.themeLight}</option>
              <option value="dark">{de.nav.themeDark}</option>
            </select>
          </div>
        </nav>
      )}
      <main id="main" tabIndex={-1}>
        <p className="print-only print-header">
          {de.printHeader(de.nav[page], new Date().toLocaleDateString('de-DE'))}
        </p>
        <AppNotices
          goToData={() => go('data')}
          hideExportReminder={page === 'data'}
          isNewStart={newStart}
        />
        <PageHeadProvider value={head}>
          <Suspense fallback={<p role="status">{de.nav.loading}</p>}>
            {page === 'household' ? (
              <HouseholdPage api={household} goToProfile={() => go('profile')} />
            ) : page === 'data' ? (
              <DataPage household={household} />
            ) : page === 'overview' && multi && view === 'household' ? (
              <HouseholdOverviewPage
                household={household}
                openPerson={(id) => {
                  household.setActivePerson(id);
                  setView('person');
                }}
                goToPersonProfile={(id) => {
                  household.setActivePerson(id);
                  setView('person');
                  go('profile');
                }}
              />
            ) : (
              <PersonWorkspace
                key={personId}
                personId={personId}
                household={household}
                page={page}
                go={go}
                newStart={newStart}
              />
            )}
          </Suspense>
        </PageHeadProvider>
      </main>
    </div>
  );
}
