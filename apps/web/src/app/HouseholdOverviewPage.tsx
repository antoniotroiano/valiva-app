import { lazy, useMemo } from 'react';
import type { ReactNode } from 'react';
import { currentLegal } from '../lib/legalConfig';
import { useHouseholdOverview } from '../state/useHouseholdOverview';
import type { HouseholdApi } from '../state/useHousehold';

const HouseholdOverview = lazy(() =>
  import('../pages/household/HouseholdOverview').then((m) => ({ default: m.HouseholdOverview })),
);

export function HouseholdOverviewPage({
  household,
  openPerson,
  goToPersonProfile,
  goToJointQuestion,
  guide,
}: {
  household: HouseholdApi;
  openPerson: (id: string) => void;
  goToPersonProfile: (id: string) => void;
  goToJointQuestion: () => void;
  guide?: ReactNode;
}) {
  const legal = useMemo(() => currentLegal(), []);
  const data = useHouseholdOverview(household, legal);
  return (
    <HouseholdOverview
      household={household}
      data={data}
      openPerson={openPerson}
      goToPersonProfile={goToPersonProfile}
      goToJointQuestion={goToJointQuestion}
      guide={guide}
    />
  );
}
