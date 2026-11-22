import { useId } from 'react';
import { de } from '../../i18n/de';

type Props = {
  label: string;
  hint?: string;
  /** `YYYY-MM`, or empty when optional and not set. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  /** Shows a button that clears the value. */
  clearable?: boolean;
};

/** Month input (`YYYY-MM`). Browsers without `type="month"` show a text field with a pattern. */
export function MonthField({ label, hint, value, onChange, error, clearable }: Props) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input
          id={id}
          type="month"
          value={value}
          placeholder="JJJJ-MM"
          pattern="[0-9]{4}-(0[1-9]|1[0-2])"
          title={de.goals.month.pattern}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-err` : ''}`}
          onChange={(e) => onChange(e.target.value)}
        />
        {clearable && value !== '' && (
          <button type="button" className="btn inline-btn" onClick={() => onChange('')}>
            {de.goals.month.clear}
          </button>
        )}
      </div>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}
