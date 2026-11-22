import type { LegalParameters } from './legalConfig';
import type { GlobalAssumptions } from './profile';
import { lumpSumTax, retirementIncomeTax } from './retirementTax';
import type { OtherIncome } from './retirementTax';

/**
 * Kinds of income `netPension` knows. `retirementDepot` is fully taxable and, for compulsory members,
 * assumed free of health and care contributions (`unverified`). `occupational` is fully taxable; compulsory
 * members pay the full health rate above an allowance and the full care rate on everything once the
 * pension exceeds a threshold (`unverified`).
 */
export type PensionKind = 'statutory' | 'retirementDepot' | 'occupational';

export type NetPension = {
  gross: number;
  /** Income tax share of this pension (tax on the sum of all pensions, split by taxable amount). */
  tax: number;
  health: number;
  care: number;
  /** `health + care`. */
  contributions: number;
  net: number;
  /** Part of the gross pension that is subject to income tax. */
  taxable: number;
  /** Share of the gross pension that is taxable, in percent. */
  taxableSharePercent: number;
  /** Warning codes, e.g. `taxable_share_before_base_year`. */
  warnings: string[];
};

/** Taxable share of a pension starting in `retirementYear`, from config values. Clamped to base and maximum. */
export function taxableShare(
  retirementYear: number,
  legal: LegalParameters,
): { percent: number; beforeBaseYear: boolean } {
  const p = legal.pension;
  const beforeBase = retirementYear < p.taxableShareBaseYear;
  const raw =
    p.taxableShareBasePercent +
    p.taxableShareIncreasePerYear * (retirementYear - p.taxableShareBaseYear);
  return {
    percent: Math.min(p.taxableShareMaxPercent, Math.max(p.taxableShareBasePercent, raw)),
    beforeBaseYear: beforeBase,
  };
}

export type NetPensionContext = {
  retirementYear: number;
  /** Nominal amounts are divided by this factor (inflation since today) to apply today's tariff. */
  realFactor: number;
  /** Multiplies allowance and threshold of the occupational pension (the inflation factor). */
  thresholdScale?: number;
  /** Other taxable income in the same year (today's purchasing power); absent = taxed alone. */
  other?: OtherIncome;
};

/**
 * Net monthly pension from a gross monthly pension (all amounts nominal, same unit as the input).
 * Income tax is levied on the sum of the person's pensions (tariff §32a EStG in today's purchasing
 * power, see `retirementIncomeTax`); this pension carries its share of it. Contributions follow the health
 * status in the assumptions: `statutoryCompulsory` pays half of the general rate plus half of the
 * additional rate, care in full (higher for the childless); `other` pays the entered total rate and no
 * separate care rate.
 */
export function netPension(
  grossMonthly: number,
  kind: PensionKind,
  context: NetPensionContext,
  assumptions: GlobalAssumptions,
  legal: LegalParameters,
): NetPension {
  const warnings: string[] = [];
  let taxable = grossMonthly;
  let taxableSharePercent = 100;
  let health: number;
  let care = 0;
  const h = assumptions.health;

  if (kind === 'statutory') {
    const share = taxableShare(context.retirementYear, legal);
    if (share.beforeBaseYear) warnings.push('taxable_share_before_base_year');
    taxable = (grossMonthly * share.percent) / 100;
    taxableSharePercent = share.percent;
    if (h.mode === 'statutoryCompulsory') {
      health =
        (grossMonthly * (legal.social.healthGeneralRatePercent + h.additionalRatePercent)) / 200;
      care =
        (grossMonthly *
          (h.childless ? legal.social.careRateChildlessPercent : legal.social.careRatePercent)) /
        100;
    } else {
      health = (grossMonthly * (h.otherRatePercent ?? 0)) / 100;
    }
  } else if (kind === 'retirementDepot') {
    health = h.mode === 'other' ? (grossMonthly * (h.otherRatePercent ?? 0)) / 100 : 0;
  } else {
    ({ health, care } = occupationalContributions(
      grossMonthly,
      context.thresholdScale ?? 1,
      assumptions,
      legal,
    ));
  }

  const contributions = health + care;
  const f = context.realFactor;
  const incomes = [
    { id: 'own', taxableMonthly: taxable / f, contributionsMonthly: contributions / f },
  ];
  if (context.other) {
    incomes.push({
      id: 'other',
      taxableMonthly: context.other.taxableMonthlyReal,
      contributionsMonthly: context.other.contributionsMonthlyReal,
    });
  }
  const tax = (retirementIncomeTax(incomes, legal.incomeTax).byId.own ?? 0) * f;

  return {
    gross: grossMonthly,
    tax,
    health,
    care,
    contributions,
    net: grossMonthly - tax - contributions,
    taxable,
    taxableSharePercent,
    warnings,
  };
}

/**
 * Occupational pension contributions: compulsory members pay the full health rate (general plus additional)
 * on the part above the allowance and the full care rate on the whole pension once it exceeds the threshold
 * (all or nothing). Allowance and threshold are today's values and are multiplied by `thresholdScale`
 * (assumption: they rise like prices). `other` pays the entered rate on the whole pension.
 */
function occupationalContributions(
  gross: number,
  thresholdScale: number,
  assumptions: GlobalAssumptions,
  legal: LegalParameters,
): { health: number; care: number } {
  const h = assumptions.health;
  if (h.mode !== 'statutoryCompulsory') {
    return { health: (gross * (h.otherRatePercent ?? 0)) / 100, care: 0 };
  }
  const allowance = legal.social.occupationalHealthAllowanceMonthly * thresholdScale;
  const threshold = legal.social.occupationalCareThresholdMonthly * thresholdScale;
  const health =
    (Math.max(0, gross - allowance) *
      (legal.social.healthGeneralRatePercent + h.additionalRatePercent)) /
    100;
  const care =
    gross > threshold
      ? (gross *
          (h.childless ? legal.social.careRateChildlessPercent : legal.social.careRatePercent)) /
        100
      : 0;
  return { health, care };
}

/**
 * One-off payout (lump sum of the retirement depot) paid in a year in which the monthly pensions run on.
 * Fully taxable; the tax is the extra tax over the year without it. `own` and `other` are today's
 * purchasing power; the returned amounts are in the same unit as `grossReal`.
 */
export function netLumpSum(
  grossReal: number,
  own: { taxableMonthlyReal: number; contributionsMonthlyReal: number },
  other: OtherIncome | undefined,
  assumptions: GlobalAssumptions,
  legal: LegalParameters,
): { tax: number; health: number; net: number } {
  const incomes = [
    {
      id: 'own',
      taxableMonthly: own.taxableMonthlyReal,
      contributionsMonthly: own.contributionsMonthlyReal,
    },
  ];
  if (other) {
    incomes.push({
      id: 'other',
      taxableMonthly: other.taxableMonthlyReal,
      contributionsMonthly: other.contributionsMonthlyReal,
    });
  }
  const tax = lumpSumTax(incomes, grossReal, legal.incomeTax);
  const h = assumptions.health;
  const health = h.mode === 'other' ? (grossReal * (h.otherRatePercent ?? 0)) / 100 : 0;
  return { tax, health, net: grossReal - tax - health };
}
