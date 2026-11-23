import {
  DEFAULT_ETF_PAYOUT,
  DEFAULT_ETF_PLAN,
  defaultBlock,
  defaultHouseholdState,
} from '@valiva/core';
import type { Household, Person } from '@valiva/core';
import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { guidanceFor, personStatus, sameData } from '../src/lib/inputStatus';
import type { GuidanceInput, PersonStatus } from '../src/lib/inputStatus';
import { currentLegal } from '../src/lib/legalConfig';
import type { PersonBlocks } from '../src/lib/personProducts';
import { CURRENT_YEAR, defaultGlobalAssumptions } from '../src/state/useHousehold';

const legal = currentLegal();
const household = (): Household =>
  defaultHouseholdState(CURRENT_YEAR, defaultGlobalAssumptions()).household;
const blocks = (): PersonBlocks => ({
  etfPlan: DEFAULT_ETF_PLAN,
  etfPayout: DEFAULT_ETF_PAYOUT,
  statutory: defaultBlock('statutory', CURRENT_YEAR),
  depot: defaultBlock('depot', CURRENT_YEAR),
  occupational: defaultBlock('occupational', CURRENT_YEAR),
  overview: defaultBlock('overview', CURRENT_YEAR),
  goals: defaultBlock('goals', CURRENT_YEAR),
});
const statusOf = (h: Household, p: Person, b: PersonBlocks) =>
  personStatus(h, p, legal, CURRENT_YEAR, b).pages;

describe('sameData', () => {
  it('ignores key order and undefined fields, not values', () => {
    expect(sameData({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1, c: undefined })).toBe(true);
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameData([1], [1, 2])).toBe(false);
    expect(sameData({ a: 1 }, [1])).toBe(false);
  });
});

describe('personStatus', () => {
  it('shows every page as empty for the default data and leaves optional goals without a mark', () => {
    const h = household();
    const pages = statusOf(h, h.persons[0]!, blocks());
    expect(pages).toEqual({
      profile: 'empty',
      etf: 'empty',
      statutory: 'empty',
      depot: 'empty',
      occupational: 'empty',
    });
  });

  it('marks a page done once something is entered', () => {
    const h = household();
    const b = blocks();
    b.statutory = { ...b.statutory, projectedMonthlyPensionToday: 1400 };
    b.depot = { ...b.depot, ownContributionMonthly: 100 };
    b.occupational = { ...b.occupational, employeeContributionMonthlyGross: 100 };
    b.etfPlan = { ...b.etfPlan, monthlyContribution: 400 };
    const person = { ...h.persons[0]!, birthYear: CURRENT_YEAR - 45 };
    const pages = statusOf(h, person, b);
    expect(pages.profile).toBe('done');
    expect(pages.statutory).toBe('done');
    expect(pages.depot).toBe('done');
    expect(pages.occupational).toBe('done');
    expect(pages.etf).toBe('done');
  });

  it('flags an invalid profile and a contribution above the allowed maximum as "hint"', () => {
    const h = household();
    const bad = { ...h.persons[0]!, birthYear: 1800 };
    expect(statusOf(h, bad, blocks()).profile).toBe('hint');

    const b = blocks();
    b.depot = { ...b.depot, ownContributionMonthly: 5000 };
    expect(statusOf(h, h.persons[0]!, b).depot).toBe('hint');
  });

  it('does not turn unverified legal values into a note on the page', () => {
    const h = household();
    const b = blocks();
    b.statutory = { ...b.statutory, projectedMonthlyPensionToday: 1400 };
    expect(statusOf(h, h.persons[0]!, b).statutory).toBe('done');
  });

  it('shows goals only when one exists', () => {
    const h = household();
    const b = blocks();
    b.goals = {
      ...b.goals,
      goals: [
        {
          id: 'g1',
          name: 'Trip',
          targetAmount: 3000,
          currentAmount: 0,
          monthlyContribution: 100,
          accountInterestPercent: 2,
          priority: 1,
          taxEnabled: false,
          taxFreeAllowancePerYear: 1000,
          startMonth: '2026-12',
        },
      ],
    };
    expect(statusOf(h, h.persons[0]!, b).goals).toBe('done');
    b.goals = { ...b.goals, goals: [{ ...b.goals.goals[0]!, targetAmount: -5 }] };
    expect(statusOf(h, h.persons[0]!, b).goals).toBe('hint');
  });
});

describe('guidanceFor', () => {
  const empty: PersonStatus = { pages: { profile: 'empty', statutory: 'empty' } };
  const filled: PersonStatus = { pages: { profile: 'done', statutory: 'done' } };
  const input = (a: PersonStatus, b?: PersonStatus, extra: Partial<GuidanceInput> = {}) =>
    ({
      persons: [
        { id: 'a', name: 'Anna', status: a },
        ...(b ? [{ id: 'b', name: 'Ben', status: b }] : []),
      ],
      wish: false,
      exported: false,
      ...extra,
    }) satisfies GuidanceInput;

  it('walks through profile, pension, wish and backup in order', () => {
    expect(guidanceFor(input(empty)).next?.id).toBe('profile');
    expect(guidanceFor(input({ pages: { profile: 'done', statutory: 'empty' } })).next?.id).toBe(
      'statutory',
    );
    expect(guidanceFor(input(filled)).next?.id).toBe('wish');
    expect(guidanceFor(input(filled, undefined, { wish: true })).next?.id).toBe('export');
    expect(
      guidanceFor(input(filled, undefined, { wish: true, exported: true })).next,
    ).toBeUndefined();
  });

  it('counts a pension step with a note as done, an invalid profile as open', () => {
    const hinted: PersonStatus = { pages: { profile: 'done', statutory: 'hint' } };
    expect(guidanceFor(input(hinted)).steps.find((s) => s.id === 'statutory')?.done).toBe(true);
    const bad: PersonStatus = { pages: { profile: 'hint', statutory: 'done' } };
    expect(guidanceFor(input(bad)).next?.id).toBe('profile');
  });

  it('names the first open person in the household view and only the active one in the person view', () => {
    const i = input(filled, empty);
    const household = guidanceFor(i);
    expect(household.next).toEqual({ id: 'profile', personId: 'b', personName: 'Ben' });
    expect(household.perPerson).toEqual([
      { id: 'a', name: 'Anna', done: 2, total: 2 },
      { id: 'b', name: 'Ben', done: 0, total: 2 },
    ]);
    // Anna is done with her own steps: only the shared steps remain in her view.
    expect(guidanceFor(i, 'a').next?.id).toBe('wish');
    expect(guidanceFor(i, 'b').next).toEqual({ id: 'profile', personId: 'b', personName: 'Ben' });
  });

  it('has a text for every step', () => {
    for (const id of guidanceFor(input(empty)).steps.map((s) => s.id)) {
      expect(de.guidance.steps[id].title.length).toBeGreaterThan(0);
    }
  });
});
