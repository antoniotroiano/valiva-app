export const notices = {
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
} as const;
