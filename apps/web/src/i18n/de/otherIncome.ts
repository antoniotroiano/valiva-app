import type { OtherIncomeKind } from '@valiva/core';

const kinds: Record<OtherIncomeKind, string> = {
  riester: 'Riester-Rente',
  basisPension: 'Basisrente',
  privateAnnuity: 'Private Rentenversicherung',
  civilServicePension: 'Pension',
  rent: 'Mieteinnahmen',
  other: 'Sonstiges',
};

export const otherIncome = {
  title: 'Sonstige Einkünfte',
  subtitle:
    'Weitere Einkünfte im Alter, etwa Riester-Rente, Basisrente, private Rente, Pension oder Miete: was bleibt davon nach Steuer?',
  formLabel: 'Eingaben Sonstige Einkünfte',
  kinds,
  /** Hint per kind; the legal references are unverified assumptions (see the assumptions page). */
  kindHints: {
    riester:
      'Den Betrag laut Standmitteilung eintragen ("Rente ab Alter X"). Leistungen aus Riester-Altverträgen gelten in der App als voll steuerpflichtig.',
    basisPension:
      'Die App besteuert die Basisrente wie die gesetzliche Rente (Besteuerungsanteil nach Rentenbeginn).',
    privateAnnuity:
      'Den steuerpflichtigen Anteil (Ertragsanteil) laut Versicherer oder Steuerbescheid eintragen. Eine Tabelle gibt es in der App nicht.',
    civilServicePension:
      'Die Pension gilt als voll steuerpflichtig. Der Versorgungsfreibetrag ist nicht berücksichtigt, die Steuer ist daher eher zu hoch.',
    rent: 'Den Betrag nach Instandhaltung, Zinsen und Abschreibung eintragen. Sparerpauschbetrag und Werbungskosten sind nicht berücksichtigt.',
    other:
      'Ein regelmäßiger Betrag, den du im Alter erwartest. Sparerpauschbetrag und Werbungskosten sind nicht berücksichtigt.',
  } satisfies Record<OtherIncomeKind, string>,
  list: {
    heading: 'Einträge',
    count: (n: number, max: number) => `${n} von ${max}`,
    add: 'Eintrag hinzufügen',
    addKind: 'Art des neuen Eintrags',
    edit: 'Bearbeiten',
    remove: 'Entfernen',
    removeTitle: 'Eintrag entfernen?',
    removeButton: 'Entfernen',
    removeConfirm: (name: string) =>
      `Der Eintrag "${name}" wird entfernt. Das kann nicht rückgängig gemacht werden.`,
    full: (max: number) => `Es sind höchstens ${max} Einträge möglich.`,
    disabled: 'Aus',
    perMonth: (amount: string) => `${amount} pro Monat`,
    selected: 'Ausgewählt',
    invalid: 'Fehler in den Angaben',
  },
  groups: {
    amount: 'Betrag',
    timing: 'Beginn und Ende',
    tax: 'Steuer und Abgaben',
    household: 'Weitergabe an den Partner',
  },
  rows: {
    amount: (amount: string, basis: string) => `${amount}, ${basis}`,
    timing: (start: string, end: string) => `${start}, ${end}`,
    tax: (tax: string) => tax,
    survivor: (percent: string) => `${percent} %`,
  },
  fields: {
    name: {
      label: 'Name',
      hint: 'Zum Beispiel "Riester Anna". Höchstens 60 Zeichen.',
    },
    enabled: {
      label: 'In die Rechnung einbeziehen',
      hint: 'Ausgeschaltet bleibt der Eintrag gespeichert, zählt aber nicht.',
    },
    amountMonthly: {
      label: 'Betrag pro Monat, brutto',
      hint: 'Vor Steuer und Abgaben.',
    },
    amountBasis: {
      label: 'Der Betrag gilt in',
      today: 'Kaufkraft von heute',
      nominalAtStart: 'Euro bei Beginn (nominal)',
      hint: 'Nominal bei Beginn passt zu Standmitteilungen: Der Betrag wird dann nicht mehr hochgerechnet.',
    },
    adjustment: {
      label: 'Anpassung pro Jahr',
      inflation: 'Wie die Inflation',
      pension: 'Wie die gesetzliche Rente',
      fixed: 'Fester Satz',
      hint: 'Wie sich der Betrag nach dem Beginn ändert.',
    },
    adjustmentPercent: {
      label: 'Fester Satz pro Jahr',
      hint: '0 bedeutet: der Betrag bleibt nominal gleich.',
    },
    start: {
      label: 'Beginn',
      retirement: 'Mit dem Rentenbeginn',
      age: 'Ab einem Alter',
    },
    startAge: { label: 'Beginnalter', hint: 'Ganze Jahre, 18 bis 100.' },
    end: {
      label: 'Ende',
      lifelong: 'Lebenslang',
      age: 'Bis zu einem Alter',
    },
    endAge: {
      label: 'Endalter',
      hint: 'Ganze Jahre. Die Zahlung endet zu Beginn dieses Alters und muss nach dem Beginn liegen.',
    },
    taxMode: {
      label: 'Besteuerung',
      none: 'Nicht steuerpflichtig',
      full: 'Voll steuerpflichtig',
      percent: 'Anteil steuerpflichtig',
      pensionShare: 'Wie die gesetzliche Rente',
      hint: 'Die Einkommensteuer wird auf die Summe aller Einkünfte berechnet, nicht je Eintrag.',
    },
    taxSharePercent: {
      label: 'Steuerpflichtiger Anteil',
      hint: 'Zum Beispiel der Ertragsanteil laut Versicherer.',
    },
    contributions: {
      label: 'Kranken- und Pflegeversicherung',
      none: 'Keine Abgaben',
      likeOccupational: 'Wie bei der Betriebsrente',
      hint: 'Freibetrag und Freigrenze gelten dann gemeinsam mit der Betriebsrente.',
    },
    survivorPercent: {
      label: 'Weiterzahlung an den Partner',
      hint: 'Anteil des Betrags in Prozent, der nach dem Tod weitergezahlt wird. 0 bedeutet: die Zahlung endet.',
      needsPair:
        'Die Weiterzahlung wirkt nur bei zwei Personen im Haushalt und eingeschalteter Hinterbliebenenrente. Der Wert bleibt gespeichert.',
    },
  },
  unitYears: 'Jahre',
  describe: {
    basis: (b: 'today' | 'nominalAtStart') => (b === 'today' ? 'Kaufkraft heute' : 'nominal'),
    start: (age: number | undefined) =>
      age === undefined ? 'ab Rentenbeginn' : `ab ${age} Jahren`,
    end: (age: number | undefined) => (age === undefined ? 'lebenslang' : `bis ${age} Jahre`),
    tax: {
      none: 'steuerfrei',
      full: 'voll steuerpflichtig',
      percent: (p: string) => `${p} % steuerpflichtig`,
      pensionShare: 'wie gesetzliche Rente',
    },
  },
  result: {
    eyebrow: (age: number) => `Sonstige Einkünfte ab ${age} Jahren, netto pro Monat`,
    perMonth: 'pro Monat',
    note: 'In Kaufkraft von heute, nach Steuer und Abgaben, für den Rentenbeginn laut Profil. Alle drei Szenarien sind gleich, weil die Einträge keine Rendite haben.',
    kpi: {
      gross: 'Brutto pro Monat',
      tax: 'Steuer und Abgaben pro Monat',
      net: 'Netto pro Monat',
    },
    table: {
      title: 'Einträge im Überblick',
      columns: ['Eintrag', 'Beginn', 'Ende', 'Netto pro Monat ab Beginn', 'Status'],
    },
    status: {
      included: 'Zählt',
      later: 'Beginnt später',
      ended: 'Schon beendet',
      disabled: 'Aus',
      invalid: 'Fehler',
      empty: 'Betrag 0',
    },
    retirement: 'Rentenbeginn',
  },
  empty: {
    title: 'Noch keine sonstigen Einkünfte',
    text: 'Hier trägst du Einkünfte ein, die es neben gesetzlicher Rente, Betriebsrente, Depot und ETF gibt, zum Beispiel eine Riester-Rente oder Mieteinnahmen. Sie fließen in den Rentenplan ein.',
    button: 'Ersten Eintrag anlegen',
  },
  profileInvalid: 'Das Profil hat Fehler, die Einkünfte können damit nicht berechnet werden.',
  profileLink: 'Zum Profil',
  assumptionsLink: 'Annahmen und Rechtswerte ansehen',
  inputInvalid: 'Die Angaben eines Eintrags sind nicht gültig. Bitte die markierten Felder prüfen.',
  calculation: {
    simplification:
      'Vereinfachungen: Die App rechnet mit dem Betrag, den du einträgst, und kennt weder Garantien noch Überschüsse oder Kosten. Sparerpauschbetrag, Werbungskosten und der Versorgungsfreibetrag sind nicht berücksichtigt. Eine Weiterzahlung an den Partner wird ohne Abgaben gerechnet.',
    perEntry: (name: string) => `Rechenweg: ${name}`,
    steps: {
      title: 'Rechenweg je Eintrag',
      columns: ['Schritt', 'Wert'],
      amountAtStart: 'Brutto bei Beginn, nominal',
      amountAtStartReal: 'Brutto bei Beginn, Kaufkraft heute',
      adjustment: 'Anpassung pro Jahr',
      taxable: 'Steuerpflichtiger Teil pro Monat',
      tax: 'Steuer pro Monat',
      contributions: 'Abgaben pro Monat',
      net: 'Netto pro Monat, Kaufkraft heute',
    },
  },
  warnings: {
    rent_allowance_not_applicable:
      'Der Pauschbetrag für Renteneinkünfte (102 €) ist für Mieten eigentlich nicht vorgesehen. Bei reinen Mieteinkünften ist die Steuer daher etwas zu niedrig.',
    shared_occupational_threshold:
      'Betriebsrente und Einträge mit "Wie bei der Betriebsrente" teilen sich Freibetrag und Freigrenze. Die Betriebsrente-Seite zeigt weiter ihren Einzelwert.',
    survivor_needs_pair:
      'Die Weiterzahlung an den Partner hat keine Wirkung: Sie braucht zwei Personen und eingeschaltete Hinterbliebenenrente.',
  },
  ruleNames: {
    basisPensionTaxShare: 'Besteuerung der Basisrente wie die gesetzliche Rente',
    privateAnnuityEarningsShare: 'Ertragsanteil der privaten Leibrente (Anteil vom Nutzer)',
    riesterFullyTaxable: 'Riester-Leistungen voll steuerpflichtig',
    sharedBenefitThreshold: 'Gemeinsamer Freibetrag und Freigrenze aller Versorgungsbezüge',
    survivorIncomeCredited: 'Eigene Renten, Pensionen und Mieten bei der Witwenrente angerechnet',
  },
} as const;
