import { PROFILE_LIMITS } from '@valiva/core';

export const issues = {
  not_finite: 'Bitte eine Zahl eingeben.',
  not_integer: 'Bitte eine ganze Zahl eingeben.',
  negative: 'Der Wert darf nicht negativ sein.',
  out_of_range: (min?: number, max?: number) =>
    min !== undefined && max !== undefined
      ? `Der Wert muss zwischen ${min} und ${max} liegen.`
      : max !== undefined
        ? `Der Wert darf höchstens ${max} sein.`
        : min !== undefined
          ? `Der Wert muss mindestens ${min} sein.`
          : 'Der Wert liegt außerhalb des erlaubten Bereichs.',
  scenario_order: 'Die Renditen müssen aufsteigend sein: pessimistisch ≤ neutral ≤ optimistisch.',
  not_positive: 'Der Wert muss größer als 0 sein.',
  required: 'Bitte einen Wert angeben.',
  invalid_month: 'Bitte einen Monat im Format JJJJ-MM angeben.',
  not_after_start: 'Der Monat muss nach dem Startmonat liegen.',
  not_chronological: 'Die Monate müssen aufsteigend sein.',
  before_first_contribution_year: (min?: number) =>
    min !== undefined
      ? `Das Altersvorsorgedepot startet frühestens im Januar ${min}.`
      : 'Der Beitragsbeginn liegt zu früh.',
  before_current_year: (min?: number) =>
    min !== undefined
      ? `Der Rentenbeginn liegt in der Vergangenheit. Frühestens mit ${min} Jahren.`
      : 'Der Rentenbeginn liegt in der Vergangenheit.',
  retirement_in_past: (min?: number) =>
    `Der Rentenbeginn liegt in der Vergangenheit.${
      min !== undefined && min <= PROFILE_LIMITS.retirementAge.max
        ? ` Frühestens mit ${min} Jahren.`
        : ''
    } Der Modus für Personen, die schon in Rente sind, folgt.`,
  before_statement_year: (min?: number) =>
    min !== undefined
      ? `Der Rentenbeginn liegt vor dem Jahr der Renteninformation. Frühestens mit ${min} Jahren.`
      : 'Der Rentenbeginn liegt vor dem Jahr der Renteninformation.',
} as const;
