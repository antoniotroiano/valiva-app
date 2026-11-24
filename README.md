<p align="center">
  <img src="docs/images/valiva-logo.png" alt="Valiva-Logo: ein gefaltetes türkises V auf dunkelblauem Grund" width="128" height="128">
</p>

# Valiva

**Zur App: <https://antoniotroiano.github.io/valiva-app/>**

Valiva ist ein Planer für den Ruhestand. Du trägst ein, was du an Rente und Vorsorge erwartest, zum Beispiel die gesetzliche Rente aus deiner Renteninformation, einen ETF-Sparplan oder eine Betriebsrente. Die App rechnet daraus aus, wie viel dir im Ruhestand pro Monat netto bleibt, wie weit das von deinem Wunscheinkommen entfernt ist und wie viel du zusätzlich sparen müsstest, um die Lücke zu schließen. Das geht für eine Person oder für einen ganzen Haushalt, etwa ein Paar.

Die App läuft komplett in deinem Browser. Sie hat kein Konto und keinen Server, und deine Eingaben verlassen deinen Rechner nicht.

> **Wichtig:** Valiva ist keine Anlage- und keine Steuerberatung. Die Ergebnisse sind Prognosen auf Basis von Annahmen, keine Garantie. Mehr dazu unter [Grenzen und Haftungsausschluss](#grenzen-und-haftungsausschluss).

## Was die App kann

- **ETF-Sparplan:** Prognose mit Kosten, Steuern und Inflation in drei Szenarien (pessimistisch, neutral, optimistisch), dazu die Entnahme im Ruhestand und die Frage "Welche Sparrate brauche ich für mein Zielvermögen?"
- **Gesetzliche Rente:** Schätzung aus der Renteninformation, mit Abschlag oder Zuschlag bei früherem oder späterem Rentenbeginn, Steuer sowie Kranken- und Pflegeversicherung
- **Altersvorsorgedepot und Betriebsrente (bAV):** Zulagen, Kosten, Garantien und Auszahlung
- **Rentner-Modus:** Wer schon Rente bezieht, trägt die Werte aus dem Rentenbescheid ein (Rente, Betriebsrente, Restkapital, ETF-Bestand); die App rechnet ab heute. Bei Paaren mit einer Person in Rente zeigt der Rentenplan, was heute schon ankommt
- **Sonstige Einkünfte im Alter:** zum Beispiel bestehende Riester- oder private Renten, Basisrente, Pension, Mieteinnahmen
- **Sparziele:** wie lange ein kurzfristiges Ziel dauert und wie viel du dafür monatlich zurücklegen musst, mit Zinssteuer
- **Rentenplan (Gesamtsicht):** Netto-Einkommen im Ruhestand gegen das Wunscheinkommen, Lücke oder Überschuss und die zusätzliche ETF-Rate, die die Lücke schließt
- **Haushalt:** mehrere Personen, Hinterbliebenenrente und gemeinsame Veranlagung bei Paaren
- **Daten:** Sicherung und Wiederherstellung als Datei, erfundene Beispieldaten zum Ausprobieren

Anleitungen für Nutzer:

- [Erste Schritte](docs/getting-started.md)
- [So rechnet die App (Überblick)](docs/how-it-works.md)
- [Häufige Fragen](docs/faq.md)
- [Annahmen und Rechenregeln im Detail](docs/assumptions.md) (Englisch)

## Datenschutz

- **Alles bleibt im Browser.** Deine Eingaben liegen im lokalen Speicher (`localStorage`) deines Browsers. Die App sendet nichts an einen Server, setzt keine Cookies und enthält kein Tracking. Technisch ist das durch die Sicherheitsrichtlinie der Seite abgesichert: Die App darf nach dem Laden keine Verbindungen aufbauen (`connect-src 'none'`).
- **Hoster:** Die Seite liegt bei GitHub Pages. GitHub sieht, wie bei jeder Webseite, dass die Seite abgerufen wird. Deine Eingaben kennt GitHub nicht, denn die App sendet sie nirgendwohin.
- **Sichern:** Auf der Seite "Daten" kannst du alles als Datei exportieren (`valiva-JJJJ-MM-TT.workspace.json`) und auf einem anderen Rechner wieder importieren. Der Import ersetzt alle aktuellen Daten und lädt vorher eine Sicherung der aktuellen Daten herunter.
- **Die Exportdatei ist nicht verschlüsselt** und enthält persönliche Finanzdaten. Bewahre sie sicher auf und gib sie nicht weiter.
- **Löschst du die Browserdaten, sind deine Eingaben weg.** Auch Safari kann lokale Daten einer Seite löschen, die länger nicht besucht wurde. Exportiere deshalb regelmäßig eine Sicherung; die App erinnert dich daran.
- Beispieldaten in der App und im Ordner `examples/` sind komplett erfunden.

## Grenzen und Haftungsausschluss

- **Keine Beratung.** Valiva gibt keine Anlage- und keine Steuerberatung und ersetzt weder eine Beratung noch die Rentenauskunft der Rentenversicherung.
- **Prognose, keine Garantie.** Die Ergebnisse folgen deinen Eingaben und Annahmen (Rendite, Inflation, Rentenanpassung, Steuer). Die Steuern sind vereinfacht gerechnet. Wie die Zukunft verläuft, weiß niemand.
- **Fünf gesetzliche Werte sind noch ungeprüft** und in der App überall sichtbar als "ungeprüft" markiert: die Kirchensteuersätze (8 % und 9 %), der Basiszins ab 2027, die Altersgrenze der Kinderzulage beim Altersvorsorgedepot und die Vereinfachung, dass Riester-Renten voll steuerpflichtig sind. Die Prüfung gegen die Gesetzestexte steht in [`docs/legal-values-review.md`](docs/legal-values-review.md). Prüfe Werte, auf die es dir ankommt, selbst nach.
- **Rentner-Modus mit Grenzen.** Nicht abgebildet sind Erwerbsminderungsrente, eine schon bezogene Witwenrente (trage sie als „Sonstige Einkünfte“ ein), der Altersentlastungsbetrag und Versicherte mit eigenem Beitragsmodell (freiwillig gesetzlich oder privat). Die Jahresrente des Jahres nach dem Rentenbeginn, die den steuerfreien Betrag bestimmt, schätzt die App, wenn du sie nicht einträgst.
- Die Oberfläche gibt es nur auf Deutsch, gerechnet wird nach deutschem Recht.
- Die Software wird ohne Gewähr bereitgestellt (siehe [Lizenz](LICENSE)).

## Mitwirken

Valiva wird von einer einzelnen Person privat gepflegt. Fehler und Vorschläge sind als [Issue](https://github.com/antoniotroiano/valiva-app/issues) willkommen, es gibt dafür zwei kurze Vorlagen. Bitte beachte:

- **Kein Anspruch auf Antwort**, Korrektur oder Umsetzung.
- **Keine Beratung:** Issues sind kein Ort für Fragen zu deiner Anlage-, Steuer- oder Rentenplanung.
- **Keine echten Finanzdaten** in Issues, sie sind öffentlich. Nutze erfundene Beispielwerte.
- **Pull Requests werden nicht angenommen.**
- **Sicherheitsprobleme** bitte nicht als Issue, sondern privat melden, siehe [`SECURITY.md`](SECURITY.md).

## Versionen

Valiva nutzt Semantic Versioning, aktuell `0.x` (in Entwicklung, Verhalten und Dateiformat können sich ändern). Die Änderungen je Version stehen in [`CHANGELOG.md`](CHANGELOG.md) (Englisch) und bei den [Releases auf GitHub](https://github.com/antoniotroiano/valiva-app/releases). Die Seite zeigt immer die letzte veröffentlichte Version; ihre Nummer steht unten auf der Seite "Daten". Wie eine Version veröffentlicht wird: [`docs/releasing.md`](docs/releasing.md).

## Lizenz

MIT, siehe [`LICENSE`](LICENSE). Copyright (c) 2026 antoniotroiano.
