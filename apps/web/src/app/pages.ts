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

/** Sidebar order; a group renders as a labelled sub-list (same grouping as the phone sheet "Eingaben"). */
export const NAV: NavEntry[] = [
  'overview',
  'household',
  {
    group: 'inputs',
    items: [
      'profile',
      { group: 'blocks', items: ['etf', 'statutory', 'depot', 'occupational', 'other'] },
    ],
  },
  { group: 'saving', items: ['goals'] },
  'assumptions',
  'data',
];

/** Pages with an input status (the "Eingaben" pages). */
export const INPUT_PAGES: Page[] = [
  'profile',
  'etf',
  'statutory',
  'depot',
  'occupational',
  'other',
  'goals',
];

/** Colour group of a building-block page (sidebar dot, see docs/design.md). */
export const BLOCK_OF: Partial<Record<Page, 'etf' | 'stat' | 'dep' | 'bav' | 'oth'>> = {
  etf: 'etf',
  statutory: 'stat',
  depot: 'dep',
  occupational: 'bav',
  other: 'oth',
};
