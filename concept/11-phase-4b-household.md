# 11 – Phase 4b: Mehrere Personen / Haushalt

Entscheidungen vom 2026-11-18. Baut auf Phase 4a auf (`10`). Startet erst, wenn 4a abgeschlossen ist.

## 1. Ziel und Abgrenzung
Aus der Ein-Personen-App einen **Haushalt mit n Personen** machen: je Person eigene Bausteine, Sparziele und Sparbudget, dazu eine **gemeinsame Haushaltslücke** gegen ein gemeinsames Wunscheinkommen. Drei Teilphasen: **4b-1** Kern und Modell, **4b-2** Zustände und Personenverwaltung, **4b-3** Haushaltssicht.

Nicht in Phase 4b: Hinterbliebenenrente, Zusammenveranlagung und Splitting, gemeinsame Sparziele, Speichern als Datei (Phase 5), Erwerbsminderung.

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| Wunscheinkommen | **Haushalt gemeinsam**: ein Netto-Wunsch in Kaufkraft heute; Lücke = Wunsch − Summe der Netto-Renten aller Personen |
| Steuer | **Pauschal je Person** (Satz im Alter, Sparerpauschbetrag je Person). Keine Zusammenveranlagung; die UI nennt die Vereinfachung |
| Sparziele, Budget | **Pro Person** (`06`); die Haushaltssumme ist nur Anzeige |
| Personenzahl | Liste ohne Obergrenze; UI und Texte auf Paare ausgelegt |
| Vorgeschlagen (Planer) | Haushaltsweite Annahmen: Inflation, Renditeszenarien, Rentenanpassung, Rendite der Auszahlphase. Je Person: KV-Status, kinderlos, Renten-Steuersatz, Grenzsteuersatz heute, Arbeitnehmer-SV-Satz |
| Vorgeschlagen (Planer) | Verlauf in **Kalenderjahren**; Person trägt von ihrem Rentenbeginn bis zur eigenen Lebenserwartung bei; Wunsch gilt, solange mindestens eine Person lebt |
| Vorgeschlagen (Planer) | Snapshot im Jahr, in dem die **letzte** Person in Rente geht; davor zeigt der Verlauf Teil-Einkommen |
| Vorgeschlagen (Planer) | "Lücke schließen" für eine wählbare Person (Default: aktive Person) |

## 3. Datenmodell (Ergänzung zu `06`)
```ts
type Household = {
  id: string;
  name?: string;
  desiredMonthlyIncomeToday?: number;   // moves here from Profile (4a)
  assumptions: HouseholdAssumptions;    // inflation, returnScenarios, pensionAdjustment, payoutPhaseReturn
  persons: Person[];
};
type Person = {                          // merges Phase 1 `Person` and `Profile`
  id: string;
  name: string;
  birthYear: number;
  targetRetirementAge: number;
  lifeExpectancyAge: number;
  childrenBirthYears: number[];
  personalAssumptions: PersonalAssumptions; // health, childless, retirementTaxRate, marginalTaxRateToday, employeeSocialInsuranceRate
  savingsBudgetMonthly?: number;
};
```
- `GlobalAssumptions` (3a) wird in `HouseholdAssumptions` und `PersonalAssumptions` geteilt; `ProjectionContext` bekommt die zusammengesetzten Werte je Person, die Projektoren bleiben unverändert
- Bausteine und Ziele je Person: `etf`, `statutory`, `retirementDepot`, `occupational`, `goals`, `enabled`-Schalter, ETF-Entnahmefelder
- `HouseholdResult`: `byPerson: OverviewResult[]` (aus 4a, mit Personen-ID), Haushalts-Snapshot, Kalenderjahr-Verlauf, Lücke, Warnungen, Issues je Person und Baustein
- Alte Phase-1-`Person` (`id`, `name`, `birthYear`) und `Profile` verschwinden; Code und Tests darauf umstellen. Abweichungen in `PROGRESS.md` notieren

## 4. Rechenregeln

