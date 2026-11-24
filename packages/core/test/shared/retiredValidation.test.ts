import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  isRetired,
  parseBlock,
  payoutStartAgeOf,
  pensionStartYearOf,
  validateDepotRetired,
  validateEtfHolding,
  validateHousehold,
  validateOccupationalRetired,
  validateProfile,
  validateRetirementTiming,
  validateStatutoryActual,
  RETIREMENT_NOTICE_LEAD_MONTHS,
  splitAssumptions,
} from '../../src';
import type { Household, Person } from '../../src';
import { ASSUMPTIONS, LEGAL, PROFILE, RET_CTX, RET_PROFILE, retCtx } from '../pensionFixtures';

const YEAR = 2026;
const codes = (issues: { field: string; code: string }[]) =>
  issues.map((i) => `${i.field}:${i.code}`);

describe('profile of a retired person', () => {
  it('is valid with a start year in the allowed band', () => {
    expect(validateProfile(RET_PROFILE, YEAR)).toEqual([]);
    expect(validateRetirementTiming(RET_PROFILE, YEAR)).toEqual([]);
  });

  it('needs the start year when `retired` is set', () => {
    const p = { ...RET_PROFILE, retirementStartYear: undefined };
    expect(codes(validateProfile(p, YEAR))).toContain('retirementStartYear:required');
  });

  it('keeps the start year within birthYear + 50 and + 75', () => {
    for (const year of [1954, 1955 + 49, 1955 + 76, 2040]) {
      const issues = validateProfile({ ...RET_PROFILE, retirementStartYear: year }, YEAR);
      expect(codes(issues)).toContain('retirementStartYear:out_of_range');
    }
    for (const year of [1955 + 50, 1955 + 75]) {
      expect(validateProfile({ ...RET_PROFILE, retirementStartYear: year }, YEAR)).toEqual([]);
    }
    expect(codes(validateProfile({ ...RET_PROFILE, retirementStartYear: 2019.5 }, YEAR))).toContain(
      'retirementStartYear:not_integer',
    );
    expect(
      codes(validateProfile({ ...RET_PROFILE, retirementStartYear: Number.NaN }, YEAR)),
    ).toContain('retirementStartYear:not_finite');
  });

  it('rejects a `retired` that is not a boolean', () => {
    const p = { ...RET_PROFILE, retired: 'yes' as unknown as boolean };
    expect(codes(validateProfile(p, YEAR))).toContain('retired:required');
    expect(isRetired(p)).toBe(false);
  });

  it('ignores the retirement age (it is kept, not used) but not the life expectancy', () => {
    // target age 75 would need a life expectancy of 76; the start age (64) is what counts
    const p = { ...RET_PROFILE, targetRetirementAge: 75, lifeExpectancyAge: 70 };
    expect(validateProfile(p, YEAR)).toEqual([]);
    const tooLow = { ...RET_PROFILE, lifeExpectancyAge: 64 };
    expect(codes(validateProfile(tooLow, YEAR))).toContain('lifeExpectancyAge:out_of_range');
  });

  it('does not use the start year of a person in the planning mode', () => {
    const p = { ...PROFILE, retirementStartYear: 1900 };
    expect(validateProfile(p, YEAR)).toEqual([]);
    expect(isRetired(p)).toBe(false);
  });
});

