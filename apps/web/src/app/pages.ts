export type Page =
  | 'overview'
  | 'household'
  | 'profile'
  | 'etf'
  | 'statutory'
  | 'depot'
  | 'occupational'
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
  'goals',
  'assumptions',
  'data',
];
/** Sidebar order; a group renders as a labelled sub-list. */
export const NAV: (Page | { group: 'blocks'; items: Page[] })[] = [
  'overview',
  'household',
  'profile',
  { group: 'blocks', items: ['etf', 'statutory', 'depot', 'occupational'] },
  'goals',
  'assumptions',
  'data',
];
