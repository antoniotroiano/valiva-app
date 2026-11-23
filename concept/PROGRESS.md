# Fortschritt

Diese Datei ist der gemeinsame Stand zwischen Planungs- und Bau-Sessions. Nach jedem abgeschlossenen Arbeitsschritt abhaken (`[x]`), Abweichungen vom Konzept unten eintragen.

Legende: `[ ]` offen · `[x]` erledigt

## Phase 0 – Konzept
- [x] Funktionsumfang, Architektur, Stack (TypeScript)
- [x] Fachregeln-Recherche (`03-domain-rules.md`)
- [x] UI-Konzept (`05-ui-concept.md`)
- [x] Datenmodell (`06-data-model.md`)
- [x] Konzept in `concept/` aufgeteilt, `CLAUDE.md` angelegt
- [ ] Beispielwerte für Golden-Tests vom Autor erhalten (anonymisiert)
- [x] Unsichere Gesetzeswerte gegen Primärquellen prüfen (2026-11-11, `03` Abschnitt 12; 2026-11-23 AP-23, `03` Abschnitt 12a: 5 Werte bleiben `unverified`)
- [x] Name festlegen (vor GitHub-Veröffentlichung): Valiva (2026-11-22)
- [x] Lizenz festlegen (vor GitHub-Veröffentlichung): MIT, Urheber "antoniotroiano" (2026-11-23)

## Phase 1 – Rechenkern + ETF-Sparplan-Rechner (`archive/04-phase-1-etf-calculator.md`)
1. Repo-Skelett
   - [x] npm-Workspaces (`packages/core`, `apps/web`), TypeScript strict
   - [x] Vitest, Lint, Prettier
   - [x] `config/`, `docs/glossary.md` angelegt
2. Rechenkern
   - [x] Typen (`EtfPlanInput`, `EtfPlanResult`, `TaxAssumptions`, `Person`)
   - [x] Eingabevalidierung (Fehler als Daten)
   - [x] Monatsschleife (Rendite, TER, Aufschlag, Depotgebühr, Dynamik, Einmalzahlungen)
   - [x] Real-Wert (Inflation)
   - [x] Unit-Tests inkl. geschlossener Formel und Property-Tests
   - [x] Golden-Vektoren (mind. 8), Excel-gegengeprüft (10 Vektoren, im Test grün; Fälle 01, 04, 05, 06 vom Autor von Hand gegen Excel und App geprüft)
3. Steuer
   - [x] `config/tax-de.json` mit Quelle und Status
   - [x] Steuerberechnung am Ende (Teilfreistellung, Freibetrag, Abgeltungsteuer)
   - [x] Tests (Freibetrag-Grenze, Steuer 0)
4. Web-App
   - [x] Mockups der Hauptseiten geprüft (3 Mockups in `docs/mockups/`, vom Autor mit "Ja, bauen" freigegeben)
   - [x] i18n-Datei `de.ts`, Layout mit Seitenleiste
   - [x] Formular (Felder, Hilfetexte, Validierung)
   - [x] Kennzahlen-Kacheln, Szenario-Diagramm, Jahrestabelle
   - [x] Annahmen-Seite mit Rechtswerten (Quelle, Status)
   - [x] Hell/Dunkel, Tastatur, Kontrast geprüft (Textkontraste rechnerisch ≥ 4,5:1, Feldrahmen ≥ 4:1; Dunkel und schmal im Browser gesehen; Tastatur per Konstruktion mit nativen Elementen, Skip-Link, sichtbarem Fokus, Tab-Durchlauf später vom Autor bestätigt)
5. E2E und Doku
   - [x] Playwright-Smoke-Test
   - [x] README (Start, Annahmen, Disclaimer)
6. Abnahme
   - [x] Excel-Gegenprüfung der Beispielfälle (Stichprobe: Fälle 01, 04, 05, 06; übrige sechs nur per Python und Test)
   - [x] Sichtprüfung im Browser (Desktop, schmaler Bildschirm; Tastatur-Durchlauf mit Tab vom Autor bestätigt)

## Phase 2 – Sparziele und Rückwärtsrechner (`archive/08-phase-2-savings-goals.md`)
0. Aufräumen aus Phase 1
   - [x] Excel-Sperrdatei `tools/~$golden-check.xlsx` löschen, `tools/~$*` in `.gitignore`
   - [x] Deutsches Anzeigefeld für Quellentexte in `config/tax-de.json`, Nutzung im `AssumptionsPanel`
1. Kern
   - [x] Typen (`SavingsGoal`, `GoalResult`, Rückwärts-Ergebnis), Monatsfunktionen (`YYYY-MM` ↔ Index)
   - [x] Zielvalidierung (Fehler als Daten)
   - [x] `projectGoal` mit geometrischem Monatszins, Zinsänderungen, Zinssteuer (Freibetrag je Kalenderjahr)
   - [x] Gemeinsamer Solver `solveRequiredContribution`
   - [x] ETF-Rückwärtsrechner (nominal/real, je Szenario), Export in `index.ts`
2. Kerntests
   - [x] Formel-, Property- und Solver-Tests
   - [x] Golden-Vektoren Sparziele (mind. 6) und ETF-Rückwärtsrechner (mind. 3), Generator und Excel erweitert
3. Mockup
   - [x] `docs/mockups/sparziele.html` (inkl. ETF-Block "Zielvermögen") vom Autor freigegeben ("Ja, bauen", 2026-11-10)
4. Web-App
   - [x] Hook `useGoals` (localStorage `pathwise.goals.v1`), Navigation `#goals`, i18n-Texte
   - [x] Zielliste, Formular, Ergebnis (Kacheln, Diagramm, Tabelle), Meldung bei `not_reached`
   - [x] Budget-Anzeige mit Warnung
   - [x] ETF-Seite: Abschnitt "Zielvermögen"
   - [x] Übersicht: Sparziele mit Fortschritt
5. E2E und Doku
   - [x] Playwright-Smoke (Ziel anlegen, ETF-Zielvermögen)
   - [x] README ergänzt
6. Abnahme
   - [x] Excel-Gegenprüfung ausgewählter neuer Fälle (vom Autor: Spalten N/O der Sparziel-Blätter, übrige Zahlen stimmen; Abweichung bei `r…` war Generator-Fehler, behoben)
   - [x] Sichtprüfung (Desktop, schmal, Dunkel, Tastatur) (vom Autor bestätigt, inkl. Smartphone-Größe)

