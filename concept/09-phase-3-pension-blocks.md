# 09 – Phase 3: Gesetzliche Rente, Altersvorsorgedepot, bAV

Entscheidungen vom 2026-11-11. Geprüfte Gesetzeswerte und ihr Status: `03-domain-rules.md` Abschnitt 12.

## 1. Ziel und Abgrenzung
Drei Bausteine mit Prognose: **gesetzliche Rente**, **Altersvorsorgedepot**, **betriebliche Altersvorsorge**, dazu die nötigen Profil- und Annahmen-Eingaben. Nicht in Phase 3: Gesamtsicht und Rentenlücke (Phase 4), ETF-Entnahme (Phase 4), mehrere Personen (Phase 4b), Speichern als Datei (Phase 5). Drei Teilphasen, jeweils lauffähig: **3a** Profil + Config + gesetzliche Rente, **3b** Altersvorsorgedepot, **3c** bAV.

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| Gesetzliche Rente, Eingabe | **Hochrechnung aus der Renteninformation** ("Regelaltersrente bei Beitragszahlung bis zur Altersgrenze", Betrag in heutigen Werten) plus Stand-Jahr; keine Entgeltpunkte |
| Auszahlphase bAV und Depot | **Auszahlplan bis Alter X** mit Rendite in der Rentenphase (globale Annahme, Default 2 % p. a.); dieselbe Funktion nutzt Phase 4 für den Entnahmeplan |
| Netto-Rente | **Pauschale Sätze + KV-Status:** Einkommensteuer nach Tarif §32a EStG auf die Summe aller Renten (seit Teilphase 6a, früher pauschaler Satz), Besteuerungsanteil bei der gesetzlichen Rente, KV/Pflege-Sätze aus Config; Schalter "pflichtversichert (KVdR)" oder "andere" mit eigenem Satz |
| bAV-Ansparphase | Netto-Aufwand vereinfacht aus Bruttoumwandlung, Grenzsteuersatz und Arbeitnehmer-SV-Satz, Arbeitgeberzuschuss 15 % |
| Vorgeschlagen (Planer) | Depot-Varianten wirken über **Kosten und Garantie-Untergrenze**, **kein Glide Path**; ETF-Seite behält bis Phase 4 eigene Inflation und Szenarien; Zulagen werden zum Kalenderjahresende gutgeschrieben |

## 3. Neue Eingaben
**Profil (`Person`, lokal `pathwise.profile.v1`):** `birthYear`, `targetRetirementAge` (Default 67), `lifeExpectancyAge` (Default 90), `childrenBirthYears[]`.
**Globale Annahmen (gleiche Speicherstelle):** `inflationPercent` (2), `returnScenarios` (3/5/7), `pensionAdjustmentPercent` (2,5), `payoutPhaseReturnPercent` (2), `retirementTaxRatePercent` (Eingabe mit Default und Erklärung), `marginalTaxRateTodayPercent`, `employeeSocialInsuranceRatePercent` (Default 20, Annahme), `health`: `statutoryCompulsory` | `other` (+ `otherRatePercent`), `additionalRatePercent` (Default aus Config, 2,9), `childless` (Pflege 4,2 %).
ETF behält bis Phase 4 eigene `inflationPercent` und `returnScenarios` (entspricht einem Override); Vereinheitlichung dann.

## 4. Konfiguration (`config/`)
Schema wie `tax-de.json`: `value` oder `tiers`, `unit`, `validFrom`, `validTo`, `source`, `sourceDe`, `status`.
- `pension-de.json`: aktueller Rentenwert (42,52 €, ab 2026-07-01), Regelaltersgrenze (67 ab Jahrgang 1964), Abschlag 0,3 %/Monat (max. 14,4 %), Zuschlag 0,5 %/Monat, Besteuerungsanteil nach Rentenbeginn (2026: 84,0, +0,5 pro Jahr bis 100 im Jahr 2058)
- `social-de.json`: KV allgemein 14,6 %, Zusatzbeitrag Ø 2,9 %, Pflege 3,6 % / 4,2 % (Kinderlose), Bezugsgröße 2026 (3.955 €) und KV-Freibetrag Betriebsrente (1/20), BBG RV 8.450 €, bAV-Grenzen (4 % SV-frei = 338 €, 8 % steuerfrei = 676 €), Arbeitgeberzuschuss 15 %
- `altersvorsorge-de.json`: Grundzulage-Staffel (`tiers`: bis 360 € 50 %, bis 1.800 € 25 %), Kinderzulage (100 %, Deckel 300 € je Kind, Bezugsgrenze 1.800 €), Bonus unter 25 (200 €), Mindesteigenbeitrag (120 €/Jahr ab 2027), Höchstbeitrag (6.840 €), Auszahlphase (Beginn 65 bis 70, Plan mindestens bis 85, Einmalauszahlung max. 30 %), Standarddepot-Kostendeckel (1,0 %), Garantiestufen (80/100 %)
- `confirmed` nur für die in `03` Abschnitt 12 bestätigten Punkte, alles Übrige `unverified`. Der Core liest keine Dateien; die Web-App parst die Config und übergibt sie (wie bei `resolveTaxAssumptions`)

