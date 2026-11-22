import { PROFILE_LIMITS } from '@pathwise/core';
import type { ValidationIssue } from '@pathwise/core';
import { APP_NAME } from '../appConfig';

export const de = {
  appName: APP_NAME,
  nav: {
    label: 'Hauptnavigation',
    loading: 'Wird geladen …',
    overview: 'Rentenplan',
    household: 'Haushalt',
    profile: 'Profil',
    blocks: 'Bausteine',
    etf: 'ETF-Sparplan',
    statutory: 'Gesetzliche Rente',
    depot: 'Altersvorsorgedepot',
    occupational: 'Betriebliche AV',
    goals: 'Sparziele',
    assumptions: 'Annahmen',
    data: 'Daten',
    skip: 'Zum Inhalt springen',
    inputs: 'Eingaben',
    more: 'Mehr',
    saving: 'Sparen',
    closeSheet: 'Schließen',
    pageTitle: (page: string) => `${page} – ${APP_NAME}`,
    person: 'Aktive Person',
    theme: 'Darstellung',
    themeSystem: 'System',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
  },
  household: {
    firstPersonName: 'Person 1',
    title: 'Haushalt',
    subtitle: 'Personen des Haushalts verwalten. Jede Person hat eigene Bausteine und Sparziele.',
    personsTitle: 'Personen',
    nameLabel: (n: number) => `Name von Person ${n}`,
    nameRequired: 'Bitte einen Namen eingeben.',
    active: 'aktiv',
    show: (name: string) => `${name} anzeigen`,
    add: 'Person hinzufügen',
    newPersonName: (n: number) => `Person ${n}`,
    remove: (name: string) => `${name} entfernen`,
    removeConfirm: (name: string) =>
      `${name} samt allen Bausteinen und Sparzielen dieser Person löschen? Das kann nicht rückgängig gemacht werden.`,
    sharedTitle: 'Gemeinsame Werte',
    sharedText:
      'Das Wunscheinkommen sowie Inflation, Renditeszenarien, Rentenanpassung und Entnahmerendite gelten für den ganzen Haushalt. Geburtsjahr, Rentenalter, Steuersatz im Ruhestand, Grenzsteuersatz, Sozialabgaben und Krankenversicherung gelten je Person.',
    sharedNote:
      'Wunscheinkommen, Inflation, Renditeszenarien, Rentenanpassung und Entnahmerendite gelten für den ganzen Haushalt, alles andere nur für die aktive Person.',
    openProfile: 'Zum Profil der aktiven Person',
    wishTitle: 'Wunscheinkommen',
    wishLabel: 'Wunscheinkommen im Ruhestand (Haushalt)',
    wishHint:
      'Monatliches Netto für den ganzen Haushalt in Kaufkraft von heute. Gilt ab dem Jahr, in dem die erste Person in Rente geht, solange mindestens eine Person lebt.',
    survivor: {
      title: 'Nach dem ersten Todesfall',
      intro:
        'Der Todesfall wird mit der Lebenserwartung der Personen angenommen. Die Einstellungen gelten nur für Haushalte mit genau zwei Personen.',
      needsTwo: 'Gilt nur für Haushalte mit genau zwei Personen.',
      enable:
        'Hinterbliebenenrente der gesetzlichen Rente berücksichtigen (Ehe oder eingetragene Lebenspartnerschaft)',
      lawLegend: 'Rechtslage',
      lawNew: 'Ehe ab 2002: 55 % der Rente des Verstorbenen',
      lawOld: 'Ehe vor 2002 und ein Partner vor 1962 geboren: 60 %',
      wishLabel: 'Wunscheinkommen nach dem ersten Todesfall (in % des bisherigen Wunsches)',
      wishUnit: '%',
      wishHint:
        'Ein Haushalt mit einer Person braucht meist weniger. 100 % heißt: keine Kürzung. Zulässig sind 10 bis 100 %.',
      creditNote:
        'Die Witwenrente wird auf das eigene Einkommen angerechnet: 40 % des Betrags über dem Freibetrag. Kapitalentnahmen aus dem ETF zählen dabei nicht. Die genauen Werte stehen auf der Seite „Annahmen“.',
    },
  },
  notices: {
    storageFailed: {
      text: 'Speichern im Browser ist nicht möglich. Deine letzten Änderungen gehen verloren, wenn du die Seite schließt. Exportiere deine Daten.',
      export: 'Zu den Daten',
    },
    changedElsewhere: {
      text: 'In einem anderen Fenster wurde etwas geändert. Neu laden?',
      hint: 'Wenn du hier weiterarbeitest, überschreibst du die Änderung aus dem anderen Fenster.',
      reload: 'Neu laden',
      ignore: 'Ignorieren',
    },
    exportReminder: {
      never:
        'Du hast noch nie exportiert. Deine Eingaben liegen nur in diesem Browser. Safari kann lokale Daten löschen, wenn die Seite längere Zeit nicht genutzt wird. Exportiere eine Sicherung.',
      stale: (days: number) =>
        `Dein letzter Export ist ${days} Tage alt. Deine Eingaben liegen nur in diesem Browser, und Safari kann lokale Daten löschen, wenn die Seite längere Zeit nicht genutzt wird. Exportiere eine neue Sicherung.`,
      export: 'Jetzt exportieren',
      later: 'Später',
    },
  },
  data: {
    title: 'Daten',
    subtitle: 'Sichern, wiederherstellen und auf einen anderen Rechner mitnehmen.',
    localBadge: 'Alles bleibt lokal',
    neverExported:
      'Noch nie exportiert. Deine Eingaben liegen nur in diesem Browser. Löschst du die Browserdaten, sind sie weg. Exportiere regelmäßig eine Sicherung.',
    lastExported: (when: string) => `Zuletzt exportiert: ${when}`,
    exportTitle: 'Exportieren',
    exportText: (fileName: string) =>
      `Speichert alle Personen und Bausteine in einer Datei (${fileName}).`,
    exportWarning:
      'Die Datei enthält persönliche Finanzdaten und ist nicht verschlüsselt. Bewahre sie sicher auf und gib sie nicht weiter.',
    exportButton: 'Daten exportieren',
    exportDone: (fileName: string) => `Export gestartet: ${fileName}`,
    importTitle: 'Importieren',
    importText:
      'Ersetzt alle aktuellen Daten durch den Inhalt der Datei. Vorher wird eine Sicherung deiner aktuellen Daten heruntergeladen.',
    fileLabel: 'Datei wählen (.workspace.json)',
    previewTitle: (name: string) => `Vorschau: ${name}`,
    previewExportedAt: 'Exportiert am',
    previewExportedValue: (when: string, version: string) => `${when} (Version ${version})`,
    previewPersons: 'Personen',
    previewPersonsValue: (n: number, names: string) => `${n}: ${names}`,
    previewNothing: 'keine Bausteine',
    previewSynthetic: 'Erfundene Beispieldaten',
    warningsTitle: 'Hinweise zur Datei',
    replaceButton: 'Daten ersetzen …',
    cancel: 'Abbrechen',
    confirmReplaceTitle: 'Alle aktuellen Daten ersetzen?',
    confirmReplaceText: (persons: number) =>
      `Es werden ${persons} ${persons === 1 ? 'Person' : 'Personen'} importiert. Deine aktuellen Daten werden vorher als Sicherung heruntergeladen.`,
    confirmReplaceButton: 'Sicherung laden und ersetzen',
    imported: 'Die Daten wurden importiert. Die Seite wird neu geladen.',
    importFailedStorage:
      'Die Daten konnten nicht gespeichert werden (Speicher voll oder gesperrt). Deine bisherigen Daten wurden nicht verändert.',
    fileTooLarge: 'Die Datei ist zu groß (höchstens 2 MB).',
    readFailed: 'Die Datei konnte nicht gelesen werden. Es wurde nichts geändert.',
    errorPrefix: 'Die Datei kann nicht importiert werden: ',
    errorSuffix: ' Es wurde nichts geändert.',
    examplesTitle: 'Beispieldaten laden',
    examplesText:
      'Komplett erfundene Haushalte zum Ausprobieren. Sie ersetzen deine aktuellen Daten, mit Vorschau und Bestätigung.',
    examples: {
      single: 'Einzelperson',
      couple: 'Paar',
      'couple-gap': 'Paar mit Rentenlücke',
    } as Record<string, string>,
    resetTitle: 'Alle Daten löschen',
    resetText:
      'Entfernt alle Personen, Bausteine und Sparziele aus diesem Browser. Das lässt sich nicht rückgängig machen.',
    resetButton: 'Alle Daten löschen …',
    confirmResetTitle: 'Wirklich alle Daten löschen?',
    confirmResetText:
      'Alle Personen, Bausteine und Sparziele in diesem Browser werden entfernt. Exportiere vorher eine Sicherung, wenn du sie behalten willst.',
    confirmResetExport: 'Erst exportieren',
    confirmResetButton: 'Alles löschen',
    resetDone: 'Alle Daten wurden gelöscht. Die Seite wird neu geladen.',
    resetFailed: 'Die Daten konnten nicht gelöscht werden.',
    blocks: {
      etfPlan: 'ETF-Sparplan',
      etfPayout: 'ETF-Entnahme',
      etfTarget: 'ETF-Zielvermögen',
      goals: 'Sparziele',
      statutory: 'Gesetzliche Rente',
      depot: 'Altersvorsorgedepot',
      occupational: 'Betriebliche AV',
      overview: 'Auswahl der Gesamtsicht',
    } as Record<string, string>,
    problems: {
      empty: 'Die Datei ist leer.',
      too_large: 'Die Datei ist zu groß (höchstens 2 MB).',
      invalid_json: 'Der Inhalt ist keine gültige JSON-Datei.',
      not_an_object: 'Der Inhalt hat nicht die erwartete Form.',
      wrong_format: 'Das ist keine Datei dieser App.',
      invalid_version: 'Die Dateiversion fehlt oder ist ungültig.',
      newer_version: 'Die Datei stammt aus einer neueren Version der App.',
      no_migration: 'Die Dateiversion wird nicht mehr unterstützt.',
      forbidden_key: 'Die Datei enthält unzulässige Einträge.',
      too_deep: 'Der Inhalt ist zu stark verschachtelt.',
      invalid_household: 'Die Angaben zum Haushalt sind fehlerhaft oder unvollständig.',
      invalid_person_id: 'Eine Person hat eine ungültige Kennung.',
      duplicate_person_id: 'Zwei Personen haben dieselbe Kennung.',
      too_many_persons: 'Die Datei enthält zu viele Personen (höchstens 20).',
      unknown_active_person: 'Die zuletzt angezeigte Person gibt es in der Datei nicht.',
      invalid_field: 'Einzelne Angaben der Datei sind fehlerhaft oder unvollständig.',
    } as Record<string, string>,
    warnBlockReplaced: (person: string, block: string) =>
      `${person}, ${block}: Die Angaben waren nicht lesbar und werden durch Standardwerte ersetzt.`,
    warnUnknownPerson: 'Angaben zu einer Person, die nicht im Haushalt steht, wurden ignoriert.',
    warnUnknownBlock: (person: string) =>
      `${person}: Unbekannte Angaben wurden ignoriert (vermutlich aus einer anderen Version).`,
  },
  householdView: {
    switchLabel: 'Ansicht',
    household: 'Haushalt',
    title: 'Gesamtsicht Haushalt',
    intro: (year: number) =>
      `Monatliches Nettoeinkommen aller Personen in Kaufkraft von heute, gerechnet im Jahr ${year}, in dem die letzte Person in Rente geht.`,
    invalid: 'Die Angaben einer Person sind unvollständig. Bitte dort korrigieren:',
    fixPerson: (name: string) => `Profil von ${name} öffnen`,
    loading: 'Daten werden geladen …',
    headline: (year: number, scenario: string) => `Haushalt im Jahr ${year} (${scenario})`,
    noWish: 'Ohne Wunscheinkommen gibt es keine Lücke.',
    toHousehold: 'Wunscheinkommen eintragen',
    compositionTitle: 'Zusammensetzung nach Person',
    compositionAlt: (parts: string[]) => `Nettorente je Person: ${parts.join(', ')}`,
    compositionCaption: (scenario: string) => `Nettorente je Person und Baustein (${scenario})`,
    person: 'Person',
    total: 'Gesamt',
    pathTitle: 'Verlauf nach Kalenderjahr',
    pathAlt: (scenario: string) =>
      `Gestapeltes Flächendiagramm der Nettorente je Person und Kalenderjahr, Szenario ${scenario}`,
    year: 'Jahr',
    persons: 'Personen',
    personEmpty: 'Noch keine Bausteine in der Gesamtsicht.',
    personEdit: (name: string) => `${name} bearbeiten`,
    personLine: (name: string, amount: string) => `${name}: ${amount}`,
    gapPerson: 'Person für die zusätzliche ETF-Rate',
    noSurvivor:
      'Es gibt keine Hinterbliebenenrente. Nach dem Tod der ersten Person ist die Lücke eher zu groß.',
    survivorSimplified:
      'Die Hinterbliebenenrente ist vereinfacht: nur die gesetzliche Rente, kein Sterbevierteljahr, keine Kinderzuschläge. Das Vermögen des Verstorbenen (ETF, Depot, betriebliche AV) wird nicht vererbt.',
    survivorTitle: 'Hinterbliebenenrente',
    survivorText: (deceased: string, year: number, survivor: string, amount: string) =>
      `Nach dem Tod von ${deceased} (${year}) erhält ${survivor} ab ${year + 1} eine Witwenrente von etwa ${amount} pro Monat (Kaufkraft von heute, nach Anrechnung des eigenen Einkommens).`,
    survivorNone: (deceased: string, year: number, survivor: string) =>
      `Nach dem Tod von ${deceased} (${year}) bleibt für ${survivor} keine Witwenrente übrig, weil das eigene Einkommen sie vollständig aufzehrt.`,
    survivorLegend: (name: string) => `Witwenrente für ${name}`,
    wishReduced: (percent: number) =>
      `Nach dem ersten Todesfall zählen nur noch ${percent} % des Wunscheinkommens.`,
    flatTax:
      'Die Steuer wird je Person auf die Summe ihrer Renteneinkünfte gerechnet (Einzelveranlagung), nicht gemeinsam veranlagt.',
    lumpSum: (name: string, amount: string) => `Einmalauszahlung ${name}: ${amount}`,
  },
  badge: 'Prognose, keine Garantie',
  printHeader: (title: string, date: string) => `${APP_NAME} – ${title}, Stand ${date}`,
  disclaimer: 'Keine Anlage- oder Steuerberatung. Prognosen sind keine Garantie.',
  overview: {
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
  },
  goals: {
    title: 'Sparziele',
    subtitle: 'Wann erreichst du dein Ziel, und welche Rate brauchst du bis zum Wunschtermin?',
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
  },
  withdrawal: {
    legend: 'Entnahme',
    annuity: 'Gleichbleibend bis zum Endalter (Annuität)',
    percent: 'Prozent vom Kapital bei Rentenbeginn',
    annuityHint: 'Annuität: Jeden Monat dieselbe Summe, das Kapital ist am Endalter aufgebraucht.',
    percentLabel: 'Entnahme pro Jahr (nur bei „Prozent“)',
    percentHint:
      'Im ersten Jahr wird dieser Anteil des Kapitals bei Rentenbeginn entnommen, ein Zwölftel pro Monat. Danach steigt die Summe jedes Jahr um die Inflation, die Kaufkraft bleibt also gleich. Erlaubt: größer als 0 und höchstens 100. Das Restkapital wächst weiter mit der Rendite der Entnahmephase.',
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
  },
  etf: {
    title: 'ETF-Sparplan',
    subtitle: 'Wie entwickelt sich dein Sparplan über die Jahre?',
    formLabel: 'Eingaben',
    calculatorTitle: 'Sparplan-Rechner',
    tableToggle: (years: number) => `Jahrestabelle anzeigen (${years} Jahre)`,
    calculatorSubtitle: (years: number) => `Ergebnis nach ${years} Jahren Laufzeit.`,
    groups: {
      plan: 'Sparplan',
      lumpSums: 'Einmalzahlungen',
      costs: 'Kosten',
      scenarios: 'Szenarien',
      tax: 'Steuer',
      retirement: 'Ruhestand (Entnahme)',
    },
    fields: {
      initialCapital: {
        label: 'Startkapital',
        hint: 'Bereits investiertes Kapital zu Beginn. Es fällt kein Ausgabeaufschlag an.',
      },
      monthlyContribution: {
        label: 'Monatliche Sparrate',
        hint: 'Betrag, der jeden Monat zu Monatsbeginn investiert wird.',
      },
      annualContributionIncreasePercent: {
        label: 'Jährliche Steigerung der Rate',
        hint: 'Die Rate steigt einmal pro Jahr um diesen Prozentsatz.',
      },
      durationYears: {
        label: 'Laufzeit',
        hint: 'Ganze Jahre von 1 bis 60. Gilt nur für den Sparplan-Rechner. Der Rentenplan und der Abschnitt „ETF im Ruhestand“ rechnen bis zum Entnahmebeginn und ignorieren dieses Feld.',
      },
      ter: {
        label: 'Laufende Fondskosten (TER)',
        hint: 'Wird von der Rendite abgezogen.',
      },
      entryFeePercent: {
        label: 'Ausgabeaufschlag',
        hint: 'Anteil jeder Einzahlung (Rate und Einmalzahlung), der als Kosten wegfällt.',
      },
      custodyFeeEurPerYear: {
        label: 'Depotgebühr (Betrag pro Jahr)',
        hint: 'Wird monatlich anteilig abgezogen. Optional.',
      },
      custodyFeePercentPerYear: {
        label: 'Depotgebühr (Prozent pro Jahr)',
        hint: 'Auf den Depotwert, monatlich anteilig. Optional.',
      },
      pessimistic: { label: 'Rendite pessimistisch', hint: 'Vor Kosten, pro Jahr.' },
      neutral: { label: 'Rendite neutral', hint: 'Vor Kosten, pro Jahr.' },
      optimistic: { label: 'Rendite optimistisch', hint: 'Vor Kosten, pro Jahr.' },
      inflationPercent: {
        label: 'Inflation',
        hint: 'Für die Darstellung in Kaufkraft von heute.',
      },
      taxEnabled: {
        label: 'Steuer am Ende berücksichtigen',
        hint: 'Vereinfacht: Kirchensteuer nur, wenn im Profil gewählt. Standardmäßig ohne Vorabpauschale.',
      },
      advanceLumpSum: {
        label: 'Vorabpauschale jedes Jahr berücksichtigen',
        hint: 'Der Fonds gilt jedes Jahr als teilweise verkauft: Die Steuer darauf wird jeweils aus dem Depot bezahlt und beim Verkauf am Ende angerechnet. Der Sparerpauschbetrag gilt dann in jedem Jahr, nicht nur einmal am Ende. Der Basiszins steht auf der Seite Annahmen. Braucht die Steuer am Ende.',
        assumedRate:
          'Der Basiszins ist für die Jahre 2018 bis 2026 amtlich bestätigt (BMF). Für spätere Jahre nimmt die App 3,20 % an. Das ist nicht gesichert, der echte Satz wird jedes Jahr im Januar neu festgelegt.',
      },
    },
    units: { eur: '€', percent: '%', years: 'Jahre' },
    global: {
      label: 'Rendite-Szenarien und Inflation aus den Annahmen verwenden',
      hint: 'Dann gelten die Werte aus dem Profil für alle Bausteine. Ausschalten, um eigene Werte nur für diesen Sparplan einzugeben.',
      values: (p: string, n: string, o: string, inflation: string) =>
        `Aus den Annahmen: Rendite ${p} / ${n} / ${o} pro Jahr, Inflation ${inflation}.`,
    },
    retirement: {
      payoutStartAge: {
        label: 'Beginn der Entnahme (Alter)',
        hint: 'Die Sparphase endet zu diesem Alter. Vorgeschlagen aus dem Profil, hier überschreibbar.',
      },
      payoutEndAge: {
        label: 'Ende der Entnahme (Alter)',
        hint: 'Konstante Monatsrate, bis das Kapital bei diesem Alter aufgebraucht ist. Vorgeschlagen: Lebenserwartung.',
      },
      fromProfile: 'Aus dem Profil übernehmen',
      title: 'ETF im Ruhestand',
      badge: 'gilt für den Rentenplan',
      subtitle: (start: number, years: number) =>
        `Eigene Rechnung: Sparphase bis zum Entnahmealter ${start} (${years} Jahre ab heute), nicht bis zur Laufzeit im Sparplan-Rechner.`,
      intro: (start: number, end: number, years: number) =>
        `Sparphase bis Alter ${start} (${years} Jahre ab heute), danach Entnahme bis Alter ${end}. Beträge pro Monat in Kaufkraft von heute.`,
      caption: 'ETF im Ruhestand je Szenario',
      row: 'Monat',
      capital: 'Kapital bei Entnahmebeginn (brutto, nominal)',
      gross: 'Entnahme brutto',
      tax: 'Steuer',
      net: 'Entnahme netto',
      durationNote: (own: number, months: number) =>
        `Die Sparphase ergibt sich hier aus dem Entnahmebeginn: vom aktuellen Monat bis Dezember vor dem Beginn (${months} Monate), nicht aus dem Feld Laufzeit (${own} Jahre). Einmalzahlungen zählen ab dem aktuellen Monat. Die Steuer fällt in der Entnahme an, nicht am Ende der Sparphase.`,
      taxNote:
        'Vereinfachte Steuer: Der Gewinnanteil der Entnahme bleibt konstant; Vorabpauschale nur, wenn im ETF-Sparplan eingeschaltet; Kirchensteuer nur, wenn im Profil gewählt. Der Sparerpauschbetrag gilt ungenutzt und nominal fest.',
      taxNoteAdvance:
        'Mit Vorabpauschale: Die Steuer in der Entnahme ist der Durchschnitt über alle Auszahlungsmonate. Vorabpauschale und Verkaufsgewinn teilen sich einen Sparerpauschbetrag je Jahr, bereits versteuerte Vorabpauschalen mindern die Verkaufsgewinne.',
      advanceSaving: 'Vorabpauschalen in der Sparphase (Summe, nominal)',
      advanceSavingTax: 'Davon Steuer, aus dem Depot bezahlt (nominal)',
      advancePayout: 'Vorabpauschalen in der Entnahme (Summe, nominal)',
      toProfile: 'Zum Profil',
      needsProfile: 'Für die Entnahme werden gültige Profildaten gebraucht.',
    },
    lump: {
      month: 'Monat',
      amount: 'Betrag',
      add: 'Einmalzahlung hinzufügen',
      remove: 'Entfernen',
      monthHint: 'Monat des Sparplans, 1 = erster Monat.',
      empty: 'Keine Einmalzahlungen.',
    },
    reset: 'Eingaben zurücksetzen',
    kpi: {
      finalAfterTax: 'Endwert nach Steuer (neutral)',
      finalNoTax: 'Endwert ohne Steuer (neutral)',
      contributions: 'Einzahlungen',
      gain: 'Gewinn vor Steuer',
      tax: 'Steuer',
      taxSale: 'Steuer beim Verkauf',
      advanceTax: 'Steuer auf Vorabpauschalen',
      advanceTaxNote: 'jährlich aus dem Depot',
      advanceNote:
        'Mit Vorabpauschale kann der Endwert höher liegen, weil der Sparerpauschbetrag dann jedes Jahr genutzt wird. Ohne Freibetrag wäre er etwas niedriger, weil die Steuer früher fällig wird.',
      real: 'Kaufkraft von heute',
      realHint: 'Endwert nach Steuer, deflationiert',
      realHintNoTax: 'Endwert ohne Steuer, deflationiert',
      range: (low: string, high: string) => `Spanne ${low} bis ${high}`,
    },
    chart: {
      title: 'Entwicklung des Depotwerts',
      contributions: 'Einzahlungen',
      pessimistic: 'Pessimistisch',
      neutral: 'Neutral',
      optimistic: 'Optimistisch',
      year: 'Jahr',
      summary: (final: string, start: string, years: number) =>
        `Im neutralen Szenario wächst das Depot von ${start} auf ${final} brutto nach ${years} Jahren.`,
      alt: 'Liniendiagramm mit drei Szenarien und den Einzahlungen. Die Jahrestabelle enthält dieselben Werte.',
    },
    table: {
      advanceLumpSum: 'Vorabpauschale',
      advanceTax: 'Steuer darauf',
      title: 'Jahrestabelle',
      scenario: 'Szenario',
      year: 'Jahr',
      contributed: 'Einzahlungen',
      value: 'Wert (brutto)',
      real: 'Wert real',
    },
    errors: 'Bitte korrigiere die markierten Eingaben, dann erscheint das Ergebnis.',
    assumptionsLink: 'Annahmen anzeigen',
    target: {
      title: 'Zielvermögen',
      valueLabel: 'Zielvermögen am Ende der Laufzeit',
      valueHint:
        'Die Rate ändert deinen Sparplan oben nicht. Die jährliche Steigerung gilt weiter.',
      basisLegend: 'Angabe in',
      real: 'Kaufkraft von heute',
      nominal: 'Nominal (Euro am Laufzeitende)',
      tableTitle: (current: string) => `Benötigte monatliche Startrate (aktuell ${current})`,
      cols: {
        scenario: 'Szenario',
        required: 'Benötigte Rate',
        difference: 'Unterschied zu heute',
      },
      reached: 'bereits erreicht, keine Rate nötig',
      unreachable: 'nicht erreichbar',
      note: (nominal: string) =>
        `Ziel nach Steuer. Entspricht am Laufzeitende nominal etwa ${nominal}.`,
      noteNominal: 'Ziel nach Steuer, nominal am Laufzeitende.',
    },
  },
  profile: {
    title: 'Profil',
    subtitle: 'Angaben zu dir und die Annahmen, die alle Rentenbausteine gemeinsam nutzen.',
    formLabel: 'Eingaben Profil',
    taxNote:
      'Die Einkommensteuer auf Renten rechnet die App nach dem aktuellen Tarif (Grundfreibetrag und Progression) auf die Summe aller Rentenbausteine. Solidaritätszuschlag, Kirchensteuer und Zusammenveranlagung sind nicht berücksichtigt.',
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
      churchTaxUnverified:
        'Der Kirchensteuersatz ist noch nicht gegen eine amtliche Quelle geprüft.',
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
  },
  statutory: {
    title: 'Gesetzliche Rente',
    subtitle:
      'Was bleibt von deiner Rente aus der Renteninformation, nach Abschlag, Anpassung, Steuer und Abgaben?',
    formLabel: 'Eingaben gesetzliche Rente',
    groups: { statement: 'Renteninformation', start: 'Rentenbeginn' },
    fields: {
      projectedMonthlyPensionToday: {
        label: 'Voraussichtliche Monatsrente laut Renteninformation',
        hint: 'Steht in deiner Renteninformation unter „Regelaltersrente bei Beitragszahlung bis zur Altersgrenze“, in heutigen Werten, ohne künftige Anpassung.',
      },
      projectedMonthlyPensionAtRetirementAgeToday: {
        label: 'Rente für genau diesen Rentenbeginn (optional)',
        hint: 'Steht in der Rentenauskunft für deinen Wunschtermin, in heutigen Werten. Sie enthält schon den Abschlag und die geänderte Zahl der Beitragsjahre. Leer lassen: dann wird die Rente oben nur mit Abschlag oder Zuschlag verrechnet.',
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
        hintOverride: (age: string) =>
          `Leer lassen: ${age} nach dem Gesetz für deinen Jahrgang. Nur bei Sonderfällen selbst eingeben, z. B. 66,67 für 66 Jahre und 8 Monate.`,
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
    kpi: {
      start: 'Rentenbeginn',
      grossNominal: 'Brutto pro Monat (nominal)',
      grossReal: 'Brutto pro Monat (Kaufkraft heute)',
      deductions: 'Steuer und Abgaben pro Monat (heute)',
      netReal: 'Netto pro Monat (Kaufkraft heute)',
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
      `Abschlag von ${percent} %. Du gehst ${months} Monate vor der Regelaltersgrenze in Rente. Die Rente sinkt dauerhaft um 0,3 % je Monat. Entgeltpunkte, die dir bis zur Regelaltersgrenze noch zugewachsen wären, sind nicht abgezogen (siehe Vereinfachung).`,
    late: (percent: string, months: number) =>
      `Zuschlag von ${percent} %. Du gehst ${months} Monate nach der Regelaltersgrenze in Rente, 0,5 % je Monat. Weitere Entgeltpunkte durch Arbeit nach der Regelaltersgrenze sind nicht angesetzt.`,
    empty:
      'Noch keine Renteninformation eingetragen. Trage oben den Betrag aus deiner Renteninformation ein, dann rechnen wir Anpassung, Steuer und Abgaben.',
    jumpToField: 'Zum Feld springen',
    inputInvalid: 'Bitte die markierten Eingaben links korrigieren, dann zeigen wir das Ergebnis.',
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
  },
  depot: {
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
        hint: 'Jeden Januar nach dem Start steigt der Beitrag um diesen Satz. Leer lassen: der Beitrag bleibt gleich. Über 570 € im Monat wird er gekappt.',
      },
      ownContributionMonthly: {
        label: 'Eigenbeitrag pro Monat',
        hint: 'Höchstens 6.840 € im Jahr (570 € im Monat). Die volle Grundzulage gibt es ab 1.800 € im Jahr (150 € im Monat). Unter 120 € im Jahr gibt es gar keine Zulage.',
      },
      startMonth: {
        label: 'Beitragsbeginn (Monat)',
        hint: 'Das Altersvorsorgedepot startet frühestens im Januar 2027.',
      },
      variant: {
        label: 'Variante',
        hint: 'Die Varianten unterscheiden sich hier nur bei Kosten und Garantie. Ein Wechsel der Anlage vor dem Rentenbeginn (Glide Path) ist nicht berechnet.',
      },
      costPercentPerYear: {
        label: 'Kosten pro Jahr',
        hintStandard: 'Beim Standarddepot ist 1,0 % die gesetzliche Obergrenze.',
        hint: 'Gesamtkosten pro Jahr, werden von der Rendite abgezogen.',
      },
      returnOverridePercent: {
        label: 'Rendite überschreiben (nur Garantievarianten, optional)',
        hint: 'Leer lassen, dann gelten die Szenarien aus dem Profil. Mit Wert gelten alle drei Szenarien gleich. Rendite vor Kosten.',
      },
      payoutStartAge: {
        label: 'Auszahlbeginn (Alter)',
        hint: '65 bis 70. Vorgeschlagen aus dem Profil, hier überschreibbar.',
      },
      payoutEndAge: {
        label: 'Auszahlplan bis (Alter)',
        hint: 'Mindestens 85. Eine lebenslange Rente ist nicht berechnet.',
      },
      lumpSumSharePercent: {
        label: 'Einmalauszahlung zu Beginn (% des Kapitals)',
        hint: '0 bis 30 %. Der Rest wird als Auszahlplan verteilt.',
      },
    },
    variants: {
      standard: 'Standarddepot (Kosten höchstens 1,0 %)',
      guarantee80: 'Garantie 80 % der Beiträge',
      guarantee100: 'Garantie 100 % der Beiträge',
      noGuarantee: 'Depot ohne Garantie',
    },
    fromProfile: 'Wie im Profil',
    profileTitle: 'Annahmen aus dem Profil (nur Anzeige)',
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
    scenarioNote: (label: string) => `Kennzahlen für das ${label} Szenario.`,
    scenarioNames: {
      pessimistic: 'pessimistische',
      neutral: 'neutrale',
      optimistic: 'optimistische',
    },
    kpi: {
      capital: (year: number) => `Kapital bei Auszahlbeginn (${year})`,
      own: 'Davon Eigenbeiträge',
      allowances: 'Davon Zulagen',
      grossNominal: 'Brutto pro Monat (nominal)',
      grossReal: 'Brutto pro Monat (Kaufkraft heute)',
      tax: 'Steuer pro Monat (heute)',
      netReal: 'Netto pro Monat (Kaufkraft heute)',
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
    inputInvalid: 'Bitte die markierten Eingaben links korrigieren, dann zeigen wir das Ergebnis.',
    profileInvalid: 'Das Profil enthält Fehler. Bitte dort korrigieren, dann rechnen wir weiter.',
    profileLinkInvalid: 'Zum Profil',
    assumptionsLink: 'Annahmen anzeigen',
  },
  occupational: {
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
        hint: 'Jeden Januar nach dem Start steigt die Umwandlung um diesen Satz, höchstens bis zur steuerfreien Grenze. Leer lassen: sie bleibt gleich. Arbeitgeberbeitrag und ein eigener Zuschuss bleiben gleich.',
      },
      employeeContributionMonthlyGross: {
        label: 'Entgeltumwandlung pro Monat, brutto',
        hint: 'Der Betrag, der vor Steuer und Sozialabgaben von deinem Gehalt in die Betriebsrente fließt. Steuerfrei bis 676 € im Monat, sozialabgabenfrei bis 338 € (2026).',
      },
      employerSubsidyMode: {
        label: 'Arbeitgeberzuschuss',
        hint: 'Gesetzlicher Pflichtzuschuss, konservativ auf höchstens 338 € Umwandlung angesetzt.',
        auto15: 'Automatisch: 15 % auf den sozialabgabenfreien Teil',
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
        hint: 'Abschluss-, Verwaltungs- und Fondskosten zusammen, als Abzug von der Rendite. Der Vertrag zeigt sie meist als Effektivkosten.',
      },
      guaranteedRatePercent: {
        label: 'Garantierte Mindestrendite (optional)',
        hint: 'Leer lassen, wenn dein Vertrag keine Garantie hat. Mit Wert gilt: Die Rendite nach Kosten fällt in keinem Szenario unter diesen Satz.',
      },
      payoutStartAge: {
        label: 'Auszahlbeginn (Alter)',
        hint: '62 bis 70. Vorgeschlagen aus dem Profil, hier überschreibbar.',
      },
      payoutEndAge: {
        label: 'Auszahlplan bis (Alter)',
        hint: 'Vorgeschlagen: deine Lebenserwartung aus dem Profil, hier überschreibbar. Eine lebenslange Rente ist nicht berechnet.',
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
    profileTitle: 'Annahmen aus dem Profil (nur Anzeige)',
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
    scenarioNote: (label: string) => `Kennzahlen für das ${label} Szenario.`,
    scenarioNames: {
      pessimistic: 'pessimistische',
      neutral: 'neutrale',
      optimistic: 'optimistische',
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
      netReal: 'Netto pro Monat (Kaufkraft heute)',
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
    empty:
      'Noch keine Umwandlung eingetragen. Trage oben einen Monatsbetrag ein, dann rechnen wir Netto-Aufwand, Kapital und Betriebsrente.',
    jumpToField: 'Zum Feld springen',
    inputInvalid: 'Bitte die markierten Eingaben links korrigieren, dann zeigen wir das Ergebnis.',
    profileInvalid: 'Das Profil enthält Fehler. Bitte dort korrigieren, dann rechnen wir weiter.',
    profileLinkInvalid: 'Zum Profil',
    assumptionsLink: 'Annahmen anzeigen',
  },
  glossary: {
    title: 'Begriffe',
    intro:
      'Fachbegriffe, die in der App vorkommen. Im Text sind sie gestrichelt unterstrichen; die Erklärung erscheint beim Darüberfahren oder Fokussieren.',
    terms: {
      KVdR: 'Krankenversicherung der Rentner: Pflichtversicherung für die meisten Rentner. Beiträge fallen auf gesetzliche Rente und Betriebsrente an, nicht auf Kapitalerträge aus ETFs.',
      bAV: 'Betriebliche Altersvorsorge: Vorsorge über den Arbeitgeber, meist per Entgeltumwandlung.',
      Entgeltumwandlung:
        'Du verzichtest auf einen Teil des Bruttolohns, der Betrag fließt in die betriebliche Altersvorsorge. Das spart Steuern und Sozialabgaben, mindert aber die gesetzliche Rente etwas.',
      Teilfreistellung:
        'Bei Aktienfonds bleibt ein gesetzlich festgelegter Teil der Erträge steuerfrei. Der Satz steht auf der Seite „Annahmen“.',
      Vorabpauschale:
        'Pauschal angenommener Ertrag, der bei thesaurierenden Fonds jährlich vorab versteuert wird. In der App nur, wenn du sie im ETF-Sparplan einschaltest (Standard: aus).',
      Besteuerungsanteil:
        'Der Teil der gesetzlichen Rente, der versteuert werden muss. Er hängt vom Jahr des Rentenbeginns ab und steigt für neue Rentenjahrgänge.',
      Zugangsfaktor:
        'Faktor, der die gesetzliche Rente bei frühem Beginn mindert (Abschlag) oder bei spätem Beginn erhöht (Zuschlag).',
      'Glide Path':
        'Schrittweise Umschichtung in sicherere Anlagen kurz vor dem Rentenbeginn. In der App nicht berechnet.',
    } as Record<string, string>,
  },
  assumptions: {
    title: 'Annahmen',
    subtitle: 'Gesetzliche Werte und Rechenregeln, die die Prognose verwendet.',
    taxTitle: 'Steuerwerte (config/tax-de.json)',
    cols: {
      name: 'Wert',
      value: 'Betrag',
      validFrom: 'Gültig ab',
      source: 'Quelle',
      status: 'Status',
    },
    names: {
      capitalGainsTaxRate: 'Abgeltungsteuer inkl. Soli',
      partialExemptionRate: 'Teilfreistellung Aktienfonds',
      taxFreeAllowance: 'Sparerpauschbetrag',
      capitalGainsBaseRate: 'Abgeltungsteuer (ohne Soli, Basis der Kirchensteuer-Formel)',
      solidaritySurchargeRate: 'Solidaritätszuschlag auf die Abgeltungsteuer',
      churchTaxRateLow: 'Kirchensteuer Baden-Württemberg, Bayern (nur auf Wunsch im Profil)',
      churchTaxRateHigh: 'Kirchensteuer übrige Bundesländer (nur auf Wunsch im Profil)',
      baseEarningsFactor: 'Basisertragsfaktor Vorabpauschale (Anteil des Basiszinses)',
      baseInterestAssumed: 'Basiszins ab 2027 (Annahme)',
    } as Record<string, string>,
    baseInterestTitle: 'Basiszins für die Vorabpauschale (config/tax-de.json)',
    baseInterestName: (year: number) => `Basiszins ${year}`,
    pensionTitle: 'Gesetzliche Rente (config/pension-de.json)',
    socialTitle: 'Sozialversicherung (config/social-de.json)',
    pensionNames: {
      pensionValue: 'Aktueller Rentenwert je Entgeltpunkt',
      averageEarningsYearly: 'Vorläufiges Durchschnittsentgelt pro Jahr',
      regularRetirementAge: 'Regelaltersgrenze (Jahrgang ab 1964)',
      regularAgeBeforeRaise: 'Regelaltersgrenze vor der Anhebung',
      regularAgeRaiseFirstBirthYear: 'Erster Jahrgang mit angehobener Regelaltersgrenze',
      regularAgeRaisePhase1LastBirthYear: 'Letzter Jahrgang der Ein-Monats-Schritte',
      regularAgeRaisePhase1MonthsPerYear: 'Anhebung je Jahrgang in der ersten Phase (Monate)',
      regularAgeRaisePhase2MonthsPerYear: 'Anhebung je Jahrgang in der zweiten Phase (Monate)',
      regularAgeFromBirthYear: 'Erster Jahrgang mit Regelaltersgrenze 67',
      earlyReductionPercentPerMonth: 'Abschlag je Monat vorzeitig',
      maxEarlyReductionPercent: 'Höchstabschlag',
      lateIncreasePercentPerMonth: 'Zuschlag je Monat nach der Regelaltersgrenze',
      taxableShareBasePercent: 'Besteuerungsanteil im Basisjahr',
      taxableShareBaseYear: 'Basisjahr des Besteuerungsanteils',
      taxableShareIncreasePerYear: 'Anstieg des Besteuerungsanteils pro Jahr',
      taxableShareMaxPercent: 'Höchster Besteuerungsanteil',
      survivorPensionRateNewPercent: 'Große Witwenrente: Satz (Ehe ab 2002)',
      survivorPensionRateOldPercent: 'Große Witwenrente: Satz (altes Recht)',
      survivorIncomeFreeFactor: 'Witwenrente: Freibetrag als Vielfaches des Rentenwerts',
      survivorIncomeCreditedPercent: 'Witwenrente: Anrechnung des übersteigenden Einkommens',
    },
    depotTitle: 'Altersvorsorgedepot (config/altersvorsorge-de.json)',
    depotNames: {
      basicGrantTier1Limit: 'Grundzulage: erste Stufe bis',
      basicGrantTier1RatePercent: 'Grundzulage: Satz erste Stufe',
      basicGrantTier2Limit: 'Grundzulage: zweite Stufe bis',
      basicGrantTier2RatePercent: 'Grundzulage: Satz zweite Stufe',
      childGrantRatePercent: 'Kinderzulage: Satz',
      childGrantContributionLimit: 'Kinderzulage: Beiträge bis',
      childGrantMaxPerChild: 'Kinderzulage: Höchstbetrag je Kind',
      childGrantMaxAge: 'Kinderzulage: Kind jünger als',
      youthBonusAmount: 'Bonus unter 25 (einmalig)',
      youthBonusMaxAge: 'Bonus: Alter zu Jahresbeginn unter',
      minOwnContributionYearly: 'Mindesteigenbeitrag pro Jahr',
      maxContributionYearly: 'Höchstbeitrag pro Jahr',
      firstContributionYear: 'Erstes Beitragsjahr',
      payoutStartAgeMin: 'Auszahlbeginn frühestens mit',
      payoutStartAgeMax: 'Auszahlbeginn spätestens mit',
      payoutEndAgeMin: 'Auszahlplan mindestens bis',
      lumpSumMaxPercent: 'Einmalauszahlung höchstens',
      standardCostCapPercent: 'Kostendeckel Standarddepot',
      guaranteeLevelLowPercent: 'Garantiestufe niedrig',
      guaranteeLevelHighPercent: 'Garantiestufe hoch',
    },
    incomeTaxTitle: 'Einkommensteuer (config/income-tax-de.json)',
    incomeTaxNames: {
      basicAllowance: 'Grundfreibetrag',
      zone2Limit: 'Tarifzone 2 bis',
      zone3Limit: 'Tarifzone 3 bis',
      zone4Limit: 'Tarifzone 4 bis',
      zone2CoefficientY: 'Zone 2: Koeffizient 1',
      zone2CoefficientBase: 'Zone 2: Koeffizient 2',
      zone3CoefficientZ: 'Zone 3: Koeffizient 1',
      zone3CoefficientBase: 'Zone 3: Koeffizient 2',
      zone3Constant: 'Zone 3: Konstante',
      zone4RatePercent: 'Zone 4: Grenzsteuersatz',
      zone4Constant: 'Zone 4: Konstante',
      zone5RatePercent: 'Zone 5: Grenzsteuersatz (Reichensteuer)',
      zone5Constant: 'Zone 5: Konstante',
      pensionIncomeLumpSumDeductionYearly: 'Werbungskosten-Pauschbetrag für Renten pro Jahr',
      specialExpensesLumpSumYearly: 'Sonderausgaben-Pauschbetrag pro Jahr',
    },
    socialNames: {
      healthGeneralRatePercent: 'Krankenversicherung allgemeiner Satz',
      healthAdditionalRatePercent: 'Zusatzbeitrag Krankenversicherung (Durchschnitt)',
      careRatePercent: 'Pflegeversicherung',
      careRateChildlessPercent: 'Pflegeversicherung Kinderlose',
      contributionCeilingPensionMonthly: 'Beitragsbemessungsgrenze Rentenversicherung',
      referenceIncomeMonthly: 'Bezugsgröße',
      occupationalHealthAllowanceMonthly: 'KV-Freibetrag Betriebsrente',
      occupationalCareThresholdMonthly: 'Pflege-Freigrenze Betriebsrente',
      occupationalSocialInsuranceFreeMonthly: 'Sozialversicherungsfrei umwandelbar',
      occupationalTaxFreeMonthly: 'Steuerfrei umwandelbar',
      employerSubsidyPercent: 'Arbeitgeberzuschuss Entgeltumwandlung',
    },
    units: {
      percent: '%',
      percent_per_month: '% je Monat',
      percentage_points_per_year: 'Prozentpunkte pro Jahr',
      EUR: '€',
      EUR_per_month: '€ pro Monat',
      years: 'Jahre',
      year: '',
      number: '',
      months: 'Monate',
    },
    status: { confirmed: 'bestätigt', unverified: 'ungeprüft' },
    unverifiedNote: 'Ungeprüfte Werte sind nicht gegen amtliche Quellen bestätigt.',
    configError: 'Für das heutige Datum gibt es keine gültigen Steuerwerte in der Konfiguration.',
    rulesTitle: 'Rechenregeln',
    rules: [
      'Monatlicher Zeitschritt; die Jahresrendite wird geometrisch auf den Monat umgerechnet.',
      'Nettorendite = Bruttorendite minus TER (Vereinfachung).',
      'Reihenfolge je Monat: Einzahlung nach Ausgabeaufschlag, dann Wachstum, dann Depotgebühr.',
      'Steuer beim Verkauf am Ende: (Gewinn × (1 − Teilfreistellung) − Freibetrag) × Steuersatz, mindestens 0. Kirchensteuer nur, wenn im Profil gewählt.',
      'Vorabpauschale (nur wenn im ETF-Sparplan eingeschaltet): Jedes Jahr min(Wert zu Jahresbeginn × Basiszins × 70 %, Wertzuwachs des Jahres), Käufe des Jahres anteilig nach Monaten. Steuer darauf nach Teilfreistellung und Freibetrag, aus dem Depot bezahlt; beim Verkauf mindern die versteuerten Vorabpauschalen den Gewinn.',
      'Sonst nicht berücksichtigt: Steuern während der Laufzeit.',
      'Kaufkraft von heute: Endwert nach Steuer geteilt durch (1 + Inflation) hoch Laufzeit.',
    ],
    pensionRulesTitle: 'Rechenregeln gesetzliche Rente',
    pensionRules: [
      'Ausgangspunkt ist die Hochrechnung aus der Renteninformation in heutigen Werten, keine Entgeltpunkte.',
      'Rente bei Beginn = Betrag × (1 + Rentenanpassung) hoch Jahre bis Rentenbeginn × Faktor.',
      'Faktor: Abschlag 0,3 % je Monat vor der Regelaltersgrenze (höchstens 14,4 %), Zuschlag 0,5 % je Monat danach. Der Rentenbeginn liegt zwischen 63 und 70.',
      'Kaufkraft von heute: nominale Rente geteilt durch (1 + Inflation) hoch Jahre bis Rentenbeginn.',
      'Steuer = Besteuerungsanteil im Jahr des Rentenbeginns × pauschaler Steuersatz im Alter. Der Besteuerungsanteil steigt von 84 % (2026) um 0,5 Prozentpunkte pro Jahr bis 100 %.',
      'Krankenversicherung als Pflichtversicherter: halber allgemeiner Satz plus halber Zusatzbeitrag. Pflege: voller Satz, für Kinderlose höher. Bei „Andere“ gilt dein eigener Gesamtsatz.',
      'Nicht berücksichtigt: Änderung der Entgeltpunkte bei früherem oder späterem Beginn, Freibeträge, Kirchensteuer, Erwerbsminderung und Hinterbliebenenrente.',
    ],
    depotRulesTitle: 'Rechenregeln Altersvorsorgedepot',
    depotRules: [
      'Ansparphase monatlich: Beitrag zu Monatsbeginn, dann Wachstum mit der Nettorendite (Szenario minus Kosten). Keine Steuer in der Ansparphase.',
      'Die Ansparphase endet im Dezember vor dem Jahr, in dem du das Auszahlalter erreichst (Geburtsjahr plus Alter).',
      'Zulagen je Kalenderjahr aus den Eigenbeiträgen des Jahres: Grundzulage 50 % bis 360 € und 25 % bis 1.800 € (höchstens 540 €), Kinderzulage 100 % bis 1.800 € je Kind (höchstens 300 €), Bonus 200 € im ersten Beitragsjahr unter 25. Unter 120 € im Jahr gibt es keine Zulage.',
      'Zulagen werden am Jahresende gutgeschrieben und danach verzinst. Die Kinderzulage zählt, solange das Kind jünger als 18 ist.',
      'Garantie: Bei Auszahlbeginn gilt mindestens 80 % oder 100 % der Eigenbeiträge plus Zulagen. Die Rendite von Garantieprodukten kannst du selbst eintragen.',
      'Auszahlphase: Einmalauszahlung (0 bis 30 %) zu Beginn, der Rest als Auszahlplan mit gleichbleibender nominaler Monatsrate bis zum gewählten Alter, verzinst mit der Rendite in der Rentenphase.',
      'Steuer: Auszahlungen sind voll steuerpflichtig mit dem pauschalen Steuersatz im Alter. Kranken- und Pflegeversicherung auf diese Leistung sind bei Pflichtversicherten mit 0 angesetzt (Annahme, nicht bestätigt); bei „Andere“ gilt dein eigener Satz.',
      'Nicht berücksichtigt: Sonderausgabenabzug und Günstigerprüfung, Ehegattenzulage, Wechsel aus Riester-Verträgen, Glide Path, lebenslange Rente und variabler Anteil.',
    ],
    occupationalRulesTitle: 'Rechenregeln Betriebliche Altersvorsorge',
    occupationalRules: [
      'Ansparphase monatlich wie beim Altersvorsorgedepot, aber ohne Zulagen: Umwandlung, Zuschuss und Arbeitgeberbeitrag zu Monatsbeginn, dann Wachstum mit der Rendite nach Kosten. Keine Steuer in der Ansparphase.',
      'Die Ansparphase endet im Dezember vor dem Jahr, in dem du das Auszahlalter erreichst (Geburtsjahr plus Alter).',
      'Arbeitgeberzuschuss (automatisch) = 15 % × Umwandlung bis 338 €. Nur dieser sozialabgabenfreie Teil spart dem Arbeitgeber Beiträge (konservativ).',
      'Netto-Aufwand heute = Umwandlung − Umwandlung bis 676 € × Grenzsteuersatz − Umwandlung bis 338 € × Sozialabgabensatz. Das ist eine Schätzung.',
      'Garantierte Mindestrendite: Die Rendite nach Kosten ist mindestens dieser Satz. Das ist keine Kapitalgarantie.',
      'Auszahlphase: Auszahlplan mit gleichbleibender nominaler Monatsrate bis zum gewählten Alter, verzinst mit der Rendite in der Rentenphase.',
      'Steuer: Die Rente ist voll steuerpflichtig mit dem pauschalen Steuersatz im Alter.',
      'Krankenversicherung als Pflichtversicherter: voller Satz (allgemein plus Zusatzbeitrag) auf den Teil über dem Freibetrag. Pflege: voller Satz auf die gesamte Rente, sobald sie die Freigrenze überschreitet, sonst 0. Freibetrag und Freigrenze werden mit der Inflation fortgeschrieben (Annahme, nicht bestätigt). Bei „Andere“ gilt dein eigener Satz auf die gesamte Rente.',
      'Nicht berücksichtigt: Kapitalauszahlung mit Verbeitragung über 120 Monate, Doppelverbeitragung, Direktzusage, Unterstützungskasse und lebenslange Rente.',
    ],
    withdrawalRulesTitle: 'Entnahmestrategien',
    withdrawalRules: [
      'Standard ist die Annuität: jeden Monat dieselbe Summe, das Kapital ist am Endalter aufgebraucht.',
      'Bei „Prozent“ wird im ersten Jahr der gewählte Anteil des Kapitals bei Rentenbeginn entnommen und danach jedes Jahr um die Inflation erhöht. Die Kaufkraft bleibt gleich.',
      'Das Kapital kann dabei vor dem Endalter aufgebraucht sein (Warnung mit Alter) oder übrig bleiben (Restkapital). Beides ist keine Garantie, sondern eine Rechnung mit den Annahmen oben.',
      'Nicht berechnet sind eine „dynamische“ Entnahme, die sich an der Wertentwicklung orientiert, und das Risiko schlechter Börsenjahre direkt nach Rentenbeginn.',
    ],
    goalRulesTitle: 'Rechenregeln Sparziele',
    goalRules: [
      'Monatlicher Zeitschritt; der Zins pro Jahr wird geometrisch auf den Monat umgerechnet.',
      'Je Monat: Einzahlung zu Monatsbeginn, dann Zins auf den Saldo, dann Steuer auf den Zins.',
      'Steuer bei jeder Zinsgutschrift: Zinsen über dem Rest des Sparerpauschbetrags werden mit der Abgeltungsteuer belegt. Der Pauschbetrag wird je Kalenderjahr verbraucht und im Januar zurückgesetzt, ohne Teilfreistellung; Kirchensteuer nur, wenn im Profil gewählt.',
      'Der Pauschbetrag gilt je Ziel und wird nicht mit anderen Zielen oder dem ETF-Sparplan geteilt.',
      'Das Ziel gilt als erreicht im ersten Monat, in dem der Saldo nach Steuer den Zielbetrag erreicht. Die Rechnung endet nach 50 Jahren.',
      'Die benötigte Rate ist der kleinste Cent-Betrag, mit dem das Ziel zum Wunschtermin erreicht wird.',
    ],
  },
  issues: {
    not_finite: 'Bitte eine Zahl eingeben.',
    not_integer: 'Bitte eine ganze Zahl eingeben.',
    negative: 'Der Wert darf nicht negativ sein.',
    out_of_range: (min?: number, max?: number) =>
      min !== undefined && max !== undefined
        ? `Der Wert muss zwischen ${min} und ${max} liegen.`
        : max !== undefined
          ? `Der Wert darf höchstens ${max} sein.`
          : min !== undefined
            ? `Der Wert muss mindestens ${min} sein.`
            : 'Der Wert liegt außerhalb des erlaubten Bereichs.',
    scenario_order: 'Die Renditen müssen aufsteigend sein: pessimistisch ≤ neutral ≤ optimistisch.',
    not_positive: 'Der Wert muss größer als 0 sein.',
    required: 'Bitte einen Wert angeben.',
    invalid_month: 'Bitte einen Monat im Format JJJJ-MM angeben.',
    not_after_start: 'Der Monat muss nach dem Startmonat liegen.',
    not_chronological: 'Die Monate müssen aufsteigend sein.',
    before_first_contribution_year: (min?: number) =>
      min !== undefined
        ? `Das Altersvorsorgedepot startet frühestens im Januar ${min}.`
        : 'Der Beitragsbeginn liegt zu früh.',
    before_current_year: (min?: number) =>
      min !== undefined
        ? `Der Rentenbeginn liegt in der Vergangenheit. Frühestens mit ${min} Jahren.`
        : 'Der Rentenbeginn liegt in der Vergangenheit.',
    retirement_in_past: (min?: number) =>
      `Der Rentenbeginn liegt in der Vergangenheit.${
        min !== undefined && min <= PROFILE_LIMITS.retirementAge.max
          ? ` Frühestens mit ${min} Jahren.`
          : ''
      } Der Modus für Personen, die schon in Rente sind, folgt.`,
    before_statement_year: (min?: number) =>
      min !== undefined
        ? `Der Rentenbeginn liegt vor dem Jahr der Renteninformation. Frühestens mit ${min} Jahren.`
        : 'Der Rentenbeginn liegt vor dem Jahr der Renteninformation.',
  },
} as const;

export function issueMessage(issue: ValidationIssue): string {
  if (issue.code === 'out_of_range') return de.issues.out_of_range(issue.min, issue.max);
  if (issue.code === 'before_first_contribution_year') {
    return de.issues.before_first_contribution_year(issue.min);
  }
  if (issue.code === 'before_current_year') return de.issues.before_current_year(issue.min);
  if (issue.code === 'retirement_in_past') return de.issues.retirement_in_past(issue.min);
  if (issue.code === 'before_statement_year') return de.issues.before_statement_year(issue.min);
  return de.issues[issue.code];
}
