import { OTHER_INCOME_KINDS, OTHER_INCOME_LIMITS, otherIncomeSurvivorHint } from '@valiva/core';
import { buildOtherIncomeProducts, otherIncomeProductId } from '@valiva/core';
import type {
  Household,
  LegalResolution,
  OtherIncomeEntry,
  OtherIncomeKind,
  ValidationIssue,
} from '@valiva/core';
import { useId, useMemo, useState } from 'react';
import { EmptyState, type EmptyAction } from '../../components/cards/EmptyState';
import { FieldGroup } from '../../components/forms/FieldGroup';
import { NumberField } from '../../components/forms/NumberField';
import { BlockPage, BlockSection } from '../../components/layout/BlockPage';
import { de, issueMessage } from '../../i18n/de';
import { formatEur, formatNumber } from '../../lib/format';
import { type OtherIncomeApi } from '../../state/useOtherIncome';
import { type OverviewApi } from '../../state/useOverview';
import { CURRENT_YEAR, type ProfileApi } from '../../state/useProfile';
import { ProfileFacts } from '../occupational/OccupationalResults';
import { OtherIncomeCalculation, OtherIncomeResult } from './OtherIncomeResults';

type Props = {
  api: OtherIncomeApi;
  profile: ProfileApi;
  legal: LegalResolution;
  household: Household;
  retirement: OverviewApi;
  goToProfile: () => void;
  goToAssumptions: () => void;
  /** Quiet second action of the empty state: the next open step. */
  nextStep?: EmptyAction;
};

/** Short description of an entry for the list row. */
function summary(e: OtherIncomeEntry): string {
  const d = de.otherIncome.describe;
  const tax =
    e.taxMode === 'percent'
      ? d.tax.percent(formatNumber(e.taxSharePercent ?? 0))
      : d.tax[e.taxMode];
  return [
    de.otherIncome.list.perMonth(
      Number.isFinite(e.amountMonthly) ? formatEur(e.amountMonthly) : '–',
    ),
    d.start(e.start.mode === 'age' ? e.start.age : undefined),
    d.end(e.end.mode === 'age' ? e.end.age : undefined),
    tax,
  ].join(', ');
}

