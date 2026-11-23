export const occupational = {
  title: 'Betriebliche Altersvorsorge',
  subtitle:
    'Was kostet dich die Entgeltumwandlung wirklich, und was bleibt nach Steuer und Abgaben als Betriebsrente?',
  formLabel: 'Eingaben Betriebliche Altersvorsorge',
  groups: {
    contribution: 'Beitrag',
    costs: 'Kosten und Garantie',
    payout: 'Auszahlphase',
  },
  fields: {
    annualContributionIncreasePercent: {
      label: 'Jährliche Steigerung der Umwandlung',
      hint: 'Die Umwandlung steigt jeden Januar um diesen Satz.',
      more: 'Sie steigt höchstens bis zur steuerfreien Grenze. Leer lassen: sie bleibt gleich. Arbeitgeberbeitrag und ein eigener Zuschuss bleiben gleich.',
    },
    employeeContributionMonthlyGross: {
      label: 'Entgeltumwandlung pro Monat, brutto',
      hint: 'Der Betrag, der vor Steuer und Sozialabgaben in die Betriebsrente fließt.',
      more: 'Steuerfrei bis 676 € im Monat, sozialabgabenfrei bis 338 € (2026).',
    },
    employerSubsidyMode: {
      label: 'Arbeitgeberzuschuss',
      hint: 'Gesetzlicher Pflichtzuschuss, konservativ auf höchstens 338 € Umwandlung angesetzt.',
      auto15: 'Automatisch (15 %)',
      custom: 'Eigener Betrag',
    },
    employerSubsidyCustomMonthly: {
      label: 'Zuschuss des Arbeitgebers pro Monat',
      hint: 'Wird unverändert übernommen, ohne Deckel auf 338 €.',
    },
    employerContributionMonthly: {
      label: 'Zusätzlicher Arbeitgeberbeitrag pro Monat (optional)',
      hint: 'Nur falls dein Arbeitgeber freiwillig mehr zahlt als den Pflichtzuschuss.',
    },
    startMonth: {
      label: 'Beitragsbeginn (Monat)',
      hint: 'Der Monat, ab dem eingezahlt wird.',
    },
    costPercentPerYear: {
      label: 'Kosten pro Jahr',
      hint: 'Abschluss-, Verwaltungs- und Fondskosten zusammen, als Abzug von der Rendite.',
      more: 'Der Vertrag zeigt sie meist als Effektivkosten.',
    },
    guaranteedRatePercent: {
      label: 'Garantierte Mindestrendite (optional)',
      hint: 'Leer lassen, wenn dein Vertrag keine Garantie hat.',
      more: 'Mit Wert fällt die Rendite nach Kosten in keinem Szenario unter diesen Satz.',
    },
    payoutStartAge: {
      label: 'Auszahlbeginn (Alter)',
      hint: '62 bis 70, vorgeschlagen aus dem Profil.',
    },
    payoutEndAge: {
      label: 'Auszahlplan bis (Alter)',
      hint: 'Vorgeschlagen: deine Lebenserwartung aus dem Profil.',
      more: 'Eine lebenslange Rente ist nicht berechnet.',
    },
  },
  errors: {
    conversionMax: (max: string) =>
      `Die Umwandlung darf höchstens ${max} im Monat betragen (steuerfreie Grenze 2026).`,
    payoutEnd: 'Der Auszahlplan muss nach dem Auszahlbeginn enden.',
    startAfterPayout: (year: number) =>
      `Der Beitragsbeginn muss vor dem Auszahlbeginn liegen (${year}).`,
  },
  fromProfile: 'Wie im Profil',
  profileRows: {
    scenarios: 'Rendite pessimistisch / neutral / optimistisch',
    payoutReturn: 'Rendite in der Auszahlphase',
    inflation: 'Inflation p. a.',
    marginalTax: 'Grenzsteuersatz heute',
    socialInsurance: 'Sozialabgaben Arbeitnehmer heute',
    tax: 'Einkommensteuer im Alter',
    taxValue: 'nach Tarif, auf die Summe aller Renten',
    health: 'Krankenversicherung',
    healthCompulsory: (additional: string, care: string) =>
      `KVdR, Zusatzbeitrag ${additional} %, Pflege ${care} %`,
    healthOther: (rate: string) => `andere, eigener Satz ${rate} %`,
  },
  profileLink: 'Im Profil ändern',
  simplification: {
    title: 'Vereinfachungen',
    text: 'Nicht berechnet sind die Kapitalauszahlung mit Verbeitragung über 120 Monate, die Doppelverbeitragung bei alten Verträgen, Direktzusage und Unterstützungskasse sowie die lebenslange Rente. Der Netto-Aufwand ist eine Schätzung mit pauschalen Sätzen. Die Krankenkassen-Freigrenzen sind noch nicht gesichert.',
  },
  perMonth: 'pro Monat',
  heroEyebrow: (year: number) => `Netto pro Monat ab ${year}, Kaufkraft von heute, neutral`,
  rows: {
    payout: (start: number, end: number) => `Alter ${start} bis ${end}`,
    costs: (rate: string) => `Kosten ${rate} %`,
  },
  kpi: {
    netEffort: 'Netto-Aufwand pro Monat (heute)',
    netEffortNote: (gross: string) => `statt ${gross} brutto, geschätzt`,
    intoContract: 'Einzahlung in den Vertrag pro Monat',
    intoContractNote: (conversion: string, subsidy: string) =>
      `${conversion} Umwandlung + ${subsidy} Zuschuss`,
    capital: (year: number) => `Kapital bei Auszahlbeginn (${year})`,
    parts: 'Davon Umwandlung / Zuschuss',
    grossNominal: 'Brutto pro Monat (nominal)',
    grossReal: 'Brutto pro Monat (Kaufkraft heute)',
    tax: 'Steuer und Abgaben pro Monat (heute)',
  },
  effort: {
    title: (conversion: string, net: string) =>
      `Netto-Aufwand: so wird aus ${conversion} Umwandlung ${net}`,
    cols: { item: 'Posten', monthly: 'Pro Monat' },
    conversion: 'Umwandlung brutto',
    taxSaving: (base: string, rate: string) =>
      `Steuerersparnis: ${base} (bis 676 €) × ${rate} % Grenzsteuersatz`,
    socialSaving: (base: string, rate: string) =>
      `Sozialabgaben-Ersparnis: ${base} (bis 338 €) × ${rate} %`,
    net: 'Netto-Aufwand',
    note: (subsidy: string) =>
      `Der Zuschuss des Arbeitgebers von ${subsidy} kommt obendrauf und kostet dich nichts. Die Ersparnis fällt heute an, sinkt aber später durch niedrigere gesetzliche Rente etwas (nicht berechnet). Schätzung mit deinen Sätzen aus dem Profil.`,
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
  },
  chart: {
    title: 'Kapital bis Auszahlbeginn',
    alt: 'Liniendiagramm: Umwandlung plus Zuschuss und Kapital im pessimistischen, neutralen und optimistischen Szenario.',
    contributions: 'Umwandlung plus Zuschuss',
    pessimistic: 'pessimistisch',
    neutral: 'neutral',
    optimistic: 'optimistisch',
    year: 'Jahr',
    summary: (contributed: string, neutral: string, pess: string, opt: string, year: number) =>
      `Aus ${contributed} Umwandlung und Zuschuss werden bis ${year} im neutralen Szenario ${neutral}, im pessimistischen ${pess} und im optimistischen ${opt}.`,
  },
  steps: {
    title: 'So wird aus dem Kapital die Nettorente (neutral)',
    cols: { step: 'Schritt', nominal: 'Pro Monat nominal', real: 'Kaufkraft heute' },
    plan: (from: number, to: number, months: number, rate: string, capital: string) =>
      `Auszahlplan ${from} bis ${to} (${months} Monate, ${rate} % Rendite, Kapital ${capital})`,
    tax: 'Einkommensteuer (voll steuerpflichtig, Tarif auf die Summe aller Renten)',
    healthCompulsory: (rate: string, allowance: string) =>
      `Krankenversicherung: ${rate} % auf den Teil über dem Freibetrag (heute ${allowance})`,
    healthOther: (rate: string) => `Krankenversicherung (eigener Satz ${rate} %)`,
    careOver: (rate: string) =>
      `Pflegeversicherung: ${rate} % auf die gesamte Rente (über der Freigrenze)`,
    careUnder: 'Pflegeversicherung: keine Beiträge (Rente unter der Freigrenze)',
    net: 'Netto',
    note: 'Freibetrag und Freigrenze werden wie die Rente in Kaufkraft von heute verglichen und steigen im Modell mit der Inflation (Annahme). Die Rate bleibt nominal gleich und verliert in der Auszahlphase an Kaufkraft.',
  },
  notices: {
    statutoryLoss: (amount: string) =>
      `Die Entgeltumwandlung senkt deine gesetzliche Rente um etwa ${amount} im Monat (heutige Werte, Näherung). Der umgewandelte Lohn ist bis zur sozialversicherungsfreien Grenze frei von Rentenbeiträgen, dafür fehlen dir Entgeltpunkte. Liegt dein Gehalt über der Beitragsbemessungsgrenze, entfällt dieser Verlust. Die Zahl steckt nicht im Ergebnis oben.`,
    guarantee: (model: string, floor: string) =>
      `Die garantierte Mindestrendite wirkt. Ohne Garantie läge die Rendite nach Kosten bei ${model}, mit Garantie rechnet die App mit ${floor}. Die Garantie gilt als Untergrenze der Rendite nach Kosten für die ganze Laufzeit, nicht als Kapitalgarantie auf die Beiträge.`,
    belowThreshold: (threshold: string) =>
      `Keine Kranken- und Pflegebeiträge: Die Rente liegt in Kaufkraft von heute unter ${threshold}. Die Pflege-Freigrenze ist eine harte Kante: Schon ein Cent darüber macht den vollen Pflegebeitrag fällig.`,
    subsidyCapped: (base: string, subsidy: string) =>
      `Der Zuschuss steigt nur bis ${base} Umwandlung. Bei dir sind es ${subsidy} im Monat.`,
  },
  warnings: {
    conversion_capped_at_tax_free_limit:
      'Die gestiegene Umwandlung wäre über der steuerfreien Grenze. Es wird mit der Grenze gerechnet.',
    contributions_above_tax_free:
      'Umwandlung, Zuschuss und Arbeitgeberbeitrag liegen zusammen über der steuerfreien Grenze. Der Teil darüber ist voll steuerpflichtig, das rechnet die App nicht mit.',
    thresholds_indexed:
      'Freibetrag und Freigrenze der Betriebsrente (heute 197,75 €) steigen im Modell mit der Inflation (Annahme).',
    unverified: (name: string) => `Ungeprüfter Rechtswert verwendet: ${name}.`,
  },
  emptyTitle: 'Noch keine Umwandlung eingetragen',
  emptyText:
    'Trage oben einen Monatsbetrag ein, dann rechnen wir Netto-Aufwand, Kapital und Betriebsrente.',
  emptyButton: 'Betrag eintragen',
  inputInvalid: 'Bitte die markierten Eingaben korrigieren, dann zeigen wir das Ergebnis.',
  profileInvalid: 'Das Profil enthält Fehler. Bitte dort korrigieren, dann rechnen wir weiter.',
  profileLinkInvalid: 'Zum Profil',
  assumptionsLink: 'Annahmen anzeigen',
} as const;
