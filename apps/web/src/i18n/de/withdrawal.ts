export const withdrawal = {
  legend: 'Entnahme',
  annuity: 'Gleichbleibend bis zum Endalter (Annuität)',
  percent: 'Prozent vom Kapital bei Rentenbeginn',
  annuityHint: 'Annuität: Jeden Monat dieselbe Summe, das Kapital ist am Endalter aufgebraucht.',
  percentLabel: 'Entnahme pro Jahr (nur bei „Prozent“)',
  percentHint: 'Anteil des Kapitals bei Rentenbeginn, der im ersten Jahr entnommen wird.',
  percentMore:
    'Entnommen wird ein Zwölftel pro Monat. Danach steigt die Summe jedes Jahr um die Inflation, die Kaufkraft bleibt also gleich. Erlaubt: größer als 0 und höchstens 100. Das Restkapital wächst weiter mit der Rendite der Entnahmephase.',
  gross: 'Entnahme im ersten Jahr, brutto',
  net: 'Netto im ersten Jahr',
  lasts: 'Kapital reicht bis Alter',
  lastsEnd: (age: number) => `${age} (Ende)`,
  depletedAt: (years: number, months: number) =>
    months === 0 ? `${years} Jahre` : `${years} Jahre ${months} Monate`,
  remaining: 'Restkapital im Endalter (nominal)',
  depleted: (age: string) =>
    `Das Kapital ist im neutralen Fall mit ${age} aufgebraucht. Danach zahlt dieser Baustein nichts mehr.`,
  note: 'Bei „Prozent“ zählt die Zahlung im ersten Jahr. Sie steigt jedes Jahr um die Inflation und bleibt in Kaufkraft von heute gleich.',
  noteEtfTax:
    'Die Steuer ist für das erste Jahr gerechnet (Sparerpauschbetrag fest in Euro, daher wird sie später real etwas höher).',
  chart: {
    title: 'Restkapital im Ruhestand',
    alt: 'Liniendiagramm des Restkapitals je Alter in den drei Szenarien.',
    summary: (neutral: string, end: string) =>
      `Neutral sinkt das Kapital von ${neutral} bei Entnahmebeginn auf ${end} im Endalter.`,
    age: 'Alter',
    tableCaption: 'Restkapital am Jahresende (neutral, nominal)',
    details: 'Tabelle zum Diagramm',
    colAge: 'Alter',
    colPayment: 'Entnahme pro Monat',
    colRemaining: 'Restkapital',
  },
} as const;
