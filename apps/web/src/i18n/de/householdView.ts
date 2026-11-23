export const householdView = {
  switchLabel: 'Ansicht',
  household: 'Haushalt',
  title: 'Gesamtsicht Haushalt',
  intro: (year: number) =>
    `Monatliches Nettoeinkommen aller Personen in Kaufkraft von heute, gerechnet im Jahr ${year}, in dem die letzte Person in Rente geht.`,
  invalid: 'Die Angaben einer Person sind unvollständig. Bitte dort korrigieren:',
  fixPerson: (name: string) => `Profil von ${name} öffnen`,
  loading: 'Daten werden geladen …',
  hero: {
    wishHint:
      'Gemeinsamer Wunsch des Haushalts. Er entscheidet, ob eine Lücke oder ein Überschuss entsteht.',
  },
  sections: {
    details: 'Details und Tabellen',
    detailsMeta: 'Nettorente je Person und Einkommensquelle, Hinterbliebenenrente, Personen',
  },
  headline: (year: number, scenario: string) => `Haushalt im Jahr ${year} (${scenario})`,
  noWish: 'Ohne Wunscheinkommen gibt es keine Lücke.',
  toHousehold: 'Wunscheinkommen eintragen',
  compositionTitle: 'Zusammensetzung nach Person',
  compositionAlt: (parts: string[]) => `Nettorente je Person: ${parts.join(', ')}`,
  compositionCaption: (scenario: string) =>
    `Nettorente je Person und Einkommensquelle (${scenario})`,
  person: 'Person',
  total: 'Gesamt',
  pathTitle: 'Verlauf nach Kalenderjahr',
  pathAlt: (scenario: string) =>
    `Gestapeltes Flächendiagramm der Nettorente je Person und Kalenderjahr, Szenario ${scenario}`,
  year: 'Jahr',
  persons: 'Personen',
  personEmpty: 'Noch keine Einkommensquellen in der Gesamtsicht.',
  personEdit: (name: string) => `${name} bearbeiten`,
  personLine: (name: string, amount: string) => `${name}: ${amount}`,
  gapPerson: 'Person für die zusätzliche ETF-Rate',
  noSurvivor:
    'Es gibt keine Hinterbliebenenrente. Nach dem Tod der ersten Person ist die Lücke eher zu groß.',
  survivorSimplified:
    'Die Hinterbliebenenrente ist vereinfacht: nur die gesetzliche Rente, kein Sterbevierteljahr, keine Kinderzuschläge. Das Vermögen des Verstorbenen (ETF, Depot, betriebliche AV) wird nicht vererbt.',
  survivorTitle: 'Hinterbliebenenrente',
  survivorText: (deceased: string, year: number, survivor: string, amount: string) =>
    `Nach dem Tod von ${deceased} (${year}) erhält ${survivor} ab ${year + 1} eine Witwenrente von etwa ${amount} pro Monat (Kaufkraft von heute, nach Anrechnung des eigenen Einkommens).`,
  survivorNone: (deceased: string, year: number, survivor: string) =>
    `Nach dem Tod von ${deceased} (${year}) bleibt für ${survivor} keine Witwenrente übrig, weil das eigene Einkommen sie vollständig aufzehrt.`,
  survivorLegend: (name: string) => `Witwenrente für ${name}`,
  wishReduced: (percent: number) =>
    `Nach dem ersten Todesfall zählen nur noch ${percent} % des Wunscheinkommens.`,
  flatTax:
    'Die Steuer wird je Person auf die Summe ihrer Renteneinkünfte gerechnet (Einzelveranlagung), nicht gemeinsam veranlagt.',
  lumpSum: (name: string, amount: string) => `Einmalauszahlung ${name}: ${amount}`,
} as const;
