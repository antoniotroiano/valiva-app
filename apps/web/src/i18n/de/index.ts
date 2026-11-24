import type { ValidationIssue } from '@valiva/core';
import { common } from './common';
import { nav } from './nav';
import { household } from './household';
import { notices } from './notices';
import { data } from './data';
import { householdView } from './householdView';
import { overview } from './overview';
import { goals } from './goals';
import { withdrawal } from './withdrawal';
import { etf } from './etf';
import { profile } from './profile';
import { statutory } from './statutory';
import { depot } from './depot';
import { occupational } from './occupational';
import { otherIncome } from './otherIncome';
import { glossary } from './glossary';
import { assumptions } from './assumptions';
import { issues } from './issues';
import { blocks } from './blocks';
import { guidance } from './guidance';
import { retired } from './retired';

export const de = {
  ...common,
  nav,
  household,
  notices,
  data,
  householdView,
  overview,
  goals,
  withdrawal,
  etf,
  profile,
  statutory,
  depot,
  occupational,
  otherIncome,
  glossary,
  assumptions,
  issues,
  blocks,
  guidance,
  retired,
} as const;

export function issueMessage(issue: ValidationIssue): string {
  if (issue.code === 'out_of_range') return de.issues.out_of_range(issue.min, issue.max);
  if (issue.code === 'before_first_contribution_year') {
    return de.issues.before_first_contribution_year(issue.min);
  }
  if (issue.code === 'before_current_year') return de.issues.before_current_year(issue.min);
  if (issue.code === 'retirement_in_past') return de.issues.retirement_in_past(issue.min);
  if (issue.code === 'retired_start_in_future') return de.issues.retired_start_in_future(issue.max);
  if (issue.code === 'end_not_after_today') return de.issues.end_not_after_today(issue.min);
  if (issue.code === 'before_statement_year') return de.issues.before_statement_year(issue.min);
  if (issue.code === 'end_not_after_start') return de.issues.end_not_after_start(issue.min);
  if (issue.code === 'too_many_entries') return de.issues.too_many_entries(issue.max);
  return de.issues[issue.code];
}
