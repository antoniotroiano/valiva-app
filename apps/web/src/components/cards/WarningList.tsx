import { de } from '../../i18n/de';
import { mergeUnverified, warningText, warningWeight } from '../../lib/warningText';
import { Disclosure } from './Disclosure';

/** One note of a building block: a ready text and its weight (`important` stays visible, `info` is collapsed). */
export type Note = { id: string; text: string; weight: 'important' | 'info' };

/** Core warning codes as notes; the weight comes from `warningWeight`. */
export const notesFromCodes = (codes: readonly string[]): Note[] =>
  mergeUnverified([...new Set(codes)]).map((c) => ({
    id: c,
    text: warningText(c),
    weight: warningWeight(c),
  }));

/** Core warning codes as one notice with a list; nothing is rendered for an empty list. */
export function WarningList({ codes }: { codes: readonly string[] }) {
  if (codes.length === 0) return null;
  return (
    <div className="notice" role="status">
      <ul>
        {codes.map((c) => (
          <li key={c}>{warningText(c)}</li>
        ))}
      </ul>
    </div>
  );
}

/** The important notes as one visible notice (above the figures); nothing for an empty list. */
export function ImportantNotes({ notes }: { notes: readonly Note[] }) {
  const important = notes.filter((n) => n.weight === 'important');
  if (important.length === 0) return null;
  return (
    <div className="notice" role="status">
      <ul>
        {important.map((n) => (
          <li key={n.id}>{n.text}</li>
        ))}
      </ul>
    </div>
  );
}

/** The info notes as one collapsible row of the calculation list (use inside `.dts`); nothing for none. */
export function InfoNotes({ notes, extra }: { notes: readonly Note[]; extra?: readonly Note[] }) {
  const info = [...notes.filter((n) => n.weight === 'info'), ...(extra ?? [])];
  if (info.length === 0) return null;
  return (
    <Disclosure title={de.blocks.notes} meta={de.blocks.notesCount(info.length)}>
      {info.map((n) => (
        <p className="hint" key={n.id}>
          {n.text}
        </p>
      ))}
    </Disclosure>
  );
}
