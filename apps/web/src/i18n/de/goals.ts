export const goals = {
  title: 'Sparziele',
  subtitle: 'Wann erreichst du dein Ziel, und welche Rate brauchst du bis zum Wunschtermin?',
  progressLabel: (name: string) => `Fortschritt ${name}`,
  listTitle: 'Meine Sparziele',
  add: 'Ziel hinzufügen',
  remove: 'Ziel löschen',
  removeConfirm: (name: string) => `Ziel „${name}“ wirklich löschen?`,
  empty: 'Noch keine Sparziele. Lege dein erstes Ziel an.',
  sortHint: 'Sortiert nach Priorität (nur Anzeige, keine automatische Verteilung).',
  select: (name: string) => `Ziel auswählen: ${name}`,
  newName: 'Neues Ziel',
  perMonth: (amount: string) => `${amount} pro Monat`,
  desired: (month: string) => `Wunschtermin ${month}`,
  budget: {
    title: 'Sparbudget',
    label: 'Monatliches Sparbudget',
    hint: 'Wie viel du insgesamt pro Monat zurücklegen kannst. Optional.',
    goalsSum: (n: number) => `Sparziele (${n})`,
    etfRate: 'ETF-Sparplan (aktuelle Rate)',
    rest: 'Rest zum Budget',
    over: (amount: string) =>
      `Deine Raten liegen ${amount} über dem Budget. Das ist nur ein Hinweis, die Rechnung bleibt unverändert.`,
  },
  formLabel: 'Eingaben zum Sparziel',
  groups: { goal: 'Ziel', interest: 'Zins', tax: 'Steuer' },
  fields: {
    name: { label: 'Name', hint: '' },
    targetAmount: { label: 'Zielbetrag', hint: 'Betrag, den du erreichen möchtest.' },
    currentAmount: { label: 'Aktueller Stand', hint: 'Was bereits auf dem Konto liegt.' },
    monthlyContribution: {
      label: 'Monatliche Sparrate',
      hint: 'Wird zu Monatsbeginn eingezahlt.',
    },
    targetMonth: {
      label: 'Wunschtermin (optional)',
      hint: 'Ohne Datum rechnen wir nur, wann das Ziel erreicht wird.',
    },
    startMonth: { label: 'Startmonat', hint: 'Ab diesem Monat wird gerechnet.' },
    priority: { label: 'Priorität', hint: 'Nur zum Sortieren der Liste, 1 steht oben.' },
    accountInterestPercent: {
      label: 'Zins pro Jahr',
      hint: 'Effektiver Jahreszins, wird auf Monate umgerechnet.',
    },
    taxEnabled: {
      label: 'Steuer auf Zinsen berücksichtigen',
      hint: 'Vereinfacht: Abgeltungsteuer auf Zinsen über dem Pauschbetrag, Kirchensteuer nur, wenn im Profil gewählt. Die Werte sind noch nicht gegen amtliche Quellen geprüft.',
    },
  },
  allowance: {
    title: 'Sparerpauschbetrag für alle Ziele',
    label: 'Sparerpauschbetrag pro Jahr',
    hint: 'Gilt gemeinsam für alle Sparziele dieser Person. Die Ziele nutzen ihn nacheinander in der Reihenfolge ihrer Priorität: Ziel 1 zuerst, Ziel 2 bekommt den Rest des Jahres und so weiter. Nutzt du ihn schon anderweitig (zum Beispiel bei einem Tagesgeld), trage hier weniger ein. Der ETF-Sparplan ist nicht eingerechnet, er wird meist Jahre später verkauft.',
    standard: (value: string) =>
      `Voreingestellt ist der Wert aus den Annahmen (${value} €, noch nicht gegen amtliche Quellen geprüft). Leer lassen setzt den Standard.`,
    usage: (parts: string) =>
      `Freibetrag: ${parts}. Der Rest geht an Ziele mit niedrigerer Priorität.`,
    usageYear: (year: number, amount: string) => `${amount} im Jahr ${year} genutzt`,
    usageMore: 'weitere Jahre',
    usageNone: 'Dieses Ziel nutzt in keinem Jahr Freibetrag.',
    short:
      'Hinweis: In mindestens einem Jahr reicht der Freibetrag für dieses Ziel nicht, weil Ziele mit höherer Priorität ihn nutzen. Die Zinsen darüber werden versteuert.',
  },
  interestChanges: {
    title: 'Zinsänderungen',
    empty: 'Keine Zinsänderungen.',
    from: 'Ab Monat',
    percent: 'Zins pro Jahr',
    add: 'Zinsänderung hinzufügen',
    remove: 'Entfernen',
  },
  month: {
    pattern: 'Format JJJJ-MM, zum Beispiel 2027-06',
    clear: 'Datum entfernen',
  },
  units: { eur: '€', percent: '%' },
  kpi: {
    reached: 'Ziel erreicht im',
    duration: 'Dauer',
    months: (n: number) => (n === 1 ? '1 Monat' : `${n} Monate`),
    yearsMonths: (y: number, m: number) => (m === 0 ? `${y} Jahre` : `${y} Jahre, ${m} Monate`),
    atStart: 'bereits erreicht',
    required: 'Rate für den Wunschtermin',
    requiredNone: 'Kein Wunschtermin gewählt',
    requiredNotNeeded: 'Der aktuelle Stand reicht bis dahin allein.',
    requiredUnreachable: 'nicht erreichbar',
    interestNet: 'Zinsen nach Steuer',
    tax: 'Steuer auf Zinsen',
  },
  missed: (target: string, rate: string, reached: string | undefined, required: string) =>
    `Der Wunschtermin ${target} wird mit ${rate} pro Monat verfehlt. ${
      reached
        ? `Das Ziel wird voraussichtlich im ${reached} erreicht.`
        : 'Das Ziel wird nicht erreicht.'
    } ${required}`,
  missedRequired: (amount: string) => `Für den Wunschtermin brauchst du ${amount} pro Monat.`,
  missedUnreachable: 'Der Wunschtermin ist auch mit sehr hohen Raten nicht erreichbar.',
  notReached: (years: number) =>
    `Mit diesen Angaben wird das Ziel in den nächsten ${years} Jahren nicht erreicht. Erhöhe die Monatsrate oder den Zins, oder senke den Zielbetrag. Kennzahlen und Diagramm zeigen nur den Verlauf über ${years} Jahre.`,
  errors: 'Bitte korrigiere die markierten Eingaben, dann erscheint das Ergebnis.',
  chart: {
    title: 'Entwicklung des Saldos',
    balance: 'Saldo',
    target: 'Zielbetrag',
    alt: 'Liniendiagramm mit dem Saldo und dem Zielbetrag. Die Tabelle enthält die Jahreswerte.',
    summary: (start: string, end: string, target: string, reached: string | undefined) =>
      reached
        ? `Der Saldo wächst von ${start} auf ${end} und erreicht den Zielbetrag ${target} im ${reached}.`
        : `Der Saldo wächst von ${start} auf ${end} und bleibt unter dem Zielbetrag ${target}.`,
  },
  table: {
    title: 'Verlauf je Kalenderjahr',
    year: 'Jahr',
    contributed: 'Eingezahlt',
    balance: 'Saldo',
    interest: 'Zinsen (brutto)',
    tax: 'Steuer',
  },
  assumptionsLink: 'Annahmen anzeigen',
} as const;
