export const overview = {
  title: 'Rentenplan',
  subtitle: 'Gesamtsicht im Ruhestand',
  subtitlePerson: (name: string) => `Gesamtsicht im Ruhestand · ${name}`,
  subtitleHousehold: (names: string) => `Gesamtsicht im Ruhestand · ${names}`,
  goalsLink: {
    title: 'Sparziele',
    text: 'Kurzfristige Ziele wie Urlaub oder Auto, getrennt von der Rente.',
  },
  sampleBadge: 'Beispielwerte',
  sampleNote:
    'Diese Zahlen stammen aus vorbelegten Werten, nicht aus deinen Angaben. Sobald du etwas änderst, verschwindet dieser Hinweis.',
  welcome: {
    title: 'Willkommen',
    intro:
      'Mit Valiva planst du, was dir im Ruhestand netto pro Monat bleibt, und ob zum Wunscheinkommen etwas fehlt.',
    stepsTitle: 'So gehst du vor',
    stepProfile: 'Profil prüfen',
    stepProfileHint: 'Geburtsjahr, Rentenalter',
    stepStatutory: 'Gesetzliche Rente eintragen',
    stepStatutoryHint: 'aus der Renteninformation',
    stepWish: 'Wunscheinkommen festlegen',
    stepWishHint: 'dann siehst du die Lücke',
    start: 'Mit meinen Daten beginnen',
    example: 'Mit Beispieldaten ausprobieren',
    localHint:
      'Beispieldaten sind erfunden. Deine Eingaben bleiben nur in diesem Browser gespeichert.',
    confirmTitle: 'Beispieldaten laden?',
    confirmText:
      'Die vorbelegten Standardwerte werden durch erfundene Beispieldaten einer Einzelperson ersetzt. Du kannst sie später unter „Daten“ wieder löschen.',
    confirmButton: 'Beispieldaten laden',
    cancel: 'Abbrechen',
    loadFailed: 'Die Beispieldaten konnten nicht geladen werden.',
  },
  wish: {
    title: 'Wunscheinkommen',
    label: 'Gewünschtes Netto-Einkommen pro Monat (Kaufkraft von heute)',
    hint: 'Ohne diesen Wert kann die Rentenlücke nicht berechnet werden.',
    unit: '€ pro Monat',
  },
  retirement: {
    title: 'Gesamtsicht im Ruhestand',
    intro:
      'Monatliches Nettoeinkommen aus den Einkommensquellen in Kaufkraft von heute, verglichen mit deinem Wunscheinkommen.',
    blocks: 'Einkommensquellen in der Gesamtsicht',
    profileInvalid: 'Die Profildaten oder Annahmen sind unvollständig.',
    toProfile: 'Zum Profil',
    toBlock: 'Zur Einkommensquelle',
    productNames: {
      etf: 'ETF-Sparplan',
      statutory: 'Gesetzliche Rente',
      retirementDepot: 'Altersvorsorgedepot',
      occupational: 'Betriebliche AV',
      otherIncome: 'Sonstige Einkünfte',
    },
    otherIncomeChip: (counted: number, total: number) =>
      `Sonstige Einkünfte: ${total} ${total === 1 ? 'Eintrag' : 'Einträge'}${
        counted < total ? `, davon ${counted} gezählt` : ''
      }`,
    status: {
      included: (start?: number) => `zählt ab Alter ${start}`,
      later: (start?: number) => `zahlt erst ab Alter ${start}, im Zielalter noch nicht gezählt`,
      ended: () => 'Ende vor dem Rentenbeginn, zählt nicht',
      disabled: () => 'ausgeschaltet',
      invalid: () => 'nicht berechenbar.',
    },
    print: 'Drucken / Als PDF speichern',
    hero: {
      chipGap: (amount: string) => `Lücke ${amount}`,
      chipCovered: 'Wunsch gedeckt',
      chipNoWish: 'Kein Wunscheinkommen',
      closeGapLink: 'So lässt sich die Lücke schließen',
    },
    sections: {
      composition: 'Zusammensetzung nach Einkommensquelle',
      more: 'Mehr dazu',
      pathMeta: 'Diagramm, drei Szenarien',
      closeGapMeta: (amount: string) => `+${amount} Sparrate (neutral)`,
      closeGapNone: 'keine zusätzliche Rate nötig',
      details: 'Details und Tabellen',
      detailsMeta: 'Werte je Szenario, Verlauf als Tabelle',
      blocksMeta: (on: number, total: number) => `${on} von ${total}`,
      notes: (count: number) => `Hinweise (${count})`,
      notesMeta: 'Hintergrund und Annahmen',
      important: (count: number) =>
        count === 1 ? '1 wichtiger Hinweis' : `${count} wichtige Hinweise`,
      blockInvalid: (name: string) => `${name}: nicht berechenbar.`,
    },
    empty: {
      title: 'Nächster Schritt: gesetzliche Rente eintragen',
      text: 'In der Gesamtsicht ist noch keine Einkommensquelle ausgefüllt. Sobald eine da ist, erscheint hier das Ergebnis.',
      primary: 'Gesetzliche Rente eintragen',
      secondary: 'Profil prüfen',
    },
    whatIf: {
      title: 'Was wäre, wenn …',
      hint: 'Nur zum Ausprobieren, nichts wird gespeichert.',
      returnLabel: 'Rendite aller Szenarien',
      returnValue: (v: string) => `${v} Prozentpunkte`,
      rateLabel: 'ETF-Sparrate',
      rateValue: (v: string) => `${v} € pro Monat`,
      rateOff: 'Der ETF-Sparplan ist in der Gesamtsicht ausgeschaltet.',
      caption: (age: number) => `Netto pro Monat im Alter ${age}, Kaufkraft von heute`,
      current: 'Aktuelle Planung',
      changed: 'Mit Änderung',
      difference: 'Unterschied',
      gapLine: (before: string, after: string) =>
        `Rentenlücke (neutral): ${before} → ${after} pro Monat.`,
      noGap: 'kein Fehlbetrag',
      invalid: 'Mit dieser Änderung ist die Rechnung nicht möglich. Bitte weniger ändern.',
      reset: 'Zurücksetzen',
      note: 'Die Rendite-Änderung gilt für alle drei Renditeszenarien, nicht für die Auszahlungsphase. Die gesetzliche Rente bleibt unverändert. Die Rate fällt nicht unter 0 €.',
    },
    statusEmpty: 'noch nichts eingetragen, zählt mit 0 €',
    snapshotCaption: (age: number) => `Monatliche Werte im Alter ${age}, Kaufkraft von heute`,
    row: 'Monat',
    scenarios: { pessimistic: 'Pessimistisch', neutral: 'Neutral', optimistic: 'Optimistisch' },
    desired: 'Wunscheinkommen',
    gross: 'Brutto',
    tax: 'Steuern und Beiträge',
    net: 'Netto',
    gap: 'Rentenlücke',
    surplus: 'Überschuss',
    totalGap: 'Gesamtlücke bis zur Lebenserwartung',
    lumpSum: 'Einmalauszahlung (netto)',
    noDesired: 'Ohne Wunscheinkommen kann keine Lücke berechnet werden.',
    notes: (total: number, important: number) =>
      important > 0
        ? `Hinweise und Annahmen (${total}), davon ${important} wichtig`
        : `Hinweise und Annahmen (${total})`,
    noteImportant: 'Wichtig',
    noteInfo: 'Info',
    firstEnd: (age: number) =>
      `Ab Alter ${age} endet die erste Auszahlung, danach wächst die Lücke.`,
    pathTitle: 'Verlauf pro Jahr',
    pathCaption: (scenario: string) =>
      `Monatliches Netto je Alter (${scenario}), Kaufkraft von heute`,
    age: 'Alter',
    /** One note for all unverified legal values; `items` are the values with their amounts. */
    unverifiedValues: (items: string) =>
      `Ungeprüfte Rechtswerte (Details unter „Annahmen“): ${items}.`,
    depotAssumptions:
      'Altersvorsorgedepot: Auszahlungen werden als voll steuerpflichtig mit pauschalem Satz und ohne Kranken- und Pflegebeiträge angenommen (nicht bestätigt).',
    unknownWarning: 'Zu dieser Berechnung gibt es einen weiteren Hinweis zu den Annahmen.',
    unverifiedTax:
      'ETF: Die Steuerwerte (Abgeltungsteuer, Teilfreistellung, Sparerpauschbetrag) sind ungeprüft.',
    etfDurationOverridden:
      'ETF: Die Sparphase läuft vom aktuellen Monat bis Dezember vor dem Rentenbeginn, nicht über die Laufzeit der ETF-Seite.',
    charts: {
      scenario: 'Szenario',
      headline: (age: number, scenario: string) =>
        `Netto-Rente ab ${age}, Kaufkraft von heute (${scenario})`,
      perMonth: (amount: string) => `${amount} pro Monat`,
      range: (low: string, high: string) => `Spanne: ${low} bis ${high}`,
      wish: (amount: string) => `Wunscheinkommen: ${amount} pro Monat`,
      gapTitle: 'Lücke zum Wunscheinkommen',
      gapText: (amount: string) => `Es fehlen etwa ${amount} pro Monat.`,
      noGap: 'Das Wunscheinkommen ist gedeckt.',
      surplus: (amount: string) => `Es bleiben ${amount} pro Monat über.`,
      singleSource: (name: string, amount: string) =>
        `Dein Netto kommt vollständig aus: ${name} (${amount}).`,
      covered: (percent: number) => `Gedeckt sind ${percent} % des Wunsches.`,
      gapBarAlt: (net: string, desired: string, percent: number) =>
        `${net} von ${desired} gedeckt (${percent} %).`,
      compositionTitle: 'Zusammensetzung',
      compositionAlt: (parts: string[]) =>
        `Gestapelter Balken der Netto-Rente: ${parts.join(', ')}. Die Tabelle enthält dieselben Werte.`,
      pathTitle: 'Verlauf je Alter',
      pathAlt: (scenario: string) =>
        `Flächendiagramm des monatlichen Netto-Einkommens je Alter (${scenario}) mit Wunschlinie. Die Verlaufstabelle enthält dieselben Werte.`,
      endMarker: (age: number) => `Auszahlung endet (${age})`,
    },
    closeGap: {
      title: 'Lücke schließen',
      intro: (desired: string, current: string) =>
        `Zusätzliche monatliche ETF-Sparrate, damit die Netto-Rente das Wunscheinkommen von ${desired} erreicht. Aktuelle ETF-Rate: ${current}.`,
      caption: 'Zusätzliche ETF-Sparrate je Szenario',
      row: 'Zusätzlich pro Monat',
      newRow: 'Neue ETF-Rate',
      status: {
        already_reached: 'schon erreicht',
        unreachable: 'nicht erreichbar',
      },
      etfOff:
        'Der ETF-Sparplan ist in der Gesamtsicht ausgeschaltet. Die Rechnung nimmt ihn trotzdem mit der Rate der ETF-Seite hinzu.',
      budgetRest: (amount: string) =>
        `Mit der neuen Rate (neutral) bleiben ${amount} im Sparbudget.`,
      budgetOver: (amount: string) =>
        `Mit der neuen Rate (neutral) liegen deine Raten ${amount} über dem Sparbudget. Das ist nur ein Hinweis.`,
      budgetBase: 'Sparbudget und Sparziele',
      noDesired: 'Ohne Wunscheinkommen im Profil gibt es nichts zu schließen.',
    },
    etfTaxSimplified:
      'ETF: Die Steuer in der Entnahme ist vereinfacht (konstanter Gewinnanteil; Vorabpauschale nur, wenn im ETF-Sparplan eingeschaltet; Kirchensteuer nur, wenn im Profil gewählt).',
    etfAdvanceLumpSum:
      'ETF: Die Vorabpauschale wird jedes Jahr berechnet und in der Sparphase aus dem Depot bezahlt. In der Entnahme zählt sie zur Steuer (Durchschnitt über alle Monate).',
    etfWithdrawalDepleted:
      'ETF: Das Kapital ist vor dem Endalter aufgebraucht. Danach zahlt der ETF nichts mehr.',
    depotWithdrawalDepleted:
      'Altersvorsorgedepot: Das Kapital des Auszahlplans ist vor dem Endalter aufgebraucht. Danach zahlt das Depot nichts mehr.',
    etfAdvanceAssumedRate:
      'ETF: Der Basiszins der Vorabpauschale ist ab 2027 angenommen (3,20 %), nicht amtlich bekannt.',
  },
} as const;
