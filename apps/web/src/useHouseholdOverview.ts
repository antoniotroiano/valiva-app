import { useEffect, useMemo, useState } from 'react';
import { householdOverview, personContext, solveHouseholdGapContribution } from '@pathwise/core';
import type { GapSolveResult, HouseholdOutcome, LegalResolution } from '@pathwise/core';
import { buildEtfProduct, buildPersonProducts, loadPersonBlocks } from './personProducts';
import type { PersonBlocks } from './personProducts';
import { CURRENT_YEAR } from './useHousehold';
import type { HouseholdApi } from './useHousehold';

export type HouseholdOverviewApi = {
  blocks: Record<string, PersonBlocks> | undefined;
  outcome?: HouseholdOutcome;
  gapPersonId: string;
  setGapPersonId: (id: string) => void;
  gap?: GapSolveResult;
};

/**
 * Household overview from the saved blocks of every person. The blocks are read in an effect: on a person
 * switch the previous workspace flushes its last edit while it unmounts, which is after the render.
 */
export function useHouseholdOverview(
  api: HouseholdApi,
  legal: LegalResolution,
): HouseholdOverviewApi {
  const { household, activePersonId } = api.state;
  const idKey = household.persons.map((p) => p.id).join('|');
  const [blocks, setBlocks] = useState<Record<string, PersonBlocks>>();
  const [chosenGapPerson, setGapPersonId] = useState<string>();

  useEffect(() => {
    const next: Record<string, PersonBlocks> = {};
    for (const id of idKey.split('|')) next[id] = loadPersonBlocks(id);
    setBlocks(next);
  }, [idKey]);

  const gapPersonId = household.persons.some((p) => p.id === chosenGapPerson)
    ? (chosenGapPerson as string)
    : activePersonId;

  const computed = useMemo(() => {
    if (!blocks || !legal.ok) return {};
    const tax = legal.legal.incomeTax;
    const productsByPerson: Record<string, ReturnType<typeof buildPersonProducts>> = {};
    for (const person of household.persons) {
      const b = blocks[person.id];
      if (!b) return {};
      productsByPerson[person.id] = buildPersonProducts(b, personContext(household, person), legal);
    }
    const outcome = householdOverview(
      household,
      productsByPerson,
      CURRENT_YEAR,
      tax,
      legal.legal.pension,
    );
    const person = household.persons.find((p) => p.id === gapPersonId);
    const b = blocks[gapPersonId];
    let gap: GapSolveResult | undefined;
    if (outcome.ok && person && b) {
      const ctx = personContext(household, person);
      gap = solveHouseholdGapContribution(
        household,
        gapPersonId,
        productsByPerson,
        (monthly) => buildEtfProduct(b, ctx, legal, monthly, true),
        b.etfPlan.monthlyContribution,
        CURRENT_YEAR,
        tax,
        legal.legal.pension,
      );
    }
    return { outcome, gap };
  }, [blocks, household, legal, gapPersonId]);

  return { blocks, ...computed, gapPersonId, setGapPersonId };
}