export function OtherIncomePage({
  api,
  profile,
  legal,
  household,
  retirement,
  goToProfile,
  goToAssumptions,
  nextStep,
}: Props) {
  const t = de.otherIncome;
  const kindId = useId();
  const entries = api.state.entries;
  const [chosen, setChosen] = useState<string>();
  const [newKind, setNewKind] = useState<OtherIncomeKind>('riester');
  const selected = entries.find((e) => e.id === chosen) ?? entries[0];
  const full = entries.length >= OTHER_INCOME_LIMITS.maxEntries;
  const target = profile.state.profile.targetRetirementAge;
  const lifeExpectancy = profile.state.profile.lifeExpectancyAge;
  const outcome = retirement.outcome;
  const result = outcome?.ok ? outcome.result : undefined;

  const productOf = (id: string) =>
    result?.products.find((p) => p.productId === otherIncomeProductId(id));
  const issuesOf = (id: string): ValidationIssue[] => productOf(id)?.issues ?? [];
  const invalidIds = entries.filter((e) => productOf(e.id)?.status === 'invalid').map((e) => e.id);
  const err = (field: string): string | undefined => {
    if (!selected) return undefined;
    const i = issuesOf(selected.id).find((x) => x.field === field);
    return i ? issueMessage(i) : undefined;
  };
  const hasErr = (...fields: string[]) => fields.some((f) => err(f) !== undefined);

  /** Notes of all entries (per entry) and the overview's note for the shared threshold. */
  const ctx = useMemo(
    () =>
      legal.ok && profile.committedValid
        ? {
            profile: profile.committed.profile,
            assumptions: profile.committed.assumptions,
            legal: legal.legal,
            currentYear: CURRENT_YEAR,
          }
        : undefined,
    [legal, profile.committed, profile.committedValid],
  );
  const codes = useMemo(() => {
    if (!ctx) return [] as string[];
    const out: string[] = [];
    for (const p of buildOtherIncomeProducts(api.committed.entries, ctx)) {
      if (p.outcome.ok) out.push(...p.outcome.results.neutral.warnings);
    }
    if (result?.scenarios.neutral.snapshot.warnings.includes('shared_occupational_threshold')) {
      out.push('shared_occupational_threshold');
    }
    for (const e of api.committed.entries) {
      if (otherIncomeSurvivorHint(e, household)) out.push('survivor_needs_pair');
    }
    return out;
  }, [ctx, api.committed.entries, household, result]);

  const pair = household.persons.length === 2;
  const set = (patch: Partial<OtherIncomeEntry>) => selected && api.update(selected.id, patch);

  const addEntry = () => {
    if (full) return;
    setChosen(api.add(newKind, t.kinds[newKind], target));
  };

  const list = (
    <section className="card" aria-labelledby="oi-list-h">
      <div className="oi-list-head">
        <h3 id="oi-list-h">{t.list.heading}</h3>
        <small>{t.list.count(entries.length, OTHER_INCOME_LIMITS.maxEntries)}</small>
      </div>
      {entries.length > 0 && (
        <ul className="oi-list">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className={e.id === selected?.id ? 'oi-row on' : 'oi-row'}
                aria-pressed={e.id === selected?.id}
                onClick={() => setChosen(e.id)}
              >
                <b>{e.name}</b>
                <small>
                  {t.kinds[e.kind]}, {summary(e)}
                  {!e.enabled && ` (${t.list.disabled})`}
                  {invalidIds.includes(e.id) && ` – ${t.list.invalid}`}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="field">
        <label htmlFor={kindId}>{t.list.addKind}</label>
        <select
          id={kindId}
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as OtherIncomeKind)}
        >
          {OTHER_INCOME_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.kinds[k]}
            </option>
          ))}
        </select>
        <p className="hint">{t.kindHints[newKind]}</p>
      </div>
      <button type="button" className="btn" disabled={full} onClick={addEntry}>
        {t.list.add}
      </button>
      {full && <p className="hint">{t.list.full(OTHER_INCOME_LIMITS.maxEntries)}</p>}
    </section>
  );

  const form = selected && (
    <form
      className="card"
      aria-label={t.formLabel}
      onSubmit={(e) => e.preventDefault()}
      key={selected.id}
    >
      <EntryHead
        entry={selected}
        error={err('name')}
        onName={(name) => set({ name })}
        onEnabled={(enabled) => set({ enabled })}
        onRemove={() => {
          if (window.confirm(t.list.removeConfirm(selected.name))) {
            api.remove(selected.id);
            setChosen(undefined);
          }
        }}
      />
      <p className="hint">{t.kindHints[selected.kind]}</p>
      <FieldGroup
        title={t.groups.amount}
        defaultOpen
        hasError={hasErr('amountMonthly', 'amountBasis', 'adjustment.percent')}
      >
        <NumberField
          label={t.fields.amountMonthly.label}
          hint={t.fields.amountMonthly.hint}
          unit="€"
          value={selected.amountMonthly}
          onChange={(v) => set({ amountMonthly: v })}
          error={err('amountMonthly')}
        />
        <SelectField
          label={t.fields.amountBasis.label}
          hint={t.fields.amountBasis.hint}
          value={selected.amountBasis}
          options={[
            ['today', t.fields.amountBasis.today],
            ['nominalAtStart', t.fields.amountBasis.nominalAtStart],
          ]}
          onChange={(v) => set({ amountBasis: v as OtherIncomeEntry['amountBasis'] })}
          error={err('amountBasis')}
        />
        <SelectField
          label={t.fields.adjustment.label}
          hint={t.fields.adjustment.hint}
          value={selected.adjustment.mode}
          options={[
            ['inflation', t.fields.adjustment.inflation],
            ['pension', t.fields.adjustment.pension],
            ['fixed', t.fields.adjustment.fixed],
          ]}
          onChange={(v) =>
            set({
              adjustment:
                v === 'fixed'
                  ? { mode: 'fixed', percent: 0 }
                  : { mode: v as 'inflation' | 'pension' },
            })
          }
        />
        {selected.adjustment.mode === 'fixed' && (
          <NumberField
            label={t.fields.adjustmentPercent.label}
            hint={t.fields.adjustmentPercent.hint}
            unit="%"
            value={selected.adjustment.percent}
            onChange={(v) => set({ adjustment: { mode: 'fixed', percent: v } })}
            error={err('adjustment.percent')}
          />
        )}
      </FieldGroup>
      <FieldGroup
        title={t.groups.timing}
        summary={t.rows.timing(
          t.describe.start(selected.start.mode === 'age' ? selected.start.age : undefined),
          t.describe.end(selected.end.mode === 'age' ? selected.end.age : undefined),
        )}
        hasError={hasErr('start.age', 'end.age')}
      >
        <SelectField
          label={t.fields.start.label}
          value={selected.start.mode}
          options={[
            ['retirement', t.fields.start.retirement],
            ['age', t.fields.start.age],
          ]}
          onChange={(v) =>
            set({
              start:
                v === 'age' ? { mode: 'age', age: Math.round(target) } : { mode: 'retirement' },
            })
          }
        />
        {selected.start.mode === 'age' && (
          <NumberField
            plain
            label={t.fields.startAge.label}
            hint={t.fields.startAge.hint}
            unit={t.unitYears}
            value={selected.start.age}
            onChange={(v) => set({ start: { mode: 'age', age: v } })}
            error={err('start.age')}
          />
        )}
        <SelectField
          label={t.fields.end.label}
          value={selected.end.mode}
          options={[
            ['lifelong', t.fields.end.lifelong],
            ['age', t.fields.end.age],
          ]}
          onChange={(v) =>
            set({
              end:
                v === 'age'
                  ? {
                      mode: 'age',
                      age: Math.max(
                        lifeExpectancy,
                        (selected.start.mode === 'age' ? selected.start.age : target) + 1,
                      ),
                    }
                  : { mode: 'lifelong' },
            })
          }
        />
        {selected.end.mode === 'age' && (
          <NumberField
            plain
            label={t.fields.endAge.label}
            hint={t.fields.endAge.hint}
            unit={t.unitYears}
            value={selected.end.age}
            onChange={(v) => set({ end: { mode: 'age', age: v } })}
            error={err('end.age')}
          />
        )}
      </FieldGroup>
      <FieldGroup
        title={t.groups.tax}
        summary={t.rows.tax(
          selected.taxMode === 'percent'
            ? t.describe.tax.percent(formatNumber(selected.taxSharePercent ?? 0))
            : t.describe.tax[selected.taxMode],
        )}
        hasError={hasErr('taxMode', 'taxSharePercent')}
      >
        <SelectField
          label={t.fields.taxMode.label}
          hint={t.fields.taxMode.hint}
          value={selected.taxMode}
          options={[
            ['none', t.fields.taxMode.none],
            ['full', t.fields.taxMode.full],
            ['percent', t.fields.taxMode.percent],
            ['pensionShare', t.fields.taxMode.pensionShare],
          ]}
          onChange={(v) =>
            set({
              taxMode: v as OtherIncomeEntry['taxMode'],
              taxSharePercent: v === 'percent' ? (selected.taxSharePercent ?? 0) : undefined,
            })
          }
          error={err('taxMode')}
        />
        {selected.taxMode === 'percent' && (
          <NumberField
            label={t.fields.taxSharePercent.label}
            hint={t.fields.taxSharePercent.hint}
            unit="%"
            value={selected.taxSharePercent ?? Number.NaN}
            onChange={(v) => set({ taxSharePercent: v })}
            error={err('taxSharePercent')}
          />
        )}
        <SelectField
          label={t.fields.contributions.label}
          hint={t.fields.contributions.hint}
          value={selected.contributions}
          options={[
            ['none', t.fields.contributions.none],
            ['likeOccupational', t.fields.contributions.likeOccupational],
          ]}
          onChange={(v) => set({ contributions: v as OtherIncomeEntry['contributions'] })}
        />
      </FieldGroup>
      {(pair || selected.survivorPercent > 0) && (
        <FieldGroup
          title={t.groups.household}
          summary={t.rows.survivor(formatNumber(selected.survivorPercent))}
          hasError={hasErr('survivorPercent')}
        >
          <NumberField
            label={t.fields.survivorPercent.label}
            hint={
              otherIncomeSurvivorHint(selected, household)
                ? t.fields.survivorPercent.needsPair
                : t.fields.survivorPercent.hint
            }
            unit="%"
            value={selected.survivorPercent}
            onChange={(v) => set({ survivorPercent: v })}
            error={err('survivorPercent')}
          />
        </FieldGroup>
      )}
    </form>
  );

  const inputs = (
    <>
      {list}
      {form}
    </>
  );

  const profileFacts = (
    <>
      <ProfileFacts a={profile.state.assumptions} legal={legal.ok ? legal.legal : undefined} />
      <p>
        <button type="button" className="link" onClick={goToProfile}>
          {de.occupational.profileLink}
        </button>
      </p>
    </>
  );

  const result_ = !legal.ok ? (
    <div className="notice">{de.profile.configError}</div>
  ) : !profile.committedValid || outcome === undefined ? (
    <div className="notice" role="status">
      {t.profileInvalid}{' '}
      <button type="button" className="link" onClick={goToProfile}>
        {t.profileLink}
      </button>
    </div>
  ) : entries.length === 0 ? (
    <EmptyState
      title={t.empty.title}
      primary={{ label: t.empty.button, onClick: addEntry }}
      secondary={nextStep}
    >
      {t.empty.text}
    </EmptyState>
  ) : !outcome.ok ? (
    <div className="notice" role="status">
      {t.inputInvalid}
    </div>
  ) : (
    <>
      {invalidIds.length > 0 && (
        <div className="notice" role="status">
          {t.inputInvalid}
        </div>
      )}
      <OtherIncomeResult entries={entries} result={outcome.result} codes={codes} />
    </>
  );

  return (
    <BlockPage title={t.title} subtitle={t.subtitle}>
      <BlockSection
        id="other"
        inputs={inputs}
        result={result_}
        calculation={
          <OtherIncomeCalculation
            entry={selected && api.committed.entries.find((e) => e.id === selected.id)}
            ctx={
              ctx && selected
                ? {
                    ...ctx,
                    otherIncome: retirement.otherIncome?.[otherIncomeProductId(selected.id)],
                  }
                : undefined
            }
            codes={codes}
            profileFacts={profileFacts}
          />
        }
      />
      <p className="inline-link">
        <button type="button" className="link" onClick={goToAssumptions}>
          {t.assumptionsLink}
        </button>
      </p>
    </BlockPage>
  );
}

