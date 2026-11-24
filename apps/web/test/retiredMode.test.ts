import {
  DEFAULT_ETF_PAYOUT,
  DEFAULT_ETF_PLAN,
  RETIREMENT_NOTICE_LEAD_MONTHS,
  defaultBlock,
  defaultHouseholdState,
} from '@valiva/core';
import type { Household, Person, Profile } from '@valiva/core';
import { describe, expect, it } from 'vitest';
import { personStatus } from '../src/lib/inputStatus';
import { currentLegal } from '../src/lib/legalConfig';
import type { PersonBlocks } from '../src/lib/personProducts';
import { defaultRetirementStartYear, noticeMayBeThere } from '../src/lib/retired';
import { warningText, warningWeight } from '../src/lib/warningText';
import { CURRENT_YEAR, defaultGlobalAssumptions } from '../src/state/useHousehold';

const profile = (over: Partial<Profile>): Profile => ({
  birthYear: 1960,
  targetRetirementAge: 67,
  lifeExpectancyAge: 90,
  childrenBirthYears: [],
  ...over,
});

describe('defaultRetirementStartYear', () => {
  it('offers the planned start and keeps it inside the band and not after the current year', () => {
    expect(defaultRetirementStartYear(profile({ birthYear: 1950 }), 2026)).toBe(2017);
    // planned 2027 lies ahead: the current year
    expect(defaultRetirementStartYear(profile({ birthYear: 1960 }), 2026)).toBe(2026);
    // a young person: the earliest year of the band (the profile then reports the start as in the future)
    expect(defaultRetirementStartYear(profile({ birthYear: 1990 }), 2026)).toBe(2040);
    // planned start before birth + 50 is raised to it
    expect(
      defaultRetirementStartYear(profile({ birthYear: 1940, targetRetirementAge: 55 }), 2026),
    ).toBe(1995);
    expect(defaultRetirementStartYear(profile({ birthYear: Number.NaN }), 2026)).toBeNaN();
  });
});

describe('noticeMayBeThere', () => {
  it('is true from RETIREMENT_NOTICE_LEAD_MONTHS months before the start (January of the start year) and for the start year', () => {
    expect(RETIREMENT_NOTICE_LEAD_MONTHS).toBe(12);
    const p = profile({ birthYear: 1960 }); // starts 2027
    expect(noticeMayBeThere(p, 2026, 1)).toBe(true); // exactly 12 months
    expect(noticeMayBeThere(p, 2026, 12)).toBe(true);
    expect(noticeMayBeThere(profile({ birthYear: 1961 }), 2026, 12)).toBe(false); // 2028: 25 months
    expect(noticeMayBeThere(profile({ birthYear: 1959 }), 2026, 6)).toBe(true); // starts this year
  });

  it('is false for a person who is retired and for a start in the past', () => {
    expect(noticeMayBeThere(profile({ retired: true, retirementStartYear: 2025 }), 2026, 5)).toBe(
      false,
    );
    expect(noticeMayBeThere(profile({ birthYear: 1950 }), 2026, 5)).toBe(false);
  });
});

describe('input status of a retired person', () => {
  const legal = currentLegal();
  const household = (): Household =>
    defaultHouseholdState(CURRENT_YEAR, defaultGlobalAssumptions()).household;
  const retiree = (h: Household): Person => ({
    ...h.persons[0]!,
    birthYear: CURRENT_YEAR - 70,
    retired: true,
    retirementStartYear: CURRENT_YEAR - 5,
  });
  const blocks = (): PersonBlocks => ({
    etfPlan: DEFAULT_ETF_PLAN,
    etfPayout: DEFAULT_ETF_PAYOUT,
    statutory: defaultBlock('statutory', CURRENT_YEAR),
    depot: defaultBlock('depot', CURRENT_YEAR),
    occupational: defaultBlock('occupational', CURRENT_YEAR),
    otherIncome: defaultBlock('otherIncome', CURRENT_YEAR),
    overview: defaultBlock('overview', CURRENT_YEAR),
    goals: defaultBlock('goals', CURRENT_YEAR),
  });
  const pages = (b: PersonBlocks) => {
    const h = household();
    return personStatus(h, retiree(h), legal, CURRENT_YEAR, b).pages;
  };

  it('counts the profile as entered (the switch changes it) and every block as empty at first', () => {
    expect(pages(blocks())).toMatchObject({
      profile: 'done',
      etf: 'empty',
      statutory: 'empty',
      depot: 'empty',
      occupational: 'empty',
    });
  });

  it('keeps the ETF empty while the sum paid in is missing (required field)', () => {
    const b = blocks();
    b.etfPayout = { ...b.etfPayout, holdingValue: 80000 };
    expect(pages(b).etf).toBe('empty');
    b.etfPayout = { ...b.etfPayout, holdingContributions: 50000 };
    expect(pages(b).etf).toBe('done');
  });

  it('marks the actual values of the other blocks as done', () => {
    const b = blocks();
    b.statutory = { ...b.statutory, actualMonthlyGross: 1650 };
    b.occupational = { ...b.occupational, retiredForm: 'annuity', annuityMonthlyGross: 250 };
    b.depot = { ...b.depot, retiredCapitalToday: 30000, retiredEndAge: 90 };
    expect(pages(b)).toMatchObject({ statutory: 'done', occupational: 'done', depot: 'done' });
  });

  it('shows an invalid actual value as with note', () => {
    const b = blocks();
    b.statutory = { ...b.statutory, actualMonthlyGross: 99999 };
    expect(pages(b).statutory).toBe('hint');
  });
});

describe('warning texts of the retiree mode', () => {
  it('have a German text, and the estimate and the depot hint are background notes', () => {
    for (const code of ['first_full_year_estimated', 'depot_before_first_contribution_year']) {
      expect(warningText(code).length).toBeGreaterThan(40);
      expect(warningWeight(code)).toBe('info');
    }
  });
});
