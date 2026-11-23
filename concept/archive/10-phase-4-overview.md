# 10 – Phase 4: Gesamtsicht, Rentenlücke, Entnahme

Entscheidungen vom 2026-11-18. Baut auf Phase 3 (`09`) auf. Mehrere Personen sind **Phase 4b** (eigene Planung danach).

## 1. Ziel und Abgrenzung
Aus den Bausteinen (gesetzliche Rente, Altersvorsorgedepot, bAV, ETF-Sparplan) eine **Gesamtsicht** machen: voraussichtliche Netto-Rente gegen das Wunscheinkommen, **Rentenlücke**, Verlauf über die Rentenjahre, und ein Rückwärtsrechner, der zeigt, wie viel mehr ETF-Sparrate die Lücke schließt. Der ETF-Sparplan bekommt dafür eine Entnahmephase.

Nicht in Phase 4: mehrere Personen/Haushalt (4b), Speichern als Datei (5), weitere Bausteine (6), Entnahmestrategien jenseits konstanter Rate (Inflationsanpassung, 4-%-Regel), Was-wäre-wenn-Regler (Option für später, `05` §8).

Vier Teilphasen, jeweils lauffähig: **4a-1** Kern Gesamtsicht, **4a-2** ETF im Ruhestand, **4a-3** Lücke schließen, **4a-4** UI Startseite.

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| ETF-Entnahme | Konstante nominale Monatsrate bis Alter X über `payoutPlan` (wie Depot und bAV), Rendite der Auszahlphase aus den globalen Annahmen |
| Rentenlücke | Snapshot zum Rentenbeginn **und** Verlauf je Alter bis `lifeExpectancyAge` |
| Lücke schließen | Rückwärtsrechner: nötige **zusätzliche ETF-Sparrate**, je Szenario, mit `solveRequiredContribution` |
| Personen | Phase 4a: eine Person (`Profile`); `Profile`/`Person` zusammenführen in 4b |
| Zielgröße | `desiredMonthlyIncomeToday`: **Netto** pro Monat in Kaufkraft von heute |
| Vorgeschlagen (Planer) | ETF-Seite nutzt Rendite-Szenarien und Inflation der globalen Annahmen, mit Override-Schalter (Vereinheitlichung, in `09` §3 angekündigt); ETF-Laufzeit für die Gesamtsicht ergibt sich aus dem Rentenbeginn |

## 3. Voraussetzung: einheitliche Kaufkraft-Basis ("real")
Die gesetzliche Rente deflationiert heute ab dem **Stand-Jahr** der Renteninformation (`statutory.ts`: `(1+Inflation)^(Rentenbeginnjahr − Stand-Jahr)`), Depot, bAV und ETF ab **heute**. Beim Summieren wäre das falsch (etwa 2 % je Jahr Abstand zwischen Stand-Jahr und heute).

Regel ab Phase 4: **real = Kaufkraft des aktuellen Jahres** (`ctx.currentYear`) für alle Bausteine. Gesetzliche Rente: `real = nominal / (1+Inflation)^(Rentenbeginnjahr − currentYear)`, ebenso im Pfad (`PensionPathPoint.real`). Das ist eine **Abweichung von `09` §5.2** und gehört in `PROGRESS.md`. Folgen: Golden-Vektoren und Excel-Blätter der gesetzlichen Rente (`s01`–`s07`) neu erzeugen, Testwerte anpassen; UI-Beschriftung "Kaufkraft heute" prüfen. Rentenbeginn in der Vergangenheit (`retirementYear < currentYear`) wird nicht unterstützt: Validierungsfehler als Daten.

## 4. Neue Eingaben
**Profil (`valiva.profile.v1`, additiv):** `desiredMonthlyIncomeToday` (Netto, heutige Kaufkraft, ≥ 0; leer = Lücke nicht berechenbar, UI erklärt den nächsten Schritt). `lifeExpectancyAge` existiert bereits (Default 90).
**Bausteine im Verlauf:** `valiva.overview.v1` mit `enabled` je Baustein (`etf`, `statutory`, `depot`, `occupational`); nur aktivierte und gültige Bausteine zählen.
**ETF, neu:** `payoutStartAge` (Default = `targetRetirementAge`), `payoutEndAge` (Default = `lifeExpectancyAge`), `useGlobalAssumptions` (Default an).

## 5. Rechenregeln