describe('validateRetirementTiming with the retiree mode', () => {
  it('reports no retirement_in_past for a person in the retiree mode', () => {
    const issues = validateRetirementTiming(
      { ...RET_PROFILE, birthYear: 1950, retirementStartYear: 2010 },
      YEAR,
    );
    expect(issues).toEqual([]);
  });

  it('reports a start after the current year as a specialist error, not as a profile error', () => {
    const p = { ...RET_PROFILE, birthYear: 1962, retirementStartYear: 2029 };
    expect(validateProfile(p, YEAR)).toEqual([]);
    expect(validateRetirementTiming(p, YEAR)).toEqual([
      { field: 'retirementStartYear', code: 'retired_start_in_future', max: YEAR },
    ]);
  });

  it('accepts a start in the current year', () => {
    const p = { ...RET_PROFILE, birthYear: 1959, retirementStartYear: YEAR };
    expect(validateRetirementTiming(p, YEAR)).toEqual([]);
  });

  it('reports a life expectancy in the past in both modes', () => {
    const retired = {
      ...RET_PROFILE,
      birthYear: 1930,
      retirementStartYear: 1990,
      lifeExpectancyAge: 90,
    };
    expect(validateRetirementTiming(retired, YEAR)).toEqual([
      { field: 'lifeExpectancyAge', code: 'life_expectancy_in_past', min: YEAR - 1930 },
    ]);
    // planning mode, start still ahead, life expectancy already past (an inconsistent profile)
    const planning = {
      ...PROFILE,
      birthYear: 1960,
      targetRetirementAge: 67,
      lifeExpectancyAge: 60,
    };
    expect(validateRetirementTiming(planning, YEAR)).toEqual([
      { field: 'lifeExpectancyAge', code: 'life_expectancy_in_past', min: YEAR - 1960 },
    ]);
    expect(validateRetirementTiming({ ...retired, lifeExpectancyAge: YEAR - 1930 }, YEAR)).toEqual(
      [],
    );
  });

  it('keeps the old single issue for a planning-mode start in the past', () => {
    const p = { ...PROFILE, birthYear: 1900, targetRetirementAge: 60, lifeExpectancyAge: 90 };
    expect(validateRetirementTiming(p, YEAR)).toEqual([
      { field: 'targetRetirementAge', code: 'retirement_in_past', min: YEAR - 1900 },
    ]);
  });

  it('property: a retired person with a valid start and a future life expectancy never gets an issue', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1920, max: 1976 }),
        fc.integer({ min: 50, max: 75 }),
        (birthYear, startAge) => {
          const retirementStartYear = birthYear + startAge;
          fc.pre(retirementStartYear <= YEAR);
          const p = { ...RET_PROFILE, birthYear, retirementStartYear, lifeExpectancyAge: 120 };
          expect(validateProfile(p, YEAR)).toEqual([]);
          expect(validateRetirementTiming(p, YEAR)).toEqual([]);
        },
      ),
    );
  });
});

describe('helpers', () => {
  it('payout starts today for a retired person and at the target age otherwise', () => {
    expect(payoutStartAgeOf(RET_PROFILE, YEAR)).toBe(71);
    expect(payoutStartAgeOf(PROFILE, YEAR)).toBe(67);
    expect(pensionStartYearOf(RET_PROFILE)).toBe(2019);
    expect(pensionStartYearOf(PROFILE)).toBe(1985 + 67);
  });

  it('names the notice lead time as a constant', () => {
    expect(RETIREMENT_NOTICE_LEAD_MONTHS).toBe(12);
  });
});

describe('household validation with the retiree fields', () => {
  const split = splitAssumptions(ASSUMPTIONS);
  const person = (over: Partial<Person> = {}): Person => ({
    id: 'p1',
    name: 'Marta',
    birthYear: 1955,
    targetRetirementAge: 67,
    lifeExpectancyAge: 90,
    childrenBirthYears: [],
    personalAssumptions: split.personal,
    retired: true,
    retirementStartYear: 2019,
    ...over,
  });
  const household = (p: Person): Household => ({
    id: 'h',
    assumptions: split.household,
    persons: [p],
  });

  it('is valid and prefixes issues with the person', () => {
    expect(validateHousehold(household(person()), YEAR)).toEqual([]);
    const bad = validateHousehold(household(person({ retirementStartYear: 2040 })), YEAR);
    expect(codes(bad)).toEqual(['persons.p1.retirementStartYear:out_of_range']);
  });
});

