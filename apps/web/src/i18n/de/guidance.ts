/** Guided start (AP-13): input status, "next step" card, empty states. */
export const guidance = {
  status: {
    empty: 'leer',
    done: 'ausgefüllt',
    hint: 'mit Hinweis',
  },
  /** Read by screen readers after the page name, e.g. "Gesetzliche Rente, ausgefüllt". */
  statusSr: {
    empty: 'noch leer',
    done: 'ausgefüllt',
    hint: 'mit Hinweis',
  },
  statusFor: (name: string) => `Status für ${name}`,
  card: {
    eyebrow: 'Nächster Schritt',
    progress: (done: number, total: number) => `${done} von ${total} erledigt`,
    hide: 'Ausblenden',
    progressLabel: 'Fortschritt',
    stepDone: 'erledigt',
    stepNext: 'nächster Schritt',
    stepOpen: 'offen',
    persons: (items: { name: string; done: number; total: number }[]) =>
      items.map((p) => `${p.name} ${p.done} von ${p.total}`).join(' · '),
    householdScope: 'Haushalt',
  },
  steps: {
    profile: {
      label: 'Profil',
      title: 'Profil prüfen',
      titlePerson: (name: string) => `Profil von ${name} prüfen`,
      text: 'Geburtsjahr und gewünschtes Rentenalter bestimmen, ab wann gerechnet wird.',
      button: 'Profil öffnen',
      buttonPerson: (name: string) => `Zum Profil von ${name}`,
    },
    statutory: {
      label: 'Gesetzliche Rente',
      title: 'Gesetzliche Rente eintragen',
      titlePerson: (name: string) => `Gesetzliche Rente von ${name} eintragen`,
      text: 'Den Betrag aus der Renteninformation eintragen. Dann rechnen wir die Rente nach Abzügen.',
      button: 'Rente eintragen',
      buttonPerson: (name: string) => `Zur Rente von ${name}`,
    },
    wish: {
      label: 'Wunscheinkommen',
      title: 'Wunscheinkommen festlegen',
      text: 'Ohne Wunscheinkommen gibt es keine Aussage zur Rentenlücke.',
      button: 'Wunsch eintragen',
    },
    joint: {
      label: 'Veranlagung',
      title: 'Gemeinsame Veranlagung klären',
      text: 'Für ein Paar hängt die Steuer davon ab, ob ihr gemeinsam veranlagt werdet. Eine Antwort dauert eine Sekunde.',
      button: 'Frage beantworten',
    },
    export: {
      label: 'Daten sichern',
      title: 'Daten sichern',
      text: 'Deine Eingaben liegen nur in diesem Browser. Eine Sicherung als Datei schützt vor Verlust.',
      button: 'Sicherung exportieren',
    },
  },
  empty: {
    next: (title: string) => `Weiter: ${title}`,
    goals: { primary: 'Ziel hinzufügen' },
  },
} as const;
