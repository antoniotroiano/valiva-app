import { lumpSumTax, retirementIncomeTax } from '../tax/retirementTax';
import type { IncomeTaxParameters } from '../tax/incomeTax';
import { jointLumpSumTax, jointRetirementIncomeTax } from '../tax/jointTax';
import type { JointAssessmentParameters } from '../tax/jointTax';
import type { OtherIncome, RetirementTax, TaxableIncome } from '../tax/retirementTax';
import { validateAssumptions, validateProfile, validateRetirementTiming } from '../shared/profile';
import type { GlobalAssumptions, Profile } from '../shared/profile';
import type { ProjectionResult } from '../pension/projection';
import {
  OTHER_INCOME_PRODUCT_PREFIX,
  sharedOccupationalContributions,
} from '../pension/otherIncome';
import type { SharedThresholdParameters } from '../pension/netPension';
import { SCENARIO_NAMES } from '../shared/types';
import type { ScenarioName, ValidationIssue } from '../shared/types';

export const OVERVIEW_PRODUCT_KINDS = [
  'etf',
  'statutory',
  'retirementDepot',
  'occupational',
] as const;
export type OverviewProductKind = (typeof OVERVIEW_PRODUCT_KINDS)[number];
/** A fixed product kind or one entry of the generic block: `otherIncome:<entry id>` (`15` §6). */
export type OverviewProductId = OverviewProductKind | `otherIncome:${string}`;

/**
 * One product as the overview sees it: the projection result per scenario (or the issues that kept it from
 * being computed) plus the ages of its payout phase. `payoutEndAge` is absent for the statutory pension (lifelong).
 */
export type OverviewProductInput = {
  productId: OverviewProductId;
  enabled: boolean;
  payoutStartAge: number;
  payoutEndAge?: number;
  /**
   * Set on entries with `contributions: 'likeOccupational'`: the product joins the shared threshold group of the
   * person (together with the occupational pension), and carries the social values the group rule needs.
   * Absent: contributions as the projector computed them.
   */
  sharedThreshold?: SharedThresholdParameters;
  /**
   * Set on entries with `survivorPercent > 0`: share of the amount that goes on to the partner after the
   * death (household of two with the survivor's pension switched on, `15` §4.2). Absent: ends with the death.
   */
  survivorPercent?: number;
  outcome:
    | { ok: true; results: Record<ScenarioName, ProjectionResult> }
    | { ok: false; issues: ValidationIssue[] };
};

/**
 * `included`: counts from the target retirement age. `later`: valid, but pays out only after the target
 * age, so the snapshot carries it with 0. `ended` (entries of the generic block only): the end age is at or
 * before the target age, it contributes 0. `disabled`/`invalid`: not counted; `invalid` lists the reasons.
 */
export type OverviewProductStatus = {
  productId: OverviewProductId;
  status: 'included' | 'later' | 'ended' | 'disabled' | 'invalid';
  payoutStartAge?: number;
  payoutEndAge?: number;
  /** Valid, but pays nothing in any scenario (for example a contribution of 0). Ignored for end age and warnings. */
  empty?: boolean;
  issues?: ValidationIssue[];
};

export type OverviewProductAmount = {
  productId: OverviewProductId;
  /** Monthly, in today's purchasing power, at the target retirement age. */
  netReal: number;
  grossReal: number;
  taxAndContributionsReal: number;
};

export type OverviewSnapshot = {
  netMonthlyPensionReal: number;
  grossMonthlyPensionReal: number;
  taxAndContributionsReal: number;
  byProduct: OverviewProductAmount[];
  /** `max(0, desired - net)`; absent without a desired income. */
  gap?: number;
  /** `max(0, net - desired)`; absent without a desired income. */
  surplus?: number;
  /** One-off payouts (retirement depot), kept apart from the monthly pension. */
  lumpSumNetReal: number;
  lumpSumGrossReal: number;
  warnings: string[];
};