### 5.1 ETF als `ProductProjector` (4a-2)
- Adapter `etfProjector` im Core, liefert `ProjectionResult` wie Depot und bAV; Szenarien pessimistisch/neutral/optimistisch
- Ansparphase: bestehender Kern (`projectEtfScenario`) mit `durationYears = Rentenbeginnjahr − currentYear` (ganze Jahre, ≥ 1). Weicht das von der Laufzeit der ETF-Seite ab, Warnung `etf_duration_overridden`
- Kapital bei Rentenbeginn = **Bruttowert vor Steuer** (`grossFinalValue`). Die Phase-1-Steuer "Verkauf am Ende" gilt hier **nicht**; Steuer fällt bei der Entnahme an
- Entnahme: `payoutPlan(kapital, payoutStartAge, payoutEndAge, payoutPhaseReturnPercent)` → Brutto-Monatsrate `W`
- **Steuer (vereinfacht):** Gewinnanteil `g = max(0, K − E) / K` mit Kapital `K` und Einzahlungen `E`, über die Entnahme konstant angenommen. Steuerpflichtig pro Jahr: `12 · W · g · (1 − Teilfreistellung)`; Steuer = `max(0, steuerpflichtig − Sparerpauschbetrag) · Abgeltungsteuersatz`; monatlich `Steuer/12`. Werte aus `config/tax-de.json` (bleiben `unverified`). Kirchensteuer nur über den Satz, Vorabpauschale nur mit der Option im ETF-Plan (dann Steuer je Jahr aus Vorabpauschale und Verkaufsgewinn, `taxMonthlyNominal` als Durchschnitt, siehe `docs/assumptions.md`), Freibetrag nominal fix und ungenutzt durch andere Erträge. Der Gewinnanteil bleibt in Wahrheit nicht konstant (Restkapital wächst weiter); als bekannte Vereinfachung in der UI nennen
- KV/Pflege auf ETF-Erträge: keine (Kapitalerträge sind nicht beitragspflichtig)
- Real: Rate des Rentenbeginns durch `(1+Inflation)^(Rentenbeginnjahr − currentYear)`

### 5.2 Gesamtsicht (4a-1)
Reine Funktion `overview(products, profile, assumptions, currentYear)` in `packages/core`:
- Eingabe: `ProjectionResult`/Details je aktiviertem Baustein und Szenario (Statutory: Szenarien identisch)
- **Snapshot** je Szenario: Summe `netMonthlyPensionReal` (Kaufkraft heute), Brutto, `taxAndContributions`, Zusammensetzung je Baustein, Lücke = `max(0, desiredMonthlyIncomeToday − Summe)`, Überschuss = `max(0, Summe − Wunsch)`, gesammelte Warnungen (`unverified:` usw.), Einmalauszahlung des Depots **separat** ausgewiesen (nicht in der Monatsrente)
- **Verlauf je Alter** von `targetRetirementAge` bis `lifeExpectancyAge` (Jahresschritte, Alter = Alter am Jahresende; Rentenbeginn mitten im Jahr nicht modelliert). Je Baustein Netto in Kaufkraft heute:
  - gesetzliche Rente: lebenslang; nominal wächst nach Rentenbeginn mit `pensionAdjustmentPercent`; Netto/Brutto-Verhältnis vom Rentenbeginn bleibt (Besteuerungsanteil ist ab Rentenbeginn fix)
  - Depot, bAV, ETF: konstante nominale Rate vom Auszahlbeginn bis `payoutEndAge`, danach 0; real mit Inflation ab heute
  - Wunsch: konstante Linie in Kaufkraft heute
- Lücke je Alter = `max(0, Wunsch − Summe)`; die Ausgabe nennt das Alter, ab dem die Lücke wächst (Auszahlende eines Bausteins), und die Gesamtlücke über alle Rentenjahre in Kaufkraft heute
- Bausteine mit unterschiedlichem Rentenbeginn: Beitrag ab dem eigenen Auszahlbeginn. Der Snapshot gilt für `targetRetirementAge`; fängt ein Baustein später an, wird er im Snapshot mit 0 geführt und ein Hinweis gezeigt
- Fehler als Daten: ungültige Bausteine fehlen im Ergebnis, die Gründe stehen in `issues` je Baustein; keine Exceptions

