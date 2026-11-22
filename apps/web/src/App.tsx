import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { de } from './i18n/de';
import { useEtfPlan } from './useEtfPlan';
import { useGoals } from './useGoals';
import { currentLegal } from './legalConfig';
import { useHousehold } from './useHousehold';
import { useHouseholdOverview } from './useHouseholdOverview';
import type { HouseholdApi } from './useHousehold';
import { useProfile } from './useProfile';
import { useStatutory } from './useStatutory';
import { useDepot } from './useDepot';
import { useOccupational } from './useOccupational';
import { useOverview } from './useOverview';
import { createStore } from './createStore';
import { isNewStart, markStarted } from './onboarding';

const AssumptionsPage = lazy(() =>
  import('./pages/AssumptionsPage').then((m) => ({ default: m.AssumptionsPage })),
);
const GoalsPage = lazy(() => import('./pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const StatutoryPage = lazy(() =>
  import('./pages/StatutoryPage').then((m) => ({ default: m.StatutoryPage })),
);
const DepotPage = lazy(() => import('./pages/DepotPage').then((m) => ({ default: m.DepotPage })));
const OccupationalPage = lazy(() =>
  import('./pages/OccupationalPage').then((m) => ({ default: m.OccupationalPage })),
);
const EtfPage = lazy(() => import('./pages/EtfPage').then((m) => ({ default: m.EtfPage })));
const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const HouseholdPage = lazy(() =>
  import('./pages/HouseholdPage').then((m) => ({ default: m.HouseholdPage })),
);
const DataPage = lazy(() => import('./pages/DataPage').then((m) => ({ default: m.DataPage })));
const HouseholdOverview = lazy(() =>
  import('./components/HouseholdOverview').then((m) => ({ default: m.HouseholdOverview })),
);

type Page =
  | 'overview'
  | 'household'
  | 'profile'
  | 'etf'
  | 'statutory'
  | 'depot'
  | 'occupational'
  | 'goals'
  | 'assumptions'
  | 'data';
type Theme = 'system' | 'light' | 'dark';

const PAGES: Page[] = [
  'overview',
  'household',
  'profile',
  'etf',
  'statutory',
  'depot',
  'occupational',
  'goals',
  'assumptions',
  'data',
];
/** Sidebar order; a group renders as a labelled sub-list. */
const NAV: (Page | { group: 'blocks'; items: Page[] })[] = [
  'overview',
  'household',
  'profile',
  { group: 'blocks', items: ['etf', 'statutory', 'depot', 'occupational'] },
  'goals',
  'assumptions',
  'data',
];

function pageFromHash(): Page {
  const h = window.location.hash.slice(1) as Page;
  return PAGES.includes(h) ? h : 'overview';
}

export function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('pathwise.theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });
  const household = useHousehold();
  const personId = household.state.activePersonId;
  const [view, setView] = useState<'household' | 'person'>('household');
  const multi = household.state.household.persons.length > 1;

  const [newStart, setNewStart] = useState(isNewStart);
  const neverExported = useMemo(() => createStore().lastExport() === undefined, []);

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

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pathwise.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const go = (p: Page) => {
    window.location.hash = p;
    setMenuOpen(false);
  };

  const navLink = (p: Page) => (
    <a
      href={`#${p}`}
      aria-current={page === p ? 'page' : undefined}
      onClick={() => setMenuOpen(false)}
    >
      {de.nav[p]}
    </a>
  );

  return (
    <div className="layout">
      <a className="skip" href="#main">
        {de.nav.skip}
      </a>
      <nav className={menuOpen ? 'open' : ''} aria-label={de.nav.label}>
        <div className="nav-head">
          <strong>{de.appName}</strong>
          <button
            type="button"
            className="btn menu-btn"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? de.nav.close : de.nav.menu}
          </button>
        </div>
        {household.state.household.persons.length > 1 && (
          <div className="person-switch">
            <label htmlFor="person">{de.nav.person}</label>
            <select
              id="person"
              value={personId}
              onChange={(e) => household.setActivePerson(e.target.value)}
            >
              {household.state.household.persons.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {p.name.trim() || de.household.newPersonName(i + 1)}
                </option>
              ))}
            </select>
          </div>
        )}
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
      <main id="main" tabIndex={-1}>
        <p className="print-only print-header">
          {de.printHeader(de.nav[page], new Date().toLocaleDateString('de-DE'))}
        </p>
        {page === 'overview' && multi && (
          <ViewSwitch household={household} view={view} setView={setView} />
        )}
        <Suspense fallback={<p role="status">{de.nav.loading}</p>}>
          {page === 'household' ? (
            <HouseholdPage api={household} goToProfile={() => go('profile')} />
          ) : page === 'data' ? (
            <DataPage household={household} />
          ) : page === 'overview' && multi && view === 'household' ? (
            <HouseholdOverviewPage
              household={household}
              goToHousehold={() => go('household')}
              openPerson={(id) => {
                household.setActivePerson(id);
                setView('person');
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
              neverExported={neverExported}
            />
          )}
        </Suspense>
      </main>
    </div>
  );
}

