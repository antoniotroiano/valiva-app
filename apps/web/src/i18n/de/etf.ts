export const etf = {
  title: 'ETF-Sparplan',
  subtitle: 'Wie entwickelt sich dein Sparplan über die Jahre?',
  formLabel: 'Eingaben',
  calculatorTitle: 'Sparplan-Rechner',
  tableToggle: (years: number) => `Jahrestabelle anzeigen (${years} Jahre)`,
  calculatorSubtitle: (years: number) => `Ergebnis nach ${years} Jahren Laufzeit.`,
  groups: {
    plan: 'Sparplan',
    lumpSums: 'Einmalzahlungen',
    costs: 'Kosten',
    scenarios: 'Szenarien',
    tax: 'Steuer',
    retirement: 'Ruhestand (Entnahme)',
  },
  fields: {
    initialCapital: {
      label: 'Startkapital',
      hint: 'Bereits investiertes Kapital zu Beginn. Es fällt kein Ausgabeaufschlag an.',
    },
    monthlyContribution: {
      label: 'Monatliche Sparrate',
      hint: 'Betrag, der jeden Monat zu Monatsbeginn investiert wird.',
    },
    annualContributionIncreasePercent: {
      label: 'Jährliche Steigerung der Rate',
      hint: 'Die Rate steigt einmal pro Jahr um diesen Prozentsatz.',
    },
    durationYears: {
      label: 'Laufzeit',
      hint: 'Ganze Jahre von 1 bis 60. Gilt nur für den Sparplan-Rechner. Der Rentenplan und der Abschnitt „ETF im Ruhestand“ rechnen bis zum Entnahmebeginn und ignorieren dieses Feld.',
    },
    ter: {
      label: 'Laufende Fondskosten (TER)',
      hint: 'Wird von der Rendite abgezogen.',
    },
    entryFeePercent: {
      label: 'Ausgabeaufschlag',
      hint: 'Anteil jeder Einzahlung (Rate und Einmalzahlung), der als Kosten wegfällt.',
    },
    custodyFeeEurPerYear: {
      label: 'Depotgebühr (Betrag pro Jahr)',
      hint: 'Wird monatlich anteilig abgezogen. Optional.',
    },
    custodyFeePercentPerYear: {
      label: 'Depotgebühr (Prozent pro Jahr)',
      hint: 'Auf den Depotwert, monatlich anteilig. Optional.',
    },
    pessimistic: { label: 'Rendite pessimistisch', hint: 'Vor Kosten, pro Jahr.' },
    neutral: { label: 'Rendite neutral', hint: 'Vor Kosten, pro Jahr.' },
    optimistic: { label: 'Rendite optimistisch', hint: 'Vor Kosten, pro Jahr.' },
    inflationPercent: {
      label: 'Inflation',
      hint: 'Für die Darstellung in Kaufkraft von heute.',
    },
    taxEnabled: {
      label: 'Steuer am Ende berücksichtigen',
      hint: 'Vereinfacht: Kirchensteuer nur, wenn im Profil gewählt. Standardmäßig ohne Vorabpauschale.',
    },
    advanceLumpSum: {
      label: 'Vorabpauschale jedes Jahr berücksichtigen',
      hint: 'Der Fonds gilt jedes Jahr als teilweise verkauft: Die Steuer darauf wird jeweils aus dem Depot bezahlt und beim Verkauf am Ende angerechnet. Der Sparerpauschbetrag gilt dann in jedem Jahr, nicht nur einmal am Ende. Der Basiszins steht auf der Seite Annahmen. Braucht die Steuer am Ende.',
      assumedRate:
        'Der Basiszins ist für die Jahre 2018 bis 2026 amtlich bestätigt (BMF). Für spätere Jahre nimmt die App 3,20 % an. Das ist nicht gesichert, der echte Satz wird jedes Jahr im Januar neu festgelegt.',
    },
  },
  units: { eur: '€', percent: '%', years: 'Jahre' },
  global: {
    label: 'Rendite-Szenarien und Inflation aus den Annahmen verwenden',
    hint: 'Dann gelten die Werte aus dem Profil für alle Bausteine. Ausschalten, um eigene Werte nur für diesen Sparplan einzugeben.',
    values: (p: string, n: string, o: string, inflation: string) =>
      `Aus den Annahmen: Rendite ${p} / ${n} / ${o} pro Jahr, Inflation ${inflation}.`,
  },
  retirement: {
    payoutStartAge: {
      label: 'Beginn der Entnahme (Alter)',
      hint: 'Die Sparphase endet zu diesem Alter. Vorgeschlagen aus dem Profil, hier überschreibbar.',
    },
    payoutEndAge: {
      label: 'Ende der Entnahme (Alter)',
      hint: 'Konstante Monatsrate, bis das Kapital bei diesem Alter aufgebraucht ist. Vorgeschlagen: Lebenserwartung.',
    },
    fromProfile: 'Aus dem Profil übernehmen',
    title: 'ETF im Ruhestand',
    badge: 'gilt für den Rentenplan',
    subtitle: (start: number, years: number) =>
      `Eigene Rechnung: Sparphase bis zum Entnahmealter ${start} (${years} Jahre ab heute), nicht bis zur Laufzeit im Sparplan-Rechner.`,
    intro: (start: number, end: number, years: number) =>
      `Sparphase bis Alter ${start} (${years} Jahre ab heute), danach Entnahme bis Alter ${end}. Beträge pro Monat in Kaufkraft von heute.`,
    caption: 'ETF im Ruhestand je Szenario',
    row: 'Monat',
    capital: 'Kapital bei Entnahmebeginn (brutto, nominal)',
    gross: 'Entnahme brutto',
    tax: 'Steuer',
    net: 'Entnahme netto',
    durationNote: (own: number, months: number) =>
      `Die Sparphase ergibt sich hier aus dem Entnahmebeginn: vom aktuellen Monat bis Dezember vor dem Beginn (${months} Monate), nicht aus dem Feld Laufzeit (${own} Jahre). Einmalzahlungen zählen ab dem aktuellen Monat. Die Steuer fällt in der Entnahme an, nicht am Ende der Sparphase.`,
    taxNote:
      'Vereinfachte Steuer: Der Gewinnanteil der Entnahme bleibt konstant; Vorabpauschale nur, wenn im ETF-Sparplan eingeschaltet; Kirchensteuer nur, wenn im Profil gewählt. Der Sparerpauschbetrag gilt ungenutzt und nominal fest.',
    taxNoteAdvance:
      'Mit Vorabpauschale: Die Steuer in der Entnahme ist der Durchschnitt über alle Auszahlungsmonate. Vorabpauschale und Verkaufsgewinn teilen sich einen Sparerpauschbetrag je Jahr, bereits versteuerte Vorabpauschalen mindern die Verkaufsgewinne.',
    advanceSaving: 'Vorabpauschalen in der Sparphase (Summe, nominal)',
    advanceSavingTax: 'Davon Steuer, aus dem Depot bezahlt (nominal)',
    advancePayout: 'Vorabpauschalen in der Entnahme (Summe, nominal)',
    toProfile: 'Zum Profil',
    needsProfile: 'Für die Entnahme werden gültige Profildaten gebraucht.',
  },
  lump: {
    month: 'Monat',
    amount: 'Betrag',
    add: 'Einmalzahlung hinzufügen',
    remove: 'Entfernen',
    monthHint: 'Monat des Sparplans, 1 = erster Monat.',
    empty: 'Keine Einmalzahlungen.',
  },
  reset: 'Eingaben zurücksetzen',
  kpi: {
    finalAfterTax: 'Endwert nach Steuer (neutral)',
    finalNoTax: 'Endwert ohne Steuer (neutral)',
    contributions: 'Einzahlungen',
    gain: 'Gewinn vor Steuer',
    tax: 'Steuer',
    taxSale: 'Steuer beim Verkauf',
    advanceTax: 'Steuer auf Vorabpauschalen',
    advanceTaxNote: 'jährlich aus dem Depot',
    advanceNote:
      'Mit Vorabpauschale kann der Endwert höher liegen, weil der Sparerpauschbetrag dann jedes Jahr genutzt wird. Ohne Freibetrag wäre er etwas niedriger, weil die Steuer früher fällig wird.',
    real: 'Kaufkraft von heute',
    realHint: 'Endwert nach Steuer, deflationiert',
    realHintNoTax: 'Endwert ohne Steuer, deflationiert',
    range: (low: string, high: string) => `Spanne ${low} bis ${high}`,
  },
  chart: {
    title: 'Entwicklung des Depotwerts',
    contributions: 'Einzahlungen',
    pessimistic: 'Pessimistisch',
    neutral: 'Neutral',
    optimistic: 'Optimistisch',
    year: 'Jahr',
    summary: (final: string, start: string, years: number) =>
      `Im neutralen Szenario wächst das Depot von ${start} auf ${final} brutto nach ${years} Jahren.`,
    alt: 'Liniendiagramm mit drei Szenarien und den Einzahlungen. Die Jahrestabelle enthält dieselben Werte.',
  },
  table: {
    advanceLumpSum: 'Vorabpauschale',
    advanceTax: 'Steuer darauf',
    title: 'Jahrestabelle',
    scenario: 'Szenario',
    year: 'Jahr',
    contributed: 'Einzahlungen',
    value: 'Wert (brutto)',
    real: 'Wert real',
  },
  errors: 'Bitte korrigiere die markierten Eingaben, dann erscheint das Ergebnis.',
  assumptionsLink: 'Annahmen anzeigen',
  target: {
    title: 'Zielvermögen',
    valueLabel: 'Zielvermögen am Ende der Laufzeit',
    valueHint: 'Die Rate ändert deinen Sparplan oben nicht. Die jährliche Steigerung gilt weiter.',
    basisLegend: 'Angabe in',
    real: 'Kaufkraft von heute',
    nominal: 'Nominal (Euro am Laufzeitende)',
    tableTitle: (current: string) => `Benötigte monatliche Startrate (aktuell ${current})`,
    cols: {
      scenario: 'Szenario',
      required: 'Benötigte Rate',
      difference: 'Unterschied zu heute',
    },
    reached: 'bereits erreicht, keine Rate nötig',
    unreachable: 'nicht erreichbar',
    note: (nominal: string) =>
      `Ziel nach Steuer. Entspricht am Laufzeitende nominal etwa ${nominal}.`,
    noteNominal: 'Ziel nach Steuer, nominal am Laufzeitende.',
  },
} as const;
