export const overview = {
  title: 'Rentenplan',
  subtitle: 'Kurzzusammenfassung deines ETF-Sparplans und deiner Altersvorsorge.',
  headline: 'Endwert nach Steuer, Kaufkraft von heute (neutral)',
  headlineNoTax: 'Endwert ohne Steuer, Kaufkraft von heute (neutral)',
  range: (low: string, high: string) => `Spanne: ${low} bis ${high}`,
  invalid: 'Die Eingaben im ETF-Sparplan sind unvollständig. Bitte dort korrigieren.',
  goalsTitle: 'Sparziele',
  goalsEmpty: 'Du hast noch kein Sparziel.',
  goalsCreate: 'Sparziel anlegen',
  goalsOpen: 'Zu den Sparzielen',
  goalProgress: (current: string, target: string, percent: number) =>
    `${current} von ${target} (${percent} %)`,
  goalProgressLabel: (name: string) => `Fortschritt ${name}`,
  goalExpected: (month: string) => `voraussichtlich ${month}`,
  goalNotReached: 'mit dieser Rate nicht erreichbar',
  goalMissed: (month: string) => `Wunschtermin ${month} verfehlt`,
  goalDesired: (month: string) => `Wunschtermin ${month}`,
  goalInvalid: 'Eingaben unvollständig',
  sampleBadge: 'Beispielwerte',
  sampleNote:
    'Diese Zahlen stammen aus vorbelegten Werten, nicht aus deinen Angaben. Sobald du etwas änderst, verschwindet dieser Hinweis.',
  welcome: {
    title: 'Willkommen',
    intro: 'Mit dieser App planst du deine Altersvorsorge:',
    points: [
      'Prognose für ETF-Sparplan, gesetzliche Rente, Altersvorsorgedepot und betriebliche Altersvorsorge',
      'Gesamtsicht: Wie viel bleibt im Ruhestand netto pro Monat?',
      'Rentenlücke zum Wunscheinkommen und was sie schließen würde',
    ],
    stepsTitle: 'So gehst du vor',
    stepProfile: 'Profil ausfüllen (Geburtsjahr, Rentenalter)',
    stepBlocks: 'Bausteine eintragen',
    stepGap: 'Rentenlücke ansehen',
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
      'Monatliches Nettoeinkommen aus den Bausteinen in Kaufkraft von heute, verglichen mit deinem Wunscheinkommen.',
    blocks: 'Bausteine in der Gesamtsicht',
    profileInvalid: 'Die Profildaten oder Annahmen sind unvollständig.',
    toProfile: 'Zum Profil',
    toBlock: 'Zum Baustein',
    productNames: {
      etf: 'ETF-Sparplan',
      statutory: 'Gesetzliche Rente',
      retirementDepot: 'Altersvorsorgedepot',
      occupational: 'Betriebliche AV',
    },
    status: {
      included: (start?: number) => `zählt ab Alter ${start}`,
      later: (start?: number) => `zahlt erst ab Alter ${start}, im Zielalter noch nicht gezählt`,
      disabled: () => 'ausgeschaltet',
      invalid: () => 'nicht berechenbar.',
    },
    print: 'Drucken / Als PDF speichern',
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
    unverified: (key: string) => `Ungeprüfter Rechtswert verwendet: ${key}.`,
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
        'Der ETF-Baustein ist in der Gesamtsicht ausgeschaltet. Die Rechnung nimmt ihn trotzdem mit der Rate der ETF-Seite hinzu.',
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
