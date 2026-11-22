import { lumpSumTax, retirementIncomeTax } from './retirementTax';
import type { IncomeTaxParameters } from './incomeTax';
import type { OtherIncome, TaxableIncome } from './retirementTax';
import { validateAssumptions, validateProfile } from './profile';
import type { GlobalAssumptions, Profile } from './profile';
import type { ProjectionResult } from './projection';
import { SCENARIO_NAMES } from './types';
import type { ScenarioName, ValidationIssue } from './types';

export const OVERVIEW_PRODUCT_KINDS = [
  'etf',
  'statutory',
  'retirementDepot',
  'occupational',
] as const;
export type OverviewProductKind = (typeof OVERVIEW_PRODUCT_KINDS)[number];

/**
 * One product as the overview sees it: the projection result per scenario (or the issues that kept it from
 * being computed) plus the ages of its payout phase. `payoutEndAge` is absent for the statutory pension (lifelong).
 */
export type OverviewProductInput = {
  productId: OverviewProductKind;
  enabled: boolean;
  payoutStartAge: number;
  payoutEndAge?: number;
  outcome:
    | { ok: true; results: Record<ScenarioName, ProjectionResult> }
    | { ok: false; issues: ValidationIssue[] };
};

/**
 * `included`: counts from the target retirement age. `later`: valid, but pays out only after the target
 * age, so the snapshot carries it with 0. `disabled`/`invalid`: not counted; `invalid` lists the reasons.
 */
export type OverviewProductStatus = {
  productId: OverviewProductKind;
  status: 'included' | 'later' | 'disabled' | 'invalid';
  payoutStartAge?: number;
  payoutEndAge?: number;
  /** Valid, but pays nothing in any scenario (for example a contribution of 0). Ignored for end age and warnings. */
  empty?: boolean;
  issues?: ValidationIssue[];
};

export type OverviewProductAmount = {
  productId: OverviewProductKind;
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
  byProduct: Partial<Record<OverviewProductKind, number>>;
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
function activityFactor(
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
 * Taxable income and contributions of one product at `age`, in today's purchasing power. Later increases of a
 * statutory pension are fully taxable: its tax-free part is a fixed amount in euros from the first year (a
 * constant nominal amount, so it loses purchasing power with the inflation), not a share of the growing pension.
 */
function incomeAt(
  p: OverviewProductInput,
  scenario: ScenarioName,
  age: number,
  assumptions: GlobalAssumptions,
): TaxableIncome {
  const r = resultsOf(p, scenario);
  const f = activityFactor(p, r, age, assumptions);
  let taxable = r.taxableMonthlyReal * f;
  if (p.productId === 'statutory' && f > 0) {
    const taxFree = r.monthlyPensionReal - r.taxableMonthlyReal;
    const inflation = 1 + assumptions.inflationPercent / 100;
    taxable = Math.max(
      0,
      r.monthlyPensionReal * f - taxFree * Math.pow(inflation, -(age - p.payoutStartAge)),
    );
  }
  return {
    id: p.productId,
    taxableMonthly: taxable,
    contributionsMonthly: r.contributionsMonthlyReal * f,
  };
}

/**
 * Income of the products other than `excludeId` that runs at `age` per scenario, to hand to a projector as
 * `otherIncome`. Only enabled, valid products count; each is taken as projected without other income, which
 * is enough because taxable amounts and contributions do not depend on the tax.
 */
export function concurrentIncome(
  products: OverviewProductInput[],
  excludeId: OverviewProductKind,
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
): OverviewOutcome {
  const issues = [...validateProfile(profile, currentYear), ...validateAssumptions(assumptions)];
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
      statuses.push({
        productId: p.productId,
        status: p.payoutStartAge > target ? 'later' : 'included',
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
    const taxAt = (age: number) =>
      retirementIncomeTax(
        counted.map((p) => incomeAt(p, scenario, age, assumptions)),
        incomeTaxParameters,
      );
    const amountsAt = (
      p: OverviewProductInput,
      r: ProjectionResult,
      age: number,
      tax = taxAt(age),
    ) => {
      const f = activityFactor(p, r, age, assumptions);
      const share = tax.byId[p.productId] ?? 0;
      const grossReal = r.monthlyPensionReal * f;
      const deductions = (r.fixedTaxMonthlyReal + r.contributionsMonthlyReal) * f + share;
      return { grossReal, taxAndContributionsReal: deductions, netReal: grossReal - deductions };
    };

    /** Net of the one-off payout in the year it is paid, taxed on top of the other incomes of that year. */
    const lumpSumNet = (p: OverviewProductInput, r: ProjectionResult): number => {
      if (!r.lumpSum) return 0;
      const incomes = counted.map((q) => incomeAt(q, scenario, p.payoutStartAge, assumptions));
      const tax = lumpSumTax(incomes, r.lumpSum.grossReal, incomeTaxParameters);
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
