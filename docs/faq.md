# Häufige Fragen

Keine Anlage- und keine Steuerberatung, keine Rechtsberatung. Die Antworten beschreiben, was die App tut.

## Wo liegen meine Daten?

Nur in deinem Browser, im lokalen Speicher (`localStorage`) dieser Seite auf deinem Gerät. Die App sendet nichts an einen Server, setzt keine Cookies und enthält kein Tracking; die Sicherheitsrichtlinie der Seite verbietet ihr nach dem Laden jede Verbindung (`connect-src 'none'`). Die Seite selbst liegt bei GitHub Pages, GitHub sieht wie bei jeder Webseite, dass sie abgerufen wird, aber nicht, was du eingibst.

Daraus folgt: Die Daten gelten für **diesen Browser auf diesem Gerät**. Auf einem anderen Gerät oder in einem anderen Browser (auch auf demselben Gerät) siehst du sie nicht, bis du sie über Export und Import mitnimmst.

## Was passiert, wenn ich die Browserdaten lösche?

Dann sind deine Eingaben weg, auch wenn du nur "Cookies und Websitedaten" löschst. Das gilt auch für einen privaten Tab, der geschlossen wird. Die App kann sie nicht wiederherstellen. Exportiere deshalb von Zeit zu Zeit eine Sicherung (Seite **Daten**, **Daten exportieren**). Mit der Datei kannst du alles per **Importieren** zurückholen.

Die App erinnert dich daran: Hast du noch nie exportiert oder ist der letzte Export alt (mehr als 90 Tage), erscheint ein Hinweis, den du für sieben Tage ausblenden kannst. Auf der Seite "Daten" steht, wann du zuletzt exportiert hast.

## Und bei Safari?

Safari kann lokal gespeicherte Daten einer Seite löschen, wenn du die Seite eine Weile nicht benutzt hast (Safari nennt das Schutz vor Tracking). Das betrifft jede Seite, die ihre Daten nur im Browser speichert, auch diese App. Exportiere darum bei Safari besonders regelmäßig eine Sicherung. Die App weist beim Erinnerungshinweis ausdrücklich darauf hin.

## Wie sichere ich meine Daten und nehme sie auf ein anderes Gerät mit?

1. Seite **Daten** öffnen und **Daten exportieren** wählen. Der Browser speichert eine Datei `valiva-JJJJ-MM-TT.workspace.json`.
2. Die Datei auf das andere Gerät bringen (Weg und Ablageort bestimmst du).
3. Dort die App öffnen, auf **Daten** gehen, die Datei unter **Importieren** auswählen, die Vorschau prüfen und bestätigen.

Der Import **ersetzt alle aktuellen Daten**, die App führt nichts zusammen. Vorher lädt sie eine Sicherung der aktuellen Daten herunter. Eine ungültige Datei ändert nichts und zeigt eine Meldung.

**Die Datei ist nicht verschlüsselt** und enthält persönliche Finanzdaten. Lege sie sicher ab und gib sie nicht weiter.

## Kann ich die App auf dem Smartphone nutzen?

Ja, sie läuft im Browser des Smartphones. Die Seiten passen sich der Bildschirmbreite an; unten gibt es eine Leiste für die wichtigsten Bereiche. Die Daten liegen dann im Browser des Smartphones, nicht auf dem Computer. Export und Import funktionieren auch dort; wo der Browser die Datei speichert, hängt von deinem Gerät ab. Es gibt keine eigene App zum Installieren.

## Was bedeutet "ungeprüft"?

Ein Wert, den die App aus einem Gesetz oder einer Vorschrift übernimmt, ist erst "bestätigt", wenn er gegen den Gesetzestext oder eine amtliche Quelle geprüft wurde. "Ungeprüft" heißt: Das ist noch nicht gelungen oder der Wert ist eine Annahme. Die App rechnet damit, markiert ihn aber sichtbar und zeigt Hinweise in den Ergebnissen. Auf der Seite **Annahmen** steht jeder Wert mit Quelle und Status; eine Übersicht der Prüfung steht in [`legal-values-review.md`](legal-values-review.md). Prüfe Werte, die für deine Entscheidung wichtig sind, selbst nach.

## Kann ich mich auf das Ergebnis verlassen?

Nein, nicht als alleinige Grundlage. Das Ergebnis ist eine Prognose auf Basis deiner Eingaben und Annahmen. Renditen, Inflation und Gesetze ändern sich, und die App rechnet vereinfacht. Sie ersetzt weder eine Beratung noch die Rentenauskunft der Rentenversicherung. Vergleiche die Zahlen der gesetzlichen Rente mit deiner Renteninformation.

## Was kann die App noch nicht?

- **Rentner-Modus:** Personen, die ihre Rente schon beziehen, sind nicht vorgesehen. Ein Rentenbeginn in der Vergangenheit führt zu einer Fehlermeldung statt zu einem Ergebnis.
- Die App gibt es nur auf Deutsch und rechnet nach deutschem Recht.
- Bekannte Vereinfachungen stehen auf der Seite **Annahmen** und in [`assumptions.md`](assumptions.md).

## Wie lösche ich alle meine Daten?

Auf der Seite **Daten** gibt es **Alle Daten löschen …**. Nach einer Bestätigung entfernt die App alle Personen, Einkommensquellen und Sparziele aus diesem Browser. Das lässt sich nicht rückgängig machen; exportiere vorher eine Sicherung, wenn du sie behalten willst. Alternativ löschst du die Websitedaten in den Einstellungen deines Browsers.