export type OverviewPathPoint = {
  /** Age at the end of the year. */
  age: number;
  year: number;
  /** Net monthly income per product, in today's purchasing power. */
  byProduct: Partial<Record<OverviewProductId, number>>;
  total: number;
  gap?: number;
};

export type ScenarioOverview = {
  snapshot: OverviewSnapshot;
  /** From the target retirement age to the life expectancy age, in yearly steps. */
  path: OverviewPathPoint[];
  /** Sum of `12 x gap` over the retirement years (target age up to, excluding, the life expectancy age). */
  totalGapReal?: number;
};

export type OverviewResult = {
  personId: string;
  targetRetirementAge: number;
  lifeExpectancyAge: number;
  desiredMonthlyIncomeToday?: number;
  products: OverviewProductStatus[];
  /** Age at which the first counted fixed-term product ends, so the gap grows; absent if none ends in the horizon. */
  firstPayoutEndAge?: number;
  scenarios: Record<ScenarioName, ScenarioOverview>;
};

export type OverviewOutcome =
  { ok: true; result: OverviewResult } | { ok: false; issues: ValidationIssue[] };

/**
 * Share of the value at the payout start that the product pays at `age`, in today's purchasing power:
 * 0 before the start and from the end age on; a constant nominal rate loses `1 / (1 + inflation)` per year;
 * a payment indexed with the inflation keeps its value (`indexationPercent`);
 * the statutory pension grows with the pension adjustment and loses the inflation.
 */
export function activityFactor(
  p: OverviewProductInput,
  r: ProjectionResult,
  age: number,
  assumptions: GlobalAssumptions,
): number {
  if (age < p.payoutStartAge) return 0;
  // A result may end earlier than planned (capital used up).
  const endAge = r.payoutEndAge ?? p.payoutEndAge;
  if (endAge !== undefined && age >= endAge) return 0;
  const inflation = 1 + assumptions.inflationPercent / 100;
  const years = age - p.payoutStartAge;
  if (p.productId === 'statutory') {
    return Math.pow((1 + assumptions.pensionAdjustmentPercent / 100) / inflation, years);
  }
  return Math.pow((1 + (r.indexationPercent ?? 0) / 100) / inflation, years);
}

type OkResults = Record<ScenarioName, ProjectionResult>;
const resultsOf = (p: OverviewProductInput, scenario: ScenarioName): ProjectionResult =>
  (p.outcome as { ok: true; results: OkResults }).results[scenario];

/** True if the valid product pays nothing in any scenario. */
function paysNothing(p: OverviewProductInput): boolean {
  return (
    p.outcome.ok &&
    SCENARIO_NAMES.every((s) => {
      const r = resultsOf(p, s);
      return r.monthlyPensionReal === 0 && (r.lumpSum?.grossReal ?? 0) === 0;
    })
  );
}

/**
 * Part of the gross payment that is tax-free for good, as a fixed monthly amount at the payout start (today's
 * purchasing power). The statutory pension derives it from its taxable share; other products (a basic pension
 * entry with `pensionShare`) state it in `fixedTaxFreeMonthlyReal`. Absent: the taxable share stays constant.
 */
function fixedTaxFreeAmount(p: OverviewProductInput, r: ProjectionResult): number | undefined {
  if (p.productId === 'statutory') return r.monthlyPensionReal - r.taxableMonthlyReal;
  return r.fixedTaxFreeMonthlyReal;
}

/**
 * Taxable income and contributions of one product at `age`, in today's purchasing power. Later increases of a
 * payment with a fixed tax-free amount (statutory pension, basic pension entry) are fully taxable: its tax-free
 * part is a fixed amount in euros from the first year (a constant nominal amount, so it loses purchasing power
 * with the inflation), not a share of the growing payment. `contributions` overrides the projector's own
 * contributions (shared threshold group).
 */
