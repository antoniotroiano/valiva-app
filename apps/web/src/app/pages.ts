export type Page =
  | 'overview'
  | 'household'
  | 'profile'
  | 'etf'
  | 'statutory'
  | 'depot'
  | 'occupational'
  | 'other'
  | 'goals'
  | 'assumptions'
  | 'data';

export const PAGES: Page[] = [
  'overview',
  'household',
  'profile',
  'etf',
  'statutory',
  'depot',
  'occupational',
  'other',
  'goals',
  'assumptions',
  'data',
];
export type NavEntry = Page | { group: 'inputs' | 'blocks' | 'saving'; items: NavEntry[] };

/** Pages of the colour-coded building blocks (sidebar group "Einkommensquellen", phone sheet "Eingaben"). */
export const BLOCK_PAGES: Page[] = ['etf', 'statutory', 'depot', 'occupational', 'other'];
export const SAVING_PAGES: Page[] = ['goals'];
/** Pages under "Mehr" on the phone. */
export const MORE_PAGES: Page[] = ['assumptions', 'data'];

/** Pages with an input status (the "Eingaben" pages); the phone sheet "Eingaben" lists exactly these. */
export const INPUT_PAGES: Page[] = ['profile', ...BLOCK_PAGES, ...SAVING_PAGES];

/**
 * Sidebar order; a group renders as a labelled sub-list. This file is the single place that lists the pages:
 * the phone navigation (`MobileNav`) derives its sheets from the arrays above. A new page goes into `Page`,
 * `PAGES` and one of these arrays.
 */
export const NAV: NavEntry[] = [
  'overview',
  'household',
  { group: 'inputs', items: ['profile', { group: 'blocks', items: BLOCK_PAGES }] },
  { group: 'saving', items: SAVING_PAGES },
  'assumptions',
  'data',
];

/** Colour group of a building-block page (sidebar dot, see docs/design.md). */
export const BLOCK_OF: Partial<Record<Page, 'etf' | 'stat' | 'dep' | 'bav' | 'oth'>> = {
  etf: 'etf',
  statutory: 'stat',
  depot: 'dep',
  occupational: 'bav',
  other: 'oth',
};
