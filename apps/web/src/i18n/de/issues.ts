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
  invalid_id:
    'Die Kennung darf nur Buchstaben, Ziffern, Unterstrich und Bindestrich enthalten (höchstens 32 Zeichen).',
  duplicate_id: 'Diese Kennung kommt bereits vor.',
  name_invalid: 'Bitte einen Namen mit 1 bis 60 Zeichen eingeben.',
  end_not_after_start: (min?: number) =>
    min !== undefined
      ? `Das Ende muss nach dem Beginn liegen, frühestens mit ${min} Jahren.`
      : 'Das Ende muss nach dem Beginn liegen.',
  nominal_start_in_past:
    'Ein Betrag "nominal bei Beginn" ist nur für einen Beginn möglich, der noch nicht vergangen ist. Bitte "Kaufkraft heute" wählen.',
  too_many_entries: (max?: number) =>
    max !== undefined ? `Es sind höchstens ${max} Einträge möglich.` : 'Es sind zu viele Einträge.',
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
    } Wenn du schon Rente beziehst, führe die Person als Rentner.`,
  retired_start_in_future: (max?: number) =>
    max !== undefined
      ? `Der Rentenbeginn laut Bescheid liegt nach ${max}. Ohne Rentenbezug bitte den Schalter "Ich beziehe bereits Rente" ausschalten.`
      : 'Der Rentenbeginn laut Bescheid liegt in der Zukunft.',
  life_expectancy_in_past:
    'Die Lebenserwartung liegt in der Vergangenheit. Bitte ein höheres Alter eingeben.',
  end_not_after_today: (min?: number) =>
    min !== undefined
      ? `Das Endalter muss nach dem heutigen Alter liegen, mindestens ${min} Jahre.`
      : 'Das Endalter muss nach dem heutigen Alter liegen.',
  legal_values_missing: 'Für diese Berechnung fehlen gesetzliche Werte.',
  before_statement_year: (min?: number) =>
    min !== undefined
      ? `Der Rentenbeginn liegt vor dem Jahr der Renteninformation. Frühestens mit ${min} Jahren.`
      : 'Der Rentenbeginn liegt vor dem Jahr der Renteninformation.',
} as const;
