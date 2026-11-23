import { useMemo } from 'react';
import { currentLegal } from '../lib/legalConfig';
import { personStatus } from '../lib/inputStatus';
import type { GuidanceInput } from '../lib/inputStatus';
import { de } from '../i18n/de';
import type { HouseholdApi } from './useHousehold';
import { CURRENT_YEAR } from './useHousehold';
import { useDataVersion } from './storageStatus';

/**
 * Input of the guidance (sidebar status, "next step" card): the status of each person, read from the saved
 * data again after every save. Uses the committed (debounced) household so half-typed input does not flicker.
 */
export function useGuidanceInput(household: HouseholdApi, exported: boolean): GuidanceInput {
  const version = useDataVersion();
  const legal = useMemo(() => currentLegal(), []);
  const committed = household.committed.household;
  return useMemo(
    () => ({
      persons: committed.persons.map((p, i) => ({
        id: p.id,
        name: p.name.trim() || de.household.newPersonName(i + 1),
        status: personStatus(committed, p, legal, CURRENT_YEAR),
      })),
      wish: committed.desiredMonthlyIncomeToday !== undefined,
      exported,
      ...(committed.persons.length === 2
        ? {
            joint:
              committed.jointAssessment === undefined ? ('open' as const) : ('answered' as const),
          }
        : {}),
    }),
    // `version` re-reads the block storage after each save.
    [committed, legal, exported, version],
  );
}
