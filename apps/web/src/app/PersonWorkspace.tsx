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
const OccupationalPage = lazy(() =>
  import('../pages/occupational/OccupationalPage').then((m) => ({ default: m.OccupationalPage })),
);
const EtfPage = lazy(() => import('../pages/etf/EtfPage').then((m) => ({ default: m.EtfPage })));
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
  const legal = useMemo(() => currentLegal(), []);
  const plan = useEtfPlan(personId, profile, legal);
  const retirement = useOverview(personId, profile, legal, plan, statutory, depot, occupational);

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
          nextStep={nextStep}
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
          nextStep={nextStep}
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
          nextStep={nextStep}
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
      {page === 'assumptions' && (
        <AssumptionsPage
          assumptions={profile.committed.assumptions}
          goToProfile={() => go('profile')}
        />
      )}
    </PageHeadProvider>
  );
}
