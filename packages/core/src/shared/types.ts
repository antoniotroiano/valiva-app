export type ScenarioName = 'pessimistic' | 'neutral' | 'optimistic';

export type ReturnScenarios = Record<ScenarioName, number>;

export const SCENARIO_NAMES: readonly ScenarioName[] = ['pessimistic', 'neutral', 'optimistic'];

export type LumpSum = {
  /** 1-based month of the plan in which the amount is invested. */
  month: number;
  amount: number;
};

export type EtfPlanInput = {
  initialCapital: number;
  monthlyContribution: number;
  annualContributionIncreasePercent: number;
  durationYears: number;
  lumpSums: LumpSum[];
  /** Total expense ratio, % p. a. */
  ter: number;
  entryFeePercent: number;
  custodyFeeEurPerYear: number;
  custodyFeePercentPerYear: number;
  /** Gross return before costs, % p. a. */
  returnScenarios: ReturnScenarios;
  inflationPercent: number;
  taxEnabled: boolean;
  /**
   * Charge the advance lump-sum tax (Vorabpauschale, §18 InvStG) every year, paid from the depot. Needs
   * `TaxAssumptions.advanceLumpSum`. Absent or false: tax only at the sale, as before.
   */
  advanceLumpSum?: boolean;
};

/** Church tax on capital gains: `low` = 8 % (Baden-Württemberg, Bavaria), `high` = 9 %. Absent: no church tax. */
export type ChurchTaxChoice = 'low' | 'high';

export type TaxAssumptions = {
  capitalGainsTaxRate: number; // percent
  partialExemptionRate: number; // percent
  taxFreeAllowance: number; // EUR
  /** Values for the advance lump-sum tax; only used if the plan switches it on. */
  advanceLumpSum?: AdvanceLumpSumParameters;
};

/** Parameters of the advance lump-sum tax (§18 InvStG) from `config/tax-de.json`, all rates in percent. */
export type AdvanceLumpSumParameters = {
  /** Share of the base interest that forms the base earnings (70 %). */
  baseEarningsFactorPercent: number;
  /** Published base interest by calendar year; zero or negative means no advance lump sum. */
  baseInterestByYear: Record<number, number>;
  /** Used for every year without a published rate (an assumption, not a published value). */
  assumedBaseInterestPercent: number;
  /** Calendar year and month (1 to 12) in which the plan starts. */
  startYear: number;
  startMonth: number;
};

export type SeriesPoint = {
  /** 0 = start, 1..n = end of month. */
  month: number;
  contributed: number;
  value: number;
};

export type YearSummary = {
  year: number;
  contributed: number;
  value: number;
  valueReal: number;
  /** Only with the advance lump-sum tax: the advance lump sum of the year (before partial exemption) and the tax on it. */
  advanceLumpSum?: number;
  advanceTax?: number;
};

export type TaxBreakdown = {
  gain: number;
  taxableGain: number;
  tax: number;
};

export type EtfScenarioResult = {
  scenario: ScenarioName;
  series: SeriesPoint[];
  yearly: YearSummary[];
  grossFinalValue: number;
  totalContributions: number;
  gainBeforeTax: number;
  tax: number;
  finalValueAfterTax: number;
  /** After-tax final value in today's purchasing power. */
  finalValueReal: number;
  /**
   * Only with the advance lump-sum tax: sum of the advance lump sums (credited against the gain at the sale)
   * and the tax paid on them from the depot. `tax` is the tax at the sale only.
   */
  advanceLumpSumTotal?: number;
  advanceTaxPaid?: number;
};

export type ValidationIssue = {
  field: string;
  code:
    | 'not_finite'
    | 'negative'
    | 'out_of_range'
    | 'not_integer'
    | 'scenario_order'
    | 'not_positive'
    | 'invalid_month'
    | 'not_after_start'
    | 'not_chronological'
    | 'before_statement_year'
    | 'before_current_year'
    | 'retirement_in_past'
    | 'before_first_contribution_year'
    | 'required'
    | 'invalid_id'
    | 'duplicate_id'
    | 'name_invalid'
    | 'end_not_after_start'
    | 'nominal_start_in_past'
    | 'too_many_entries'
    | 'retired_start_in_future'
    | 'life_expectancy_in_past'
    | 'end_not_after_today'
    | 'legal_values_missing';
  /** Allowed range or limit, for message formatting in the UI. */
  min?: number;
  max?: number;
};

export type EtfPlanResult =
  | { ok: false; issues: ValidationIssue[] }
  | { ok: true; scenarios: Record<ScenarioName, EtfScenarioResult> };
