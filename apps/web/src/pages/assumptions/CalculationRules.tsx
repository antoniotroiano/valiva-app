import { Disclosure } from '../../components/cards/Disclosure';
import { de } from '../../i18n/de';

/** Calculation rules, one collapsible row per building block; the wording is unchanged. */
export function CalculationRules() {
  const t = de.assumptions;
  const blocks: { id: string; title: string; rules: readonly string[] }[] = [
    { id: 'etf', title: t.etfRulesTitle, rules: t.rules },
    { id: 'statutory', title: t.pensionRulesTitle, rules: t.pensionRules },
    { id: 'depot', title: t.depotRulesTitle, rules: t.depotRules },
    { id: 'occupational', title: t.occupationalRulesTitle, rules: t.occupationalRules },
    { id: 'otherIncome', title: t.otherIncomeRulesTitle, rules: t.otherIncomeRules },
    { id: 'withdrawal', title: t.withdrawalRulesTitle, rules: t.withdrawalRules },
    { id: 'goals', title: t.goalRulesTitle, rules: t.goalRules },
  ];
  return (
    <section className="asm-section" aria-labelledby="calc-rules">
      <h2 id="calc-rules">{t.rulesTitle}</h2>
      <div className="dts">
        {blocks.map((b) => (
          <Disclosure
            key={b.id}
            id={`rules-${b.id}`}
            title={b.title}
            meta={t.ruleCount(b.rules.length)}
          >
            <ul className="rules">
              {b.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Disclosure>
        ))}
      </div>
    </section>
  );
}

/** Technical terms explained, as one collapsed row. */
export function Glossary() {
  const g = de.glossary;
  const terms = Object.entries(g.terms);
  return (
    <section className="asm-section" aria-labelledby="glossary">
      <h2 id="glossary">{g.title}</h2>
      <div className="dts">
        <Disclosure id="glossary-terms" title={g.rowTitle} meta={g.termCount(terms.length)}>
          <p>{g.intro}</p>
          <dl>
            {terms.map(([term, text]) => (
              <div key={term}>
                <dt>
                  <b>{term}</b>
                </dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </Disclosure>
      </div>
    </section>
  );
}