function EntryHead({
  entry,
  error,
  onName,
  onEnabled,
  onRemove,
}: {
  entry: OtherIncomeEntry;
  error?: string;
  onName: (name: string) => void;
  onEnabled: (enabled: boolean) => void;
  onRemove: () => void;
}) {
  const t = de.otherIncome;
  const id = useId();
  return (
    <div className="oi-head">
      <div className="field">
        <label htmlFor={`${id}-name`}>{t.fields.name.label}</label>
        <input
          id={`${id}-name`}
          type="text"
          value={entry.name}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-name-hint${error ? ` ${id}-name-err` : ''}`}
          onChange={(e) => onName(e.target.value)}
        />
        <p className="hint" id={`${id}-name-hint`}>
          {t.fields.name.hint}
        </p>
        {error && (
          <p className="error" id={`${id}-name-err`}>
            {error}
          </p>
        )}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={entry.enabled}
          onChange={(e) => onEnabled(e.target.checked)}
        />{' '}
        {t.fields.enabled.label}
      </label>
      <p className="hint">{t.fields.enabled.hint}</p>
      <button type="button" className="btn" onClick={onRemove}>
        {t.list.remove}
      </button>
    </div>
  );
}

function SelectField({
  label,
  hint,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          `${hint ? `${id}-hint` : ''}${error ? ` ${id}-err` : ''}`.trim() || undefined
        }
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
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
