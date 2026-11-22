# 08 – Phase 2: Sparziele und Rückwärtsrechner

Entscheidungen vom 2026-11-10 (siehe auch `07-decisions-and-open-points.md`).

## 1. Ziel und Abgrenzung
Mehrere kurzfristige Sparziele (Fahrrad, Auto) mit Tagesgeld-Zins, Zieldatum und benötigter Rate. Rückwärtsrechner auch für den ETF-Plan. Einfache Budget-Anzeige. **Nicht** in Phase 2: Speichern als Datei (Phase 5), automatische Ratenverteilung, Vorsorgebausteine (Phase 3).

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| Rückwärtsrechner | Für **Sparziele und ETF-Plan**, ein gemeinsamer Solver im Kern |
| Zinsmodell | Zinssatz p. a. als effektiver Jahreszins, **geometrisch** auf Monatszins umgerechnet (wie beim ETF) |
| Zinssteuer | Optional, **laufend bei jeder Zinsgutschrift**, Abgeltungsteuer ohne Teilfreistellung, Freibetrag je Kalenderjahr **frei wählbar pro Ziel** (Default 1.000 €); Freibetrag wird **nicht** zwischen Zielen geteilt, die UI weist darauf hin |
| Budget | Anzeigen und Warnung bei Überschreitung, **keine** automatische Verteilung; `priority` ist nur ein Sortierfeld |

## 3. Rechenregeln Sparziel (Kern)
Zeit: `YYYY-MM`, Monatsindex 0 = `startMonth`. Der Kern liest keine Systemzeit; `startMonth` kommt aus der UI (aktueller Monat als Default).

Je Monat m ≥ 1, gleiche Reihenfolge wie beim ETF:
1. Beitrag `monthlyContribution` zu Monatsbeginn zum Saldo
2. Zins des Monats = Saldo · i_m mit `i_m = (1 + r)^(1/12) − 1`; `r` ist der im Monat gültige Jahreszins (Basis `accountInterestPercent`, ab `fromMonth` abgelöst durch `interestChanges`)
3. Steuer (wenn `taxEnabled`): `taxFreeAllowancePerYear` wird je **Kalenderjahr** verbraucht (Reset im Januar anhand `startMonth`); Zinsen über dem Restfreibetrag werden mit `capitalGainsTaxRate` besteuert; der Nettozins wird dem Saldo gutgeschrieben
4. Ziel erreicht im ersten Monat mit Saldo ≥ `targetAmount` (nach Steuer). Ist `currentAmount ≥ targetAmount`: Status `reached_at_start`
5. Horizont max. 600 Monate; sonst Status `not_reached` (z. B. Rate 0 und Zins 0)
6. Reihe läuft bis zum Erreichen, mindestens bis `targetMonth` (falls später), höchstens bis zum Horizont

Ausgabe `GoalResult`: `status` (`reached_at_start` | `reached` | `not_reached`), `reachedMonth?`, `monthsToReach?`, `series` (Monatsindex, Kalendermonat, contributed, balance), `yearly`, `interestGross`, `tax`, `interestNet`, `finalBalance`, `requiredMonthlyForTargetMonth?` (nur mit `targetMonth`), `warnings`. Ungültige Eingaben liefern Probleme als Daten (`{ok:false, issues}`) wie in Phase 1.

## 4. Rückwärtsrechner (gemeinsamer Solver)
- `solveRequiredContribution(forward, target, options)`: Bisektion über die monoton nicht fallende Vorwärtsfunktion, **über ganze Cent**. `lo = 0`, `hi` durch Verdoppeln (Obergrenze 1.000.000 €/Monat). Ergebnis ist der kleinste Cent-Betrag, der das Ziel erreicht; ein Cent weniger erreicht es nicht
- Status als Daten: `already_reached` (Rate 0 reicht), `ok`, `unreachable`
- **Sparziel:** Vorwärtsfunktion = Saldo zum `targetMonth` bei Rate R (nach Steuer) → "Benötigte Rate für den Wunschtermin"
- **ETF-Plan:** Vorwärtsfunktion = `finalValueAfterTax` je Szenario bei Startrate R (Dynamik gilt weiter). Eingabe `targetValue` mit Schalter "nominal" oder "in Kaufkraft von heute" (real wird mit `(1+Inflation)^Jahre` auf nominal umgerechnet). Ausgabe: benötigte Monatsrate für pessimistisch, neutral, optimistisch, im Vergleich zur aktuellen Rate
- Das Zielvermögen verändert den ETF-Input nicht; es ist ein zusätzliches Eingabefeld (Abschnitt "Zielvermögen" auf der ETF-Seite)

