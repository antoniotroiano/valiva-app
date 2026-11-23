export const statutory = {
  title: 'Gesetzliche Rente',
  subtitle:
    'Was bleibt von deiner Rente aus der Renteninformation, nach Abschlag, Anpassung, Steuer und Abgaben?',
  formLabel: 'Eingaben gesetzliche Rente',
  groups: { statement: 'Renteninformation', start: 'Rentenbeginn' },
  fields: {
    projectedMonthlyPensionToday: {
      label: 'Voraussichtliche Monatsrente laut Renteninformation',
      hint: 'Aus deiner Renteninformation, in heutigen Werten.',
      more: 'Der Betrag steht dort unter „Regelaltersrente bei Beitragszahlung bis zur Altersgrenze“, ohne künftige Anpassung.',
    },
    projectedMonthlyPensionAtRetirementAgeToday: {
      label: 'Rente für genau diesen Rentenbeginn (optional)',
      hint: 'Aus der Rentenauskunft für deinen Wunschtermin, in heutigen Werten.',
      more: 'Dieser Betrag enthält schon den Abschlag und die geänderte Zahl der Beitragsjahre. Leer lassen: dann wird die Rente oben nur mit Abschlag oder Zuschlag verrechnet.',
    },
    statementYear: {
      label: 'Jahr der Renteninformation',
      hint: 'Ab diesem Jahr wird die Rente angepasst.',
    },
    retirementAge: {
      label: 'Alter bei Rentenbeginn',
      hint: '63 bis 70. Vorgeschlagen aus dem Profil, hier überschreibbar.',
    },
    regularRetirementAge: {
      label: 'Regelaltersgrenze (Jahre)',
      hintConfig: (birthYear: number, age: string) =>
        `Für Jahrgang ${birthYear} ${age} nach dem Gesetz (aus der Konfiguration).`,
      hintOverride: (age: string) => `Leer lassen: ${age} nach dem Gesetz für deinen Jahrgang.`,
      moreOverride: 'Nur bei Sonderfällen selbst eingeben, z. B. 66,67 für 66 Jahre und 8 Monate.',
    },
  },
  fromProfile: 'Aus Profil übernehmen',
  profileTitle: 'Annahmen aus dem Profil (nur Anzeige)',
  profileRows: {
    adjustment: 'Rentenanpassung p. a.',
    inflation: 'Inflation p. a.',
    tax: 'Einkommensteuer im Alter',
    taxValue: 'nach Tarif, auf die Summe aller Renten',
    health: 'Krankenversicherung',
    healthCompulsory: 'KVdR',
    healthOther: 'andere',
  },
  profileLink: 'Im Profil ändern',
  simplification: {
    title: 'Vereinfachung',
    text: 'Ein früherer Rentenbeginn senkt in Wirklichkeit auch deine Entgeltpunkte, weil dir Beitragsjahre fehlen. Hier wird ohne weitere Angabe nur der Abschlag von 0,3 % je Monat angesetzt. Ein späterer Beginn erhöht keine Entgeltpunkte, nur den Zuschlag von 0,5 % je Monat. Trage bei frühem oder spätem Rentenbeginn im Feld „Rente für genau diesen Rentenbeginn“ den Wert aus deiner Rentenauskunft ein, dann entfällt diese Vereinfachung.',
  },
  perMonth: 'pro Monat',
  heroEyebrow: (year: number) => `Netto pro Monat ab ${year}, Kaufkraft von heute`,
  rows: {
    table: 'Verlauf als Tabelle',
    tableMeta: 'alle 5 Jahre',
  },
  kpi: {
    start: 'Rentenbeginn',
    grossNominal: 'Brutto pro Monat (nominal)',
    grossReal: 'Brutto pro Monat (Kaufkraft heute)',
    deductions: 'Steuer und Abgaben pro Monat (heute)',
  },
  chart: {
    title: 'Verlauf bis Rentenbeginn',
    alt: 'Liniendiagramm der Brutto-Monatsrente bis Rentenbeginn, nominal und in Kaufkraft von heute.',
    nominal: 'nominal',
    real: 'Kaufkraft von heute',
    summary: (year: number, nominal: string, real: string) =>
      `Die Hochrechnung der Bruttorente wächst bis ${year} auf ${nominal} im Monat. Nach Abzug der Inflation entspricht das ${real} heutiger Kaufkraft.`,
  },
  steps: {
    title: 'So wird aus der Renteninformation die Nettorente',
    cols: { step: 'Schritt', nominal: 'Pro Monat nominal', real: 'Kaufkraft heute' },
    statement: 'Renteninformation, heutige Werte',
    adjusted: (percent: string, years: number) =>
      `Nach Anpassung ${percent} % p. a. über ${years} Jahre`,
    factorStated: (age: number) =>
      `Rente für Rentenbeginn ${age} laut Eingabe (Abschlag und Beitragsjahre schon enthalten)`,
    factorRegular: (age: number) => `Faktor Rentenbeginn ${age} (Regelalter): × 1,000`,
    factorEarly: (age: number, percent: string) =>
      `Abschlag bei Rentenbeginn ${age}: − ${percent} %`,
    factorLate: (age: number, percent: string) =>
      `Zuschlag bei Rentenbeginn ${age}: + ${percent} %`,
    tax: (share: string) =>
      `Einkommensteuer (${share} % steuerpflichtig, Tarif auf die Summe aller Renten)`,
    health: (rate: string) =>
      `Krankenversicherung (${rate} %: halber Satz plus halber Zusatzbeitrag)`,
    healthOther: (rate: string) => `Kranken- und Pflegeversicherung (eigener Satz ${rate} %)`,
    care: (rate: string, childless: boolean) =>
      `Pflegeversicherung (${rate} %, ${childless ? 'kinderlos' : 'mit Kindern'})`,
    net: 'Netto',
    note: 'Steuer, Krankenversicherung und Pflege folgen den Sätzen aus Profil und Konfiguration. Der Zusatzbeitrag ist ein Durchschnitt, die Kassen weichen ab.',
  },
  table: {
    title: 'Verlauf bis Rentenbeginn (Brutto pro Monat)',
    year: 'Jahr',
    age: 'Alter',
    nominal: 'Nominal',
    real: 'Kaufkraft heute',
    start: (year: number) => `${year} (Rentenbeginn)`,
  },
  early: (percent: string, months: number) =>
    `Abschlag von ${percent} %: Du gehst ${months} Monate vor der Regelaltersgrenze in Rente, die Rente sinkt dauerhaft um 0,3 % je Monat.`,
  late: (percent: string, months: number) =>
    `Zuschlag von ${percent} %: Du gehst ${months} Monate nach der Regelaltersgrenze in Rente, 0,5 % je Monat. Weitere Entgeltpunkte durch Arbeit sind nicht angesetzt.`,
  emptyTitle: 'Noch keine Renteninformation eingetragen',
  emptyText:
    'Trage oben den Betrag aus deiner Renteninformation ein, dann rechnen wir Anpassung, Steuer und Abgaben.',
  emptyButton: 'Betrag eintragen',
  inputInvalid: 'Bitte die markierten Eingaben korrigieren, dann zeigen wir das Ergebnis.',
  profileInvalid: 'Das Profil enthält Fehler. Bitte dort korrigieren, dann rechnen wir weiter.',
  profileLinkInvalid: 'Zum Profil',
  warnings: {
    taxable_share_before_base_year:
      'Der Rentenbeginn liegt vor dem Basisjahr des Besteuerungsanteils. Es wird der Wert des Basisjahres angesetzt.',
    statutory_amount_for_retirement_age:
      'Es wird die Rente verwendet, die du für diesen Rentenbeginn eingetragen hast. Abschlag und Zuschlag werden nicht noch einmal abgezogen.',
    unverified: (name: string) => `Ungeprüfter Rechtswert verwendet: ${name}.`,
  },
  assumptionsLink: 'Annahmen anzeigen',
} as const;
