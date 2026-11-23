import { ScrollTable } from './ScrollTable';

export type ResultRow = {
  label: string;
  /** One text per value column, already formatted. */
  values: readonly string[];
  /** Total row, highlighted. */
  sum?: boolean;
  /** Row of the neutral scenario and similar, highlighted. */
  emphasis?: boolean;
};

type Props = {
  /** Caption and accessible name of the scroll region. */
  title: string;
  /** Header of the first (row label) column followed by the value columns. */
  columns: readonly string[];
  rows: readonly ResultRow[];
  /** One sentence below the table. */
  note?: string;
  /** Own card around the table; off when the table sits in a collapsible row. */
  card?: boolean;
};

function Table({ title, columns, rows, note, card = false }: Props) {
  const [first, ...rest] = columns;
  return (
    <ScrollTable label={title} className={card ? 'card' : undefined}>
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{first}</th>
            {rest.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={r.sum || r.emphasis ? 'sum' : undefined}>
              <th scope="row" className="left">
                {r.label}
              </th>
              {r.values.map((v, i) => (
                <td key={i} className="num">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="hint">{note}</p>}
    </ScrollTable>
  );
}

/** Calculation steps from capital to net (rows may be marked as a total). Used by every building block. */
export const StepsTable = Table;

/** Values per scenario (rows or columns are the scenarios; the neutral one may be emphasised). */
export const ScenarioTable = Table;
