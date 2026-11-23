import { useEffect, useId, useState } from 'react';
import { withTerms } from '../cards/Terms';
import { formatNumber, parseNumber } from '../../lib/format';
import { MoreInfo } from './MoreInfo';

type Props = {
  label: string;
  hint?: string;
  /** Details behind "Mehr erfahren", for text that does not fit the one-sentence hint. */
  more?: string;
  unit?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  /** Makes the field optional: an empty text calls this instead of `onChange(NaN)`. */
  onClear?: () => void;
  error?: string;
  disabled?: boolean;
  /** Calendar years and similar values are shown without thousands separators. */
  plain?: boolean;
};

const show = (v: number | undefined, plain?: boolean) =>
  v === undefined ? '' : plain ? (Number.isFinite(v) ? String(v) : '') : formatNumber(v);

/** Text input with de-DE parsing. Invalid text is reported as NaN so the core flags it. */
export function NumberField({
  label,
  hint,
  more,
  unit,
  value,
  onChange,
  onClear,
  error,
  disabled,
  plain,
}: Props) {
  const id = useId();
  const [text, setText] = useState(show(value, plain));

  // Re-sync when the value changes from outside (e.g. reset), but not while typing.
  useEffect(() => {
    setText((current) => {
      if (value === undefined) return current.trim() === '' ? current : '';
      const parsed = parseNumber(current);
      return Object.is(parsed, value) || (Number.isNaN(parsed) && Number.isNaN(value))
        ? current
        : show(value, plain);
    });
  }, [value, plain]);

  return (
    <div className="field">
      <label htmlFor={id}>{withTerms(label)}</label>
      <div className="input-row">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-err` : ''}`}
          onChange={(e) => {
            setText(e.target.value);
            if (onClear && e.target.value.trim() === '') onClear();
            else onChange(parseNumber(e.target.value));
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {withTerms(hint)}
        </p>
      )}
      {more && <MoreInfo text={more} hasError={error !== undefined} />}
      {error && (
        <p className="error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}