## 5. Rechenregeln

### 5.1 Gemeinsame Funktionen (Core, in Phase 4 wiederverwendet)
- `payoutPlan(capital, startAge, endAge, annualReturn)`: gleichbleibende nominale Monatsrate über `n = (endAge − startAge)·12` Monate, `P = C·i/(1−(1+i)^−n)` mit `i = (1+r)^(1/12) − 1`, Rate fällig zum Monatsende, `i = 0` → `C/n`; liefert auch die Restkapital-Reihe. Reale Darstellung: Rate des Rentenbeginns mit `(1+Inflation)^Jahre bis Rentenbeginn` auf heutige Kaufkraft zurückgerechnet. Hinweis in der UI: Die konstante nominale Rate verliert in der Rentenphase an Kaufkraft
- `netPension(grossMonthly, kind, profile, assumptions, legal)`: Steuer = Anteil an der Einkommensteuer auf die Summe aller Renten (`retirementIncomeTax`, Tarif in Kaufkraft von heute); Abgaben nach Art (5.2 bis 5.4); Ergebnis `{ gross, tax, contributions, net }` plus Warnungen

### 5.2 Gesetzliche Rente (`statutory`)
- Eingabe: `projectedMonthlyPensionToday` (Hochrechnung der Renteninformation, heutige Werte, ohne künftige Anpassung), `statementYear`, `retirementAge`, optional `regularRetirementAge` (nur bei Jahrgang vor 1964, sonst 67 aus Config)
- Faktor = `1 − 0,003·Monate vor Regelalter` (max. 14,4 %) bzw. `1 + 0,005·Monate nach Regelalter`; Rentenbeginn zwischen 63 und 70 (Validierung)
- Nominal bei Rentenbeginn: `P_today · (1 + pensionAdjustment)^(Jahre bis Rentenbeginn) · Faktor`; real = mit Inflation auf heute zurück
- Netto: steuerpflichtig = Besteuerungsanteil(Rentenbeginnjahr) · Brutto; KV/Pflege bei `statutoryCompulsory`: halber KV-Satz plus halber Zusatzbeitrag, Pflege voll (Kinderlose 4,2 %); bei `other` eigener Satz
- **Bekannte Vereinfachung (in der UI nennen):** Ein früherer Rentenbeginn senkt real auch die Entgeltpunkte (weniger Beitragsjahre); hier wird nur der Abschlag angesetzt. Ein späterer Beginn erhöht keine Entgeltpunkte
- Szenarien: gleiche Werte in allen drei; die UI zeigt einen Wert

