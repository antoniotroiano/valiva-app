import { advanceLumpSum, advanceLumpSumTax } from './advanceLumpSum';
import type {
  AdvanceLumpSumParameters,
  EtfPlanInput,
  EtfScenarioResult,
  ScenarioName,
  SeriesPoint,
  TaxAssumptions,
  YearSummary,
} from './types';

/** The advance lump-sum tax as the projection runs it; `parameters.startYear/startMonth` place the plan in time. */
export type AdvanceLumpSumRun = { parameters: AdvanceLumpSumParameters; tax: TaxAssumptions };

/**
 * Projects one scenario. Assumes validated input.
 *
 * Per month: contribution (after entry fee) at the start of the month, then growth by
 * g = (1 + gross - TER)^(1/12), then custody fee (EUR/12 plus value * percent/12).
 * Initial capital is treated as already invested (no entry fee).
 * Tax is NOT applied here (see calculateEtfScenario), except with `advance`: then the advance lump-sum tax
 * (Vorabpauschale) is charged at the end of every calendar December from the depot. The lump sum is
 * `min(base earnings, gain of the year)` with base earnings = (value at the start of the year + purchases
 * weighted by the months held) * base interest * 70 %; the cap uses the gain of the whole depot. The initial
 * capital counts as bought in the first month. A sale mid-year leaves that year without an advance lump sum.
 */
export function projectEtfScenario(
  input: EtfPlanInput,
  scenario: ScenarioName,
  /** Savings months; default `durationYears * 12`. The ETF with payout passes fewer months for a start mid-year. */
  monthsOverride?: number,
  advance?: AdvanceLumpSumRun,
): Omit<EtfScenarioResult, 'tax' | 'finalValueAfterTax' | 'finalValueReal' | 'gainBeforeTax'> {
  const months = monthsOverride ?? input.durationYears * 12;
  const netReturn = input.returnScenarios[scenario] - input.ter;
  const growth = Math.pow(1 + netReturn / 100, 1 / 12);
  const entryKeep = 1 - input.entryFeePercent / 100;
  const increase = 1 + input.annualContributionIncreasePercent / 100;
  const inflation = 1 + input.inflationPercent / 100;

  const lumpByMonth = new Map<number, number>();
  for (const l of input.lumpSums)
    lumpByMonth.set(l.month, (lumpByMonth.get(l.month) ?? 0) + l.amount);

  let value = input.initialCapital;
  let contributed = input.initialCapital;
  let lumpSumTotal = 0;
  let taxPaid = 0;
  let yearOpen = 0;
  let yearInflow = input.initialCapital;
  let yearWeighted = advance
    ? (input.initialCapital * (13 - advance.parameters.startMonth)) / 12
    : 0;
  let yearLumpSum = 0;
  let yearTax = 0;
  const series: SeriesPoint[] = [{ month: 0, contributed, value }];
  const yearly: YearSummary[] = [];

  for (let m = 1; m <= months; m++) {
    const rate = input.monthlyContribution * Math.pow(increase, Math.floor((m - 1) / 12));
    const paid = rate + (lumpByMonth.get(m) ?? 0);
    contributed += paid;
    value += paid * entryKeep;
    value *= growth;
    value -= input.custodyFeeEurPerYear / 12 + (value * input.custodyFeePercentPerYear) / 1200;
    if (value < 0) value = 0;
    if (advance) {
      const offset = advance.parameters.startMonth - 1 + (m - 1);
      const calendarMonth = (offset % 12) + 1;
      const calendarYear = advance.parameters.startYear + Math.floor(offset / 12);
      const inflow = paid * entryKeep;
      yearInflow += inflow;
      yearWeighted += (inflow * (13 - calendarMonth)) / 12;
      if (calendarMonth === 12) {
        const lumpSum = advanceLumpSum(
          advance.parameters,
          calendarYear,
          yearOpen + yearWeighted,
          value - yearOpen - yearInflow,
        );
        const tax = Math.min(advanceLumpSumTax(lumpSum, advance.tax), value);
        value -= tax;
        lumpSumTotal += lumpSum;
        taxPaid += tax;
        yearLumpSum += lumpSum;
        yearTax += tax;
        yearOpen = value;
        yearInflow = 0;
        yearWeighted = 0;
      }
    }
    series.push({ month: m, contributed, value });
    if (m % 12 === 0) {
      const year = m / 12;
      yearly.push({
        year,
        contributed,
        value,
        valueReal: value / Math.pow(inflation, year),
        ...(advance ? { advanceLumpSum: yearLumpSum, advanceTax: yearTax } : {}),
      });
      yearLumpSum = 0;
      yearTax = 0;
    }
  }

  return {
    scenario,
    series,
    yearly,
    grossFinalValue: value,
    totalContributions: contributed,
    ...(advance ? { advanceLumpSumTotal: lumpSumTotal, advanceTaxPaid: taxPaid } : {}),
  };
}
