import type { DepotVariant } from './depot';
import { DEPOT_VARIANTS } from './depot';
import type { EmployerSubsidyMode } from './occupational';
import type { PersonBlock } from './householdMigration';
import type { SavingsGoal, TargetBasis } from './goalTypes';
import { validateSavingsGoal } from './goalValidation';
import { monthToIndex } from './months';
import { DEFAULT_WITHDRAWAL_PERCENT, WITHDRAWAL_STRATEGIES } from './payout';
import type { WithdrawalSettings, WithdrawalStrategy } from './payout';
import type { EtfPlanInput } from './types';

/** Largest absolute number accepted in stored or imported data; far beyond any sensible input. */
export const MAX_ABS_VALUE = 1e12;
export const MAX_STRING_LENGTH = 200;
export const MAX_GOALS = 200;
export const MAX_LUMP_SUMS = 1000;

/**
 * Optional withdrawal choice of a payout state. Both fields are kept apart so that the percentage survives a
 * switch back to the annuity. Absent strategy = annuity.
 */
export type WithdrawalFields = {
  withdrawalStrategy?: WithdrawalStrategy;
  withdrawalPercent?: number;
};

/** The settings the projectors take; the percentage falls back to the default if none is stored. */
export function withdrawalOf(state: WithdrawalFields): WithdrawalSettings {
  return state.withdrawalStrategy === 'percent'
    ? { strategy: 'percent', percent: state.withdrawalPercent ?? DEFAULT_WITHDRAWAL_PERCENT }
    : { strategy: 'annuity' };
}

export type EtfPayoutState = WithdrawalFields & {
  schemaVersion: 1;
  /** True: return scenarios and inflation come from the global assumptions. */
  useGlobalAssumptions: boolean;
  /** Overrides; `undefined` = target retirement age and life expectancy from the profile. */
  payoutStartAge?: number;
  payoutEndAge?: number;
};

export type EtfTargetState = { targetValue: number; basis: TargetBasis };

export type GoalsState = {
  schemaVersion: 1;
  savingsBudgetMonthly?: number;
  /** Yearly allowance all goals of the person share; absent: the value from `config/tax-de.json`. */
  taxFreeAllowanceYearly?: number;
  goals: SavingsGoal[];
};

export type StatutoryState = {
  schemaVersion: 1;
  /** 0 = nothing entered yet. */
  projectedMonthlyPensionToday: number;
  /** Pension for the chosen retirement age from the statement; `undefined` or 0 = not entered. */
  projectedMonthlyPensionAtRetirementAgeToday?: number;
  statementYear: number;
  /** Override; `undefined` = use the profile's target retirement age. */
  retirementAge?: number;
  regularRetirementAge?: number;
};

export type DepotState = WithdrawalFields & {
  schemaVersion: 1;
  /** 0 = nothing entered yet. */
  ownContributionMonthly: number;
  startMonth: string;
  variant: DepotVariant;
  costPercentPerYear: number;
  /** Yearly rise of the contribution in percent, every January after the start; `undefined` = constant. */
  annualContributionIncreasePercent?: number;
  /** Overrides; `undefined` = use the profile (payout start) or the default. */
  payoutStartAge?: number;
  payoutEndAge: number;
  lumpSumSharePercent: number;
  /** `undefined` = not set. Only used by guarantee variants. */
  returnOverridePercent?: number;
};

export type OccupationalState = {
  schemaVersion: 1;
  /** 0 = nothing entered yet. */
  employeeContributionMonthlyGross: number;
  employerSubsidyMode: EmployerSubsidyMode;
  employerSubsidyCustomMonthly: number;
  employerContributionMonthly: number;
  costPercentPerYear: number;
  /** Yearly rise of the contribution in percent, every January after the start; `undefined` = constant. */
  annualContributionIncreasePercent?: number;
  startMonth: string;
  /** Overrides; `undefined` = use the profile. */
  payoutStartAge?: number;
  payoutEndAge?: number;
  /** `undefined` = no guarantee. */
  guaranteedRatePercent?: number;
};

/** Blocks the overview can include. */
export const OVERVIEW_BLOCKS = ['etf', 'statutory', 'retirementDepot', 'occupational'] as const;
export type OverviewBlock = (typeof OVERVIEW_BLOCKS)[number];

