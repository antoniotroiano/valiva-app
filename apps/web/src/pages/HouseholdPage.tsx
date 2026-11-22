import { useId } from 'react';
import { NumberField } from '../components/NumberField';
import { PageShell } from '../components/PageShell';
import { SURVIVOR_WISH_PERCENT_LIMITS } from '@valiva/core';
import { de, issueMessage } from '../i18n/de';
import type { HouseholdApi } from '../useHousehold';

export function HouseholdPage({
  api,
  goToProfile,
}: {
  api: HouseholdApi;
  goToProfile: () => void;
}) {
  const t = de.household;
  const idBase = useId();
  const { persons } = api.state.household;
  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <section className="card">
        <h2>{t.personsTitle}</h2>
        <ul className="person-list">
          {persons.map((p, i) => {
            const active = p.id === api.state.activePersonId;
            const empty = p.name.trim() === '';
            return (
              <li key={p.id} className="person-row">
                <div className="field">
                  <label htmlFor={`${idBase}-${p.id}`}>{t.nameLabel(i + 1)}</label>
                  <input
                    id={`${idBase}-${p.id}`}
                    value={p.name}
                    aria-invalid={empty ? true : undefined}
                    onChange={(e) =>
                      api.updatePerson(p.id, (x) => ({ ...x, name: e.target.value }))
                    }
                    onBlur={() => {
                      if (empty)
                        api.updatePerson(p.id, (x) => ({ ...x, name: t.newPersonName(i + 1) }));
                    }}
                  />
                  {empty && <p className="error">{t.nameRequired}</p>}
                </div>
                <div className="actions">
                  {active ? (
                    <span className="badge">{t.active}</span>
                  ) : (
                    <button type="button" className="btn" onClick={() => api.setActivePerson(p.id)}>
                      {t.show(p.name || t.newPersonName(i + 1))}
                    </button>
                  )}
                  {persons.length > 1 && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (window.confirm(t.removeConfirm(p.name))) api.removePerson(p.id);
                      }}
                    >
                      {t.remove(p.name || t.newPersonName(i + 1))}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p>
          <button
            type="button"
            className="btn primary"
            onClick={() => api.addPerson(t.newPersonName(persons.length + 1))}
          >
            {t.add}
          </button>
        </p>
      </section>
      <section className="card">
        <h2>{t.wishTitle}</h2>
        <NumberField
          label={t.wishLabel}
          hint={t.wishHint}
          unit={de.profile.units.eurPerMonth}
          value={api.state.household.desiredMonthlyIncomeToday}
          onChange={(v) => api.setDesiredIncome(v)}
          onClear={() => api.setDesiredIncome(undefined)}
        />
      </section>
      <SurvivorCard api={api} />
      <section className="card">
        <h2>{t.sharedTitle}</h2>
        <p>{t.sharedText}</p>
        <p>
          <button type="button" className="link" onClick={goToProfile}>
            {t.openProfile}
          </button>
        </p>
      </section>
    </PageShell>
  );
}

function SurvivorCard({ api }: { api: HouseholdApi }) {
  const t = de.household.survivor;
  const radioName = useId();
  const { household } = api.state;
  const two = household.persons.length === 2;
  const on = household.survivorPension !== undefined;
  const wish = household.survivorWishPercent;
  return (
    <section className="card" aria-labelledby="survivor-title">
      <h2 id="survivor-title">{t.title}</h2>
      <p className="hint">{t.intro}</p>
      {!two && <p className="hint">{t.needsTwo}</p>}
      <label className="check">
        <input
          type="checkbox"
          disabled={!two}
          checked={on}
          onChange={(e) =>
            api.setSurvivor({
              survivorPension: e.target.checked ? 'new' : undefined,
              survivorWishPercent: wish,
            })
          }
        />{' '}
        {t.enable}
      </label>
      {on && (
        <fieldset className="radios" disabled={!two}>
          <legend>{t.lawLegend}</legend>
          {(['new', 'old'] as const).map((law) => (
            <label key={law}>
              <input
                type="radio"
                name={radioName}
                checked={household.survivorPension === law}
                onChange={() =>
                  api.setSurvivor({ survivorPension: law, survivorWishPercent: wish })
                }
              />{' '}
              {law === 'new' ? t.lawNew : t.lawOld}
            </label>
          ))}
        </fieldset>
      )}
      <NumberField
        label={t.wishLabel}
        hint={t.wishHint}
        unit={t.wishUnit}
        disabled={!two}
        value={wish ?? 100}
        onChange={(v) =>
          api.setSurvivor({ survivorPension: household.survivorPension, survivorWishPercent: v })
        }
        error={wishError(wish)}
      />
      <p className="hint">{t.creditNote}</p>
    </section>
  );
}

function wishError(wish: number | undefined): string | undefined {
  if (wish === undefined) return undefined;
  if (!Number.isFinite(wish))
    return issueMessage({ field: 'survivorWishPercent', code: 'not_finite' });
  const { min, max } = SURVIVOR_WISH_PERCENT_LIMITS;
  return wish < min || wish > max
    ? issueMessage({ field: 'survivorWishPercent', code: 'out_of_range', min, max })
    : undefined;
}
