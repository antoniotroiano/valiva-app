import { useEffect, useRef } from 'react';
import { de } from '../../i18n/de';

export type PersonOption = { id: string; label: string };

/**
 * Changing the view swaps the whole page (and with it this component), so the keyboard focus would be
 * lost. A change sets this flag and the next instance puts the focus back on its selected option.
 */
let restoreFocus = false;

/** More options than this turn the tabs into a select (tabs would not fit a phone). */
const MAX_TABS = 3;

/**
 * The one person switcher of a page. With `withHousehold` the first option is the household view
 * (overview); `selected` is then `'household'` or a person id.
 */
export function PersonTabs({
  persons,
  selected,
  onSelect,
  withHousehold = false,
}: {
  persons: PersonOption[];
  selected: string;
  onSelect: (id: string) => void;
  withHousehold?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!restoreFocus) return;
    restoreFocus = false;
    const target = root.current?.querySelector<HTMLElement>('input:checked, select');
    target?.focus();
  }, []);
  const change = (id: string) => {
    restoreFocus = true;
    onSelect(id);
  };
  const label = withHousehold ? de.householdView.switchLabel : de.nav.person;
  const options: PersonOption[] = withHousehold
    ? [{ id: 'household', label: de.householdView.household }, ...persons]
    : persons;
  if (options.length > MAX_TABS + (withHousehold ? 1 : 0)) {
    return (
      <label className="person-select" ref={root as React.RefObject<HTMLLabelElement>}>
        <span>{label}</span>
        <select value={selected} onChange={(e) => change(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="seg person-tabs"
      ref={root as React.RefObject<HTMLDivElement>}
    >
      {options.map((o) => (
        <label key={o.id} className={selected === o.id ? 'seg-on' : undefined}>
          <input
            type="radio"
            name="person-tabs"
            checked={selected === o.id}
            onChange={() => change(o.id)}
          />{' '}
          {o.label}
        </label>
      ))}
    </div>
  );
}
