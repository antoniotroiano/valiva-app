import type { Household } from '../household/household';
import { personContext } from '../household/household';
import { pensionStartYearOf } from '../shared/profile';
import type { TaxableIncome } from '../tax/retirementTax';
import type { JointAssessmentInput } from '../tax/jointTax';
import { taxableIncomesAt } from './overview';
import type { JointTaxContext, OverviewProductInput } from './overview';

/** True if the household has exactly two persons and the answer to the joint assessment question is yes. */
export function isJointlyAssessed(household: Household): boolean {
  return household.persons.length === 2 && household.jointAssessment === true;
}

/**
 * The joint assessment of `personId` with the partner (`AP-16`), or `undefined` for single assessment (not two
 * persons, not answered, or answered no). Splitting applies in the calendar years in which both persons are
 * retired (before that the other person's salary is not modelled, so the person is taxed alone) up to the year
 * after the first death: in the death year both are taxed jointly, in the following year the survivor keeps the
 * splitting tariff (`partnerIncomesIn` returns `null`); after that alone. `productsByPerson` holds the products
 * as the overview takes them.
 */
export function jointContextFor(
  household: Household,
  personId: string,
  productsByPerson: Record<string, OverviewProductInput[]>,
  input: JointAssessmentInput,
): JointTaxContext | undefined {
  if (!isJointlyAssessed(household)) return undefined;
  const me = household.persons.find((p) => p.id === personId);
  const partner = household.persons.find((p) => p.id !== personId);
  if (me === undefined || partner === undefined) return undefined;
  // The pension start itself: for a person in the retiree mode the year of the notice, so the joint assessment
  // starts in the year the later of the two starts (`16` §5.5).
  const start = pensionStartYearOf;
  const end = (p: { birthYear: number; lifeExpectancyAge: number }) =>
    p.birthYear + p.lifeExpectancyAge;
  const firstYear = Math.max(start(me), start(partner));
  const lastYear = Math.min(end(me), end(partner)) + 1;
  const { unverified, ...parameters } = input;
  const warnings = (unverified ?? [])
    .filter((key) => key.startsWith('jointAssessment.'))
    .map((key) => `unverified:${key}`);
  const partnerAssumptions = personContext(household, partner).assumptions;
  const partnerProducts = productsByPerson[partner.id] ?? [];
  return {
    parameters,
    warnings,
    partnerIncomesIn: (year, scenario): TaxableIncome[] | null | undefined => {
      if (year < firstYear || year > lastYear) return undefined;
      if (year > end(partner)) return null;
      return taxableIncomesAt(
        partnerProducts,
        scenario,
        year - partner.birthYear,
        partnerAssumptions,
      );
    },
  };
}