function ViewSwitch({
  household,
  view,
  setView,
}: {
  household: HouseholdApi;
  view: 'household' | 'person';
  setView: (v: 'household' | 'person') => void;
}) {
  const { persons } = household.state.household;
  const active = household.state.activePersonId;
  return (
    <div role="radiogroup" aria-label={de.householdView.switchLabel} className="seg view-switch">
      <label className={view === 'household' ? 'seg-on' : undefined}>
        <input
          type="radio"
          name="overview-view"
          checked={view === 'household'}
          onChange={() => setView('household')}
        />{' '}
        {de.householdView.household}
      </label>
      {persons.map((p, i) => (
        <label key={p.id} className={view === 'person' && active === p.id ? 'seg-on' : undefined}>
          <input
            type="radio"
            name="overview-view"
            checked={view === 'person' && active === p.id}
            onChange={() => {
              household.setActivePerson(p.id);
              setView('person');
            }}
          />{' '}
          {p.name.trim() || de.household.newPersonName(i + 1)}
        </label>
      ))}
    </div>
  );
}

function HouseholdOverviewPage({
  household,
  goToHousehold,
  openPerson,
}: {
  household: HouseholdApi;
  goToHousehold: () => void;
  openPerson: (id: string) => void;
}) {
  const legal = useMemo(() => currentLegal(), []);
  const data = useHouseholdOverview(household, legal);
  return (
    <HouseholdOverview
      household={household}
      data={data}
      goToHousehold={goToHousehold}
      openPerson={openPerson}
    />
  );
}

function PersonWorkspace({
  personId,
  household,
  page,
  go,
  newStart,
  neverExported,
}: {
  personId: string;
  household: HouseholdApi;
  page: Page;
  go: (p: Page) => void;
  newStart: boolean;
  neverExported: boolean;
}) {
  const profile = useProfile(household, personId);
  const goals = useGoals(personId, profile.committed.assumptions.churchTax);
  const statutory = useStatutory(personId);
  const depot = useDepot(personId);
  const occupational = useOccupational(personId);
  const legal = useMemo(() => currentLegal(), []);
  const plan = useEtfPlan(personId, profile, legal);
  const retirement = useOverview(personId, profile, legal, plan, statutory, depot, occupational);

  const multi = household.state.household.persons.length > 1;
  const shared = multi && (page === 'profile' || page === 'assumptions');

  return (
    <>
      {shared && <p className="hint">{de.household.sharedNote}</p>}
      {page === 'overview' && (
        <OverviewPage
          result={plan.result}
          taxEnabled={plan.input.taxEnabled}
          goals={goals.goals}
          goalResults={goals.results}
          goToGoals={() => go('goals')}
          retirement={retirement}
          budget={{
            budget: goals.state.savingsBudgetMonthly,
            otherSavingsMonthly: goals.state.goals.reduce(
              (sum, g) =>
                sum + (Number.isFinite(g.monthlyContribution) ? g.monthlyContribution : 0),
              0,
            ),
          }}
          goTo={go}
          wish={profile.state.profile.desiredMonthlyIncomeToday}
          setWish={(v) => profile.setProfile({ desiredMonthlyIncomeToday: v })}
          newStart={newStart}
          neverExported={neverExported}
        />
      )}
      {page === 'etf' && (
        <EtfPage
          {...plan}
          assumptions={profile.committed.assumptions}
          goToAssumptions={() => go('assumptions')}
        />
      )}
      {page === 'profile' && (
        <ProfilePage
          api={profile}
          legal={legal}
          hideWish={shared}
          goToAssumptions={() => go('assumptions')}
        />
      )}
      {page === 'statutory' && (
        <StatutoryPage
          api={statutory}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          otherIncome={retirement.otherIncome?.statutory}
        />
      )}
      {page === 'depot' && (
        <DepotPage
          api={depot}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          otherIncome={retirement.otherIncome?.retirementDepot}
        />
      )}
      {page === 'occupational' && (
        <OccupationalPage
          api={occupational}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          otherIncome={retirement.otherIncome?.occupational}
        />
      )}
      {page === 'goals' && (
        <GoalsPage
          api={goals}
          etfMonthly={plan.input.monthlyContribution}
          goToAssumptions={() => go('assumptions')}
        />
      )}
      {page === 'assumptions' && <AssumptionsPage />}
    </>
  );
}