/** Which blocks count in the overview. */
export type OverviewState = {
  schemaVersion: 1;
  enabled: Record<OverviewBlock, boolean>;
};

export type BlockStates = {
  etfPlan: EtfPlanInput;
  etfPayout: EtfPayoutState;
  etfTarget: EtfTargetState;
  goals: GoalsState;
  statutory: StatutoryState;
  depot: DepotState;
  occupational: OccupationalState;
  overview: OverviewState;
};

export const DEFAULT_ETF_PLAN: EtfPlanInput = {
  initialCapital: 5000,
  monthlyContribution: 250,
  annualContributionIncreasePercent: 0,
  durationYears: 20,
  lumpSums: [],
  ter: 0.2,
  entryFeePercent: 0,
  custodyFeeEurPerYear: 0,
  custodyFeePercentPerYear: 0,
  returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
  inflationPercent: 2,
  taxEnabled: true,
};

export const DEFAULT_ETF_PAYOUT: EtfPayoutState = { schemaVersion: 1, useGlobalAssumptions: true };
export const DEFAULT_ETF_TARGET: EtfTargetState = { targetValue: 150000, basis: 'real' };
export const DEFAULT_OVERVIEW: OverviewState = {
  schemaVersion: 1,
  enabled: { etf: true, statutory: true, retirementDepot: true, occupational: true },
};

export function defaultBlock<B extends PersonBlock>(block: B, currentYear: number): BlockStates[B] {
  const defaults: BlockStates = {
    etfPlan: DEFAULT_ETF_PLAN,
    etfPayout: DEFAULT_ETF_PAYOUT,
    etfTarget: DEFAULT_ETF_TARGET,
    goals: { schemaVersion: 1, goals: [] },
    statutory: {
      schemaVersion: 1,
      projectedMonthlyPensionToday: 0,
      statementYear: currentYear,
    },
    depot: {
      schemaVersion: 1,
      ownContributionMonthly: 0,
      startMonth: '2027-01',
      variant: 'standard',
      costPercentPerYear: 1,
      payoutEndAge: 85,
      lumpSumSharePercent: 0,
    },
    occupational: {
      schemaVersion: 1,
      employeeContributionMonthlyGross: 0,
      employerSubsidyMode: 'auto15',
      employerSubsidyCustomMonthly: 0,
      employerContributionMonthly: 0,
      costPercentPerYear: 1,
      startMonth: '2027-01',
    },
    overview: DEFAULT_OVERVIEW,
  };
  return defaults[block] as BlockStates[B];
}

export type BlockParseResult<B extends PersonBlock> =
  | {
      ok: true;
      value: BlockStates[B];
      /** Fields that were present but unusable and were replaced by their defaults (or dropped). */
      problems: string[];
    }
  | { ok: false };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function readWithdrawal(r: Reader): WithdrawalFields {
  const strategy = r.oneOf<WithdrawalStrategy | ''>(
    'withdrawalStrategy',
    [...WITHDRAWAL_STRATEGIES, ''],
    '',
  );
  const percent = r.optNum('withdrawalPercent');
  return {
    ...(strategy === '' ? {} : { withdrawalStrategy: strategy }),
    ...(percent === undefined ? {} : { withdrawalPercent: percent }),
  };
}

/** Reads fields of untrusted data; unusable values fall back to a default and are recorded. */
class Reader {
  readonly problems: string[] = [];
  constructor(
    readonly src: Record<string, unknown>,
    private readonly path = '',
  ) {}
  private missing(key: string): boolean {
    return this.src[key] === undefined || this.src[key] === null;
  }
  private bad(key: string) {
    this.problems.push(`${this.path}${key}`);
  }
  num(key: string, fallback: number): number {
    if (this.missing(key)) return fallback;
    const v = this.src[key];
    if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_ABS_VALUE) return v;
    this.bad(key);
    return fallback;
  }
  optNum(key: string): number | undefined {
    if (this.missing(key)) return undefined;
    const v = this.src[key];
    if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_ABS_VALUE) return v;
    this.bad(key);
    return undefined;
  }
  bool(key: string, fallback: boolean): boolean {
    if (this.missing(key)) return fallback;
    if (typeof this.src[key] === 'boolean') return this.src[key] as boolean;
    this.bad(key);
    return fallback;
  }
  month(key: string, fallback: string): string {
    if (this.missing(key)) return fallback;
    const v = this.src[key];
    if (typeof v === 'string' && monthToIndex(v) !== null) return v;
    this.bad(key);
    return fallback;
  }
  str(key: string, fallback: string): string {
    if (this.missing(key)) return fallback;
    const v = this.src[key];
    if (typeof v === 'string' && v.length <= MAX_STRING_LENGTH) return v;
    this.bad(key);
    return fallback;
  }
  oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    if (this.missing(key)) return fallback;
    const v = this.src[key];
    if (allowed.includes(v as T)) return v as T;
    this.bad(key);
    return fallback;
  }
  /** Stored version must be exactly 1. */
  version(): boolean {
    return this.src.schemaVersion === 1;
  }
}