function incomeAt(
  p: OverviewProductInput,
  scenario: ScenarioName,
  age: number,
  assumptions: GlobalAssumptions,
  contributions?: number,
): TaxableIncome {
  const r = resultsOf(p, scenario);
  const f = activityFactor(p, r, age, assumptions);
  let taxable = r.taxableMonthlyReal * f;
  const taxFree = fixedTaxFreeAmount(p, r);
  if (taxFree !== undefined && f > 0) {
    const inflation = 1 + assumptions.inflationPercent / 100;
    taxable = Math.max(
      0,
      r.monthlyPensionReal * f - taxFree * Math.pow(inflation, -(age - p.payoutStartAge)),
    );
  }
  return {
    id: p.productId,
    taxableMonthly: taxable,
    contributionsMonthly: contributions ?? r.contributionsMonthlyReal * f,
  };
}

/**
 * Contributions per member of the shared threshold group (occupational pension and entries with
 * `likeOccupational`) at `age`, or undefined if no entry joins the group (then every product keeps its own).
 */
function sharedContributionsAt(
  counted: OverviewProductInput[],
  scenario: ScenarioName,
  age: number,
  assumptions: GlobalAssumptions,
): Record<string, number> | undefined {
  const social = counted.find(
    (p) => p.sharedThreshold !== undefined && !paysNothing(p),
  )?.sharedThreshold;
  if (social === undefined) return undefined;
  const members = counted
    .filter((p) => p.productId === 'occupational' || p.sharedThreshold !== undefined)
    .map((p) => {
      const r = resultsOf(p, scenario);
      return {
        id: p.productId as string,
        amount: r.monthlyPensionReal * activityFactor(p, r, age, assumptions),
      };
    });
  return sharedOccupationalContributions(members, social, assumptions);
}

/**
 * Taxable incomes of all enabled, valid products at `age` (today's purchasing power), as `overview` taxes them.
 * Used to give the partner's income to a jointly assessed person.
 */
export function taxableIncomesAt(
  products: OverviewProductInput[],
  scenario: ScenarioName,
  age: number,
  assumptions: GlobalAssumptions,
): TaxableIncome[] {
  const counted = products.filter((p) => p.enabled && p.outcome.ok);
  const shared = sharedContributionsAt(counted, scenario, age, assumptions);
  return counted.map((p) => incomeAt(p, scenario, age, assumptions, shared?.[p.productId]));
}

/**
 * Joint assessment of a person with the partner (splitting). `partnerIncomesIn(year, scenario)` returns the
 * partner's taxable incomes in that calendar year, `null` in the year after the partner's death (the survivor
 * keeps the splitting tariff, §32a Abs. 6 EStG), or `undefined` if the two are not taxed jointly in that year (the
 * person is then taxed alone). Absent: single assessment, exactly as before.
 */
export type JointTaxContext = {
  parameters: JointAssessmentParameters;
  /** Warning codes of unverified splitting values; added to the snapshot of a person who is taxed jointly then. */
  warnings?: readonly string[];
  partnerIncomesIn: (year: number, scenario: ScenarioName) => TaxableIncome[] | null | undefined;
};

/**
 * Income of the products other than `excludeId` that runs at `age` per scenario, to hand to a projector as
 * `otherIncome`. Only enabled, valid products count; each is taken as projected without other income, which
 * is enough because taxable amounts and contributions do not depend on the tax.
 */
export function concurrentIncome(
  products: OverviewProductInput[],
  excludeId: OverviewProductId,
  age: number,
  assumptions: GlobalAssumptions,
): Record<ScenarioName, OtherIncome> {
  const out = {} as Record<ScenarioName, OtherIncome>;
  for (const scenario of SCENARIO_NAMES) {
    let taxable = 0;
    let contributions = 0;
    for (const p of products) {
      if (p.productId === excludeId || !p.enabled || !p.outcome.ok) continue;
      const i = incomeAt(p, scenario, age, assumptions);
      taxable += i.taxableMonthly;
      contributions += i.contributionsMonthly;
    }
    out[scenario] = { taxableMonthlyReal: taxable, contributionsMonthlyReal: contributions };
  }
  return out;
}

