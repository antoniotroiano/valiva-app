export const profile = {
  title: 'Profil',
  subtitle: 'Angaben zu dir und die Annahmen, die alle Einkommensquellen gemeinsam nutzen.',
  formLabel: 'Eingaben Profil',
  taxNote:
    'Die Einkommensteuer auf Renten rechnet die App nach dem aktuellen Tarif (Grundfreibetrag und Progression) auf die Summe aller Einkommensquellen. Solidaritätszuschlag, Kirchensteuer und Zusammenveranlagung sind nicht berücksichtigt.',
  groups: {
    person: 'Person',
    general: 'Allgemeine Annahmen',
    tax: 'Steuer im Alter',
    churchTax: 'Kirchensteuer auf Kapitalerträge',
    health: 'Kranken- und Pflegeversicherung im Alter',
  },
  advancedSummary: (values: string) => `Erweitert, Standardwerte gesetzt: ${values}`,
  summaries: {
    general: (inflation: string, neutral: string) =>
      `Inflation ${inflation} % · Rendite neutral ${neutral} %`,
    tax: (marginal: string, social: string) =>
      `Grenzsteuersatz ${marginal} % · Sozialabgaben ${social} %`,
    churchTax: (choice: string) => choice,
  },
  fields: {
    birthYear: { label: 'Geburtsjahr', hint: '' },
    targetRetirementAge: {
      label: 'Gewünschtes Rentenalter',
      hint: 'Zwischen 55 und 75. Die gesetzliche Rente lässt einen Beginn von 63 bis 70 zu.',
    },
    lifeExpectancyAge: {
      label: 'Planungshorizont: Alter (Lebenserwartung)',
      hint: 'Bis zu diesem Alter laufen spätere Auszahlpläne. Eine Annahme, keine Prognose.',
    },
    desiredMonthlyIncomeToday: {
      label: 'Wunscheinkommen im Ruhestand (netto pro Monat, optional)',
      hint: 'In Kaufkraft von heute. Ohne Angabe kann die Gesamtsicht keine Rentenlücke berechnen.',
    },
    children: {
      label: 'Geburtsjahre der Kinder (mit Komma getrennt, optional)',
      hint: 'Wird für die Kinderzulage beim Altersvorsorgedepot genutzt. Es werden nur Jahre gespeichert, keine Namen.',
    },
    inflationPercent: {
      label: 'Inflation p. a.',
      hint: 'Für Kaufkraft von heute. Die ETF-Seite behält vorerst ihre eigene Inflation.',
    },
    pensionAdjustmentPercent: {
      label: 'Rentenanpassung p. a.',
      hint: 'Wie stark die gesetzliche Rente bis zum Rentenbeginn steigt. Annahme, kein Gesetzeswert.',
    },
    payoutPhaseReturnPercent: {
      label: 'Rendite in der Rentenphase p. a.',
      hint: 'Für Auszahlpläne, zum Beispiel beim Altersvorsorgedepot.',
    },
    scenarios: 'Renditeszenarien p. a.',
    pessimistic: 'pessimistisch',
    neutral: 'neutral',
    optimistic: 'optimistisch',
    marginalTaxRateTodayPercent: {
      label: 'Grenzsteuersatz heute',
      hint: 'Für die Betriebsrente (ab Teilphase 3c).',
    },
    employeeSocialInsuranceRatePercent: {
      label: 'Sozialabgabensatz Arbeitnehmer',
      hint: 'Annahme für die Entgeltumwandlung (ab 3c).',
    },
    churchTaxLegend: 'Kirchensteuer auf Kapitalerträge (ETF und Sparziele)',
    churchTaxNone: 'Keine Kirchensteuer',
    churchTaxLow: (rate: string) => `Kirchensteuer ${rate} % (Baden-Württemberg, Bayern)`,
    churchTaxHigh: (rate: string) => `Kirchensteuer ${rate} % (übrige Bundesländer)`,
    churchTaxHint: (without: string, withChurch: string | undefined) =>
      (withChurch === undefined
        ? `Die Steuer auf Kapitalerträge beträgt ${without} % (Abgeltungsteuer mit Solidaritätszuschlag).`
        : `Die Steuer auf Kapitalerträge beträgt ${withChurch} % statt ${without} %: Die Kirchensteuer mindert die Einkommensteuer nach §32d EStG, der Gesamtsatz steigt dadurch nur um gut 1,5 Punkte.`) +
      ' Gilt für ETF und Sparziele, nicht für die Steuer auf Renten.',
    churchTaxUnverified: 'Der Kirchensteuersatz ist noch nicht gegen eine amtliche Quelle geprüft.',
    healthLegend: 'Versicherungsstatus',
    healthCompulsory:
      'Pflichtversichert in der gesetzlichen Krankenversicherung der Rentner (KVdR)',
    healthOther: 'Andere (z. B. privat oder freiwillig versichert)',
    additionalRatePercent: {
      label: 'Zusatzbeitrag Ø',
      hint: 'Standard aus der Konfiguration. Dein Beitrag hängt von deiner Kasse ab. Rentner tragen die Hälfte.',
    },
    childless: 'Kinderlos (Pflegeversicherung 4,2 % statt 3,6 %)',
    otherRatePercent: {
      label: 'Eigener Gesamtsatz bei „Andere“',
      hint: 'Nur aktiv bei „Andere“. Anteil an der Bruttorente für Kranken- und Pflegeversicherung zusammen.',
    },
  },
  reset: 'Auf Standardwerte zurücksetzen',
  units: { percent: '%', years: 'Jahre', eurPerMonth: '€ pro Monat' },
  consequences: {
    title: 'Was daraus folgt',
    retirementYear: 'Rentenbeginn (Jahr)',
    yearsToRetirement: (year: number) => `Jahre bis zum Rentenbeginn (ab ${year})`,
    regularAge: (birthYear: number) => `Regelaltersgrenze für Jahrgang ${birthYear}`,
    regularAgeValue: (age: string) => age,
    taxableShare: (year: number) => `Besteuerungsanteil bei Rentenbeginn ${year}`,
    health: 'Versicherung im Alter',
    healthCompulsoryChildren: 'KVdR, mit Kindern',
    healthCompulsoryChildless: 'KVdR, kinderlos',
    healthOther: (rate: string) => `Andere, Gesamtsatz ${rate} %`,
    note: 'Der Besteuerungsanteil ist kein Steuersatz. Er sagt nur, welcher Teil der Rente steuerpflichtig ist. Der Steuersatz darauf kommt aus deiner Eingabe.',
  },
  outsideRange: (age: number) =>
    `Rentenalter ${age} liegt außerhalb dessen, was die gesetzliche Rente abbildet (63 bis 70). Das Profil akzeptiert den Wert, die Seite Gesetzliche Rente meldet dort einen Fehler.`,
  unverifiedNote:
    'Einige Rechtswerte sind noch nicht gegen amtliche Quellen bestätigt. Alle Werte stehen mit Quelle und Status auf der Seite Annahmen.',
  assumptionsLink: 'Zu den Annahmen',
  configError: 'Für das heutige Datum gibt es keine gültigen Rechtswerte in der Konfiguration.',
} as const;
