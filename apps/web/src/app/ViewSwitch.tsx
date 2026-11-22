import { de } from '../i18n/de';
import type { HouseholdApi } from '../state/useHousehold';

export function ViewSwitch({
  household,
  view,
  setView,
}: {
  household: HouseholdApi;
  view: 'household' | 'person';
  setView: (v: 'household' | 'person') => void;
}) {
  const { persons } = household.state.household;
  const active = household.state.activePersonId;
  return (
    <div role="radiogroup" aria-label={de.householdView.switchLabel} className="seg view-switch">
      <label className={view === 'household' ? 'seg-on' : undefined}>
        <input
          type="radio"
          name="overview-view"
          checked={view === 'household'}
          onChange={() => setView('household')}
        />{' '}
        {de.householdView.household}
      </label>
      {persons.map((p, i) => (
        <label key={p.id} className={view === 'person' && active === p.id ? 'seg-on' : undefined}>
          <input
            type="radio"
            name="overview-view"
            checked={view === 'person' && active === p.id}
            onChange={() => {
              household.setActivePerson(p.id);
              setView('person');
            }}
          />{' '}
          {p.name.trim() || de.household.newPersonName(i + 1)}
        </label>
      ))}
    </div>
  );
}