## Phase 3 – Gesetzliche Rente, Altersvorsorgedepot, bAV (`archive/09-phase-3-pension-blocks.md`)
**3a Profil, Config, gesetzliche Rente**
1. Config
   - [x] `config/pension-de.json` und `config/social-de.json` mit Quelle, `sourceDe` und Status
   - [x] Annahmen-Seite zeigt die neuen Werte
2. Kern
   - [x] Typen für Profil und Annahmen (inkl. `health`), `payoutPlan`, `netPension`
   - [x] `statutory`-Projector (Abschlag/Zuschlag, Anpassung, Besteuerungsanteil), Validierung
   - [x] Tests (Abschlag 63, Zuschlag 70, Besteuerungsanteil, Netto) und Golden-Vektoren (mind. 5), Generator und Excel erweitert
3. Mockups
   - [x] `docs/mockups/profil.html` und `rente.html` vom Autor freigegeben ("Ja, bauen", 2026-11-11)
4. Web-App
   - [x] Profil-Seite (`pathwise.profile.v1`), Seite Gesetzliche Rente (`pathwise.statutory.v1`), Navigation "Bausteine", i18n
   - [x] Playwright-Smoke (Rente berechnen)

**3b Altersvorsorgedepot**
5. Config und Kern
   - [x] `config/altersvorsorge-de.json` (Zulagenstaffel, Mindesteigenbeitrag, Höchstbeitrag, Auszahlphase, Kostendeckel)
   - [x] Zulagenfunktion (Grundzulage, Kinderzulage, Bonus, Mindesteigenbeitrag)
   - [x] Depot-Projector (Ansparphase, Garantie, Auszahlplan, Einmalauszahlung)
   - [x] Tests (Zulagen-Tabelle, Garantie, Auszahlplan) und Golden-Vektoren (mind. 5)
6. Mockup und Web
   - [x] `docs/mockups/depot.html` freigegeben ("Ja, bauen", 2026-11-11)
   - [x] Seite Altersvorsorgedepot mit Zulagenübersicht (`pathwise.depot.v1`), Smoke-Test

**3c bAV**
7. Kern
   - [x] bAV-Projector (Zuschuss 15 %, Netto-Aufwand, KV-Freibetrag, Pflege-Freigrenze)
   - [x] Tests und Golden-Vektoren (mind. 5)
8. Mockup und Web
   - [x] `docs/mockups/bav.html` freigegeben ("Ja, bauen", 2026-11-11)
   - [x] Seite Betriebliche AV (`pathwise.occupational.v1`), Smoke-Test

**Abschluss**
9. Doku und Abnahme
   - [x] README ergänzt
   - [x] Excel-Stichprobe und Prüfung der gesetzlichen Rente mit der eigenen Renteninformation (vom Autor, nicht im Repo) (grob geprüft, genauer bei aktiver Nutzung)
   - [x] Sichtprüfung (Desktop, schmal, Dunkel, Tastatur)

## Phase 4 – Gesamtsicht, Rentenlücke, Entnahme (`archive/10-phase-4-overview.md`)
Startet erst nach dem Abschluss von Phase 3 (Excel-Stichprobe, Renteninformation, Sichtprüfung).

**4a-1 Kern Gesamtsicht**
1. Kaufkraft-Basis vereinheitlichen
   - [x] Gesetzliche Rente real ab `currentYear`, Tests und Golden-Vektoren (`s01`–`s07`) angepasst, Abweichung zu `09` §5.2 notiert
2. Profil
   - [x] `desiredMonthlyIncomeToday` und Validierung (Profilseite, Feld optional)
3. Gesamtsicht-Kern
   - [x] `overview` (Snapshot, Verlauf, Warnungen) mit Tests und Golden-Vektoren (`o01`–`o06`)
   - [x] Minimale Web-Ansicht, Zustand `pathwise.overview.v1` (Abschnitt "Gesamtsicht im Ruhestand" auf der Übersicht, Smoke-Test)

**4a-2 ETF im Ruhestand**
4. Kern
   - [x] `etfProjector` mit Entnahme und Steuer, Tests, Golden-Vektoren
5. Web
   - [x] ETF-Seite: Entnahmefelder, Schalter globale Annahmen, Zustandsmigration; Gesamtsicht bindet ETF ein; Smoke-Test

**4a-3 Lücke schließen**
6. Solver
   - [x] `solveGapContribution` mit Tests; Kachel und Budgethinweis

**4a-4 UI Startseite**
7. Mockup und Web
   - [x] Mockup `gesamtsicht.html` vom Autor freigegeben
   - [x] Startseite mit Diagrammen, Szenarioumschalter, Hinweisen; Smoke-Test

**Abschluss**
8. Doku und Abnahme
   - [x] README ergänzt
   - [x] Abnahme durch den Autor (Excel-Stichprobe, Plausibilität mit eigenen Zahlen) (grob geprüft)
   - [x] Sichtprüfung (Desktop, schmal, Dunkel, Tastatur)

## Phase 4b – Mehrere Personen / Haushalt (`archive/11-phase-4b-household.md`)
Startet erst nach Abschluss von Phase 4a.

**4b-1 Kern und Modell**
1. Modell
   - [x] `Person`/`Profile` zusammengeführt, `Household`, geteilte Annahmen, Validierung, Tests umgestellt (siehe Notiz: `Profile`/`GlobalAssumptions` bleiben als zusammengesetzter Kontext)
2. Haushaltssicht im Kern
   - [x] `householdOverview` und `solveHouseholdGapContribution` mit Tests und Golden-Vektoren (`h01`–`h05`, Excel-Blätter in `golden-check.xlsx`; Stichprobe in Excel steht beim Autor aus)

**4b-2 Zustände und Personenverwaltung**
3. Migration
   - [x] `pathwise.household.v2` und Migration der Alt-Schlüssel (Alt-Daten bleiben als Backup), mit Tests
4. Web
   - [x] Personen-Umschalter, Seite Haushalt, Bausteinseiten und Ziele je aktiver Person; Smoke-Test