### 5.3 Altersvorsorgedepot (`retirementDepot`)
- Eingabe: `ownContributionMonthly` (max. 6.840 €/Jahr), `startMonth`, `variant` (`standard` | `guarantee80` | `guarantee100` | `noGuarantee`), `costPercentPerYear` (Default 1,0, bei `standard` auf 1,0 gedeckelt), `payoutStartAge` (65 bis 70), `payoutEndAge` (≥ 85), `lumpSumSharePercent` (0 bis 30, Default 0)
- Ansparphase monatlich wie der ETF-Kern (Beitrag zu Monatsbeginn, Wachstum mit Nettorendite = Szenario − Kosten, keine Steuer in der Ansparphase)
- **Zulagen je Kalenderjahr** aus den Eigenbeiträgen des Jahres `A`: Mindesteigenbeitrag (`A ≥ 120`, sonst 0); Grundzulage = `0,5·min(A,360) + 0,25·max(0, min(A,1800) − 360)`; Kinderzulage je Kind mit Kindergeld = `min(300, 1,0·min(A,1800))` (Kind zulageberechtigt bis Alter 18, **unverified**); Bonus 200 € im ersten Beitragsjahr bei Alter am Jahresbeginn < 25. Gutschrift zum Jahresende, danach verzinst; Zulagen zählen zu den Einzahlungen
- Garantie: Untergrenze bei Auszahlbeginn = `Garantie% · (Eigenbeiträge + Zulagen)`, Kapital = max(Modellkapital, Untergrenze). Die Rendite von Garantieprodukten ist Nutzereingabe (Override)
- Auszahlphase: Einmalauszahlung = Anteil · Kapital, Rest über `payoutPlan`
- Steuer: nachgelagert voll steuerpflichtig mit `retirementTaxRatePercent`; KV/Pflege auf private Altersvorsorge-Leistungen bei `statutoryCompulsory` = 0 (Annahme, `unverified`), bei `other` eigener Satz; Einmalauszahlung mit demselben Satz (Vereinfachung)
- Ausgenommen: Sonderausgabenabzug/Günstigerprüfung, Glide Path, Ehegattenzulage, Altvertrag-Wechsel, lebenslange Rente und variabler Anteil

### 5.4 Betriebliche Altersvorsorge (`occupational`)
- Eingabe: `employeeContributionMonthlyGross`, `employerSubsidyMode` (`auto15` | `custom`), `employerContributionMonthly` (zusätzlich, optional), `costsPercentPerYear`, `startMonth`, `payoutStartAge`, `payoutEndAge`, Renditeszenarien (Default global, überschreibbar), optional `guaranteedRatePercent` als Renditeuntergrenze
- Arbeitgeberzuschuss `auto15` = 15 % · min(Bruttoumwandlung, 338 €) (nur der SV-freie Teil spart dem Arbeitgeber Beiträge, konservativ)
- **Netto-Aufwand heute** = Bruttoumwandlung − `min(Umwandlung, 676 €)·marginalTaxRateToday` − `min(Umwandlung, 338 €)·employeeSocialInsuranceRate`; Anzeige als Schätzung mit sichtbaren Annahmen
- Ansparphase wie Depot ohne Zulagen; Auszahlplan wie 5.1
- Rente: voll steuerpflichtig mit `retirementTaxRatePercent`. KV bei `statutoryCompulsory`: voller Satz (14,6 % + Zusatzbeitrag) auf den Teil über dem Freibetrag (197,75 €); Pflege voller Satz auf die **gesamte** Rente, sobald sie die Freigrenze (197,75 €) überschreitet, sonst 0 (harte Kante, `unverified`). Bei `other` eigener Satz
- Ausgenommen: Kapitalauszahlung mit 1/120-Verbeitragung, Doppelverbeitragung, Direktzusage/Unterstützungskasse

## 6. Datenmodell (Ergänzung zu `06-data-model.md`)
`GlobalAssumptions` erhält `payoutPhaseReturnPercent`, `marginalTaxRateTodayPercent`, `employeeSocialInsuranceRatePercent`, `health`. `Product`-Typen `statutory`, `occupational`, `retirementDepot` mit den Feldern oben. `ProjectionResult` (`06` §5) wird erstmals gebaut: Reihe der Ansparphase, `capitalAtRetirement`, `monthlyPensionNominal`/`Real`, `taxAndContributions`, `netMonthlyPensionReal`, `lumpSum?`, `warnings`. `ProductProjector` (`06` §6) wird eingeführt; ETF bleibt bis Phase 4 bei `calculateEtfPlan`. Neue lokale Zustände: `pathwise.profile.v1`, `pathwise.statutory.v1`, `pathwise.depot.v1`, `pathwise.occupational.v1` (Migration in den Workspace in Phase 5).
Validierung (Daten statt Exceptions): Rentenbeginn 63 bis 70, Depot-Auszahlbeginn 65 bis 70, `payoutEndAge` ≥ 85 und > Beginn, Beitrag ≤ 6.840 €/Jahr, `lumpSumSharePercent` 0 bis 30, Geburtsjahr plausibel, Prozentwerte −50 bis 100.

