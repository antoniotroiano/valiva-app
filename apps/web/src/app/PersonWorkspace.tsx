import { lazy, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { EmptyAction } from '../components/cards/EmptyState';
import { PageHeadProvider, usePageHead } from '../components/layout/PageHead';
import { de } from '../i18n/de';
import { currentLegal } from '../lib/legalConfig';
import { useDepot } from '../state/useDepot';
import { useEtfPlan } from '../state/useEtfPlan';
import { useGoals } from '../state/useGoals';
import type { HouseholdApi } from '../state/useHousehold';
import { useOccupational } from '../state/useOccupational';
import { useOtherIncome } from '../state/useOtherIncome';
import { useOverview } from '../state/useOverview';
import { useProfile } from '../state/useProfile';
import { useStatutory } from '../state/useStatutory';
import type { Page } from './pages';

const AssumptionsPage = lazy(() =>
  import('../pages/assumptions/AssumptionsPage').then((m) => ({ default: m.AssumptionsPage })),
);
const GoalsPage = lazy(() =>
  import('../pages/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })),
);
const ProfilePage = lazy(() =>
  import('../pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const StatutoryPage = lazy(() =>
  import('../pages/statutory/StatutoryPage').then((m) => ({ default: m.StatutoryPage })),
);
const DepotPage = lazy(() =>
  import('../pages/depot/DepotPage').then((m) => ({ default: m.DepotPage })),
);
const OtherIncomePage = lazy(() =>
  import('../pages/other/OtherIncomePage').then((m) => ({ default: m.OtherIncomePage })),
);
const OccupationalPage = lazy(() =>
  import('../pages/occupational/OccupationalPage').then((m) => ({ default: m.OccupationalPage })),
);
const EtfPage = lazy(() => import('../pages/etf/EtfPage').then((m) => ({ default: m.EtfPage })));
const EtfRetiredPage = lazy(() =>
  import('../pages/retired/EtfRetiredPage').then((m) => ({ default: m.EtfRetiredPage })),
);
const StatutoryRetiredPage = lazy(() =>
  import('../pages/retired/StatutoryRetiredPage').then((m) => ({
    default: m.StatutoryRetiredPage,
  })),
);
const OccupationalRetiredPage = lazy(() =>
  import('../pages/retired/OccupationalRetiredPage').then((m) => ({
    default: m.OccupationalRetiredPage,
  })),
);
const DepotRetiredPage = lazy(() =>
  import('../pages/retired/DepotRetiredPage').then((m) => ({ default: m.DepotRetiredPage })),
);
const OverviewPage = lazy(() =>
  import('../pages/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);

export function PersonWorkspace({
  personId,
  household,
  page,
  go,
  newStart,
  guide,
  nextStep,
}: {
  personId: string;
  household: HouseholdApi;
  page: Page;
  go: (p: Page) => void;
  newStart: boolean;
  guide?: ReactNode;
  nextStep?: EmptyAction;
}) {
  const profile = useProfile(household, personId);
  const goals = useGoals(personId, profile.committed.assumptions.churchTax);
  const statutory = useStatutory(personId);
  const depot = useDepot(personId);
  const occupational = useOccupational(personId);
  const otherIncome = useOtherIncome(personId);
  const legal = useMemo(() => currentLegal(), []);
  const plan = useEtfPlan(personId, profile, legal);
  const retirement = useOverview(
    personId,
    profile,
    legal,
    plan,
    statutory,
    depot,
    occupational,
    otherIncome,
    household,
  );

  // A person who already draws the pension sees the pages with actual values (`16` §7).
  const retiredMode = profile.state.profile.retired === true;
  const multi = household.state.household.persons.length > 1;
  const shared = multi && (page === 'profile' || page === 'assumptions');
  const head = usePageHead();
  // Values shared by all persons: the note sits under the heading (PageShell), not above it.
  const pageHead = shared
    ? { ...head, note: <p className="hint">{de.household.sharedNote}</p> }
    : head;

  return (
    <PageHeadProvider value={pageHead}>
      {page === 'overview' && (
        <OverviewPage
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
          guide={guide}
        />
      )}
      {page === 'etf' && retiredMode && (
        <EtfRetiredPage
          plan={plan}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.etf}
        />
      )}
      {page === 'etf' && !retiredMode && (
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
      {page === 'statutory' && retiredMode && (
        <StatutoryRetiredPage
          api={statutory}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.statutory}
        />
      )}
      {page === 'statutory' && !retiredMode && (
        <StatutoryPage
          api={statutory}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.statutory}
        />
      )}
      {page === 'depot' && retiredMode && (
        <DepotRetiredPage
          api={depot}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.retirementDepot}
        />
      )}
      {page === 'depot' && !retiredMode && (
        <DepotPage
          api={depot}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.retirementDepot}
        />
      )}
      {page === 'occupational' && retiredMode && (
        <OccupationalRetiredPage
          api={occupational}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.occupational}
        />
      )}
      {page === 'occupational' && !retiredMode && (
        <OccupationalPage
          api={occupational}
          profile={profile}
          legal={legal}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          nextStep={nextStep}
          otherIncome={retirement.otherIncome?.occupational}
        />
      )}
      {page === 'other' && (
        <OtherIncomePage
          api={otherIncome}
          profile={profile}
          legal={legal}
          household={household.state.household}
          retirement={retirement}
          goToProfile={() => go('profile')}
          goToAssumptions={() => go('assumptions')}
          nextStep={nextStep}
        />
      )}
      {page === 'goals' && (
        <GoalsPage
          api={goals}
          etfMonthly={plan.input.monthlyContribution}
          goToAssumptions={() => go('assumptions')}
        />
      )}
      {page === 'assumptions' && (
        <AssumptionsPage
          assumptions={profile.committed.assumptions}
          goToProfile={() => go('profile')}
        />
      )}
    </PageHeadProvider>
  );
}
