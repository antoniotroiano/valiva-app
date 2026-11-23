import type { GlobalAssumptions } from '@valiva/core';
import { de } from '../../i18n/de';
import { formatNumber } from '../../lib/format';

/** The household's own assumptions, read only. They are edited in the profile. */
export function YourAssumptions({
  assumptions,
  goToProfile,
}: {
  assumptions: GlobalAssumptions;
  goToProfile: () => void;
}) {
  const t = de.assumptions.yours;
  const f = de.profile.fields;
  const pct = (v: number) => `${formatNumber(v)} %`;
  const s = assumptions.returnScenarios;
  const figures: { label: string; value: string }[] = [
    { label: f.inflationPercent.label, value: pct(assumptions.inflationPercent) },
    {
      label: t.scenariosLabel,
      value: t.scenarios(
        formatNumber(s.pessimistic),
        formatNumber(s.neutral),
        formatNumber(s.optimistic),
      ),
    },
    { label: f.pensionAdjustmentPercent.label, value: pct(assumptions.pensionAdjustmentPercent) },
    { label: f.payoutPhaseReturnPercent.label, value: pct(assumptions.payoutPhaseReturnPercent) },
  ];
  return (
    <section className="asm-section" aria-labelledby="your-assumptions">
      <h2 id="your-assumptions">{t.title}</h2>
      <div className="card">
        <dl className="figs">
          {figures.map((x) => (
            <div className="fig" key={x.label}>
              <dt>{x.label}</dt>
              <dd>{x.value}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">
          {t.note}{' '}
          <button type="button" className="link" onClick={goToProfile}>
            {t.change}
          </button>
        </p>
      </div>
    </section>
  );
}
