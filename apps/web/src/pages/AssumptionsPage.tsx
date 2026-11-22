import { AssumptionsPanel } from '../components/AssumptionsPanel';
import { PageShell } from '../components/PageShell';
import { de } from '../i18n/de';

export function AssumptionsPage() {
  const t = de.assumptions;
  return (
    <PageShell title={t.title} subtitle={t.subtitle} badge={false}>
      <AssumptionsPanel />
      <section className="card" aria-labelledby="glossary">
        <h2 id="glossary">{de.glossary.title}</h2>
        <p>{de.glossary.intro}</p>
        <dl>
          {Object.entries(de.glossary.terms).map(([term, text]) => (
            <div key={term}>
              <dt>
                <b>{term}</b>
              </dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="card">
        <h2>{t.rulesTitle}</h2>
        <ul>
          {t.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>{t.pensionRulesTitle}</h2>
        <ul>
          {t.pensionRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>{t.depotRulesTitle}</h2>
        <ul>
          {t.depotRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>{t.occupationalRulesTitle}</h2>
        <ul>
          {t.occupationalRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>{t.withdrawalRulesTitle}</h2>
        <ul>
          {t.withdrawalRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>{t.goalRulesTitle}</h2>
        <ul>
          {t.goalRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
