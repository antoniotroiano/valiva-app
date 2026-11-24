/** Texts of the retiree mode (`concept/16`): profile switch, notices, the four block pages, overview tiles. */
export const retired = {
  /** Profile page. */
  profile: {
    switchLabel: 'Ich beziehe bereits Rente',
    switchHint:
      'Dann trägst du die Werte aus deinem Rentenbescheid ein statt einer Prognose. Die Rechnung läuft ab heute.',
    startYear: {
      label: 'Rentenbeginn (Jahr laut Rentenbescheid)',
      hint: 'Bestimmt, welcher Teil der Rente steuerpflichtig ist. Bei einer Frührente zählt das Jahr, in dem sie tatsächlich begann.',
    },
    taxHiddenSummary: 'Für Rentner entfallen Gehalt und Grenzsteuersatz.',
    consequences: {
      startYear: 'Rentenbeginn laut Bescheid (Jahr)',
      sinceYears: 'Jahre seit dem Rentenbeginn',
      ageToday: 'Alter heute',
      taxableShare: (year: number) => `Besteuerungsanteil bei Rentenbeginn ${year}`,
      note: 'Der Besteuerungsanteil des Beginnjahres gilt für die ganze Laufzeit: Ab dem Folgejahr ist der steuerfreie Teil ein fester Euro-Betrag, spätere Rentenerhöhungen sind voll steuerpflichtig.',
    },
    asRetired: {
      text: 'Wenn du schon Rente beziehst, kannst du die Person als Rentner führen.',
      button: 'Als Rentner führen',
    },
  },
  /** Overview of one person. */
  overview: {
    headline: (scenario: string) => `Netto-Rente heute, Kaufkraft von heute (${scenario})`,
    snapshotCaption: 'Heute',
    noticeThere: {
      title: 'Liegt dir der Rentenbescheid schon vor?',
      text: 'Dein Rentenbeginn liegt in weniger als zwölf Monaten. Mit dem Bescheid kannst du die tatsächlichen Werte eintragen statt der Prognose.',
      button: 'Ist-Werte eintragen',
    },
    closeGapRetired:
      'Für Personen in Rente gibt es keinen ETF-Sparplan, deshalb schlägt die App keine zusätzliche Sparrate vor. Wer weiter spart, legt unter „Sparziele“ ein Ziel an.',
    toSavingsGoals: 'Zu den Sparzielen',
    whatIfRetired:
      'Der Regler „Was wäre wenn“ gilt für Sparpläne und entfällt, solange du Rente beziehst.',
  },
  /** Household overview. */
  household: {
    todayTitle: 'Heute schon in Rente',
    todayLine: (name: string, amount: string) => `${name}: ${amount} netto pro Monat`,
    todayNote: 'Kaufkraft von heute. Das gilt unabhängig vom Jahr der Gesamtsicht.',
    transitionBand: (from: number, to: number, name: string) =>
      `${from} bis ${to}: Übergang bis zum Rentenbeginn von ${name}. Das Einkommen aus Arbeit ist nicht modelliert, deshalb zählen diese Jahre nicht zur Lücke.`,
    transitionLegend: 'Übergang (ohne Lücke)',
    transitionRow: 'Übergang',
    jointTransition: (retired: string, working: string) =>
      `Bis ${working} in Rente ist, wird ${retired} einzeln besteuert; das Gehalt von ${working} ist nicht modelliert. Die Steuer in diesen Jahren ist eine Näherung.`,
    intro: (year: number) =>
      `Monatliches Nettoeinkommen aller Personen in Kaufkraft von heute, gerechnet im Jahr ${year}, in dem die letzte Person in Rente geht. Wer schon Rente bezieht, steht zusätzlich in der Kachel „Heute schon in Rente“.`,
    inRetirementBadge: 'in Rente',
  },
  /** Hints from the core (warning codes). */
  warnings: {
    first_full_year_estimated:
      'Gesetzliche Rente: Die Jahresrente des Jahres nach dem Rentenbeginn ist geschätzt (heutige Rente mit der angenommenen Rentenanpassung zurückgerechnet). Sie bestimmt den festen steuerfreien Betrag; mit dem Wert aus dem Bescheid wird er genauer.',
    depot_before_first_contribution_year:
      'Altersvorsorgedepot: Verträge sind erst ab 2027 möglich. Die Rechnung nimmt trotzdem ein Restkapital von heute an.',
  },
  /** Block pages: shared. */
  shared: {
    notRetired: 'Diese Eingaben gelten für Personen in Rente.',
    perMonth: 'pro Monat',
    startFromProfile: 'Rentenbeginn: aus dem Profil',
    toProfile: 'Zum Profil',
    invalid: 'Bitte die markierten Eingaben prüfen.',
    profileInvalid: 'Die Angaben im Profil sind unvollständig.',
    calculation: 'Rechenweg',
    kpiGross: 'Brutto pro Monat',
    kpiDeductions: 'Steuer und Abgaben pro Monat',
    kpiNet: 'Netto pro Monat',
  },
  statutory: {
    title: 'Gesetzliche Rente',
    subtitle: 'Die Rente, die dein Rentenbescheid ausweist, und was davon nach Steuer bleibt.',
    formLabel: 'Eingaben Rentenbescheid',
    groups: { notice: 'Rentenbescheid', optional: 'Genauer rechnen (optional)' },
    fields: {
      actualMonthlyGross: {
        label: 'Bruttorente pro Monat laut Bescheid',
        hint: 'Vor Kranken- und Pflegeversicherung, Wert des laufenden Jahres. Ab dem nächsten Jahr wächst sie mit der Rentenanpassung der Annahmen.',
      },
      firstFullYearAnnual: {
        label: 'Jahresrente im Jahr nach dem Rentenbeginn (optional)',
        hint: 'Aus dem ersten vollen Rentenjahr. Sie legt den steuerfreien Betrag fest. Ohne Angabe schätzt die App sie.',
        more: 'Der steuerfreie Teil der Rente wird im Jahr nach dem Rentenbeginn festgeschrieben (§ 22 Nr. 1 EStG). Der Gesetzestext nennt kein Bezugsjahr; die App nimmt die Jahresrente des ersten vollen Jahres. Wenn du sie nicht kennst, rechnet die App die heutige Rente mit der Rentenanpassung der Annahmen zurück. Das ist bei einem Beginn vor 2026 nur eine Näherung.',
      },
    },
    startRow: 'Rentenbeginn',
    empty: {
      title: 'Noch keine Rente eingetragen',
      text: 'Trage die Bruttorente aus deinem Rentenbescheid ein. Dann rechnet die App die Steuer und die Abgaben für heute und die kommenden Jahre.',
      button: 'Bruttorente eintragen',
    },
    heroEyebrow: 'Gesetzliche Rente, netto heute',
    kpi: {
      share: 'Besteuerungsanteil im Beginnjahr',
      taxFree: 'Steuerfreier Betrag pro Jahr',
      taxable: 'Steuerpflichtig pro Jahr heute',
    },
    steps: {
      title: 'Wie die Steuer entsteht',
      rows: {
        start: 'Rentenbeginn (Jahr)',
        share: 'Besteuerungsanteil des Beginnjahres',
        reference: 'Jahresrente im Folgejahr des Beginns',
        referenceEstimated: 'Jahresrente im Folgejahr des Beginns (geschätzt)',
        taxFree: 'Fester steuerfreier Betrag pro Jahr',
        startsThisYear:
          'Der Rentenbeginn liegt im laufenden Jahr: Dieses Jahr gilt der Anteil, ab dem nächsten Jahr der feste Betrag.',
        taxable: 'Steuerpflichtiger Teil pro Monat heute',
        health: 'Krankenversicherung pro Monat',
        care: 'Pflegeversicherung pro Monat',
        tax: 'Einkommensteuer pro Monat',
        net: 'Netto pro Monat',
      },
    },
  },
  occupational: {
    title: 'Betriebliche Altersversorgung',
    subtitle: 'Deine laufende Betriebsrente oder das Restkapital mit Auszahlplan.',
    formLabel: 'Eingaben Betriebsrente',
    groups: {
      form: 'Form der Auszahlung',
      annuity: 'Laufende Rente',
      capital: 'Restkapital mit Auszahlplan',
    },
    form: {
      legend: 'Wie bekommst du die Betriebsrente?',
      annuity: 'Als laufende Rente (fester Betrag pro Monat)',
      capital: 'Als Restkapital mit Auszahlplan',
    },
    fields: {
      annuityMonthlyGross: {
        label: 'Betriebsrente brutto pro Monat',
        hint: 'Der heutige Betrag vor Steuer und Abgaben.',
      },
      adjustment: {
        legend: 'Anpassung pro Jahr',
        fixed: 'Fester Prozentsatz',
        pension: 'Wie die gesetzliche Rente',
        percent: {
          label: 'Anpassung pro Jahr',
          hint: '0 % heißt: Der Betrag bleibt gleich und verliert an Kaufkraft.',
        },
      },
      end: {
        legend: 'Dauer',
        lifelong: 'Lebenslang',
        age: 'Bis zu einem Alter',
        ageField: { label: 'Endalter', hint: 'Bis zu diesem Alter wird gezahlt.' },
      },
      capitalToday: { label: 'Restkapital heute', hint: 'Das Kapital, das noch ausgezahlt wird.' },
      capitalEndAge: {
        label: 'Auszahlung bis zum Alter',
        hint: 'Der Auszahlplan leert das Kapital bis zu diesem Alter.',
      },
    },
    empty: {
      title: 'Noch keine Betriebsrente eingetragen',
      text: 'Trage deine Betriebsrente oder das Restkapital ein. Ohne Betriebsrente brauchst du hier nichts einzutragen.',
    },
    heroEyebrow: 'Betriebsrente, netto heute',
    steps: {
      title: 'Wie die Abgaben entstehen',
      healthAllowance: 'Freibetrag Krankenversicherung pro Monat',
      careThreshold: 'Freigrenze Pflegeversicherung pro Monat',
      planMonths: 'Monate des Auszahlplans',
    },
  },
  depot: {
    title: 'Altersvorsorgedepot',
    subtitle: 'Das Restkapital deines Altersvorsorgedepots mit Auszahlplan.',
    formLabel: 'Eingaben Altersvorsorgedepot',
    hint: 'Das Altersvorsorgedepot gibt es erst ab 2027. Für Personen in Rente zählt nur ein Restkapital mit Auszahlplan, ohne Einmalauszahlung und ohne Zulagen. Ältere Riester-Verträge trägst du als „Sonstige Einkünfte“ ein.',
    fields: {
      retiredCapitalToday: {
        label: 'Restkapital heute',
        hint: 'Das Kapital, das noch ausgezahlt wird.',
      },
      retiredEndAge: {
        label: 'Auszahlung bis zum Alter',
        hint: 'Mindestens 85 Jahre (gesetzliche Vorgabe).',
      },
    },
    empty: {
      title: 'Noch kein Depot eingetragen',
      text: 'Trage das Restkapital ein, falls du ein Altersvorsorgedepot hast.',
    },
    heroEyebrow: 'Altersvorsorgedepot, netto heute',
    calcTitle: 'Auszahlplan und Steuer',
  },
  etf: {
    title: 'ETF-Depot',
    subtitle: 'Dein Bestand heute und die Entnahme bis zum gewählten Alter.',
    formLabel: 'Eingaben ETF-Bestand',
    groups: { holding: 'Bestand', withdrawal: 'Entnahme', tax: 'Steuer' },
    fields: {
      holdingValue: { label: 'Depotwert heute', hint: 'Der heutige Wert aller ETF-Anteile.' },
      holdingContributions: {
        label: 'Summe aller Einzahlungen',
        hint: 'Pflichtfeld. Sie bestimmt, welcher Teil jeder Entnahme Gewinn ist. Sie darf höher sein als der Depotwert (Verlust).',
      },
      payoutEndAge: {
        label: 'Entnahme bis zum Alter',
        hint: 'Standard ist der Planungshorizont aus dem Profil.',
      },
      taxEnabled: 'Steuer auf die Entnahmen rechnen',
      advanceLumpSum: 'Vorabpauschale mitrechnen',
    },
    empty: {
      title: 'Noch kein ETF-Bestand eingetragen',
      text: 'Trage den Depotwert und die Summe aller Einzahlungen ein. Ohne die Einzahlungssumme kann die App den Gewinnanteil nicht bestimmen.',
      button: 'Depotwert eintragen',
    },
    heroEyebrow: 'ETF-Entnahme, netto heute',
    kpi: {
      gainShare: 'Gewinnanteil',
      months: 'Monate der Entnahme',
      remaining: 'Rest am Ende',
    },
    note: 'Ein Sparplan wird für Personen in Rente nicht gerechnet. Wer weiter spart, nutzt die Sparziele; die Sparplan-Eingaben bleiben gespeichert.',
    steps: {
      title: 'Wie die Steuer entsteht',
      tax: 'Steuer pro Monat (erstes Jahr)',
      net: 'Netto pro Monat',
    },
  },
} as const;
