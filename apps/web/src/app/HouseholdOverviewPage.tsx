import { lazy, useMemo } from 'react';
import { currentLegal } from '../lib/legalConfig';
import { useHouseholdOverview } from '../state/useHouseholdOverview';
import type { HouseholdApi } from '../state/useHousehold';

const HouseholdOverview = lazy(() =>
  import('../pages/household/HouseholdOverview').then((m) => ({ default: m.HouseholdOverview })),
);

export function HouseholdOverviewPage({
  household,
  goToHousehold,
  openPerson,
  goToPersonProfile,
}: {
  household: HouseholdApi;
  goToHousehold: () => void;
  openPerson: (id: string) => void;
  goToPersonProfile: (id: string) => void;
}) {
  const legal = useMemo(() => currentLegal(), []);
  const data = useHouseholdOverview(household, legal);
  return (
    <HouseholdOverview
      household={household}
      data={data}
      goToHousehold={goToHousehold}
      openPerson={openPerson}
      goToPersonProfile={goToPersonProfile}
    />
  );
}
