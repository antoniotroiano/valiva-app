import { warningText } from '../../lib/warningText';

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