**4b-3 Haushaltssicht**
5. Mockup
   - [x] `haushalt.html` vom Autor freigegeben
6. Web
   - [x] Startseite Haushalt/Person, Lücke schließen mit Personenauswahl, Hinweise; Smoke-Test mit zwei Personen

**Abschluss**
7. Doku und Abnahme
   - [x] README ergänzt
   - [x] Abnahme durch den Autor (Excel-Stichprobe, Plausibilität mit einem Paar) (grob geprüft)
   - [x] Sichtprüfung (Desktop, schmal, Dunkel, Tastatur)

## Phase 5 – Speichern, Export/Import, Repo-Reife, Git/GitHub (`archive/12-phase-5-persistence-and-release.md`)
Startet nach Abschluss von Phase 4b. Entschieden: Export als Download und Import per Dateiauswahl, handgeschriebene Validatoren (kein Zod).

**5a Kern**
1. Block-Validatoren
   - [x] Validatoren der Bausteinzustände aus den Hooks in den Kern (`blocks.ts`), Tests
2. Workspace
   - [x] `workspace.ts` (`buildWorkspace`, `serializeWorkspace`, `parseWorkspace`, `applyWorkspace`, Migrationskette) mit Round-trip-, Property- und Fehlerfall-Tests

**5b Web**
3. Mockup
   - [x] `docs/mockups/daten.html` vom Autor freigegeben ("Ja, bauen", 2026-11-18)
4. Seite "Daten"
   - [x] `BrowserWorkspaceStore`, Export, Import mit Vorschau und Sicherung, Zurücksetzen, Hinweis "zuletzt exportiert", i18n; Smoke-Tests (`e2e/data.spec.ts`)

**5c Repo-Reife**
5. Dateien
   - [x] `examples/` (3 erfundene Workspaces) mit Test, `docs/assumptions.md`, README neu, `LICENSE` (Urheber offen), `CONTRIBUTING.md`, `.gitignore`, `package.json`-Felder
6. CI
   - [x] `.github/workflows/ci.yml` (Typecheck, Lint, Format, Test, Build, Playwright mit Chromium); lokal noch nicht in GitHub gelaufen
7. Klärung und Scan
   - [x] Name (Valiva), Lizenz (MIT, Urheber "antoniotroiano"), Präfix (`valiva.` bleibt) vom Autor entschieden (2026-11-23)
   - [x] Datenscan (keine echten Nutzerdaten, keine Geheimnisse; `.idea/` und `.claude/settings.local.json` ignoriert; `golden-check.xlsx` ohne Autor/Pfade). Archivdatei und `CLAUDE.md` noch nicht entschieden

**5d Git/GitHub (mit dem Autor)**
8. Einrichtung
   - [x] `git init`, erster Commit, Repo (**öffentlich**, nicht privat), Push, CI grün, Branch-Schutz, Dependabot, Pages (vom Autor eingerichtet und bestätigt, 2026-11-23)

**Abschluss**
9. Release und Abnahme
   - [x] Release-Checkliste (`12` §9) abgearbeitet (2026-11-23); 11 Rechtswerte bewusst `unverified` (nur Ratgeberquellen erreichbar)
   - [x] Abnahme durch den Autor (2026-11-23); Test mit echten Daten und Testpersonen folgt in den nächsten Tagen
   - [x] Sichtprüfung der Seite "Daten" (Session mit Beispieldaten, Abnahme durch den Autor, 2026-11-23)

## Spätere Phasen (Platzhalter)
- [ ] Phase 6 – Weitere Bausteine (Rest: echte Riester-/Rürup-Modelle, Immobilie, Frühstart-Rente; nur beschrieben in `15` §12)

## Phase 6b – Generischer Baustein "Sonstige Einkünfte im Alter" (`15-phase-6-generic-block.md`)
Konzept und Mockup in AP-14 (Review 14), Kern und Web in AP-15. Voraussetzung für AP-15: AP-05, AP-06 erledigt, Mockup freigegeben.

**6b-1 Konzept und Mockup (AP-14)**
- [x] Fachfragen a bis l beantwortet (2026-11-23, alle wie empfohlen)
- [x] Konzeptdatei `15-phase-6-generic-block.md` (Felder, Validierung, Gesamtsicht und Haushalt, Workspace-Format, Rechenregeln mit Beispielen, Tests, Golden-Vektoren, Abgrenzung, offene Punkte)
- [x] Mockup `docs/mockups/sonstige-einkuenfte.html` vom Autor freigegeben ("Ja, bauen", 2026-11-23)
- [x] `01`, `06`, `07`, `README.md` ergänzt

**6b-2 Kern (AP-15)**
- [x] Typen, `validateOtherIncome*`, Config-Entscheidung (`other-income-de.json`), Tests (Teil A)
- [x] `otherIncomeProjector`, Erweiterung `overview` (`OverviewProductId`, `incomeAt`, gemeinsame Schwelle, Status `ended`), Golden-Vektoren `oi01`–`oi06` (Teil A)
- [x] `householdOverview` (Weiterzahlung an Hinterbliebene), Golden-Vektoren `oi07`, `oi08`, Regressionsvektoren (Teil A)
- [x] Workspace: Block `otherIncome`, Validator, Version 2 mit Migration, Beispieldateien, Format-Golden (Teil A)

**6b-3 Web (AP-15)**
- [x] Zustand `valiva.p.<id>.otherIncome.v1`, Seite `#other`, Seitenleiste und "Eingaben"-Blatt, Rentenplan und Haushalt, Texte in `i18n/de/`, Farbe `--b-oth` mit Kontrasttest (Teil B)
- [x] E2E-Smoke und axe, README und `docs/assumptions.md` (Teil B)
- [x] Excel-Stichprobe des Autors (`golden-check.xlsx`, Blätter `oi01`–`oi08`, 2026-11-23: passt)
- [ ] Phase 7 – Desktop, Server/Sync/Login