### 5.3 Lücke schließen (4a-3)
- `solveGapContribution(...)`: je Szenario die kleinste ganze-Cent-Zusatzrate `x`, sodass Snapshot-Summe(`etf.monthlyContribution + x`) ≥ Wunsch. `forward(x)` = Gesamtsicht-Summe mit angepasster ETF-Rate; monoton steigend (Voraussetzung von `solveRequiredContribution`)
- Ergebnis wie bei `solveEtfRequiredContribution`: Status `ok`/`already_reached`/`unreachable`, Zusatzrate und neue Gesamtrate. Ohne ETF-Baustein rechnet die Seite mit Standardwerten der ETF-Seite (UI zeigt das an)
- Die jährliche Steigerung der ETF-Rate bleibt unverändert, nur die Startrate ändert sich
- Budgetanzeige aus Phase 2 einblenden (Summe der Sparraten gegen Budget), keine automatische Verteilung

### 5.4 Entnahmestrategien (Review 13 F-16)
- Wählbar für den ETF (`EtfProjectorInput.withdrawal`) und den Auszahlplan des Altersvorsorgedepots (`DepotInput.withdrawal`, nach der Einmalauszahlung). Fehlt die Angabe: Annuität (Standard, unverändertes Ergebnis).
- `percent`: Rate im ersten Jahr `Prozent / 100 · Kapital / 12` (Kapital bei Rentenbeginn, ETF brutto), ab dem zweiten Jahr jährlich um die wirksame Inflation erhöht, also real konstant. Das Restkapital verzinst sich monatlich mit der Entnahmerendite; eine Zahlung übersteigt nie das Restkapital. Reicht es nicht bis zum Endalter, wird die letzte Zahlung gekürzt (`depletionAge`, Warnung `etf_withdrawal_depleted` / `depot_withdrawal_depleted`); sonst bleibt `remainingCapitalAtEnd`. Erlaubt: 0 < Prozent ≤ 100, Vorschlag 4.
- `monthlyPension*` und Nettowerte sind die Werte des ersten Jahres. Die Gesamtsicht rechnet mit dem Aktivitätsfaktor `((1 + Indexierung) / (1 + Inflation))^Jahre` und beendet das Produkt am früheren Endalter des Ergebnisses.
- ETF-Steuer bei `percent`: nur das erste Jahr (Sparerpauschbetrag nominal fest, real später etwas höher); mit Vorabpauschale je Jahr gerechnet, ausgewiesen wird das erste Jahr.
- Lückenrechner: löst weiter nur die Sparrate; die Rate im ersten Jahr steigt monoton mit dem Endkapital, daher bleibt die Minimalität erhalten.
- Speicherformat: optionale Felder `withdrawalStrategy` (`annuity`/`percent`) und `withdrawalPercent` in den Blöcken `etfPayout` und `depot`; Version unverändert, alte Dateien laden als Annuität.
- Nicht umgesetzt: „dynamische“ Entnahme (Anpassung an die Wertentwicklung), Monte-Carlo (Review 13 F-10).

## 6. Datenmodell (Ergänzung zu `06`)
`Profile` erhält `desiredMonthlyIncomeToday?`. Neue Typen: `OverviewResult` (Snapshot je Szenario, Verlauf, Warnungen, Issues je Baustein), `GapSolveResult`. ETF-Entnahmefelder (siehe §4). `HouseholdResult` (`06` §5) folgt in 4b und baut auf `OverviewResult` auf; `overview` deshalb ohne Annahme einer einzelnen Person im Rückgabetyp entwerfen (Personen-ID als Feld).

## 7. UI (Details `05` §4 und §9)
- Startseite wird die **Gesamtsicht** (Menüpunkt "Rentenplan" aus `05` §2): große Kennzahl Netto-Rente (Spanne der Szenarien, Kaufkraft heute), Wunsch, Lücke als Balken mit Text ("Es fehlen etwa X €/Monat"), Zusammensetzung nach Baustein (gestapelt), Verlaufsdiagramm je Alter mit Wunsch-Linie und Markierung des Auszahlendes, Szenarioumschalter, Kachel "Lücke schließen: etwa X € mehr ETF-Sparrate"
- Bausteine ohne Eingaben oder mit Fehlern: Hinweis mit Link zur Seite, kein stilles Weglassen
- Profil-Seite: Feld Wunscheinkommen; ETF-Seite: Entnahmefelder und Schalter "globale Annahmen"
- `unverified`-Hinweise gesammelt auf der Startseite; Disclaimer sichtbar
- Mockups `docs/mockups/gesamtsicht.html` (und ggf. ETF-Entnahme) vor dem Bauen vom Autor freigeben lassen

