import {
  DEFAULT_ETF_PAYOUT,
  DEFAULT_ETF_PLAN,
  defaultPerson,
  personContext,
  validateProfile,
  validateRetirementTiming,
  validateSavingsGoal,
} from '@valiva/core';
import type {
  Household,
  LegalResolution,
  OverviewProductInput,
  Person,
  PersonContext,
} from '@valiva/core';
import { defaultGlobalAssumptions } from '../state/useHousehold';
import { warningWeight } from './warningText';
import { buildPersonProducts, loadPersonBlocks } from './personProducts';
import type { PersonBlocks } from './personProducts';

/**
 * Status of one input page, derived from the stored data (AP-13). `empty`: nothing entered (or only the default
 * values); `done`: entered and valid; `hint`: entered, but invalid or the core reports a note the user can act on.
 */
export type InputStatus = 'empty' | 'done' | 'hint';
export type InputPage =
  'profile' | 'etf' | 'statutory' | 'depot' | 'occupational' | 'other' | 'goals';

export type PersonStatus = {
  /** `goals` is absent while there are no goals: the page is optional and shows no mark. `other` is `empty` without entries. */
  pages: Partial<Record<InputPage, InputStatus>>;
};

/** Key-order independent comparison of plain JSON values. */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    sameData((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

/**
 * Codes the user can act on. Notes about unchecked legal values (`unverified:`) hold for every input and
 * belong to the assumptions page, so they do not turn a page into "with note".
 */
function actionable(product: OverviewProductInput | undefined): boolean {
  if (!product) return false;
  if (!product.outcome.ok) return true;
  return Object.values(product.outcome.results).some((r) =>
    r.warnings.some((w) => warningWeight(w) === 'important' && !w.startsWith('unverified:')),
  );
}

function profileStatus(person: Person, ctx: PersonContext, currentYear: number): InputStatus {
  const issues = [
    ...validateProfile(ctx.profile, currentYear),
    ...validateRetirementTiming(ctx.profile, currentYear),
  ];
  if (issues.length > 0) return 'hint';
  const d = defaultPerson(person.id, person.name, currentYear, defaultGlobalAssumptions());
  const own = (p: Person) => ({
    birthYear: p.birthYear,
    targetRetirementAge: p.targetRetirementAge,
    lifeExpectancyAge: p.lifeExpectancyAge,
    childrenBirthYears: p.childrenBirthYears,
    personalAssumptions: p.personalAssumptions,
  });
  return sameData(own(person), own(d)) ? 'empty' : 'done';
}

/** `other` is done when there is a valid entry; any invalid entry or actionable note makes it "with note". */
function otherStatus(products: OverviewProductInput[]): InputStatus {
  const own = products.filter((p) => p.productId.startsWith('otherIncome:'));
  if (own.length === 0) return 'empty';
  return own.some((p) => actionable(p)) ? 'hint' : 'done';
}

function entered(blocks: PersonBlocks) {
  const s = blocks.statutory;
  return {
    etf:
      !sameData(blocks.etfPlan, DEFAULT_ETF_PLAN) ||
      !sameData(blocks.etfPayout, DEFAULT_ETF_PAYOUT),
    statutory:
      (s.projectedMonthlyPensionToday ?? 0) > 0 ||
      (s.projectedMonthlyPensionAtRetirementAgeToday ?? 0) > 0,
    depot: blocks.depot.ownContributionMonthly > 0,
    occupational:
      blocks.occupational.employeeContributionMonthlyGross > 0 ||
      blocks.occupational.employerContributionMonthly > 0,
  };
}

/** Status of all input pages of one person. Reads the saved blocks; the calculations are not changed. */
export function personStatus(
  household: Household,
  person: Person,
  legal: LegalResolution,
  currentYear: number,
  blocks: PersonBlocks = loadPersonBlocks(person.id),
): PersonStatus {
  const ctx = personContext(household, person);
  const profile = profileStatus(person, ctx, currentYear);
  const e = entered(blocks);
  const usable = legal.ok && profile !== 'hint';
  const products = usable ? buildPersonProducts(blocks, ctx, legal) : [];
  const byId = (id: OverviewProductInput['productId']) => products.find((p) => p.productId === id);
  const status = (isEntered: boolean, product: OverviewProductInput | undefined): InputStatus => {
    if (!isEntered) return 'empty';
    return actionable(product) ? 'hint' : 'done';
  };

  const goals = blocks.goals.goals;
  const pages: PersonStatus['pages'] = {
    profile,
    etf: status(e.etf, byId('etf')),
    statutory: status(e.statutory, byId('statutory')),
    depot: status(e.depot, byId('retirementDepot')),
    occupational: status(e.occupational, byId('occupational')),
    other: otherStatus(products),
  };
  if (goals.length > 0) {
    pages.goals = goals.some((g) => validateSavingsGoal(g).length > 0) ? 'hint' : 'done';
  }
  return { pages };
}

/* ---------- next steps ---------- */

export type StepId = 'profile' | 'statutory' | 'wish' | 'export';

/** One step of the "next step" card. Person steps are done when every person has done them. */
type StepDef = {
  id: StepId;
  scope: 'person' | 'household';
  done: (ctx: { status?: PersonStatus; wish: boolean; exported: boolean }) => boolean;
};

/**
 * The steps in order. A further step (for example the splitting question for couples, AP-16) is one more
 * entry here; the card and its progress line read this list.
 */
export const STEP_DEFS: StepDef[] = [
  { id: 'profile', scope: 'person', done: ({ status }) => status?.pages.profile === 'done' },
  {
    id: 'statutory',
    scope: 'person',
    done: ({ status }) => status !== undefined && status.pages.statutory !== 'empty',
  },
  { id: 'wish', scope: 'household', done: ({ wish }) => wish },
  { id: 'export', scope: 'household', done: ({ exported }) => exported },
];

export type GuidanceInput = {
  persons: { id: string; name: string; status: PersonStatus }[];
  wish: boolean;
  exported: boolean;
};

export type StepState = { id: StepId; done: boolean };
export type Guidance = {
  steps: StepState[];
  /** First open step and, for person steps, the first person who has not done it. */
  next?: { id: StepId; personId?: string; personName?: string };
  /** Done steps of the person-scoped steps per person, for the household line "Anna 3 von 4". */
  perPerson: { id: string; name: string; done: number; total: number }[];
};

/**
 * Progress for the card. `scope` is the person shown (person view) or `undefined` for the household view,
 * where the card names the first person with an open step.
 */
export function guidanceFor(input: GuidanceInput, scope?: string): Guidance {
  const { persons, wish, exported } = input;
  const considered = scope === undefined ? persons : persons.filter((p) => p.id === scope);
  const doneFor = (def: StepDef, p?: { status: PersonStatus }) =>
    def.done({ status: p?.status, wish, exported });

  const steps: StepState[] = STEP_DEFS.map((def) => ({
    id: def.id,
    done:
      def.scope === 'household'
        ? doneFor(def)
        : considered.length > 0 && considered.every((p) => doneFor(def, p)),
  }));

  let next: Guidance['next'];
  for (const def of STEP_DEFS) {
    if (def.scope === 'household') {
      if (!doneFor(def)) {
        next = { id: def.id };
        break;
      }
    } else {
      const open = considered.find((p) => !doneFor(def, p));
      if (open) {
        next = { id: def.id, personId: open.id, personName: open.name };
        break;
      }
    }
  }

  const personDefs = STEP_DEFS.filter((d) => d.scope === 'person');
  const perPerson = persons.map((p) => ({
    id: p.id,
    name: p.name,
    done: personDefs.filter((d) => doneFor(d, p)).length,
    total: personDefs.length,
  }));
  return { steps, next, perPerson };
}
