import type { LegalParameters } from '../tax/legalConfig';
import type { GlobalAssumptions, Profile } from '../shared/profile';
import type { OtherIncome } from '../tax/retirementTax';
import type { ScenarioName, ValidationIssue } from '../shared/types';

/** Result per product and scenario (`06-data-model.md` §5). Never stored, always computed. */
export type ProjectionResult = {
  productId: string;
  scenario: ScenarioName;
  /** Savings phase; empty for products without one (statutory pension). */
  series: { month: number; contributed: number; value: number }[];
  /** Absent for products without a savings phase. */
  capitalAtRetirement?: number;
  monthlyPensionNominal: number;
  /** In today's purchasing power. */
  monthlyPensionReal: number;
  /** Monthly tax and contributions, in today's purchasing power. */
  taxAndContributions: number;
  /** Monthly part of the gross pension subject to income tax, in today's purchasing power. */
  taxableMonthlyReal: number;
  /** Monthly health and care contributions, in today's purchasing power. */
  contributionsMonthlyReal: number;
  /** Monthly tax that does not depend on other incomes (capital gains tax of the ETF), in today's purchasing power. */
  fixedTaxMonthlyReal: number;
  netMonthlyPensionReal: number;
  /** One-off payout at the start of the payout phase (retirement depot), gross and net. */
  lumpSum?: { gross: number; tax: number; net: number; grossReal: number; netReal: number };
  /**
   * Yearly rise of the nominal payment in percent (percent withdrawal strategy); absent = constant nominal
   * payment. The overview lets such a payment keep its purchasing power if this equals the inflation.
   */
  indexationPercent?: number;
  /** Age at which the capital is used up before the planned end age; absent if it lasts. */
  payoutEndAge?: number;
  /** Codes such as `unverified:pension.pensionValue`; the UI maps them to texts. */
  warnings: string[];
};

export type ProjectionContext = {
  profile: Profile;
  assumptions: GlobalAssumptions;
  legal: LegalParameters;
  /** Calendar year of "today", passed in to keep the core deterministic. */
  currentYear: number;
  /** Month of "today" (1 to 12). Absent = 1, so the savings phase of the ETF starts in January. */
  currentMonth?: number;
  /**
   * Income of the person's other products that runs when this product pays out, per scenario. Income tax
   * is levied on the sum, so it changes the tax of this product. Absent: the product is taxed alone.
   */
  otherIncome?: Record<ScenarioName, OtherIncome>;
};

/** The other income for one scenario; none if the context carries none. */
export function otherIncomeOf(ctx: ProjectionContext, scenario: ScenarioName): OtherIncome {
  return ctx.otherIncome?.[scenario] ?? { taxableMonthlyReal: 0, contributionsMonthlyReal: 0 };
}

export type ProjectionOutcome<T extends ProjectionResult> =
  { ok: true; result: T } | { ok: false; issues: ValidationIssue[] };

/** Contract for one product type (`06-data-model.md` §6). Errors are returned as data. */
export interface ProductProjector<TInput, TResult extends ProjectionResult = ProjectionResult> {
  type: string;
  validate(input: TInput, ctx: ProjectionContext): ValidationIssue[];
  project(
    input: TInput,
    ctx: ProjectionContext,
    scenario?: ScenarioName,
  ): ProjectionOutcome<TResult>;
}
