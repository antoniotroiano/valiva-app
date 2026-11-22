import type { ReactNode } from 'react';
import { warningText, warningWeight } from '../../lib/warningText';
import { withTerms } from '../../components/cards/Terms';
import { Disclosure } from '../../components/cards/Disclosure';
import { Icon } from '../../components/layout/Icon';
import { de } from '../../i18n/de';

/** Splits core warning codes by weight: important ones go above the page, the rest is collapsed. */
export function splitWarnings(codes: string[]): { important: string[]; info: string[] } {
  const unique = [...new Set(codes)];
  return {
    important: unique.filter((c) => warningWeight(c) === 'important'),
    info: unique.filter((c) => warningWeight(c) === 'info'),
  };
}

/** A notice above the page head (important notes, invalid input). `bad` is an alert. */
export function TopNotice({
  kind,
  title,
  children,
}: {
  kind: 'warn' | 'bad';
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`notice ${kind}`} role={kind === 'bad' ? 'alert' : undefined}>
      <Icon name={kind === 'bad' ? 'error' : 'warn'} />
      <div>
        {title && <b>{title}</b>}
        {children}
      </div>
    </div>
  );
}

export function ImportantNotes({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null;
  return (
    <TopNotice kind="warn" title={de.overview.retirement.sections.important(codes.length)}>
      <ul className="note-list">
        {codes.map((c) => (
          <li key={c}>{withTerms(warningText(c))}</li>
        ))}
      </ul>
    </TopNotice>
  );
}

/** Background notes, collapsed, with their count. `extra` are fixed page-specific texts. */
export function InfoNotes({ codes, extra = [] }: { codes: string[]; extra?: string[] }) {
  const s = de.overview.retirement.sections;
  const texts = [...extra, ...codes.map((c) => warningText(c))];
  if (texts.length === 0) return null;
  return (
    <Disclosure title={s.notes(texts.length)} meta={s.notesMeta}>
      <ul className="warnings">
        {texts.map((t) => (
          <li key={t}>{withTerms(t)}</li>
        ))}
      </ul>
    </Disclosure>
  );
}