### 4.1 Haushaltssicht (`householdOverview`, 4b-1)
- Je Person `overview` (4a) mit den haushaltsweiten Annahmen plus den persönlichen
- **Zeitachse Kalenderjahre** von `min(Rentenbeginnjahr)` bis `max(Geburtsjahr + Lebenserwartung)` (Alter am Jahresende)
- Beitrag einer Person im Jahr `y`: ihr Netto (Kaufkraft heute) aus dem Personen-Verlauf, wenn `y` zwischen ihrem Rentenbeginn und ihrer Lebenserwartung liegt, sonst 0
- Wunsch im Jahr `y`: `desiredMonthlyIncomeToday`, solange mindestens eine Person lebt (`y ≤ max(Geburtsjahr + Lebenserwartung)`), sonst nicht angezeigt
- **Snapshot:** Jahr = `max(Rentenbeginnjahr)`: Summe, Lücke, Zusammensetzung nach Person und Baustein. Verlauf davor zeigt Teil-Einkommen. Einmalauszahlungen (Depot) je Person getrennt in einer Liste
- Lücke = `max(0, Wunsch − Summe)`, Überschuss separat. Gesamtlücke über alle Jahre in Kaufkraft heute
- **Bekannte Vereinfachung (in der UI nennen):** Fällt eine Person weg, endet ihr Einkommen vollständig. Hinterbliebenenrente und Witwen-Freibeträge gibt es nicht; die Haushaltslücke nach dem ersten Todesfall ist deshalb eher zu groß
### 4.1a Hinterbliebenenrente und Wunsch nach dem ersten Todesfall (nachträglich, Review `13` F-5)
- Optionale Haushaltsfelder `survivorPension` (`new` = 55 %, `old` = 60 %) und `survivorWishPercent` (10 bis 100, Standard 100). Wirksam nur bei **genau zwei Personen**; ohne `survivorPension` bleibt es bei der Vereinfachung oben
- Der erste Todesfall ist das Jahr `Geburtsjahr + Lebenserwartung` der Person mit der kleineren Zahl (bei gleichem Jahr gibt es keine Witwenrente). Ab dem Folgejahr bis zum Jahr der Lebenserwartung des Hinterbliebenen: `Witwenrente = max(0, Satz × Netto der gesetzlichen Rente des Verstorbenen im Todesjahr − 40 % × max(0, anrechenbares Einkommen − 26,4 × Rentenwert))`
- Anrechenbares Einkommen des Hinterbliebenen: gesetzliche Rente, betriebliche AV und Altersvorsorgedepot (Netto, Kaufkraft von heute); Kapitalentnahmen aus dem ETF zählen nicht. Der Freibetrag bleibt in Kaufkraft von heute konstant
- Die Witwenrente steckt in `byPerson` und `total` (und gesondert in `survivorPension`); die Lücke nutzt den Wunsch des Jahres (`desired`), nach dem ersten Todesfall gekürzt um `survivorWishPercent`
- Rechtswerte: `config/pension-de.json` (§67 Nr. 6, §255 Abs. 1, §97 Abs. 2 SGB VI). Nicht modelliert: Sterbevierteljahr, Kinderzuschläge, Vererbung von ETF, Depot und bAV, Mindestalter 47, Besteuerung über die Summe (Näherung über das Netto des Verstorbenen), Rentensplitting
- Eine Person ergibt **dasselbe Ergebnis wie 4a** (Regressionsvektoren), nur auf Kalenderjahre statt Alter abgebildet

### 4.2 Lücke schließen (4b-1, im Kern)
- `solveHouseholdGapContribution(household, personId, ...)`: kleinste ganze-Cent-Zusatzrate für den ETF der gewählten Person, sodass der Haushalts-Snapshot ≥ Wunsch. Wiederverwendung von `solveGapContribution` und `solveRequiredContribution`; `forward` = Haushalts-Snapshot mit angepasster ETF-Rate der Person
- Status `ok`/`already_reached`/`unreachable` wie 4a; Budgetvergleich je Person in der UI

## 5. Zustände und Migration (4b-2)
Aktuelle lokale Schlüssel (Stand 3c, plus 4a): `pathwise.profile.v1`, `pathwise.etfPlan.v1`, `pathwise.etfTarget.v1`, `pathwise.goals.v1`, `pathwise.statutory.v1`, `pathwise.depot.v1`, `pathwise.occupational.v1`, `pathwise.overview.v1`.
- Neuer Zustand `pathwise.household.v2`: Haushalt mit `persons[]`; Bausteinzustände je Person unter der Personen-ID (genaue Aufteilung entscheidet die Bau-Session, Vorschlag: ein Objekt `{household, byPerson: {[id]: {etfPlan, etfTarget, goals, statutory, depot, occupational, overview}}}`)
- **Migration einmalig beim Start:** Existieren die alten Schlüssel und noch kein `household.v2`, wird "Person 1" aus ihnen gebaut (`desiredMonthlyIncomeToday` aus dem Profil in den Haushalt; globale Annahmen auf Haushalt und Person verteilt). **Die alten Schlüssel bleiben unverändert stehen** (Backup), werden aber nicht mehr geschrieben. Ungültige oder fehlende Alt-Daten ergeben Defaults, nie einen Absturz
- Test: Migration mit vollständigen, teilweisen und kaputten Alt-Zuständen; erneuter Start migriert nicht doppelt
- Schemaversion im neuen Zustand, Migrationsfunktionen als Kette (Vorbereitung für Phase 5, `06` §7)

