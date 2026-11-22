import { PageShell } from '../../components/layout/PageShell';
import { usePageHead } from '../../components/layout/PageHead';
import { WelcomeCard } from '../../components/cards/WelcomeCard';
import { Icon } from '../../components/layout/Icon';
import { RetirementAlerts, RetirementOverview } from './RetirementOverview';
import type { BudgetInfo } from './RetirementGap';
import type { OverviewApi } from '../../state/useOverview';
import { de } from '../../i18n/de';

export function OverviewPage({
  retirement,
  goTo,
  budget,
  wish,
  setWish,
  newStart,
}: {
  retirement: OverviewApi;
  budget: BudgetInfo;
  goTo: (
    page:
      'profile' | 'etf' | 'statutory' | 'depot' | 'occupational' | 'assumptions' | 'data' | 'goals',
  ) => void;
  wish: number | undefined;
  setWish: (value: number | undefined) => void;
  /** First visit, nothing entered yet: shows the welcome card and marks the values as examples. */
  newStart: boolean;
}) {
  const t = de.overview;
  const { person } = usePageHead();
  return (
    <PageShell
      title={t.title}
      subtitle={person ? t.subtitlePerson(person) : t.subtitle}
      personInTitle={false}
      above={<RetirementAlerts api={retirement} goTo={goTo} />}
      tools={
        <button type="button" className="btn quiet no-print" onClick={() => window.print()}>
          {t.retirement.print}
        </button>
      }
    >
      {newStart && (
        <>
          <WelcomeCard goToProfile={() => goTo('profile')} goToBlocks={() => goTo('etf')} />
          <p className="notice info">
            <span className="badge">{t.sampleBadge}</span> {t.sampleNote}
          </p>
        </>
      )}
      <RetirementOverview
        api={retirement}
        goTo={goTo}
        budget={budget}
        wish={wish}
        setWish={setWish}
      />
      <a className="linkcard" href="#goals">
        <Icon name="goals" size="lg" />
        <span>
          <b>{t.goalsLink.title}</b>
          <small>{t.goalsLink.text}</small>
        </span>
        <Icon name="go" />
      </a>
    </PageShell>
  );
}
