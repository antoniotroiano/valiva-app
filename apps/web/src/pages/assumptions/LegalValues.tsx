import { resolveTaxAssumptions } from '@valiva/core';
import type { LegalValue } from '@valiva/core';
import { Disclosure } from '../../components/cards/Disclosure';
import { StatusChip } from '../../components/cards/StatusChip';
import { de } from '../../i18n/de';
import { formatDate, formatNumber, todayLocal } from '../../lib/format';
import { currentLegal } from '../../lib/legalConfig';
import {
  groupItems,
  legalGroups,
  unverifiedItems,
  type LegalGroup,
  type LegalItem,
} from '../../lib/legalGroups';
import { splitSourceText } from '../../lib/sourceText';
import { taxConfig } from '../../lib/taxConfig';

function formatValue(v: LegalValue): string {
  // A rule assumption has no amount: the value 1 only means "the rule is applied".
  if (v.unit === 'rule') return de.assumptions.legal.ruleApplies;
  const units = de.assumptions.units as Record<string, string>;
  const unit = units[v.unit] ?? v.unit;
  // Years such as 2026 or 1964 are not grouped like amounts.
  const num = v.unit === 'year' ? String(v.value) : formatNumber(v.value);
  return unit ? `${num} ${unit}` : num;
}

/** Status of a group, always shown in its collapsed row: the number of unverified values or "all confirmed". */
export function GroupStatus({ unverified }: { unverified: number }) {
  const t = de.assumptions.legal;
  return unverified > 0 ? (
    <StatusChip kind="warn" size="sm">
      {t.unverifiedCount(unverified)}
    </StatusChip>
  ) : (
    <StatusChip kind="ok" size="sm">
      {t.allConfirmed}
    </StatusChip>
  );
}

export function LegalValueRow({ item }: { item: LegalItem }) {
  const t = de.assumptions.legal;
  const { value: v } = item;
  const unverified = v.status === 'unverified';
  const source = splitSourceText(v.sourceDe);
  const from = formatDate(v.validFrom);
  const validity = v.validTo ? t.validRange(from, formatDate(v.validTo)) : t.validFrom(from);
  return (
    <li className={unverified ? 'val unv' : 'val'}>
      <div className="val-row">
        <span className="val-name">{item.name}</span>
        <span className="val-amount">{formatValue(v)}</span>
        <span className="val-since">{validity}</span>
        {unverified && (
          <StatusChip kind="warn" size="sm">
            {de.assumptions.status.unverified}
          </StatusChip>
        )}
      </div>
      <details className="src">
        <summary aria-label={`${t.source}: ${item.name}`}>{t.source}</summary>
        <p>
          {source.text}
          {source.date && (
            <span className="src-date">
              {' · '}
              {source.kind === 'read' ? t.readOn(source.date) : t.checkedOn(source.date)}
            </span>
          )}
        </p>
      </details>
    </li>
  );
}

export function LegalGroupBody({ group }: { group: LegalGroup }) {
  return (
    <>
      {group.parts.map((part) => (
        <div key={part.heading ?? 'main'}>
          {part.heading && <h3 className="part-heading">{part.heading}</h3>}
          <ul className="vals">
            {part.items.map((item) => (
              <LegalValueRow key={item.key} item={item} />
            ))}
          </ul>
        </div>
      ))}
      {unverifiedItems(group).length > 0 && <p className="hint">{de.assumptions.unverifiedNote}</p>}
    </>
  );
}

/** Legal values by area, all collapsed; the unverified count stays visible in each collapsed row. */
export function LegalValues() {
  const a = de.assumptions;
  const groups = legalGroups();
  const total = groups.reduce((n, g) => n + groupItems(g).length, 0);
  const unverified = groups.reduce((n, g) => n + unverifiedItems(g).length, 0);
  const taxResolved = resolveTaxAssumptions(taxConfig, todayLocal());
  const legalResolved = currentLegal();
  return (
    <section className="asm-section" aria-labelledby="legal-values">
      <h2 id="legal-values">{a.legal.title}</h2>
      {!taxResolved.ok && <p className="error">{a.configError}</p>}
      {!legalResolved.ok && <p className="error">{de.profile.configError}</p>}
      <p className="hint legal-summary">
        {a.legal.intro(total)} {unverified > 0 && <GroupStatus unverified={unverified} />}{' '}
        {unverified > 0 && a.unverifiedNote}
      </p>
      <div className="dts">
        {groups.map((group) => {
          const items = groupItems(group);
          return (
            <Disclosure
              key={group.id}
              id={`legal-${group.id}`}
              title={group.title}
              meta={a.legal.valueCount(items.length)}
              badge={<GroupStatus unverified={unverifiedItems(group).length} />}
            >
              <LegalGroupBody group={group} />
            </Disclosure>
          );
        })}
      </div>
    </section>
  );
}