/**
 * Overall view of one person (`10` §5.2): sums the enabled, valid products into a snapshot at the target
 * retirement age and a path per age up to the life expectancy age, and compares it with the desired income.
 * Pure; invalid products are reported as data, not thrown.
 */
export function overview(
  products: OverviewProductInput[],
  profile: Profile,
  assumptions: GlobalAssumptions,
  currentYear: number,
  incomeTaxParameters: IncomeTaxParameters,
  personId = 'default',
  joint?: JointTaxContext,
): OverviewOutcome {
  const issues = [
    ...validateProfile(profile, currentYear),
    ...validateRetirementTiming(profile, currentYear),
    ...validateAssumptions(assumptions),
  ];
  if (issues.length > 0) return { ok: false, issues };

  const target = profile.targetRetirementAge;
  const life = profile.lifeExpectancyAge;
  const desired = profile.desiredMonthlyIncomeToday;

  const isEmpty = paysNothing;

  const statuses: OverviewProductStatus[] = [];
  const counted: OverviewProductInput[] = [];
  for (const p of products) {
    if (!p.enabled) {
      statuses.push({ productId: p.productId, status: 'disabled' });
    } else if (!p.outcome.ok) {
      statuses.push({ productId: p.productId, status: 'invalid', issues: p.outcome.issues });
    } else {
      counted.push(p);
      const ended =
        p.productId.startsWith(OTHER_INCOME_PRODUCT_PREFIX) &&
        p.payoutEndAge !== undefined &&
        p.payoutEndAge <= target;
      statuses.push({
        productId: p.productId,
        status: ended ? 'ended' : p.payoutStartAge > target ? 'later' : 'included',
        payoutStartAge: p.payoutStartAge,
        payoutEndAge: p.payoutEndAge,
        empty: isEmpty(p) || undefined,
      });
    }
  }

  const ends = counted
    .filter((p) => !isEmpty(p))
    .filter(
      (p) => p.payoutEndAge !== undefined && p.payoutEndAge > target && p.payoutEndAge <= life,
    )
    .map((p) => p.payoutEndAge as number);
  const firstPayoutEndAge = ends.length > 0 ? Math.min(...ends) : undefined;

  const scenarios = {} as Record<ScenarioName, ScenarioOverview>;
  for (const scenario of SCENARIO_NAMES) {
    const results = counted.map((p) => ({ p, r: resultsOf(p, scenario) }));
    /** Tax on the sum of all products at `age`; the net of a product is its gross minus its own deductions and its share. */
    const incomesAt = (age: number) => {
      const shared = sharedContributionsAt(counted, scenario, age, assumptions);
      return counted.map((p) => incomeAt(p, scenario, age, assumptions, shared?.[p.productId]));
    };
    const partnerAt = (age: number) => joint?.partnerIncomesIn(profile.birthYear + age, scenario);
    const taxAt = (age: number): RetirementTax => {
      const partner = joint === undefined ? undefined : partnerAt(age);
      if (joint === undefined || partner === undefined) {
        return retirementIncomeTax(incomesAt(age), incomeTaxParameters);
      }
      const r = jointRetirementIncomeTax(
        incomesAt(age),
        partner,
        incomeTaxParameters,
        joint.parameters,
      );
      return {
        taxableIncomeYearly: r.taxableIncomeYearly,
        taxYearly: r.taxYearly,
        taxMonthly: r.shareA,
        byId: r.byIdA,
      };
    };
    const amountsAt = (
      p: OverviewProductInput,
      r: ProjectionResult,
      age: number,
      tax = taxAt(age),
    ) => {
      const f = activityFactor(p, r, age, assumptions);
      const share = tax.byId[p.productId] ?? 0;
      const grossReal = r.monthlyPensionReal * f;
      const shared = sharedContributionsAt(counted, scenario, age, assumptions)?.[p.productId];
      // Without a shared group the original expression stays, so existing results do not change by a bit.
      const deductions =
        shared === undefined
          ? (r.fixedTaxMonthlyReal + r.contributionsMonthlyReal) * f + share
          : r.fixedTaxMonthlyReal * f + shared + share;
      return { grossReal, taxAndContributionsReal: deductions, netReal: grossReal - deductions };
    };

    /** Net of the one-off payout in the year it is paid, taxed on top of the other incomes of that year. */
    const lumpSumNet = (p: OverviewProductInput, r: ProjectionResult): number => {
      if (!r.lumpSum) return 0;
      const partner = joint === undefined ? undefined : partnerAt(p.payoutStartAge);
      const tax =
        joint === undefined || partner === undefined
          ? lumpSumTax(incomesAt(p.payoutStartAge), r.lumpSum.grossReal, incomeTaxParameters)
          : jointLumpSumTax(
              incomesAt(p.payoutStartAge),
              partner,
              r.lumpSum.grossReal,
              incomeTaxParameters,
              joint.parameters,
            );
      // Health contributions on the lump sum (only without compulsory insurance), as the projector computed them.
      const toReal = r.lumpSum.gross > 0 ? r.lumpSum.grossReal / r.lumpSum.gross : 0;
      const health = Math.max(0, (r.lumpSum.gross - r.lumpSum.tax - r.lumpSum.net) * toReal);
      return r.lumpSum.grossReal - tax - health;
    };

    const byProduct: OverviewProductAmount[] = results.map(({ p, r }) => ({
      productId: p.productId,
      ...amountsAt(p, r, target),
    }));
    const sum = (pick: (a: OverviewProductAmount) => number) =>
      byProduct.reduce((s, a) => s + pick(a), 0);
    const snapNet = sum((a) => a.netReal);

    const warnings: string[] = [];
    for (const { p, r } of results) {
      if (isEmpty(p)) continue;
      for (const w of r.warnings) if (!warnings.includes(w)) warnings.push(w);
    }

    if (sharedContributionsAt(counted, scenario, target, assumptions) !== undefined) {
      warnings.push('shared_occupational_threshold');
    }
    if (joint !== undefined && partnerAt(target) !== undefined) {
      for (const w of joint.warnings ?? []) if (!warnings.includes(w)) warnings.push(w);
    }

    const snapshot: OverviewSnapshot = {
      netMonthlyPensionReal: snapNet,
      grossMonthlyPensionReal: sum((a) => a.grossReal),
      taxAndContributionsReal: sum((a) => a.taxAndContributionsReal),
      byProduct,
      gap: desired === undefined ? undefined : Math.max(0, desired - snapNet),
      surplus: desired === undefined ? undefined : Math.max(0, snapNet - desired),
      lumpSumNetReal: results.reduce((s, { p, r }) => s + lumpSumNet(p, r), 0),
      lumpSumGrossReal: results.reduce((s, { r }) => s + (r.lumpSum?.grossReal ?? 0), 0),
      warnings,
    };

    const path: OverviewPathPoint[] = [];
    let totalGap = 0;
    for (let age = target; age <= life; age++) {
      const point: OverviewPathPoint = {
        age,
        year: profile.birthYear + age,
        byProduct: {},
        total: 0,
      };
      const tax = taxAt(age);
      for (const { p, r } of results) {
        const v = amountsAt(p, r, age, tax).netReal;
        point.byProduct[p.productId] = v;
        point.total += v;
      }
      if (desired !== undefined) {
        point.gap = Math.max(0, desired - point.total);
        if (age < life) totalGap += 12 * point.gap;
      }
      path.push(point);
    }

    scenarios[scenario] = {
      snapshot,
      path,
      totalGapReal: desired === undefined ? undefined : totalGap,
    };
  }

  return {
    ok: true,
    result: {
      personId,
      targetRetirementAge: target,
      lifeExpectancyAge: life,
      desiredMonthlyIncomeToday: desired,
      products: statuses,
      firstPayoutEndAge,
      scenarios,
    },
  };
}
