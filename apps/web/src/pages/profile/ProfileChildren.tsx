import { useId, useState } from 'react';
import { de } from '../../i18n/de';
import { type ProfileApi } from '../../state/useProfile';

/** Comma separated years. Anything that is not a number becomes NaN so the core reports it. */
export function parseYears(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .filter((s) => s !== '')
    .map((s) => (/^\d+$/.test(s) ? Number(s) : Number.NaN));
}

export function ChildrenField({ api, error }: { api: ProfileApi; error?: string }) {
  const t = de.profile.fields.children;
  const id = useId();
  const years = api.state.profile.childrenBirthYears;
  const [text, setText] = useState(years.join(', '));
  return (
    <div className="field">
      <label htmlFor={id}>{t.label}</label>
      <input
        id={id}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-err` : ''}`}
        onChange={(e) => {
          setText(e.target.value);
          api.setProfile({ childrenBirthYears: parseYears(e.target.value) });
        }}
      />
      <p className="hint" id={`${id}-hint`}>
        {t.hint}
      </p>
      {error && (
        <p className="error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}