function parseEtfPlan(raw: Record<string, unknown>): BlockParseResult<'etfPlan'> {
  const r = new Reader(raw);
  const d = DEFAULT_ETF_PLAN;
  const lumpSums: EtfPlanInput['lumpSums'] = [];
  if (raw.lumpSums !== undefined && raw.lumpSums !== null) {
    if (Array.isArray(raw.lumpSums) && raw.lumpSums.length <= MAX_LUMP_SUMS) {
      raw.lumpSums.forEach((item, i) => {
        if (isObject(item)) {
          const lr = new Reader(item, `lumpSums.${i}.`);
          const month = lr.num('month', NaN);
          const amount = lr.num('amount', NaN);
          if (lr.problems.length === 0 && !Number.isNaN(month) && !Number.isNaN(amount)) {
            lumpSums.push({ month, amount });
            return;
          }
        }
        r.problems.push(`lumpSums.${i}`);
      });
    } else {
      r.problems.push('lumpSums');
    }
  }
  const scenarios = isObject(raw.returnScenarios) ? raw.returnScenarios : undefined;
  if (raw.returnScenarios !== undefined && raw.returnScenarios !== null && !scenarios) {
    r.problems.push('returnScenarios');
  }
  const sr = new Reader(scenarios ?? {}, 'returnScenarios.');
  const value: EtfPlanInput = {
    initialCapital: r.num('initialCapital', d.initialCapital),
    monthlyContribution: r.num('monthlyContribution', d.monthlyContribution),
    annualContributionIncreasePercent: r.num(
      'annualContributionIncreasePercent',
      d.annualContributionIncreasePercent,
    ),
    durationYears: r.num('durationYears', d.durationYears),
    lumpSums,
    ter: r.num('ter', d.ter),
    entryFeePercent: r.num('entryFeePercent', d.entryFeePercent),
    custodyFeeEurPerYear: r.num('custodyFeeEurPerYear', d.custodyFeeEurPerYear),
    custodyFeePercentPerYear: r.num('custodyFeePercentPerYear', d.custodyFeePercentPerYear),
    returnScenarios: {
      pessimistic: sr.num('pessimistic', d.returnScenarios.pessimistic),
      neutral: sr.num('neutral', d.returnScenarios.neutral),
      optimistic: sr.num('optimistic', d.returnScenarios.optimistic),
    },
    inflationPercent: r.num('inflationPercent', d.inflationPercent),
    taxEnabled: r.bool('taxEnabled', d.taxEnabled),
    ...(r.bool('advanceLumpSum', false) ? { advanceLumpSum: true } : {}),
  };
  return { ok: true, value, problems: [...r.problems, ...sr.problems] };
}

function parseEtfPayout(raw: Record<string, unknown>): BlockParseResult<'etfPayout'> {
  const r = new Reader(raw);
  if (!r.version()) return { ok: false };
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      useGlobalAssumptions: r.bool('useGlobalAssumptions', true),
      payoutStartAge: r.optNum('payoutStartAge'),
      payoutEndAge: r.optNum('payoutEndAge'),
      ...readWithdrawal(r),
    },
    problems: r.problems,
  };
}

function parseEtfTarget(raw: Record<string, unknown>): BlockParseResult<'etfTarget'> {
  const r = new Reader(raw);
  return {
    ok: true,
    value: {
      targetValue: r.num('targetValue', DEFAULT_ETF_TARGET.targetValue),
      basis: r.oneOf('basis', ['real', 'nominal'], DEFAULT_ETF_TARGET.basis),
    },
    problems: r.problems,
  };
}