## 8. Tests (Definition für "korrekt")
- **Kaufkraft-Basis:** gesetzliche Rente real mit `currentYear` statt Stand-Jahr; Stand-Jahr = aktuelles Jahr ergibt gleiche Werte wie vorher
- **ETF-Entnahme:** Roundtrip (Restkapital am Ende 0), `g = 0` bei Verlust (keine Steuer), Freibetrag-Grenze (`steuerpflichtig` knapp unter/über Pauschbetrag), `taxEnabled`-Unabhängigkeit des Kapitals, Laufzeit-Override mit Warnung
- **Gesamtsicht:** Summe = Summe der Bausteine, deaktivierter Baustein zählt nicht, ungültiger Baustein erscheint mit Issue, Lücke 0 bei Überschuss, Verlauf: gesetzliche Rente wächst, Depot endet am `payoutEndAge`, Lücke steigt danach
- **Lücke schließen:** Ergebnis erreicht das Ziel, ein Cent weniger nicht; `already_reached`; `unreachable` bei absurdem Wunsch
- **Property-Tests:** Summe monoton in jeder Baustein-Eingabe, Lücke monoton fallend in der ETF-Rate, Netto ≤ Brutto je Baustein, höheres Wunscheinkommen vergrößert die Lücke
- **Golden-Vektoren** (erfundene Werte, `synthetic: true`): mind. 5 für die Gesamtsicht (inkl. Verlauf an Stichproben-Altern) und 3 für ETF-Entnahme; `tools/generate_golden.py` und `tools/golden-check.xlsx` erweitern (neue Blätter, z. B. `e01`–`e0x`, `o01`–`o0x`). Hinweis wie in `09` §8: Das Skript ist eine zweite Implementierung derselben Quelle, die Excel-Prüfung bleibt eine Stichprobe des Autors
- Playwright-Smoke: Profil mit Wunscheinkommen, zwei Bausteine, Gesamtsicht zeigt Lücke und Verlauf

## 9. Arbeitsschritte (Abhaken in `PROGRESS.md`)
**4a-1 Kern Gesamtsicht**
1. Kaufkraft-Basis vereinheitlichen (§3), Tests und Golden-Vektoren anpassen
2. `Profile.desiredMonthlyIncomeToday` + Validierung
3. `overview` (Snapshot, Verlauf, Warnungen) mit Tests und Golden-Vektoren
4. Minimale Web-Ansicht der Gesamtsicht (Zahlen und einfache Tabelle), damit die Teilphase lauffähig ist; Zustand `valiva.overview.v1`

**4a-2 ETF im Ruhestand**
5. `etfProjector` mit Entnahme und Steuer (§5.1), Config-Zugriff, Tests, Golden-Vektoren
6. ETF-Seite: Entnahmefelder, Schalter globale Annahmen, Zustandsmigration; Gesamtsicht bindet ETF ein; Smoke-Test

**4a-3 Lücke schließen**
7. `solveGapContribution` mit Tests; Kachel in der Gesamtsicht, Budgethinweis

**4a-4 UI Startseite**
8. Mockup `gesamtsicht.html` zur Freigabe (kann früher liegen, vor 4a-1 Schritt 4)
9. Web: Startseite wie in §7, Diagramme (Recharts), Szenarioumschalter, Hinweise, Dunkel/Hell, Tastatur; Smoke-Test

**Abschluss**
10. README ergänzen, Abnahme durch den Autor (Excel-Stichprobe, Plausibilität mit den eigenen Zahlen), Sichtprüfung

## 10. Bewusst nicht in Phase 4
Mehrere Personen und Haushalt (4b), Speichern als Datei (5), Riester/Rürup/Lebensversicherung, Immobilie, Frühstart-Rente (6), (inflationsangepasste Entnahme und 4-%-Regel: seit Review 13 F-16 in Abschnitt 5.4 umgesetzt), automatische Verteilung der Sparraten, Was-wäre-wenn-Regler, Entgeltpunkte-Modell, Rentenbeginn mitten im Jahr, Kirchensteuer, Vorabpauschale.
