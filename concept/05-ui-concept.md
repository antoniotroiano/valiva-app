# 05 – UI-Konzept

## 1. Entscheidungen

| Thema | Entscheidung |
|---|---|
| Navigation | Seitenleiste mit Bereichen; auf kleinen Bildschirmen einklappbar als Menü |
| Eingabe | Pro Baustein eine Seite: Formular links, Live-Ergebnis und Diagramm rechts (überall dasselbe Muster); kein Wizard in V1 |
| Startseite | Rente pro Monat in Kaufkraft von heute plus Lücke zum Wunscheinkommen, Beitrag je Baustein als gestapeltes Diagramm, Sparziele mit Fortschrittsbalken. Was-wäre-wenn-Regler **nicht** auf der Startseite (eigener Bereich "Rentenplan") |
| Darstellung | Hell und Dunkel (Systemeinstellung, umschaltbar), hoher Kontrast, Ziel WCAG 2.1 AA, vollständig per Tastatur bedienbar |
| Sprache/Design | Deutsch, nüchternes Dashboard, Zahlenformat de-DE |

## 2. Seitenstruktur (Seitenleiste)
```text
Übersicht            Rente heute-Kaufkraft, Lücke, Zusammensetzung, Sparziele
Rentenplan           Gesamtsicht: Szenarien, Entnahmeplan, Was-wäre-wenn (ab Phase 4)
Profil               Person (Geburtsjahr, Rentenalter, Kinder) und globale Annahmen (Phase 3)
Bausteine
  ETF-Sparplan       (Phase 1)
  Gesetzliche Rente  (Phase 3)
  Betriebliche AV    (Phase 3)
  Altersvorsorgedepot(Phase 3)
  + weitere          (Phase 6)
Sparziele            Tagesgeld, Zieldatum (Phase 2)
Annahmen             Inflation, Renditen, Steuersätze, gesetzliche Werte mit Quelle/Status
Daten                Export/Import, Backup (Phase 5)
```
Menüpunkte erscheinen erst, wenn die Funktion existiert; keine leeren Seiten. Ab Phase 4b: Personen-Umschalter oben in der Seitenleiste.

## 3. Gemeinsames Seitenmuster "Baustein"
- **Kopf:** Titel, kurze Erklärung in einem Satz, Abzeichen "Prognose, keine Garantie"
- **Links (Formular):** Felder in einklappbaren Gruppen (z. B. Sparplan, Kosten, Szenarien, Steuer); jedes Feld mit Label, Einheit, Hilfetext und sinnvollem Default; Validierungsfehler direkt am Feld, in Klartext
- **Rechts (Ergebnis):** Kennzahl-Kacheln, Diagramm mit Szenarien, Jahrestabelle als Alternative zum Diagramm
- **Fußbereich:** "Annahmen anzeigen" (Formeln, verwendete Gesetzeswerte mit Quelle und `unverified`-Hinweis), Disclaimer "keine Anlage- oder Steuerberatung"
- **Wiederverwendbare Komponenten:** `PageShell`, `FieldGroup`, `NumberField` (de-DE-Parsing), `PercentField`, `MoneyField`, `ScenarioChart`, `KpiTile`, `YearTable`, `AssumptionsPanel`, `Disclaimer`
- Live-Neuberechnung mit Debounce; Berechnung im Browser

## 4. Startseite (Übersicht)
1. Große Kennzahl: "Voraussichtliche Rente pro Monat (Kaufkraft heute)" mit Szenario-Spanne
2. Rentenlücke: Wunscheinkommen vs. Prognose als Balken plus Text ("Es fehlen etwa X €/Monat")
3. Zusammensetzung: gestapeltes Balkendiagramm je Baustein
4. Sparziele: Liste mit Fortschrittsbalken, Zieldatum, nötige Rate
- Solange nur Phase 1 existiert: Kurzzusammenfassung des ETF-Sparplans und Hinweise auf fehlende Bausteine
- Leere Zustände erklären den nächsten Schritt mit einem Button

## 5. Visuelle Richtung und Barrierefreiheit
- Ruhige, neutrale Palette, eine Akzentfarbe; Szenarien nicht nur über Farbe unterscheiden (zusätzlich Linienstil/Beschriftung)
- Farben als Design-Tokens (CSS-Variablen) für Hell/Dunkel, Kontrast geprüft
- Gut lesbare Systemschrift, tabellarische Ziffern für Zahlen
- Sichtbarer Fokus, Labels an allen Feldern, Diagramm mit Textzusammenfassung und Tabellen-Alternative
- Responsive: Seitenleiste wird Menü, zweispaltiges Layout wird einspaltig
- Keine Dekoration, die Zahlen verdeckt

