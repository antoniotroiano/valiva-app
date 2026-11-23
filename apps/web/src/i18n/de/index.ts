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
import { glossary } from './glossary';
import { assumptions } from './assumptions';
import { issues } from './issues';
import { blocks } from './blocks';
import { guidance } from './guidance';

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
  glossary,
  assumptions,
  issues,
  blocks,
  guidance,
} as const;

export function issueMessage(issue: ValidationIssue): string {
  if (issue.code === 'out_of_range') return de.issues.out_of_range(issue.min, issue.max);
  if (issue.code === 'before_first_contribution_year') {
    return de.issues.before_first_contribution_year(issue.min);
  }
  if (issue.code === 'before_current_year') return de.issues.before_current_year(issue.min);
  if (issue.code === 'retirement_in_past') return de.issues.retirement_in_past(issue.min);
  if (issue.code === 'before_statement_year') return de.issues.before_statement_year(issue.min);
  return de.issues[issue.code];
}