## Notizen und Abweichungen
Format: `YYYY-MM-DD – Text`. Abweichungen vom Konzept hier eintragen, bevor sie umgesetzt werden, und betroffene Konzeptdatei nennen.
Lange Notizen stehen unverändert in `archive/PROGRESS-notes-archive.md` (Nummern wie in den Kurzzeilen). Neue Notizen: hier eine Zeile (Datum, Thema), Begründung bei Bedarf im Archiv.
- 2026-11-09 – Konzept aufgeteilt; Git wird erst mit der GitHub-Phase eingerichtet. Details: `archive/PROGRESS-notes-archive.md` Nr. 1.
- 2026-11-10 – Golden-Vektoren Phase 1: Generator `tools/generate_golden.py` und Excel-Prüfdatei. Details: `archive/PROGRESS-notes-archive.md` Nr. 2.
- 2026-11-18 – Visuelles Design überarbeitet (nur `apps/web/src/styles.css`). Details: `archive/PROGRESS-notes-archive.md` Nr. 3.
- 2026-11-10 – Neue Dev-Abhängigkeiten `fast-check` und `@types/node`. Details: `archive/PROGRESS-notes-archive.md` Nr. 4.
- 2026-11-10 – ETF-Annahme: Startkapital ohne Ausgabeaufschlag, Steuerbasis brutto. Details: `archive/PROGRESS-notes-archive.md` Nr. 5.
- 2026-11-10 – `finalValueReal` ist der Nachsteuer-Endwert deflationiert (bei ausgeschalteter Steuer = Brutto). Details: `archive/PROGRESS-notes-archive.md` Nr. 6.
- 2026-11-10 – Steuerwerte in `config/tax-de.json` stehen auf `unverified` (nur Ratgeberquellen laut `03` §8). Details: `archive/PROGRESS-notes-archive.md` Nr. 7.
- 2026-11-10 – Web: Navigation per URL-Hash, Eingaben in `localStorage`, Hell/Dunkel-Umschalter. Details: `archive/PROGRESS-notes-archive.md` Nr. 8.
- 2026-11-10 – Playwright nutzt lokales Google Chrome statt Browser-Download. Details: `archive/PROGRESS-notes-archive.md` Nr. 9.
- 2026-11-10 – Übersichtsseite zeigt nur den ETF-Endwert in Kaufkraft von heute (Phase-1-Fassung). Details: `archive/PROGRESS-notes-archive.md` Nr. 10.
- 2026-11-10 – Annahmen-Tabelle nach Sichtprüfung angepasst. Details: `archive/PROGRESS-notes-archive.md` Nr. 11.
- 2026-11-10 – Wegen fehlendem Git (CLAUDE.md) gibt es nur eine `.gitignore` als Vorbereitung, kein `git init`. Details: `archive/PROGRESS-notes-archive.md` Nr. 12.
- 2026-11-10 – Phase 1 abgeschlossen, Phase 2 geplant (Zinsfreibetrag pro Ziel). Details: `archive/PROGRESS-notes-archive.md` Nr. 13.
- 2026-11-10 – Phase 2 Schritt 0 bis 2: `sourceDe` in der Config, Aufräumen der Sperrdatei. Details: `archive/PROGRESS-notes-archive.md` Nr. 14.
- 2026-11-10 – Abweichung von `08` §4: Solver bisektiert über ganze Cent. Details: `archive/PROGRESS-notes-archive.md` Nr. 15.
- 2026-11-10 – Präzisierung `08` §3: `requiredMonthlyForTargetMonth` als `SolveResult`. Details: `archive/PROGRESS-notes-archive.md` Nr. 16.
- 2026-11-10 – Golden-Vektoren Phase 2: 8 Sparziel- und 4 ETF-Rückwärts-Vektoren. Details: `archive/PROGRESS-notes-archive.md` Nr. 17.
- 2026-11-10 – Phase 2 Schritt 3 bis 5. Details: `archive/PROGRESS-notes-archive.md` Nr. 18.
- 2026-11-10 – Abnahme-Funde Phase 2 (Prüfdatei-Fehler, keine Kernfehler). Details: `archive/PROGRESS-notes-archive.md` Nr. 19.
- 2026-11-11 – Phase 2 abgeschlossen, Rechtswerte geprüft, Phase 3 geplant. Details: `archive/PROGRESS-notes-archive.md` Nr. 20.
- 2026-11-11 – Phase 3a gebaut: Profil, gesetzliche Rente, Abweichungen zu `09`/`06`. Details: `archive/PROGRESS-notes-archive.md` Nr. 21.
- 2026-11-11 – Golden-Vektoren 3a: 7 Vektoren gesetzliche Rente. Details: `archive/PROGRESS-notes-archive.md` Nr. 22.
- 2026-11-11 – Phase 3b Schritt 5: Config und Kern Altersvorsorgedepot. Details: `archive/PROGRESS-notes-archive.md` Nr. 23.
- 2026-11-11 – Phase 3b Schritt 6: Web-Seite Depot (`#depot`). Details: `archive/PROGRESS-notes-archive.md` Nr. 24.
- 2026-11-11 – Phase 3c: bAV gebaut, Abweichungen zu `09` §5.4. Details: `archive/PROGRESS-notes-archive.md` Nr. 25.
- 2026-11-18 – Phase 3 Abschluss Schritt 9: README-Annahmen. Details: `archive/PROGRESS-notes-archive.md` Nr. 26.
- 2026-11-18 – Phase 4a-1 Schritt 1: Kaufkraft-Basis vereinheitlicht. Details: `archive/PROGRESS-notes-archive.md` Nr. 27.
- 2026-11-18 – Phase 4a-1 Schritte 2–3: `overview` gebaut. Details: `archive/PROGRESS-notes-archive.md` Nr. 28.
- 2026-11-18 – Phase 4a-2: `etfProjector` und Web-Anbindung. Details: `archive/PROGRESS-notes-archive.md` Nr. 29.
- 2026-11-18 – Phase 4a-3: `solveGapContribution` (Lücke schließen). Details: `archive/PROGRESS-notes-archive.md` Nr. 30.
- 2026-11-18 – Phase 4a-4: Startseite "Rentenplan". Details: `archive/PROGRESS-notes-archive.md` Nr. 31.
- 2026-11-12 – Phase 4b-1: Profil und globale Annahmen getrennt (Haushalt). Details: `archive/PROGRESS-notes-archive.md` Nr. 32.
- 2026-11-18 – Phase 4b-2 gebaut, Abweichung zu `11` §5. Details: `archive/PROGRESS-notes-archive.md` Nr. 33.
- 2026-11-19 – Phase 4b-3 gebaut, Wunscheinkommen am Mockup abgestimmt. Details: `archive/PROGRESS-notes-archive.md` Nr. 34.
- 2026-11-18 – Phase 5a: Block-Validatoren und Workspace-Kern. Details: `archive/PROGRESS-notes-archive.md` Nr. 35.
- 2026-11-18 – Phase 5b/5c: Seite "Daten", Beispieldateien, Repo-Dateien. Details: `archive/PROGRESS-notes-archive.md` Nr. 36.
- 2026-11-18 – Review 13 durchgeführt (Bericht `archive/13-review-report.md`). Details: `archive/PROGRESS-notes-archive.md` Nr. 37.
- 2026-11-19 – Review-Bericht `13`, Block „Sofort“ umgesetzt. Details: `archive/PROGRESS-notes-archive.md` Nr. 38.
- 2026-11-19 – Review `13` S-2 vorbereitet. Details: `archive/PROGRESS-notes-archive.md` Nr. 39.
- 2026-11-19 – Review 13 S-3 und S-5 bewusst offen gelassen. Details: `archive/PROGRESS-notes-archive.md` Nr. 40.
- 2026-11-19 – Review `13` S-6 erledigt. Details: `archive/PROGRESS-notes-archive.md` Nr. 41.
- 2026-11-19 – Review `13` S-7 erledigt. Details: `archive/PROGRESS-notes-archive.md` Nr. 42.
- 2026-11-19 – Teilphase 6a Schritt 1 und 2: Einkommensteuer im Alter (Review 13 C-2). Details: `archive/PROGRESS-notes-archive.md` Nr. 43.
- 2026-11-19 – Teilphase 6a, Schritt 3 erledigt. Details: `archive/PROGRESS-notes-archive.md` Nr. 44.
- 2026-11-19 – Teilphase 6a Schritt 4 und 5 (Abweichung von `03`, `06`, `09`). Details: `archive/PROGRESS-notes-archive.md` Nr. 45.
- 2026-11-19 – Review `13` C-3 erledigt (Abweichung von `09` §5.2, einfache Variante). Details: `archive/PROGRESS-notes-archive.md` Nr. 46.
- 2026-11-19 – Review `13` C-4 erledigt. Details: `archive/PROGRESS-notes-archive.md` Nr. 47.
- 2026-11-19 – Review `13` C-5 erledigt. Details: `archive/PROGRESS-notes-archive.md` Nr. 48.
- 2026-11-19 – Review `13` C-6 erledigt (Abweichung von `09` §5.3/§5.4). Details: `archive/PROGRESS-notes-archive.md` Nr. 49.
- 2026-11-19 – Review `13` C-7 erledigt (Abweichung von `10` §5.1). Details: `archive/PROGRESS-notes-archive.md` Nr. 50.
- 2026-11-19 – Review `13` C-9 erledigt (Abweichung von `09` §5.2). Details: `archive/PROGRESS-notes-archive.md` Nr. 51.
- 2026-11-19 – Review `13` C-10 erledigt, teils anders als im Bericht. Details: `archive/PROGRESS-notes-archive.md` Nr. 52.
- 2026-11-20 – Review 13 U-1 erledigt (Willkommenskarte). Details: `archive/PROGRESS-notes-archive.md` Nr. 53.
- 2026-11-20 – Review `13` U-2 bis U-6 erledigt (Mockup `docs/mockups/verstaendlichkeit.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 54.
- 2026-11-20 – Review `13` D-1 bis D-4 erledigt (Mockup `docs/mockups/dashboard.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 55.
- 2026-11-20 – Review `13` F-8 und F-9 erledigt (Mockup `docs/mockups/werkzeuge.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 56.
- 2026-11-20 – Review 13 F-5 Rechenkern fertig (Hinterbliebenenrente). Details: `archive/PROGRESS-notes-archive.md` Nr. 57.
- 2026-11-20 – Review `13` F-5 erledigt, Oberfläche (Mockup `hinterbliebene.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 58.
- 2026-11-20 – Review 13 F-6 Stufe 1 Rechenkern fertig (gemeinsamer Sparerpauschbetrag). Details: `archive/PROGRESS-notes-archive.md` Nr. 59.
- 2026-11-20 – Review `13` F-6 Stufe 1 erledigt (Mockup `sparziele-freibetrag.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 60.
- 2026-11-20 – Review 13 F-6 Stufe 2 (Paar-Pool) zurückgestellt. Details: `archive/PROGRESS-notes-archive.md` Nr. 61.
- 2026-11-20 – Review `13` F-15 erledigt. Details: `archive/PROGRESS-notes-archive.md` Nr. 62.
- 2026-11-20 – Review `13` F-7a (Kirchensteuer auf Kapitalerträge) erledigt, Vorabpauschale (F-7b) bleibt offen. Details: `archive/PROGRESS-notes-archive.md` Nr. 63.
- 2026-11-20 – Review 13 F-7b Rechenkern fertig (Vorabpauschale). Details: `archive/PROGRESS-notes-archive.md` Nr. 64.
- 2026-11-20 – Review `13` F-7b erledigt, Oberfläche (Mockup `vorabpauschale.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 65.
- 2026-11-20 – Review 13 F-16 Rechenkern fertig (Entnahmestrategien). Details: `archive/PROGRESS-notes-archive.md` Nr. 66.
- 2026-11-20 – Review `13` F-16 erledigt, Oberfläche (Mockup `entnahme.html` freigegeben). Details: `archive/PROGRESS-notes-archive.md` Nr. 67.
- 2026-11-22 – Review 14 durchgeführt (Bericht `14-review-report-2026-11-22.md`). Details: `archive/PROGRESS-notes-archive.md` Nr. 68.
- 2026-11-22 – Review 14: Entscheidungen des Autors eingearbeitet. Details: `archive/PROGRESS-notes-archive.md` Nr. 69.
- 2026-11-22 – Review 14 (Nachtrag): Sparziele raus aus dem Rentenplan, Splitting ja. Details: `archive/PROGRESS-notes-archive.md` Nr. 70.
- 2026-11-22 – Review 14 AP-01: Git lokal eingerichtet (`main`, `origin` privat), Notizen nach `archive/PROGRESS-notes-archive.md` ausgelagert, `arningText.ts` gelöscht; Commit/Push beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-02: Smartphone-Layout repariert (Grid, `ScrollTable`, 16 px/44 px, `theme-color`), neuer `e2e/mobile.spec.ts`, Sichtprüfung 375/320 px hell und dunkel; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-03: Navigation (Scroll nach oben, Fokus auf die `h1`, Seitentitel, untere Tab-Leiste mit Blättern bis 900 px, Skip-Link repariert), neuer `e2e/navigation.spec.ts`, Mockup `mobile-nav.html` freigegeben; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-04: Robustheit (Rentenbeginn in der Vergangenheit als Fehler über `validateRetirementTiming`, bewusst nicht in `validateProfile`; zentrale Speicherfunktion mit Warnleiste, Hinweis bei Änderung in anderem Tab, Flush bei `pagehide`, `todayLocal()`, Exportmahnung nach WebKit-Regel); Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-05 nicht umgesetzt: neuer App-Name Valiva, Umbenennung kommt vor AP-05; Dateizuordnung für den Kern vom Autor freigegeben. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-05a: Umbenennung auf Valiva (Pakete `@valiva/*`, Speicher-Präfix `valiva.*` mit Migration, Export-Kennung `valiva-workspace`, Doku); AP-05 folgt in neuer Session. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-05: Kern in Ordner gegliedert (`shared`, `tax`, `etf`, `goals`, `pension`, `household`, `overview`, `workspace`), Tests gespiegelt, `docs/architecture.md` neu; 572 Unit- und 123 E2E-Tests unverändert grün; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-06: Web in `app/`, `state/`, `lib/`, `components/{charts,forms,layout,cards}`, Seitenordner, `i18n/de/` und `styles/` gegliedert (Dunkel-Tokens einmal via `light-dark()`, sechste Datei `print.css`); 572 Unit- und 123 E2E-Tests grün, Screenshots hell bitgleich, dunkel minimale Kantenabweichung bei Schatten; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-07: Design-Mockup v2 (`docs/mockups/design-v2.html`) vom Autor mit „Ja, bauen“ freigegeben; Entscheidung in `docs/design.md` (Abschnitt „Design v2“). Abweichungen vom Ist-Stand/Konzept 05 §5: 16 px statt 15 px Basis, Hero-Zahl 48 px, Karten ohne Schatten, neue Bausteinfarben (Blau, Schiefer, Magenta, Ochsenbraun) und Statusfarben, `--field-border` etwas dunkler, Seitenleiste mit Icons und Bausteinpunkten, Bausteinseite als „Eingaben | Ergebnis | Rechenweg“ (Desktop zwei Spalten), keine „Aktive Person“-Auswahl mehr in der Desktop-Seitenleiste (Vorschlag, AP-09 entscheidet). Kein Code geändert. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-08: Design v2 Grundlagen umgesetzt (Tokens, Typo- und Abstandsskala, Icons und getönte Pille in der Navigation, `StatusChip`, `EmptyState`, `KpiTile hero`, Diagramme mit Bausteinfarben und Personenmustern, Kontrast-Test für alle Tokens, axe für Tab-Leiste); Seitenumbau bleibt AP-09 bis AP-12; auf Wunsch Zulagentabelle der Depot-Seite eingeklappt; 582 Unit- und 125 E2E-Tests grün; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-22 – Review 14 AP-09: Rentenplan „Ergebnis zuerst“ (Hero mit Wunsch daneben, Szenarioschalter, „Mehr dazu“ einklappbar, wichtige Hinweise oben, Sparziele nur Link, alter ETF-Endwert entfernt, ein Personenumschalter im Seitenkopf mit Person in der Überschrift); Mockup `rentenplan-ap09.html` freigegeben; Abweichungen: „Verlauf“ standardmäßig eingeklappt (Höhenziel), U-G offen; Haushalt 1.466 px Desktop / 2.310 px Smartphone; 582 Unit- und 133 E2E-Tests grün; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

- 2026-11-23 – Review 14 AP-10: Bausteinseiten-Vorlage (`BlockPage`/`BlockSection`, `ResultFrame`, `StepsTable`, `ScenarioTable`, `WarningList`) und ETF-Seite in Sparphase und Ruhestand (Mockup `etf-ap10.html` freigegeben; 540 auf 270 Wörter, 2.843 auf 2.078 px); U-G aus AP-09 erledigt. Abweichung: Smartphone-Reihenfolge Ergebnis, Eingaben, Rechenweg; Schalter "aus den Annahmen" bleibt als eingeklappte Zeile. 590 Unit- und 140 von 141 E2E-Tests grün (Skip-Link-Test schlägt auch auf HEAD im Dev-Server fehl, Backlog); Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

- 2026-11-23 – Review 14 AP-11: Depot, bAV und gesetzliche Rente auf `BlockPage` (Mockup `depot-ap11.html` freigegeben; Wörter 596/728/471 auf 277/260/191; Zulagentabelle am Smartphone als Kartenliste; Hinweise nach Gewicht gebündelt; `MoreInfo` öffnet bei Fehler). Abweichungen: Smartphone-Kennzahlen in 2 Spalten, Eingabegruppen eingeklappt. 594 Unit- und 163 von 164 E2E-Tests grün (Skip-Link-Test unverändert rot); Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

- 2026-11-23 – Review 14 AP-12: Annahmen-Seite zweigeteilt ("Deine Annahmen" nur lesend, "Gesetzliche Werte" je Bereich eingeklappt mit Abzeichen "n ungeprüft"/"alle bestätigt", Regeln und Begriffe eingeklappt; Mockup `annahmen-ap12.html` freigegeben; 3.093 auf 171 Wörter, 10.472 auf 1.350 px). Abweichungen: Prüfprotokoll in Quellentexten per Anzeige-Parser abgetrennt (`config/` unverändert), Gültigkeit als deutsches Datum, Glossar eingeklappt. 5 Werte ungeprüft, alle sichtbar markiert. 611 Unit- und 174 von 175 E2E-Tests grün (Skip-Link-Test unverändert rot); Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

- 2026-11-23 – Review 14 AP-13: Geführter Einstieg (Status je Eingabeseite in Seitenleiste und Handy-Blatt, Karte "Nächster Schritt" statt Willkommenskarte, ausblendbar, `valiva.onboarding` mit `hidden`; leere Zustände mit Knopf; Begriff "Einkommensquellen" statt "Bausteine"; Mockup `fuehrung-ap13.html` freigegeben). Abweichungen: Seitenleiste 272 px, "leer" bei Profil/ETF = unverändert gegenüber den Vorgaben, Export-Mahnung weicht auf dem Rentenplan der Karte. 621 Unit- und 189 von 190 E2E-Tests grün (Skip-Link-Test unverändert rot); Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

- 2026-11-23 – Review 14 AP-14: Konzept `15-phase-6-generic-block.md` und Mockup `docs/mockups/sonstige-einkuenfte.html` (freigegeben, "Ja, bauen"); `01`, `06`, `07`, `README.md` ergänzt, kein Code geändert. Abweichungen vom bisherigen Konzept: (1) `12` §3/§4: Workspace-Version 1 auf 2 für einen neuen optionalen Block (statt Version unverändert wie bei F-16), damit ältere App-Versionen neue Dateien ablehnen; (2) `10` §5.2: `OverviewProductKind` wird zu `OverviewProductId` mit `otherIncome:<id>` (ein Produkt je Eintrag), Status `ended` neu, `incomeAt` verallgemeinert; (3) `11` §4.1a: Weiterzahlung `survivorPercent` je Eintrag wirkt nur mit `survivorPension` und genau zwei Personen, Steuer bei der überlebenden Person; (4) `06` §4: Riester/Rürup/Versicherung laufen bis zu echten Modellen über den Eintragstyp statt über `legacy`; (5) Bezeichnung "Phase 6b", weil 6a die Einkommensteuer im Alter war; (6) ein Eintrag mit Fachfehlern wird gespeichert und in der UI markiert, nur Struktur-/Bereichsfehler verwerfen beim Import den Block. Rechtsregeln des Konzepts sind ungeprüft (`07` Punkt 14). Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-23 – AP-15 Teil A (Abweichung von "ein AP pro Session", `14` §0): AP-15 wird in zwei Sessions gebaut, weil das Paket zu groß ist. Teil A = `15` §13 Schritte 1 bis 4 (Config und Typen mit Validierung, Projektor und `overview`, Haushalt mit Hinterbliebenen, Workspace-Version 2 mit Migration und Beispieldateien), keine UI. Teil B = Schritte 5 und 6 (Seite, Hook, Seitenleiste, Rentenplan, Haushalt, E2E, Doku, Excel-Stichprobe). AP-15 bleibt in der Statustabelle "teilweise (Teil A erledigt, Teil B offen)". Entscheidungen zu `15` §14 (Teil A): (1) eigene Datei `config/other-income-de.json`, in Teil A nur Kernseite (Typen, `resolveLegalParameters` mit optionalem 5. Parameter), die sechste Gruppe auf der Annahmen-Seite folgt in Teil B; (2) gemeinsame Schwelle nur in `overview`, bAV-Projektor und bAV-Seite unverändert, Hinweis `shared_occupational_threshold`; (5) Pauschbetrag bei Miete: Rechnung unverändert, nur Hinweis (`kind = rent`), Aufteilung ins Backlog; (10) Grenze 10 Einträge als Konstante im Kern. Versorgungsfreibetrag, Ertragsanteil-Tabelle und Abgaben auf Hinterbliebenen-Anteile bleiben bekannte Einschränkungen (Doku und Backlog).
- 2026-11-23 – AP-15 Teil A erledigt (Kern, Workspace-Version 2, Golden `oi01`–`oi08`, keine UI; Teil B offen, Statustabelle "teilweise"): `config/other-income-de.json` (5 Regeln, alle ungeprüft), `projectOtherIncome`, `overview` mit `OverviewProductId`/`ended`/gemeinsamer Schwelle, `householdOverview` mit Weiterzahlung (anrechenbares Einkommen: alle Einträge, vom Autor entschieden), Block `otherIncome` mit Import-Grenzen; 755 Unit-Tests, bestehende Vektoren bitgleich, E2E 189 von 190 (Skip-Link unverändert rot); Commit beim Autor. Festlegungen: `15` §15. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-23 – AP-15 Teil B erledigt (Web: Seite `#other`, Hook `useOtherIncome`, Seitenleiste und "Eingaben"-Blatt, Rentenplan und Haushalt, sechste Gruppe der Annahmen-Seite, Farbe `--b-oth`, E2E und axe; AP-15 in der Statustabelle erledigt, offen nur die Excel-Stichprobe des Autors): Abweichungen von "bestehende Tests unverändert": (1) `e2e/assumptions.spec.ts` zählt jetzt sechs Wertegruppen (89 statt 84 Werte, "10 ungeprüft") und sieben Regelzeilen; (2) `e2e/overview.spec.ts` Höhenwächter der Haushaltsseite am Handy von 2.400 auf 2.550 px, weil das Paar-Beispiel jetzt Einträge hat und die ungeprüften Regeln als eine zusätzliche wichtige Zeile erscheinen (zusammengefasst, nicht fünf Zeilen); (3) `apps/web/test/inputStatus.test.ts` und `assumptionsPage.test.ts` kennen den neuen Block bzw. die sechste Gruppe; `a11y.spec.ts` und `mobile.spec.ts` prüfen die neue Seite mit. 760 Unit-Tests, E2E 200 von 201 (Skip-Link unverändert rot). Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md` und `15` §16.

- 2026-11-23 – Review 14 AP-16: Paar-Besteuerung (Splitting §32a Abs. 5 EStG) nur nach ausdrücklicher Antwort bei zwei Personen (Feld `jointAssessment`, Workspace-Version 2 unverändert, Config `joint-assessment-de.json`, 72 € ungeprüft; gemeinsam ab dem Jahr, in dem beide in Rente sind, bis zum Jahr nach dem ersten Todesfall; Verteilung nach steuerpflichtigen Anteilen; Mockup `splitting-ap16.html` freigegeben). Abweichungen: Property "nie höher" nur bis 2 € Rundung; Höhenwächter Haushaltsseite 1.700/2.750 px; Annahmen-Tests auf sieben Gruppen (91 Werte). 834 Unit-Tests, E2E 207 von 209 (Skip-Link unverändert rot); Excel-Stichprobe des Autors steht aus; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

- 2026-11-23 – Review 14 AP-17 (teilweise): Release-Entscheidungen des Autors festgehalten: Urheber "antoniotroiano", Präfix `valiva.` und Repo `valiva-app` bleiben, Archivdatei nach `docs/archive/`, `CLAUDE.md` bleibt, Hosting GitHub Pages, Veröffentlichung **bewusst ohne Rentner-Modus** (AP-19/AP-20 bleiben offen und kommen danach; README nennt die Grenze). Wichtig: Das Repo ist **öffentlich** und war es von Anfang an (Annahme "privat" in älteren Texten überholt). Datenscan Dateien und Verlauf sauber; CI-Lauf auf `56db5ea` im Job `e2e` rot (Skip-Link-Test); 11 Rechtswerte weiter `unverified`; Excel-Stichprobe und Abnahme mit eigenen Daten stehen beim Autor aus. Abweichung: Archivdatei per `mv` nach `docs/archive/` (`.prettierignore`, `CLAUDE.md`, `concept/README.md`, `01` angepasst). Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-23 – AP-17 Nachtrag: README auf Nutzer ausgerichtet (Link zur App `https://antoniotroiano.github.io/valiva-app/`, kurze Funktionsübersicht; Start, Befehle, Struktur, Beitragen entfernt, weil nur der Autor entwickelt). `CONTRIBUTING.md` besteht noch, ist aber nicht mehr verlinkt (Entscheidung offen). CI: laut Autor seit dem vorletzten Lauf e2e wieder mit einem Fehler rot; Logs folgen vom Autor.
- 2026-11-23 – AP-17 Nachtrag 2: CI-Fehler war der Höhenwächter der Haushaltsseite am Desktop (`e2e/overview.spec.ts`, CI 1.717 px gegen Grenze 1.700, lokal 1.672 px; Linux-Schriften). Abweichung von "bestehende Tests unverändert": Grenze auf 1.760 px. Der Skip-Link-Test ist in der CI grün, lokal mit Google Chrome weiter rot (Ursache nicht untersucht). Commit beim Autor.
- 2026-11-23 – AP-17 Nachtrag 3: `CONTRIBUTING.md` nach `docs/archive/`; Excel-Stichprobe vom Autor bestätigt (wichtige Blätter angesehen, ohne Aufstellung je Blatt); Name Valiva vom Autor extern geprüft, keine eigene Domain (GitHub Pages); Rebase auf `origin/main` auf Wunsch des Autors ausgeführt (Abweichung von "kein rebase"). Offen: Abnahme mit eigenen Daten, Rechtswerte, AP-19/20. Commit beim Autor.
- 2026-11-23 – AP-17 abgeschlossen (erledigt): Abnahme durch den Autor, Excel bestätigt, CI grün, Pages und Dependabot laufen. Rechtswerte erneut geprüft (Basiszins 2026 = 3,20 % durch mehrere Quellen bestätigt, Eintrag war schon `confirmed`); die 11 `unverified`-Werte bleiben bewusst, weil keine Primärquelle erreichbar war, die UI markiert sie weiter. Offen nur: Test mit echten Daten und Testpersonen (Autor), AP-18 bis AP-20 in eigenen Sessions. Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.

## Offene Fragen aus dem Bau
- (leer)

- 2026-11-23 – Review 14: AP-21 (Backlog-Durchsicht und Restpunkte) und AP-22 (Versionierung, automatisches Release, Start `0.1.0`) neu angelegt, vor AP-19/20 und AP-18. Details: `14-review-report-2026-11-22.md`. Kein Code geändert.

- 2026-11-23 – Review 14: AP-23 (Rechtswerte gegen Primärquellen) und AP-24 (öffentliche Außenwirkung, `concept/` ordnen) angelegt; AP-17 laut Autor abgenommen (Test mit echten Daten erledigt); `.claude/launch.json` aus dem Index genommen. Reihenfolge: AP-21, AP-23, AP-24, AP-22.

- 2026-11-23 – Review 14 AP-21: Backlog durchgesehen (Abschnitt 8 gegliedert, Erledigtes in 8a), Skip-Link-Ursache geklärt (StrictMode, nur Dev) und behoben, Playwright mit eigenem Port und Dev/Build-Schalter, Seitenliste einmal geführt, ungeprüfte Rechtswerte als ein Hinweis mit Beträgen, schlanker Fokusring, `theme-color` folgt dem Umschalter, `markExported`-Fehler sichtbar, `ConfirmRemove` statt `window.confirm`, WebKit/Firefox-Smoke lokal (`PW_CROSS=1`), Druck geprüft (Befunde im Backlog); 839 Unit- und 238 E2E-Tests grün; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-23 – Review 14 AP-23: Rechtswerte gegen Primärtexte geprüft (gesetze-im-internet.de, Landesrecht BY/BW, BGBl. 2026 I Nr. 156): 6 von 11 `confirmed` (Jugendbonus-Alter 25, 72 €, vier Regelannahmen Sonstige Einkünfte, zwei davon mit benannten Abweichungen der App), 5 bleiben `unverified` (Kirchensteuer 8/9 %, Basiszins ab 2027, Kinderzulage-Alter 18, Riester voll steuerpflichtig); `validTo` bewusst nicht gesetzt (Abweichung von AP-23, Merkzettel `docs/legal-values-review.md`), Rechenergebnisse und Golden unverändert; 840 Unit- und 220 E2E-Tests grün; Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
- 2026-11-23 – Review 14 AP-24 (teilweise): `concept/` geordnet (`archive/` für erledigte Phasenkonzepte `04`, `08`–`12`, Bericht `13` und `archive/PROGRESS-notes-archive.md`, neue Einstiegs-README), README neu auf Deutsch für Besucher mit Screenshots (`docs/images/`), Nutzerdoku `docs/getting-started.md`, `how-it-works.md`, `faq.md`, READMEs für `docs/`, `docs/mockups/`, `tools/`, `.gitignore` ergänzt, Links geprüft; Mitwirken und `SECURITY.md` vom Autor zurückgestellt, Rechtsfrage beim Autor; 840 Unit-Tests grün, E2E nicht gelaufen (kein Code geändert); Commit beim Autor. Siehe Session-Protokoll in `14-review-report-2026-11-22.md`.