## 6. UI (Details `05` §2 und §9)
- **Personen-Umschalter** oben in der Seitenleiste; die aktive Person gilt für alle Bausteinseiten, Sparziele und Budget
- Seite **Haushalt**: Personen anlegen, umbenennen, entfernen (mit Bestätigung, nennt, was gelöscht wird), Wunscheinkommen des Haushalts, haushaltsweite Annahmen
- Profilseite je Person: persönliche Daten und persönliche Annahmen
- **Startseite:** Umschalter "Haushalt / Person". Haushaltsansicht: Kennzahlen, Lücke gegen den gemeinsamen Wunsch, Zusammensetzung nach Person und Baustein (gestapelt), Verlauf nach Kalenderjahren mit Wunsch-Linie, Hinweis zu fehlender Hinterbliebenenrente und pauschaler Steuer
- Kachel "Lücke schließen" mit Personenauswahl; Budgethinweis je Person
- Leere Zustände: Person ohne Bausteine wird benannt, mit Link
- Mockup `docs/mockups/haushalt.html` vor dem Bauen vom Autor freigeben lassen

## 7. Tests (Definition für "korrekt")
- **Regression:** Haushalt mit 1 Person = Ergebnis aus 4a (Snapshot und Verlauf, nach Kalenderjahr umgerechnet)
- **Zwei Personen:** versetzter Rentenbeginn (Teil-Einkommen davor), unterschiedliche Lebenserwartung (Wunsch endet bei der letzten), eine Person ohne Bausteine, persönlicher KV-Status wirkt nur bei der eigenen Person
- **Lücke:** 0 bei Überschuss, Wunsch 0, Summe über Personen = Summe der Einzelwerte
- **Lücke schließen:** erreicht das Ziel, ein Cent weniger nicht; Personenwahl ändert nur die gewählte ETF-Rate; `unreachable`
- **Property-Tests:** Hinzufügen einer Person (mit Einkommen ≥ 0) vergrößert die Haushaltslücke nie; Wunsch höher → Lücke nicht kleiner; Reihenfolge der Personen ändert das Ergebnis nicht
- **Migration** (§5), **Golden-Vektoren** (erfundene Paare, mind. 4, `synthetic: true`) und neue Excel-Blätter (z. B. `h01`–`h0x`); Hinweis wie in `09` §8: Skript ist zweite Implementierung, Excel bleibt Stichprobe des Autors
- Playwright-Smoke: zwei Personen anlegen, Bausteine je Person, Haushaltssicht zeigt Lücke; Personenwechsel behält die Eingaben

## 8. Arbeitsschritte (Abhaken in `PROGRESS.md`)
**4b-1 Kern und Modell**
1. `Person`/`Profile` zusammenführen, `Household`, geteilte Annahmen, Validierung; bestehende Tests umstellen
2. `householdOverview` und `solveHouseholdGapContribution` mit Tests und Golden-Vektoren

**4b-2 Zustände und Personenverwaltung**
3. Zustand `pathwise.household.v2` und Migration mit Tests
4. Personen-Umschalter, Seite Haushalt, Bausteinseiten und Ziele auf die aktive Person umstellen; Smoke-Test

**4b-3 Haushaltssicht**
5. Mockup `haushalt.html` zur Freigabe
6. Startseite Haushalt/Person, Lücke schließen mit Personenauswahl, Hinweise; Smoke-Test mit zwei Personen

**Abschluss**
7. README ergänzen, Abnahme durch den Autor (Excel-Stichprobe, Plausibilität mit einem echten oder erfundenen Paar), Sichtprüfung

## 9. Bewusst nicht in Phase 4b
Hinterbliebenenrente, Zusammenveranlagung und gemeinsamer Sparerpauschbetrag, gemeinsame Sparziele, Rentensplitting und Versorgungsausgleich, Speichern als Datei (5), Zugriffsrechte je Person (7), weitere Bausteine (6).