function parseGoal(raw: unknown): SavingsGoal | undefined {
  if (!isObject(raw)) return undefined;
  const r = new Reader(raw);
  const id = r.str('id', '');
  const startMonth = r.month('startMonth', '');
  if (!id || !startMonth) return undefined;
  const interestChanges: NonNullable<SavingsGoal['interestChanges']> = [];
  if (Array.isArray(raw.interestChanges) && raw.interestChanges.length <= MAX_GOALS) {
    for (const c of raw.interestChanges) {
      if (!isObject(c)) return undefined;
      const cr = new Reader(c);
      const fromMonth = cr.month('fromMonth', '');
      const percent = cr.num('percent', NaN);
      if (!fromMonth || Number.isNaN(percent) || cr.problems.length > 0) return undefined;
      interestChanges.push({ fromMonth, percent });
    }
  } else if (raw.interestChanges !== undefined && raw.interestChanges !== null) {
    return undefined;
  }
  const targetMonth = raw.targetMonth === undefined ? undefined : r.month('targetMonth', '');
  const goal: SavingsGoal = {
    id,
    name: r.str('name', ''),
    targetAmount: r.num('targetAmount', NaN),
    targetMonth: targetMonth || undefined,
    currentAmount: r.num('currentAmount', NaN),
    monthlyContribution: r.num('monthlyContribution', NaN),
    accountInterestPercent: r.num('accountInterestPercent', NaN),
    interestChanges: interestChanges.length > 0 ? interestChanges : undefined,
    priority: r.num('priority', NaN),
    taxEnabled: r.bool('taxEnabled', true),
    taxFreeAllowancePerYear: r.num('taxFreeAllowancePerYear', NaN),
    startMonth,
  };
  if (r.problems.length > 0) return undefined;
  if (goal.targetMonth === undefined) delete goal.targetMonth;
  if (goal.interestChanges === undefined) delete goal.interestChanges;
  return validateSavingsGoal(goal).length === 0 ? goal : undefined;
}

function parseGoals(raw: Record<string, unknown>): BlockParseResult<'goals'> {
  const r = new Reader(raw);
  if (!r.version() || !Array.isArray(raw.goals)) return { ok: false };
  const goals: SavingsGoal[] = [];
  const ids = new Set<string>();
  raw.goals.slice(0, MAX_GOALS).forEach((g, i) => {
    const goal = parseGoal(g);
    if (goal && !ids.has(goal.id)) {
      ids.add(goal.id);
      goals.push(goal);
    } else {
      r.problems.push(`goals.${i}`);
    }
  });
  if (raw.goals.length > MAX_GOALS) r.problems.push('goals');
  const budget = r.optNum('savingsBudgetMonthly');
  const value: GoalsState = { schemaVersion: 1, goals };
  if (budget !== undefined) value.savingsBudgetMonthly = budget;
  const allowance = r.optNum('taxFreeAllowanceYearly');
  if (allowance !== undefined && allowance >= 0) value.taxFreeAllowanceYearly = allowance;
  else if (allowance !== undefined) r.problems.push('taxFreeAllowanceYearly');
  return { ok: true, value, problems: r.problems };
}

function parseStatutory(
  raw: Record<string, unknown>,
  currentYear: number,
): BlockParseResult<'statutory'> {
  const r = new Reader(raw);
  if (!r.version()) return { ok: false };
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      projectedMonthlyPensionToday: r.num('projectedMonthlyPensionToday', 0),
      projectedMonthlyPensionAtRetirementAgeToday: r.optNum(
        'projectedMonthlyPensionAtRetirementAgeToday',
      ),
      statementYear: r.num('statementYear', currentYear),
      retirementAge: r.optNum('retirementAge'),
      regularRetirementAge: r.optNum('regularRetirementAge'),
    },
    problems: r.problems,
  };
}

