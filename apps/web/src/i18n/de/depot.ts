export const depot = {
  title: 'Altersvorsorgedepot',
  subtitle:
    'Was wird aus deinen Beiträgen plus staatlicher Zulage, und was bleibt nach Steuer als Monatsrente?',
  formLabel: 'Eingaben Altersvorsorgedepot',
  groups: {
    contribution: 'Beitrag',
    variant: 'Produktvariante und Kosten',
    payout: 'Auszahlphase',
  },
  fields: {
    annualContributionIncreasePercent: {
      label: 'Jährliche Steigerung des Beitrags',
      hint: 'Der Beitrag steigt jeden Januar um diesen Satz.',
      more: 'Leer lassen: der Beitrag bleibt gleich. Über 570 € im Monat wird er gekappt.',
    },
    ownContributionMonthly: {
      label: 'Eigenbeitrag pro Monat',
      hint: 'Höchstens 570 € im Monat, die volle Grundzulage gibt es ab 150 €.',
      more: 'Höchstens 6.840 € im Jahr. Die volle Grundzulage gibt es ab 1.800 € im Jahr (150 € im Monat). Unter 120 € im Jahr gibt es gar keine Zulage.',
    },
    startMonth: {
      label: 'Beitragsbeginn (Monat)',
      hint: 'Das Altersvorsorgedepot startet frühestens im Januar 2027.',
    },
    variant: {
      label: 'Variante',
      hint: 'Die Varianten unterscheiden sich hier nur bei Kosten und Garantie.',
      more: 'Ein Wechsel der Anlage vor dem Rentenbeginn (Glide Path) ist nicht berechnet.',
    },
    costPercentPerYear: {
      label: 'Kosten pro Jahr',
      hintStandard: 'Beim Standarddepot ist 1,0 % die gesetzliche Obergrenze.',
      hint: 'Gesamtkosten pro Jahr, werden von der Rendite abgezogen.',
    },
    returnOverridePercent: {
      label: 'Rendite überschreiben (nur Garantievarianten, optional)',
      hint: 'Leer lassen: dann gelten die Szenarien aus dem Profil.',
      more: 'Mit Wert gelten alle drei Szenarien gleich. Gemeint ist die Rendite vor Kosten.',
    },
    payoutStartAge: {
      label: 'Auszahlbeginn (Alter)',
      hint: '65 bis 70, vorgeschlagen aus dem Profil.',
    },
    payoutEndAge: {
      label: 'Auszahlplan bis (Alter)',
      hint: 'Mindestens 85.',
      more: 'Eine lebenslange Rente ist nicht berechnet.',
    },
    lumpSumSharePercent: {
      label: 'Einmalauszahlung zu Beginn (% des Kapitals)',
      hint: '0 bis 30 %, der Rest wird als Auszahlplan verteilt.',
    },
  },
  variants: {
    standard: 'Standarddepot (Kosten bis 1,0 %)',
    guarantee80: 'Garantie 80 % der Beiträge',
    guarantee100: 'Garantie 100 % der Beiträge',
    noGuarantee: 'Depot ohne Garantie',
  },
  fromProfile: 'Wie im Profil',
  profileRows: {
    scenarios: 'Rendite pessimistisch / neutral / optimistisch',
    payoutReturn: 'Rendite in der Auszahlphase',
    inflation: 'Inflation p. a.',
    tax: 'Einkommensteuer im Alter',
    taxValue: 'nach Tarif, auf die Summe aller Renten',
    health: 'Krankenversicherung',
    healthCompulsory: 'KVdR (auf diese Leistung keine Beiträge angenommen)',
    healthOther: 'andere (eigener Satz)',
    children: 'Kinder (für Kinderzulage)',
    noChildren: 'keine eingetragen',
  },
  profileLink: 'Im Profil ändern',
  simplification: {
    title: 'Vereinfachungen',
    text: 'Nicht berechnet sind Sonderausgabenabzug und Günstigerprüfung, Ehegattenzulage, der Wechsel aus einem Riester-Vertrag und die lebenslange Rente. Die Steuer auf die Auszahlungen ist eine Pauschale, die Beitragsfreiheit in der Krankenversicherung eine Annahme.',
  },
  perMonth: 'pro Monat',
  heroEyebrow: (year: number) => `Netto pro Monat ab ${year}, Kaufkraft von heute, neutral`,
  heroEyebrowPercent: (year: number) =>
    `Netto im ersten Jahr pro Monat ab ${year}, Kaufkraft von heute, neutral`,
  rows: {
    payout: (start: number, end: number) => `Alter ${start} bis ${end}`,
  },
  kpi: {
    capital: (year: number) => `Kapital bei Auszahlbeginn (${year})`,
    own: 'Davon Eigenbeiträge',
    allowances: 'Davon Zulagen',
    grossNominal: 'Brutto pro Monat (nominal)',
    grossReal: 'Brutto pro Monat (Kaufkraft heute)',
    tax: 'Steuer pro Monat (heute)',
    lumpGross: 'Einmalauszahlung brutto',
    lumpNet: 'Einmalauszahlung nach Steuer',
    lumpReal: 'Kaufkraft heute',
  },
  scenarioTable: {
    title: 'Szenarien im Vergleich',
    scenario: 'Szenario',
    capital: (year: number) => `Kapital ${year}`,
    grossNominal: 'Brutto/Monat nominal',
    grossReal: 'Brutto/Monat heute',
    netReal: 'Netto/Monat heute',
    pessimistic: (p: string) => `Pessimistisch (${p} %)`,
    neutral: (p: string) => `Neutral (${p} %)`,
    optimistic: (p: string) => `Optimistisch (${p} %)`,
    override: (p: string) => `Alle Szenarien (${p} %)`,
  },
  chart: {
    title: 'Kapital bis Auszahlbeginn',
    alt: 'Liniendiagramm: Eigenbeiträge plus Zulagen und Kapital im pessimistischen, neutralen und optimistischen Szenario.',
    contributions: 'Eigenbeiträge plus Zulagen',
    pessimistic: 'pessimistisch',
    neutral: 'neutral',
    optimistic: 'optimistisch',
    year: 'Jahr',
    summary: (contributed: string, neutral: string, pess: string, opt: string, year: number) =>
      `Aus ${contributed} Eigenbeiträgen und Zulagen werden bis ${year} im neutralen Szenario ${neutral}, im pessimistischen ${pess} und im optimistischen ${opt}.`,
  },
  allowanceTable: {
    title: 'Zulagen je Kalenderjahr',
    meta: (years: number) => `${years} Jahre`,
    cardsLabel: 'Zulagen je Kalenderjahr als Liste',
    sumCard: (from: number, to: number) => `Summe ${from} bis ${to}`,
    cardTotal: (amount: string) => `Zulage ${amount}`,
    showAll: (shown: number, total: number) =>
      `Alle ${total} Jahre anzeigen (${shown} von ${total} sichtbar)`,
    showFirst: (shown: number) => `Nur die ersten ${shown} Jahre zeigen`,
    year: 'Jahr',
    contribution: 'Eigenbeitrag',
    basic: 'Grundzulage',
    child: 'Kinderzulage',
    bonus: 'Bonus unter 25',
    total: 'Zulage gesamt',
    value: 'Kapital Jahresende',
    sum: 'Summe',
    note: 'Zulagen werden zum Jahresende gutgeschrieben und ab dann verzinst. Die Kinderzulage läuft bis zum 18. Lebensjahr des Kindes. Altersgrenze der Kinderzulage und „einmalig“ beim Bonus sind noch nicht gesichert (Status: nicht bestätigt).',
  },
  steps: {
    title: 'So wird aus dem Kapital die Nettorente (neutral)',
    cols: { step: 'Schritt', nominal: 'Pro Monat nominal', real: 'Kaufkraft heute' },
    plan: (from: number, to: number, months: number, rate: string) =>
      `Auszahlplan ${from} bis ${to} (${months} Monate, ${rate} % Rendite)`,
    tax: 'Einkommensteuer (voll steuerpflichtig, Tarif auf die Summe aller Renten)',
    healthCompulsory: 'Kranken- und Pflegeversicherung (angenommen: keine Beiträge)',
    healthOther: (rate: string) => `Kranken- und Pflegeversicherung (eigener Satz ${rate} %)`,
    net: 'Netto',
    note: 'Die Rate bleibt nominal gleich und verliert deshalb in der Auszahlphase an Kaufkraft.',
  },
  notices: {
    missed: (
      monthly: string,
      yearly: string,
      basic: string,
      fullMonthly: string,
      max: string,
      missed: string,
    ) =>
      `Du lässt Zulage liegen. Mit ${monthly} im Monat (${yearly} im Jahr) bekommst du ${basic} Grundzulage. Mit ${fullMonthly} im Monat wären es ${max}, also ${missed} mehr im Jahr.`,
    belowMinimum: (min: string) =>
      `Keine Zulage. Der Mindesteigenbeitrag beträgt ${min} im Jahr. Darunter gibt es weder Grund- noch Kinderzulage.`,
    guarantee: (model: string, floor: string, level: string) =>
      `Die Garantie wirkt. Das Modellkapital liegt bei ${model}, die Garantie sichert ${level} der Eigenbeiträge plus Zulagen, also ${floor}. Das Kapital bei Auszahlbeginn ist ${floor}.`,
    lump: 'Die Einmalauszahlung wird mit demselben Steuersatz angesetzt wie die Monatsrente (Vereinfachung).',
  },
  warnings: {
    contribution_capped_at_maximum:
      'Der gestiegene Beitrag wäre über dem Höchstbeitrag von 6.840 € im Jahr. Es wird mit dem Höchstbeitrag gerechnet.',
    cost_capped:
      'Beim Standarddepot sind die Kosten auf 1,0 % gedeckelt. Es wird mit 1,0 % gerechnet.',
    payoutTaxation:
      'Besteuerung der Auszahlungen: Annahme „voll steuerpflichtig mit pauschalem Satz“ (nicht bestätigt).',
    noHealthContributions:
      'Kranken- und Pflegeversicherung: Annahme „keine Beiträge auf diese Leistung“ bei Pflichtversicherten (nicht bestätigt).',
    unverified: (name: string) => `Ungeprüfter Rechtswert verwendet: ${name}.`,
  },
  empty:
    'Noch kein Beitrag eingetragen. Trage oben einen Monatsbeitrag ein, dann rechnen wir Zulagen, Kapital und Auszahlplan.',
  jumpToField: 'Zum Feld springen',
  inputInvalid: 'Bitte die markierten Eingaben korrigieren, dann zeigen wir das Ergebnis.',
  profileInvalid: 'Das Profil enthält Fehler. Bitte dort korrigieren, dann rechnen wir weiter.',
  profileLinkInvalid: 'Zum Profil',
  assumptionsLink: 'Annahmen anzeigen',
} as const;