## 5. Datenmodell (Ergänzung zu `06-data-model.md`)
- `SavingsGoal` wie in `06` plus `taxFreeAllowancePerYear` (Default aus `config/tax-de.json`, `taxFreeAllowance`); `taxEnabled` Default `true`
- `GoalsState` lokal gespeichert: `{ schemaVersion: 1, savingsBudgetMonthly?: number, goals: SavingsGoal[] }` unter `localStorage`-Key `pathwise.goals.v1`; IDs per `crypto.randomUUID()`. In Phase 5 wird der Zustand in den Workspace überführt (Migration vorsehen, kein Verlust)
- `GoalResult` und Rückwärts-Ergebnisse werden **nicht** gespeichert
- Validierung: `targetAmount > 0`, `currentAmount ≥ 0`, `monthlyContribution ≥ 0`, Zins 0–20 %, Zinsänderungen chronologisch und nach `startMonth`, `targetMonth` > `startMonth`, Monate im Format `YYYY-MM`, `taxFreeAllowancePerYear ≥ 0`

## 6. Budget-Anzeige
`savingsBudgetMonthly` (optional, in Phase 2 genau eine Person) wird auf der Seite Sparziele eingegeben. Anzeige: Summe aller Ziel-Raten **plus** aktuelle ETF-Monatsrate, Rest zum Budget, Warnung (kein Fehler) bei Überschreitung. `priority` sortiert die Liste. Keine Verteilung freiwerdender Raten.

## 7. UI (Details in `05-ui-concept.md`)
Neuer Menüpunkt **Sparziele** (`#goals`) zwischen ETF-Sparplan und Annahmen; Zielliste, Formular, Ergebnis (Kennzahlen, Diagramm Saldo vs. Zielbetrag, Tabelle); ETF-Seite mit Abschnitt "Zielvermögen"; Übersicht mit Sparzielen und Fortschritt. Texte nur in `i18n/de.ts`. Vor dem Bauen gibt der Autor das Mockup `docs/mockups/sparziele.html` frei (wie in Phase 1).

## 8. Konfiguration und Recht
Zinsen nutzen `capitalGainsTaxRate` und `taxFreeAllowance` aus `config/tax-de.json` (beide `unverified`). Teilfreistellung entfällt. Siehe `03-domain-rules.md` Abschnitt 9. Die UI zeigt weiter den `unverified`-Hinweis.

## 9. Tests (Definition für "korrekt")
- **Geschlossene Formel** ohne Steuer und mit konstantem Zins: Saldo nach n Monaten = `B·g^n + R·g·(g^n−1)/(g−1)` mit `g = 1 + i_m`; Monate bis zum Ziel per Logarithmus, verglichen mit der Simulation
- **Property-Tests:** monoton in Rate und Zins; Zins 0 → Dauer `ceil((Ziel−Stand)/Rate)`; Solver-Roundtrip (Vorwärtsrechnung mit gelöster Rate erreicht das Ziel, mit Rate − 0,01 € nicht); `already_reached` und `unreachable`; Steuer 0 bei großem Freibetrag; Freibetrag-Reset im Januar
- **Golden-Vektoren Sparziele** (mind. 6, `packages/core/test/golden-vectors/goals/`): ohne Steuer, mit Steuer und Freibetrag, mit Zinsänderung, Start im Dezember, Ziel schon erreicht, nicht erreichbar. Dazu mind. 3 Vektoren für den ETF-Rückwärtsrechner (real und nominal)
- `tools/generate_golden.py` und `tools/golden-check.xlsx` erweitern. **Hinweis:** Das Skript ist eine zweite Implementierung derselben Quelle, die Excel-Prüfung bleibt eine Stichprobe des Autors
- Playwright-Smoke: Ziel anlegen → Zieldatum sichtbar; ETF-Zielvermögen → benötigte Rate sichtbar

## 10. Arbeitsschritte (Abhaken in `PROGRESS.md`)
0. Aufräumen aus Phase 1: Excel-Sperrdatei `tools/~$golden-check.xlsx` löschen und `tools/~$*` in `.gitignore`; deutsches Anzeigefeld für Quellentexte in `config/tax-de.json` und im `AssumptionsPanel`
1. Kern: Typen, Monatsfunktionen, Zielvalidierung, `projectGoal`, Zinssteuer, Solver, ETF-Rückwärtsrechner, Export in `index.ts`
2. Kerntests: Formel-, Property-, Solver-Tests, Golden-Vektoren mit Generator-Erweiterung
3. Mockup `sparziele.html` (inklusive ETF-Block "Zielvermögen") zur Freigabe
4. Web: Hook `useGoals`, Seite Sparziele, Ergebnis, Budget-Anzeige, ETF-Abschnitt "Zielvermögen", Übersicht, Texte, Navigation
5. E2E-Smoke und README ergänzen
6. Abnahme: Excel-Gegenprüfung ausgewählter Fälle, Sichtprüfung (Desktop, schmal, Dunkel, Tastatur)

## 11. Bewusst nicht in Phase 2
- Verteilung freiwerdender Raten nach Priorität (später möglich)
- Geteilter Sparerpauschbetrag über Ziele und ETF (Ziele untereinander seit Review `13` F-6, siehe `PROGRESS.md`; ETF und Paar-Pool offen)
- Speicherung als Datei und Mehrpersonen-Budget (Phase 4b/5)
- Prüfung der Zinssteuer-Werte gegen Primärquellen (zusammen mit den übrigen `unverified`-Werten vor Phase 3)