function parseDepot(raw: Record<string, unknown>, currentYear: number): BlockParseResult<'depot'> {
  const r = new Reader(raw);
  if (!r.version()) return { ok: false };
  const d = defaultBlock('depot', currentYear);
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      ownContributionMonthly: r.num('ownContributionMonthly', 0),
      startMonth: r.month('startMonth', d.startMonth),
      variant: r.oneOf('variant', DEPOT_VARIANTS, 'standard'),
      costPercentPerYear: r.num('costPercentPerYear', d.costPercentPerYear),
      annualContributionIncreasePercent: r.optNum('annualContributionIncreasePercent'),
      payoutStartAge: r.optNum('payoutStartAge'),
      payoutEndAge: r.num('payoutEndAge', d.payoutEndAge),
      lumpSumSharePercent: r.num('lumpSumSharePercent', 0),
      returnOverridePercent: r.optNum('returnOverridePercent'),
      ...readWithdrawal(r),
    },
    problems: r.problems,
  };
}

function parseOccupational(
  raw: Record<string, unknown>,
  currentYear: number,
): BlockParseResult<'occupational'> {
  const r = new Reader(raw);
  if (!r.version()) return { ok: false };
  const d = defaultBlock('occupational', currentYear);
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      employeeContributionMonthlyGross: r.num('employeeContributionMonthlyGross', 0),
      employerSubsidyMode: r.oneOf('employerSubsidyMode', ['auto15', 'custom'], 'auto15'),
      employerSubsidyCustomMonthly: r.num('employerSubsidyCustomMonthly', 0),
      employerContributionMonthly: r.num('employerContributionMonthly', 0),
      costPercentPerYear: r.num('costPercentPerYear', d.costPercentPerYear),
      annualContributionIncreasePercent: r.optNum('annualContributionIncreasePercent'),
      startMonth: r.month('startMonth', d.startMonth),
      payoutStartAge: r.optNum('payoutStartAge'),
      payoutEndAge: r.optNum('payoutEndAge'),
      guaranteedRatePercent: r.optNum('guaranteedRatePercent'),
    },
    problems: r.problems,
  };
}

function parseOverview(raw: Record<string, unknown>): BlockParseResult<'overview'> {
  const r = new Reader(raw);
  if (!r.version() || !isObject(raw.enabled)) return { ok: false };
  const er = new Reader(raw.enabled, 'enabled.');
  const enabled = { ...DEFAULT_OVERVIEW.enabled };
  for (const key of OVERVIEW_BLOCKS) enabled[key] = er.bool(key, DEFAULT_OVERVIEW.enabled[key]);
  return { ok: true, value: { schemaVersion: 1, enabled }, problems: er.problems };
}

/**
 * Reads one block from untrusted data (a stored value or an imported file): known fields only, every
 * value type- and range-checked. Fields that cannot be used fall back to their default and are listed in
 * `problems`. `ok: false` means the block as a whole is unusable (not an object, wrong version).
 * Never throws.
 */
export function parseBlock<B extends PersonBlock>(
  block: B,
  raw: unknown,
  currentYear: number,
): BlockParseResult<B> {
  if (!isObject(raw)) return { ok: false };
  let result: BlockParseResult<PersonBlock>;
  switch (block) {
    case 'etfPlan':
      result = parseEtfPlan(raw);
      break;
    case 'etfPayout':
      result = parseEtfPayout(raw);
      break;
    case 'etfTarget':
      result = parseEtfTarget(raw);
      break;
    case 'goals':
      result = parseGoals(raw);
      break;
    case 'statutory':
      result = parseStatutory(raw, currentYear);
      break;
    case 'depot':
      result = parseDepot(raw, currentYear);
      break;
    case 'occupational':
      result = parseOccupational(raw, currentYear);
      break;
    case 'overview':
      result = parseOverview(raw);
      break;
    default:
      return { ok: false };
  }
  return result as BlockParseResult<B>;
}

/** Convenience for the stored-JSON case: unreadable data gives the defaults. */
export function loadBlock<B extends PersonBlock>(
  block: B,
  rawJson: string | null | undefined,
  currentYear: number,
): BlockStates[B] {
  if (!rawJson) return defaultBlock(block, currentYear);
  try {
    const result = parseBlock(block, JSON.parse(rawJson) as unknown, currentYear);
    return result.ok ? result.value : defaultBlock(block, currentYear);
  } catch {
    return defaultBlock(block, currentYear);
  }
}
