import type { LegalParameters, SocialKey } from '../tax/legalConfig';
import type { GlobalAssumptions } from '../shared/profile';
import { lumpSumTax, retirementIncomeTax } from '../tax/retirementTax';
import type { OtherIncome } from '../tax/retirementTax';

/**
 * Kinds of income `netPension` knows. `retirementDepot` is fully taxable and, for compulsory members,
 * assumed free of health and care contributions (`unverified`). `occupational` is fully taxable; compulsory
 * members pay the full health rate above an allowance and the full care rate on everything once the
 * pension exceeds a threshold (`unverified`).
 */
export type PensionKind = 'statutory' | 'retirementDepot' | 'occupational';

/** Social-insurance values the shared threshold of the occupational pension needs. */
export type SharedThresholdParameters = Pick<
  Record<SocialKey, number>,
  | 'healthGeneralRatePercent'
  | 'careRatePercent'
  | 'careRateChildlessPercent'
  | 'occupationalHealthAllowanceMonthly'
  | 'occupationalCareThresholdMonthly'
> & {
  /** Members born before this year pay no surcharge for the childless (`16` §5.6); absent = not applied. */
  careChildlessExemptBeforeBirthYear?: number;
};

/**
 * Care insurance rate in percent: the childless rate only for a childless member who is not exempt. Members born
 * before `exemptBeforeBirthYear` (§55 Abs. 3 Satz 2 SGB XI, 1940) pay the normal rate. Without a birth year or
 * an exemption year the childless rate applies, as before.
 */
export function careRatePercentFor(
  childless: boolean,
  social: Pick<SharedThresholdParameters, 'careRatePercent' | 'careRateChildlessPercent'>,
  birthYear?: number,
  exemptBeforeBirthYear?: number,
): number {
  const exempt =
    birthYear !== undefined &&
    exemptBeforeBirthYear !== undefined &&
    birthYear < exemptBeforeBirthYear;
  return childless && !exempt ? social.careRateChildlessPercent : social.careRatePercent;
}

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

/**
 * Taxable share (percent) of a statutory pension that started in `startYear`, for people who already draw it
 * (`16` §5.2): the table of §22 Nr. 1 Satz 3 Buchst. a aa EStG up to 2025 (`legal.retired`), from the base year on
 * the formula of `taxableShare`. Never below 50 % (the first step covers every earlier start) and never above the
 * maximum. Undefined if the legal values carry no table.
 */
export function taxableShareForStartYear(
  startYear: number,
  legal: LegalParameters,
): number | undefined {
  const tiers = legal.retired?.taxableShareTiers;
  const first = tiers?.[0];
  if (!tiers || !first) return undefined;
  const p = legal.pension;
  if (startYear >= p.taxableShareBaseYear) return taxableShare(startYear, legal).percent;
  let percent = first.percent;
  for (const t of tiers) if (t.fromYear <= startYear) percent = t.percent;
  return percent;
}

export type NetPensionContext = {
  retirementYear: number;
  /** Nominal amounts are divided by this factor (inflation since today) to apply today's tariff. */
  realFactor: number;
  /** Multiplies allowance and threshold of the occupational pension (the inflation factor). */
  thresholdScale?: number;
  /** Other taxable income in the same year (today's purchasing power); absent = taxed alone. */
  other?: OtherIncome;
  /** Birth year of the person; with `legal.retired` it switches off the care surcharge for those born before 1940. */
  birthYear?: number;
  /**
   * Statutory pension of a person who already draws it (`16` §5.2): the tax-free part is this fixed monthly
   * amount (nominal), so the taxable part is `gross - taxFreeMonthly`. Takes precedence over the share.
   */
  taxFreeMonthly?: number;
  /** Statutory pension: this share (percent) instead of the planning formula, e.g. for the start year itself. */
  taxableSharePercentOverride?: number;
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

  const exemptYear = legal.retired?.careChildlessExemptBeforeBirthYear;
  if (kind === 'statutory') {
    if (context.taxFreeMonthly !== undefined) {
      taxable = Math.max(0, grossMonthly - context.taxFreeMonthly);
      taxableSharePercent = grossMonthly > 0 ? (taxable / grossMonthly) * 100 : 0;
    } else if (context.taxableSharePercentOverride !== undefined) {
      taxableSharePercent = context.taxableSharePercentOverride;
      taxable = (grossMonthly * taxableSharePercent) / 100;
    } else {
      const share = taxableShare(context.retirementYear, legal);
      if (share.beforeBaseYear) warnings.push('taxable_share_before_base_year');
      taxable = (grossMonthly * share.percent) / 100;
      taxableSharePercent = share.percent;
    }
    if (h.mode === 'statutoryCompulsory') {
      health =
        (grossMonthly * (legal.social.healthGeneralRatePercent + h.additionalRatePercent)) / 200;
      care =
        (grossMonthly *
          careRatePercentFor(h.childless, legal.social, context.birthYear, exemptYear)) /
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
      legal.social,
      context.birthYear,
      exemptYear,
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
export function occupationalContributions(
  gross: number,
  thresholdScale: number,
  assumptions: GlobalAssumptions,
  social: SharedThresholdParameters,
  birthYear?: number,
  exemptBeforeBirthYear?: number,
): { health: number; care: number } {
  const h = assumptions.health;
  if (h.mode !== 'statutoryCompulsory') {
    return { health: (gross * (h.otherRatePercent ?? 0)) / 100, care: 0 };
  }
  const allowance = social.occupationalHealthAllowanceMonthly * thresholdScale;
  const threshold = social.occupationalCareThresholdMonthly * thresholdScale;
  const health =
    (Math.max(0, gross - allowance) * (social.healthGeneralRatePercent + h.additionalRatePercent)) /
    100;
  const care =
    gross > threshold
      ? (gross *
          careRatePercentFor(
            h.childless,
            social,
            birthYear,
            exemptBeforeBirthYear ?? social.careChildlessExemptBeforeBirthYear,
          )) /
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