## 6. Phase-1-UI (konkret)
- Seitenleiste mit Übersicht, ETF-Sparplan, Annahmen
- Seite ETF-Sparplan nach Muster (Abschnitt 3), Szenarienfarben pessimistisch/neutral/optimistisch plus Linie "Einzahlungen"
- Übersicht minimal, Annahmen-Seite listet Steuerwerte aus `config/` mit Quelle und Status
- Vor dem Bauen je ein einfaches HTML-Mockup der Hauptseiten prüfen

## 7. Phase-2-UI (Sparziele)
- Neuer Menüpunkt **Sparziele** (`#goals`) zwischen ETF-Sparplan und Annahmen
- Links: Zielliste (nach Priorität sortiert) mit "Ziel hinzufügen", Budget-Feld und Summenzeile (Ziel-Raten plus ETF-Rate, Rest, Warnung bei Überschreitung); Auswahl eines Ziels öffnet das Formular nach Muster Abschnitt 3: Name, Zielbetrag, aktueller Stand, Monatsrate, Zins p. a., Zinsänderungen, Wunschtermin (optional), Startmonat, Steuer an/aus, Freibetrag mit Hinweis "gilt nur für dieses Ziel", Priorität
- Rechts: Kennzahlen (Zieldatum, Dauer, benötigte Rate für den Wunschtermin, Nettozinsen, Steuer), Liniendiagramm Saldo vs. Zielbetrag mit Tabellen-Alternative, klare Meldung bei `not_reached`
- Monatseingabe über `<input type="month">`, Fallback Textfeld mit Muster; Tastatur und Labels wie in Phase 1
- ETF-Seite: einklappbarer Abschnitt "Zielvermögen" (nominal oder Kaufkraft von heute) mit benötigter Monatsrate je Szenario
- Übersicht: Liste "Sparziele" mit Fortschritt als Text und Balken (`aktueller Stand / Zielbetrag`) und voraussichtlichem Zieldatum; ohne Ziele leerer Zustand mit Button
- Vor dem Bauen: Mockup `docs/mockups/sparziele.html` vom Autor freigeben lassen
- Details und Rechenregeln: `archive/08-phase-2-savings-goals.md`

## 8. Phase-3-UI (Rentenbausteine)
- Seitenleiste: Gruppe "Bausteine" (ETF-Sparplan, Gesetzliche Rente, Altersvorsorgedepot, Betriebliche AV) und neuer Punkt **Profil** (Person und globale Annahmen), siehe Abschnitt 2
- Bausteinseiten im Muster aus Abschnitt 3: Kennzahlen (Kapital bei Rentenbeginn, Brutto-Rente nominal und real, Abzüge, Netto real), Diagramm der Ansparphase, Tabelle; Szenarien nur bei Depot und bAV
- Altersvorsorgedepot: Zulagen je Jahr aufgeschlüsselt; Hinweis, wenn der Beitrag unter 1.800 € liegt ("Zulage bleibt liegen")
- bAV: Kachel "Netto-Aufwand pro Monat" mit Erklärung der Steuer- und Abgabenersparnis
- Gesetzliche Rente: Hinweisbox zur Vereinfachung (Abschlag ohne Verlust von Entgeltpunkten)
- `unverified`-Werte tragen an der Stelle der Anzeige einen Hinweis; die Annahmen-Seite listet die neuen Config-Dateien
- Vor dem Bauen je Teilphase ein Mockup (`profil.html`, `rente.html`, `depot.html`, `bav.html`) vom Autor freigeben lassen
- Details: `archive/09-phase-3-pension-blocks.md`

## 9. Phase-4-UI (Gesamtsicht)
- Startseite = "Rentenplan": Kennzahl Netto-Rente mit Szenario-Spanne, Wunsch und Lücke, Zusammensetzung je Baustein, Verlaufsdiagramm je Alter mit Wunsch-Linie, Kachel "Lücke schließen"
- Bausteine ohne Eingaben oder mit Fehlern: Hinweis mit Link, nicht stillschweigend weglassen
- Mockup `gesamtsicht.html` vor dem Bauen freigeben lassen
- Details: `archive/10-phase-4-overview.md` §7

## 10. Phase-4b-UI (Haushalt)
- Personen-Umschalter oben in der Seitenleiste, Seite "Haushalt" (Personen verwalten, gemeinsames Wunscheinkommen)
- Startseite mit Umschalter Haushalt/Person, Zusammensetzung nach Person und Baustein, Verlauf nach Kalenderjahren
- Hinweis auf fehlende Hinterbliebenenrente und pauschale Steuer je Person
- Mockup `haushalt.html` vor dem Bauen freigeben lassen
- Details: `archive/11-phase-4b-household.md` §6

## 11. Offen
- Farbpalette und Schrift (bei Umsetzung, mit Kontrastprüfung)
- Was-wäre-wenn-Regler im Bereich "Rentenplan" (Phase 4)
- Desktop ist Hauptziel, Handy lesbar