describe('validators of the four blocks', () => {
  it('statutory: amount required and within 0 to 20,000, annual amount within 0 to 240,000', () => {
    expect(codes(validateStatutoryActual({}, RET_CTX))).toEqual(['actualMonthlyGross:required']);
    expect(validateStatutoryActual({ actualMonthlyGross: 0 }, RET_CTX)).toEqual([]);
    expect(
      validateStatutoryActual({ actualMonthlyGross: 20000, firstFullYearAnnual: 240000 }, RET_CTX),
    ).toEqual([]);
    expect(codes(validateStatutoryActual({ actualMonthlyGross: 20001 }, RET_CTX))).toEqual([
      'actualMonthlyGross:out_of_range',
    ]);
    expect(codes(validateStatutoryActual({ actualMonthlyGross: -1 }, RET_CTX))).toEqual([
      'actualMonthlyGross:out_of_range',
    ]);
    expect(codes(validateStatutoryActual({ actualMonthlyGross: Number.NaN }, RET_CTX))).toEqual([
      'actualMonthlyGross:not_finite',
    ]);
    expect(
      codes(
        validateStatutoryActual({ actualMonthlyGross: 1000, firstFullYearAnnual: 240001 }, RET_CTX),
      ),
    ).toEqual(['firstFullYearAnnual:out_of_range']);
  });

  it('statutory: needs a retired person, a start year not in the future and the legal values', () => {
    expect(
      codes(validateStatutoryActual({ actualMonthlyGross: 1 }, { ...RET_CTX, profile: PROFILE })),
    ).toEqual(['retirementStartYear:required']);
    expect(
      codes(
        validateStatutoryActual(
          { actualMonthlyGross: 1 },
          retCtx({ retirementStartYear: 2027, birthYear: 1962 }),
        ),
      ),
    ).toEqual(['retirementStartYear:retired_start_in_future']);
    expect(
      codes(validateStatutoryActual({ actualMonthlyGross: 1 }, { ...RET_CTX, legal: LEGAL })),
    ).toEqual(['legal:legal_values_missing']);
  });

  it('occupational annuity: amount, adjustment range, end age after today', () => {
    expect(codes(validateOccupationalRetired({ retiredForm: 'annuity' }, RET_CTX))).toEqual([
      'annuityMonthlyGross:required',
    ]);
    const ok = { retiredForm: 'annuity' as const, annuityMonthlyGross: 250 };
    expect(validateOccupationalRetired(ok, RET_CTX)).toEqual([]);
    expect(validateOccupationalRetired({ ...ok, annuityEndAge: 'lifelong' }, RET_CTX)).toEqual([]);
    expect(validateOccupationalRetired({ ...ok, annuityEndAge: 120 }, RET_CTX)).toEqual([]);
    expect(
      validateOccupationalRetired({ ...ok, annuityAdjustment: { mode: 'pension' } }, RET_CTX),
    ).toEqual([]);
    expect(codes(validateOccupationalRetired({ ...ok, annuityEndAge: 71 }, RET_CTX))).toEqual([
      'annuityEndAge:end_not_after_today',
    ]);
    expect(codes(validateOccupationalRetired({ ...ok, annuityEndAge: 121 }, RET_CTX))).toEqual([
      'annuityEndAge:out_of_range',
    ]);
    expect(codes(validateOccupationalRetired({ ...ok, annuityEndAge: 80.5 }, RET_CTX))).toEqual([
      'annuityEndAge:not_integer',
    ]);
    expect(
      codes(
        validateOccupationalRetired(
          { ...ok, annuityAdjustment: { mode: 'fixed', percent: 101 } },
          RET_CTX,
        ),
      ),
    ).toEqual(['annuityAdjustment.percent:out_of_range']);
    expect(
      validateOccupationalRetired(
        { ...ok, annuityAdjustment: { mode: 'fixed', percent: -50 } },
        RET_CTX,
      ),
    ).toEqual([]);
  });

  it('occupational capital: amount and end age', () => {
    expect(codes(validateOccupationalRetired({ retiredForm: 'capital' }, RET_CTX))).toEqual([
      'capitalToday:required',
      'capitalEndAge:required',
    ]);
    expect(
      validateOccupationalRetired(
        { retiredForm: 'capital', capitalToday: 20000, capitalEndAge: 85 },
        RET_CTX,
      ),
    ).toEqual([]);
    expect(
      codes(
        validateOccupationalRetired(
          { retiredForm: 'capital', capitalToday: 5_000_001, capitalEndAge: 71 },
          RET_CTX,
        ),
      ),
    ).toEqual(['capitalToday:out_of_range', 'capitalEndAge:end_not_after_today']);
  });

  it('depot: capital required, end age after today and at least the legal minimum', () => {
    expect(codes(validateDepotRetired({}, RET_CTX))).toEqual([
      'retiredCapitalToday:required',
      'retiredEndAge:required',
    ]);
    expect(
      validateDepotRetired({ retiredCapitalToday: 10000, retiredEndAge: 85 }, RET_CTX),
    ).toEqual([]);
    expect(
      codes(validateDepotRetired({ retiredCapitalToday: 0, retiredEndAge: 84 }, RET_CTX)),
    ).toEqual(['retiredEndAge:out_of_range']);
    expect(
      codes(validateDepotRetired({ retiredCapitalToday: 0, retiredEndAge: 71 }, RET_CTX)),
    ).toEqual(['retiredEndAge:end_not_after_today']);
  });

  it('etf holding: both amounts required, end age after today, tax and withdrawal checked', () => {
    const tax = { capitalGainsTaxRate: 26.375, partialExemptionRate: 30, taxFreeAllowance: 1000 };
    expect(codes(validateEtfHolding({ payoutEndAge: 90, tax }, RET_CTX))).toEqual([
      'holdingValue:required',
      'holdingContributions:required',
    ]);
    expect(
      validateEtfHolding(
        { holdingValue: 80000, holdingContributions: 50000, payoutEndAge: 90, tax },
        RET_CTX,
      ),
    ).toEqual([]);
    // a loss depot: more paid in than worth today is allowed
    expect(
      validateEtfHolding(
        { holdingValue: 1000, holdingContributions: 50000, payoutEndAge: 90, tax },
        RET_CTX,
      ),
    ).toEqual([]);
    expect(
      codes(
        validateEtfHolding(
          { holdingValue: 1, holdingContributions: 1, payoutEndAge: 71, tax },
          RET_CTX,
        ),
      ),
    ).toEqual(['payoutEndAge:end_not_after_today']);
    expect(
      codes(
        validateEtfHolding(
          {
            holdingValue: 1,
            holdingContributions: 1,
            payoutEndAge: 90,
            tax,
            withdrawal: { strategy: 'percent', percent: 0 },
          },
          RET_CTX,
        ),
      ),
    ).toEqual(['withdrawal.percent:not_positive']);
  });
});