## 7. UI (Details in `05-ui-concept.md`)
- Seitenleiste: Gruppe "Bausteine" mit ETF-Sparplan, Gesetzliche Rente, Altersvorsorgedepot, Betriebliche AV; neuer Punkt **Profil** (Person + globale Annahmen)
- Bausteinseiten nach Muster `05` §3: Kennzahlen (Kapital bei Rentenbeginn, Brutto-Rente nominal und real, Abzüge, Netto real), Diagramm der Ansparphase, Tabelle; Szenarien nur bei Depot und bAV
- Depot: Zulagen je Jahr und Hinweis, wenn der Beitrag unter 1.800 € liegt ("Zulage bleibt liegen")
- bAV: Kachel "Netto-Aufwand pro Monat"; gesetzliche Rente: Hinweisbox zur Vereinfachung
- `unverified`-Hinweise an den betroffenen Werten; Annahmen-Seite listet die neuen Config-Dateien
- Mockups `docs/mockups/profil.html`, `rente.html`, `depot.html`, `bav.html` vor dem Bauen vom Autor freigeben lassen (je Teilphase)

## 8. Tests (Definition für "korrekt")
- **Zulagen:** `A = 0, 119, 120, 359, 360, 1.800, 2.400` ohne/mit Kindern und Bonus; Sprung 119 → 120
- **Gesetzliche Rente:** Abschlag bei 63 = 14,4 %, Zuschlag bei 70 = +18 %, Regelalter = 1,0; Besteuerungsanteil 2026/2027/2058/2060; Netto mit `statutoryCompulsory` und `other`
- **Auszahlplan:** geschlossene Formel, `i = 0`, Restkapital am Ende 0, Roundtrip, Einmalauszahlung 0/30 %
- **bAV:** Netto-Aufwand und Zuschuss an den Grenzen 338/676 €; KV-Freibetrag und Pflege-Freigrenze bei 197,75/197,76 €
- **Garantie:** Untergrenze greift bei schwacher Rendite (z. B. −2 %), nicht bei normaler
- **Property-Tests:** Kapital monoton in Beitrag und Rendite, höhere Kosten senken die Rente, Netto ≤ Brutto
- **Golden-Vektoren** je Baustein (mind. 5, erfundene Werte, `synthetic: true`); `tools/generate_golden.py` und `tools/golden-check.xlsx` erweitern. Hinweis: Das Skript ist eine zweite Implementierung derselben Quelle, die Excel-Prüfung bleibt eine Stichprobe des Autors. Zusätzlich prüft der Autor die gesetzliche Rente einmalig **mit der eigenen Renteninformation** (nicht im Repo)
- Playwright-Smoke je Teilphase: Rente berechnen, Depot mit Zulage, bAV mit Netto-Aufwand

## 9. Arbeitsschritte (Abhaken in `PROGRESS.md`)
**3a Profil, Config, gesetzliche Rente**
1. Config `pension-de.json` und `social-de.json`; Annahmen-Seite zeigt sie
2. Kern: Profil-/Annahmen-Typen, `payoutPlan`, `netPension`, `statutory`-Projector, Validierung, Tests, Golden-Vektoren
3. Mockups `profil.html` und `rente.html` zur Freigabe
4. Web: Profil-Seite, Seite Gesetzliche Rente, Navigation "Bausteine", i18n, Smoke-Test

**3b Altersvorsorgedepot**
5. Config `altersvorsorge-de.json`; Kern: Zulagenfunktion, Depot-Projector, Tests, Golden-Vektoren
6. Mockup `depot.html`; Web-Seite mit Zulagenübersicht; Smoke-Test

**3c bAV**
7. Kern: bAV-Projector mit Netto-Aufwand, Zuschuss, KV/Pflege-Regeln, Tests, Golden-Vektoren
8. Mockup `bav.html`; Web-Seite; Smoke-Test

**Abschluss**
9. README ergänzen, Abnahme (Excel-Stichprobe, eigene Renteninformation), Sichtprüfung (Desktop, schmal, Dunkel, Tastatur)

## 10. Bewusst nicht in Phase 3
Gesamtsicht und Rentenlücke, ETF-Entnahme und Entnahmeplan (Phase 4), mehrere Personen (4b), Speichern als Datei (5), Riester/Rürup/Lebensversicherung, Immobilie, Frühstart-Rente (6), lebenslange Depot-Rente und variabler Anteil, Glide Path, Sonderausgabenabzug, Entgeltpunkte-Modell, Erwerbsminderung und Hinterbliebene.
