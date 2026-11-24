import type {
  LegalResolution,
  OtherIncome,
  ProjectionContext,
  ScenarioName,
  ValidationIssue,
} from '@valiva/core';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { BlockPage, BlockSection } from '../../components/layout/BlockPage';
import { de, issueMessage } from '../../i18n/de';
import { CURRENT_YEAR } from '../../state/useProfile';
import type { ProfileApi } from '../../state/useProfile';

/** Projection context of a person in the retiree mode; `undefined` while the profile or the legal values are unusable. */
export function useRetiredContext(
  profile: ProfileApi,
  legal: LegalResolution,
  otherIncome?: Record<ScenarioName, OtherIncome>,
): ProjectionContext | undefined {
  const committed = profile.committed;
  return useMemo(() => {
    if (!legal.ok || !profile.committedValid) return undefined;
    return {
      profile: committed.profile,
      assumptions: committed.assumptions,
      legal: legal.legal,
      currentYear: CURRENT_YEAR,
      otherIncome,
    };
  }, [legal, profile.committedValid, committed, otherIncome]);
}

/** Message of the issue at `field` (exact match), for the field error. */
export const issueAt = (issues: readonly ValidationIssue[], field: string): string | undefined => {
  const i = issues.find((x) => x.field === field);
  return i ? issueMessage(i) : undefined;
};

/**
 * Frame of a block page of a person in the retiree mode: the same template as the planning pages (inputs left,
 * result right, calculation below), with the notice when the profile or the legal values are unusable.
 */
export function RetiredFrame({
  id,
  title,
  subtitle,
  ctx,
  legal,
  goToProfile,
  inputs,
  result,
  calculation,
  above,
}: {
  id: string;
  title: string;
  subtitle: string;
  ctx: ProjectionContext | undefined;
  legal: LegalResolution;
  goToProfile: () => void;
  inputs: ReactNode;
  result: ReactNode;
  calculation?: ReactNode;
  above?: ReactNode;
}) {
  const s = de.retired.shared;
  const unusable = !legal.ok ? (
    <div className="notice">{de.profile.configError}</div>
  ) : ctx === undefined ? (
    <div className="notice" role="status">
      {s.profileInvalid}{' '}
      <button type="button" className="link" onClick={goToProfile}>
        {s.toProfile}
      </button>
    </div>
  ) : undefined;
  return (
    <BlockPage title={title} subtitle={subtitle} above={above}>
      <BlockSection
        id={id}
        inputs={inputs}
        result={unusable ?? result}
        calculation={unusable ? undefined : calculation}
      />
    </BlockPage>
  );
}
