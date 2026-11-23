import type { GlobalAssumptions } from '@valiva/core';
import { PageShell } from '../../components/layout/PageShell';
import { de } from '../../i18n/de';
import { CalculationRules, Glossary } from './CalculationRules';
import { LegalValues } from './LegalValues';
import { YourAssumptions } from './YourAssumptions';

export function AssumptionsPage({
  assumptions,
  goToProfile,
}: {
  assumptions: GlobalAssumptions;
  goToProfile: () => void;
}) {
  const t = de.assumptions;
  return (
    <PageShell title={t.title} subtitle={t.subtitle} badge={false}>
      <YourAssumptions assumptions={assumptions} goToProfile={goToProfile} />
      <LegalValues />
      <CalculationRules />
      <Glossary />
    </PageShell>
  );
}
