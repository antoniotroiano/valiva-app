/** Texts of the shared building-block page template (`BlockPage`) and its shared tables. */
export const blocks = {
  inputs: 'Eingaben',
  result: 'Ergebnis',
  calculation: 'Rechenweg',
  sections: 'Abschnitte dieser Seite',
  resultBar: 'Ergebnisse im Überblick',
  stepCols: { step: 'Schritt' },
  notes: 'Hinweise zur Rechnung',
  notesCount: (count: number) => (count === 1 ? '1 Hinweis' : `${count} Hinweise`),
  assumptions: 'Annahmen aus dem Profil',
  assumptionsMeta: 'nur Anzeige',
  simplification: 'Nicht berechnet',
  scenarios: 'Alle Szenarien im Vergleich',
  chartMeta: 'drei Szenarien',
  range: (low: string, high: string) => `Spanne pessimistisch bis optimistisch: ${low} bis ${high}`,
} as const;