describe('block parsing with the retiree fields', () => {
  const parse = <B extends 'statutory' | 'occupational' | 'depot' | 'etfPayout'>(
    block: B,
    raw: unknown,
  ) => parseBlock(block, raw, YEAR);

  it('keeps valid fields and leaves old data without them unchanged', () => {
    const old = { schemaVersion: 1, projectedMonthlyPensionToday: 1800, statementYear: 2026 };
    const r = parse('statutory', old);
    expect(r.ok && r.problems).toEqual([]);
    expect(r.ok && r.value).toEqual({
      ...old,
      retirementAge: undefined,
      regularRetirementAge: undefined,
      projectedMonthlyPensionAtRetirementAgeToday: undefined,
    });
    expect(r.ok && 'actualMonthlyGross' in r.value).toBe(false);
    const withNew = parse('statutory', {
      ...old,
      mode: 'actual',
      actualMonthlyGross: 1650,
      firstFullYearAnnual: 17073.48,
    });
    expect(withNew.ok && withNew.problems).toEqual([]);
    expect(withNew.ok && withNew.value).toMatchObject({
      mode: 'actual',
      actualMonthlyGross: 1650,
      firstFullYearAnnual: 17073.48,
    });
  });

  it('records out-of-range, wrong-type and non-finite values as problems', () => {
    const base = { schemaVersion: 1, projectedMonthlyPensionToday: 0, statementYear: 2026 };
    const bad: Record<string, unknown> = {
      actualMonthlyGross: 20001,
      firstFullYearAnnual: '1000',
      mode: 'both',
    };
    for (const [key, value] of Object.entries(bad)) {
      const r = parse('statutory', { ...base, [key]: value });
      expect(r.ok && r.problems).toEqual([key]);
    }
    for (const value of [null, Number.NaN, Number.POSITIVE_INFINITY, -5, '10']) {
      const r = parse('statutory', { ...base, actualMonthlyGross: value });
      if (value === null) expect(r.ok && r.problems).toEqual([]);
      else expect(r.ok && r.problems).toEqual(['actualMonthlyGross']);
    }
  });

  it('occupational: enumerations, nested adjustment, end age', () => {
    const base = { schemaVersion: 1, startMonth: '2027-01' };
    const ok = parse('occupational', {
      ...base,
      retiredForm: 'annuity',
      annuityMonthlyGross: 250,
      annuityAdjustment: { mode: 'fixed', percent: 1.5, injected: 1 },
      annuityEndAge: 'lifelong',
      capitalToday: 1,
      capitalEndAge: 85,
    });
    expect(ok.ok && ok.problems).toEqual([]);
    expect(ok.ok && ok.value.annuityAdjustment).toEqual({ mode: 'fixed', percent: 1.5 });
    expect(ok.ok && ok.value.annuityEndAge).toBe('lifelong');
    const pension = parse('occupational', {
      ...base,
      annuityAdjustment: { mode: 'pension', percent: 9 },
    });
    expect(pension.ok && pension.value.annuityAdjustment).toEqual({ mode: 'pension' });
    const problems = (raw: Record<string, unknown>) => {
      const r = parse('occupational', { ...base, ...raw });
      return r.ok ? r.problems : ['not ok'];
    };
    expect(problems({ retiredForm: 'other' })).toEqual(['retiredForm']);
    expect(problems({ annuityAdjustment: 'fixed' })).toEqual(['annuityAdjustment']);
    expect(problems({ annuityAdjustment: { mode: 'x' } })).toEqual(['annuityAdjustment.mode']);
    expect(problems({ annuityAdjustment: { mode: 'fixed', percent: 101 } })).toEqual([
      'annuityAdjustment.percent',
    ]);
    expect(problems({ annuityAdjustment: { mode: 'fixed' } })).toEqual([
      'annuityAdjustment.percent',
    ]);
    expect(problems({ annuityEndAge: 'for life' })).toEqual(['annuityEndAge']);
    expect(problems({ annuityEndAge: 80.5 })).toEqual(['annuityEndAge']);
    expect(problems({ annuityEndAge: 121 })).toEqual(['annuityEndAge']);
    expect(problems({ capitalToday: 5_000_001 })).toEqual(['capitalToday']);
    expect(problems({ capitalEndAge: Number.NaN })).toEqual(['capitalEndAge']);
  });

  it('depot and ETF fields', () => {
    const depot = { schemaVersion: 1, startMonth: '2027-01', payoutEndAge: 85 };
    const d = parse('depot', { ...depot, retiredCapitalToday: 10000, retiredEndAge: 90 });
    expect(d.ok && d.problems).toEqual([]);
    expect(d.ok && d.value).toMatchObject({ retiredCapitalToday: 10000, retiredEndAge: 90 });
    const bad = parse('depot', { ...depot, retiredCapitalToday: -1, retiredEndAge: 90.5 });
    expect(bad.ok && bad.problems).toEqual(['retiredCapitalToday', 'retiredEndAge']);
    const e = parse('etfPayout', {
      schemaVersion: 1,
      useGlobalAssumptions: true,
      holdingValue: 80000,
      holdingContributions: 50000,
    });
    expect(e.ok && e.problems).toEqual([]);
    expect(e.ok && e.value).toMatchObject({ holdingValue: 80000, holdingContributions: 50000 });
    const e2 = parse('etfPayout', {
      schemaVersion: 1,
      useGlobalAssumptions: true,
      holdingValue: 5e7 + 1,
      holdingContributions: '5',
    });
    expect(e2.ok && e2.problems).toEqual(['holdingValue', 'holdingContributions']);
  });

  it('drops unknown fields and survives prototype keys without polluting', () => {
    const raw = JSON.parse(
      '{"schemaVersion":1,"projectedMonthlyPensionToday":0,"statementYear":2026,"actualMonthlyGross":5,"__proto__":{"polluted":true},"constructor":{"x":1},"extra":1}',
    ) as unknown;
    const r = parse('statutory', raw);
    expect(r.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(r.ok && Object.keys(r.value)).not.toContain('extra');
    expect(r.ok && Object.keys(r.value)).not.toContain('constructor');
    expect(r.ok && Object.prototype.hasOwnProperty.call(r.value, '__proto__')).toBe(false);
  });

  it('property: any untrusted value for the new fields never throws and never leaks a non-finite number', () => {
    fc.assert(
      fc.property(
        fc.anything(),
        fc.constantFrom('actualMonthlyGross', 'firstFullYearAnnual', 'mode'),
        (value, key) => {
          const r = parse('statutory', {
            schemaVersion: 1,
            projectedMonthlyPensionToday: 0,
            statementYear: 2026,
            [key]: value,
          });
          if (r.ok && key !== 'mode' && key in r.value) {
            const v = (r.value as Record<string, unknown>)[key];
            expect(typeof v === 'number' && Number.isFinite(v)).toBe(true);
          }
        },
      ),
    );
  });
});
