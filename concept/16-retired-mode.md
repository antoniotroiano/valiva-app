# 16 – Rentner-Modus: Personen, die schon in Rente sind

Entscheidungen vom 2026-11-24 (Review 14, Abschnitt 9 Frage 3 und Fachfragen a bis l der Planungssession AP-19, alle wie empfohlen). Baut auf `09` (Rentenbausteine), `10` (Gesamtsicht), `11` (Haushalt), `12` (Workspace), `15` (Sonstige Einkünfte) und AP-16 (Splitting) auf. Umsetzung in AP-20. **Stand: Konzept und Mockup `docs/mockups/rentner-modus.html` am 2026-11-24 vom Autor mit "Ja, bauen" freigegeben. AP-20 Teil A (Kern, Workspace-Version 3, Golden, Arbeitsschritte 1 bis 5) am 2026-11-24 gebaut, Teil B (Web, Arbeitsschritte 6 und 7) am 2026-11-24 gebaut (Stand siehe §17). Die drei Config-Werte aus den selbst gelesenen Normen sind `confirmed` (§10, §16).**

## 1. Ziel und Abgrenzung
Personen, die ihre Rente schon beziehen, sollen abbildbar sein: **allein** und **im Paar** (eine Person in Rente, eine noch nicht). Heute ist das ein Fehlerfall: Ein Rentenbeginn in der Vergangenheit ergibt seit AP-04 eine Meldung (`retirement_in_past`, "Modus folgt", Befund B-3/U-H). Der Modus ersetzt die Meldung durch Ist-Werte statt Hochrechnung.

Kern der Idee: **Eingaben nur noch Ist-Werte.** Die gesetzliche Rente kommt aus dem Rentenbescheid, bAV und Depot als laufende Rente oder Restkapital mit Auszahlplan, das ETF-Depot als Bestand mit Entnahme ab heute. Die Rechnung läuft ab **heute**, nicht ab einem Rentenbeginn in der Zukunft.

**Nicht Teil dieser Phase (siehe §12):** Erwerbsminderungsrente als eigener Typ, Witwenrente als bezogene Rente, Gehalt der noch arbeitenden Person, privat Versicherte und freiwillig gesetzlich Versicherte mit eigenem Beitragsmodell, Altersentlastungsbetrag, Rentensplitting, Rentenanpassung nach dem echten 1.-Juli-Termin.

Betroffen: Profil (neues Feld), vier Bausteinzustände (neue optionale Felder), Rechenkern (Zeitbezug in `overview`/`householdOverview`, Ist-Rente, ETF-Bestand), `config/` (Besteuerungsanteil für Jahre vor 2026, Kinderlosenzuschlag-Grenze), Workspace-Format (Version 3), Web (Profil, vier Bausteinseiten, Rentenplan, Haushalt, Seitenleiste).

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| (a) Wann "in Rente" | **Ausdrücklicher Schalter** am Profil ("Ich beziehe bereits Rente", `retired`), keine stille Automatik. Die Fehlermeldung `retirement_in_past` bekommt den Knopf "Als Rentner führen". Rentenbeginn im laufenden Jahr bleibt gültig im Planungsmodus (AP-04). "Nah, aber noch nicht erreicht" = Planungsmodus plus Hinweis ab 12 Monaten vor dem Rentenbeginn ("Liegt dir der Rentenbescheid vor? Dann Ist-Werte eintragen"). Schalter nur möglich bei Rentenbeginn im laufenden oder früheren Jahr, sonst Fehler `retired_start_in_future` |
| (b) Gesetzliche Rente | Modus **Ist-Rente laut Rentenbescheid**: Bruttorente pro Monat (vor KV und Pflege), Rentenbeginn-Jahr aus dem Bescheid, optional "Jahresrente im Folgejahr des Beginns". Der Betrag zählt als Wert des **laufenden Jahres**, ab dem nächsten Jahr wächst er mit `pensionAdjustmentPercent`. Abschläge, Regelalter und Entgeltpunkte entfallen (stecken im Bescheid) |
| (c) bAV, Depot | **bAV** in zwei Formen: **laufende Rente** (Betrag/Monat, Anpassung 0 % oder wie Rentenanpassung, lebenslang oder bis Alter) oder **Restkapital mit Auszahlplan** (Kapital heute, bis Alter X, Rendite der Auszahlphase global, `payoutPlan`). **Depot** (Start frühestens 2027): nur Restkapital mit Auszahlplan, keine Einmalauszahlung. Riester-Altverträge bleiben "Sonstige Einkünfte" |
| (d) ETF | **Bestandsdepot** statt Sparplan: Depotwert heute und Summe der Einzahlungen (**Pflicht, keine Vorbelegung**, weil sie den Gewinnanteil bestimmt). Entnahme beginnt heute bis zur Lebenserwartung; Strategien Annuität oder Prozent und die Vorabpauschale-Option bleiben. Sparrate, Dynamik, Einmalzahlungen, Laufzeit, Beginnmonat entfallen |
| (e) Anpassung, Horizont | Rente wächst mit der globalen Rentenanpassung, Inflation global, Horizont = `lifeExpectancyAge`. Snapshot = **heute**, Verlauf vom heutigen Alter bis zur Lebenserwartung. Neu für **alle** Personen: Fehler `life_expectancy_in_past` (löst den Backlogpunkt aus AP-04) |
| (f) KV und Pflege | Zwei Modi wie heute (KVdR-pflichtversichert, "anders" mit eigenem Prozentsatz; Text für Rentner: "freiwillig gesetzlich oder privat: trage deinen tatsächlichen Beitrag in % der Rente ein"). Zusatzbeitrag editierbar, Kinderlose 4,2 % Pflege. Kein Beitragsmodell für freiwillig oder privat Versicherte (Backlog). Neu: Kinderlosenzuschlag entfällt für vor 1940 Geborene (§10) |
| (g) Steuer | Besteuerungsanteil **festgeschrieben nach Rentenbeginnjahr**, steuerfreier Euro-Betrag fest (§5.2). Pauschbeträge (102 €, 36 €) und Abzug der KV/Pflege-Beiträge wie heute. Altersentlastungsbetrag nicht modelliert (Backlog) |
| (h) Paar | Splitting wie AP-16 (**gemeinsam erst ab dem Jahr, in dem beide in Rente sind**, davor Einzelbesteuerung der Rentnerin, Hinweis). Verlauf startet heute; **Übergangsjahre** bis zum Rentenbeginn der zweiten Person zählen nicht zur Gesamtlücke. Kachel "Heute schon in Rente: Name, X € netto". Hinterbliebene unverändert über die Lebenserwartung |
| (i) Felder und Seiten | Tabelle in §7 |
| (j) Sparziele, ETF-Sparplan | Sparziele bleiben unverändert. Der ETF-Sparplan entfällt für Personen in Rente (die Seite zeigt nur Bestand und Entnahme); wer weiter spart, nutzt Sparziele. Die Sparplan-Eingaben bleiben im Speicher (Schalter zurück ohne Datenverlust), werden aber nicht gerechnet |
| (k) Sonderfälle | **Frührente** im Umfang (der Bescheidbetrag enthält den Abschlag, nur das Beginnjahr zählt). **Erwerbsminderungsrente**, Witwenrente, Pension: außerhalb, erfassbar als "Sonstige Einkünfte" (§12) |
| (l) Format und Version | `Workspace.schemaVersion` **2 auf 3** mit leerer Migration, App-Version MINOR (0.2.0, `docs/releasing.md`), Details §8 |
| Vorgeschlagen (Planer) | Kein neuer Baustein und keine neue Seite: Der Modus ist ein Zustand der Person und schaltet je Seite die Eingaben um. Ein Rentner hat dieselben fünf Seiten wie sonst, mit anderen Feldern |
| Vorgeschlagen (Planer) | Besteuerungsanteil für Jahre vor 2026 als neue Config-Tabelle `taxableShareTable` (§10); ohne sie wäre der Anteil für jeden heutigen Rentner (Beginn 2005 bis 2025) falsch |

## 3. Felder und Validierung

### 3.1 Profil (`Person`, additiv)
| Feld | Typ | Bereich / Standard |
|---|---|---|
| `retired` | boolean | Standard `false`; fehlt = `false` (ältere Dateien) |
| `retirementStartYear` | integer | nur bei `retired = true`, Pflicht dann; Jahr des Rentenbeginns laut Bescheid; `birthYear + 50 ≤ Jahr ≤ min(currentYear, birthYear + 75)` |
`targetRetirementAge` bleibt gespeichert (Schalter zurück), wird bei `retired` nicht benutzt; sein Feld ist ausgeblendet. Alter beim Beginn = `retirementStartYear − birthYear`.

### 3.2 Gesetzliche Rente (`statutory`, additiv)
| Feld | Typ | Bereich / Standard |
|---|---|---|
| `mode` | `projection` · `actual` | Standard `projection`; bei `retired` gilt `actual` (die Seite zeigt nur diesen Modus), bei Planung `projection` |
| `actualMonthlyGross` | number | 0 bis 20.000 € brutto/Monat, Wert des laufenden Jahres |
| `firstFullYearAnnual` | number, optional | 0 bis 240.000 €, Jahresbetrag der Rente im Jahr nach dem Rentenbeginn; fehlt = Näherung (§5.2) |
Die Felder der Hochrechnung (`projectedMonthlyPensionToday`, `statementYear`, `retirementAge` …) bleiben gespeichert und werden bei `actual` nicht benutzt.

### 3.3 bAV (`occupational`, additiv)
| Feld | Typ | Bereich / Standard |
|---|---|---|
| `retiredForm` | `annuity` · `capital` | nur bei `retired`; Standard `annuity` |
| `annuityMonthlyGross` | number | 0 bis 20.000 € |
| `annuityAdjustment` | `{mode: 'fixed', percent}` · `{mode: 'pension'}` | Standard `fixed` 0 %; `percent` −50 bis 100 |
| `annuityEndAge` | integer oder `lifelong` | Standard `lifelong`; Alter größer als das heutige, höchstens 120 |
| `capitalToday` | number | 0 bis 5.000.000 € (Form `capital`) |
| `capitalEndAge` | integer | größer als das heutige Alter, höchstens 120 |

### 3.4 Altersvorsorgedepot (`depot`, additiv)
`retiredCapitalToday` (0 bis 5.000.000 €), `retiredEndAge` (größer als das heutige Alter, mindestens 85 laut Gesetz `confirmed` in `altersvorsorge-de.json`, höchstens 120). Eine Einmalauszahlung gibt es nicht.

### 3.5 ETF (`etfPayout`, additiv)
`holdingValue` (0 bis 50.000.000 €), `holdingContributions` (**Pflicht**, 0 bis 50.000.000 €, `required` wenn leer, darf den Depotwert überschreiten: Verlustdepot, Gewinnanteil dann 0). Die Entnahmefelder (`withdrawalStrategy`, `withdrawalPercent`, `payoutEndAge`, Vorabpauschale) gelten weiter, `payoutStartAge` ist fest das heutige Alter.

### 3.6 Validierung (Fehler als Daten)
| Regel | Feld | Code |
|---|---|---|
| `retired` ohne Beginnjahr | `retirementStartYear` | `required` |
| Beginnjahr nach `currentYear` | `retirementStartYear` | `retired_start_in_future` |
| Beginnjahr außerhalb `birthYear + 50 … + 75` | `retirementStartYear` | `out_of_range` |
| Lebenserwartungsjahr (`birthYear + lifeExpectancyAge`) kleiner `currentYear` (alle Personen) | `lifeExpectancyAge` | `life_expectancy_in_past` |
| `retired` und `actualMonthlyGross` fehlt bei aktiviertem Baustein | `actualMonthlyGross` | `required` |
| Endalter nicht über dem heutigen Alter | `…EndAge` | `end_not_after_today` |
| ETF-Bestand ohne Einzahlungssumme | `holdingContributions` | `required` |
| `nominalAtStart` bei Sonstigen Einkünften mit Beginn in der Vergangenheit | `amountBasis` | `nominal_start_in_past` (unverändert; im Rentner-Modus ist die Wahl ausgeblendet, Basis fest `today`) |
`validateRetirementTiming` (`retirement_in_past`) gilt nur noch für Personen **ohne** `retired`. Wie bei AP-04 steht `life_expectancy_in_past` **nicht** in `validateProfile` (das schützt auch Laden und Import, eine kalenderabhängige Regel würde zum Jahreswechsel Daten verwerfen), sondern in `validateRetirementTiming`; gespeichert wird die Person trotzdem, die Fehler stehen am Feld.

## 4. Zeitbezug und Gesamtsicht

### 4.1 Eine Person
- Für eine Person mit `retired` ist **Rentenbeginn = heute**: `startYear = currentYear`, Alter heute `a₀ = currentYear − birthYear` (Alter am Jahresende wie bisher). Der Snapshot gilt für das laufende Jahr, der Verlauf läuft von `a₀` bis zur Lebenserwartung. Die Hero-Zahl heißt "Heute" statt "ab Rentenbeginn".
- Jedes Produkt der Person zahlt ab `a₀` (statt ab `targetRetirementAge`): gesetzliche Rente lebenslang, bAV und Depot bis zu ihrem Endalter, ETF bis `payoutEndAge`, Einträge der Sonstigen Einkünfte mit ihrem Beginn (liegt er in der Vergangenheit, zählen sie ab heute mit ihrem Aktivitätsfaktor ab ihrem Beginn).
- Lücke und Überschuss wie bisher (`max(0, Wunsch − Summe)`); ohne Wunscheinkommen keine Lücke (Hinweis wie bisher).

### 4.2 Paar mit einer Person in Rente
- Zeitachse in Kalenderjahren ab dem **laufenden Jahr**. Jede Person zählt ab ihrem effektiven Beginnjahr: `currentYear` bei `retired`, sonst `birthYear + targetRetirementAge`.
- **Übergangsjahre** = Jahre vor dem Beginn der zuletzt in Rente gehenden Person. Das Gehalt der arbeitenden Person ist nicht modelliert (wie `15` §5.3: Beiträge vor dem Rentenbeginn zählen nicht). Deshalb: Die Übergangsjahre stehen im Verlauf als eigenes Band ("bis zum Rentenbeginn von Ben: Einkommen aus Arbeit nicht modelliert") und fließen **nicht** in die Gesamtlücke und nicht in den Lückenlöser. Jeder Verlaufspunkt bekommt `transition: true`.
- **Snapshot** bleibt im Jahr, in dem die letzte Person in Rente geht (`11` §4.1) und ist der Wert der Hero-Zahl und des Lückenlösers. Sind alle Personen in Rente, ist das das laufende Jahr.
- **Kachel "Heute schon in Rente":** je Person mit `retired` der Netto-Betrag heute (Kaufkraft heute), unabhängig vom Snapshot.
- **Wunsch:** unverändert ein gemeinsames Netto-Wunscheinkommen, das ab Snapshot gilt (Übergangsjahre ohne Wunschlinie im Lückenwert, die Linie darf gezeigt werden).
- **Hinterbliebene:** unverändert (`11` §4.1a): erster Todesfall im Jahr `Geburtsjahr + Lebenserwartung` der Person mit der kleineren Zahl; das Netto der gesetzlichen Rente des Verstorbenen im Todesjahr kommt bei `actual` aus dem Ist-Betrag mit Anpassung. Eine bereits bezogene Witwenrente ist ein Eintrag der Sonstigen Einkünfte.

## 5. Rechenregeln

### 5.1 Gemeinsames
Alles in Kaufkraft des laufenden Jahres wie seit `10` §3. Beim Rentner ist `n = 0` für das laufende Jahr: Nominal gleich real heute. Anpassung `g = pensionAdjustmentPercent`, Inflation `i`, Aktivitätsfaktor wie bisher `((1+g)/(1+i))^(a − a₀)`.

### 5.2 Gesetzliche Rente `actual`
- Bruttorente heute `R` = `actualMonthlyGross`. Nominal im Jahr `t` Jahre ab heute: `R·(1+g)^t`, real `R·((1+g)/(1+i))^t`.
- Beginnjahr `S = retirementStartYear`, Besteuerungsanteil `p(S)` aus der Tabelle (§10, für Jahre ab 2026 aus `taxableShareBasePercent` + 0,5 je Jahr wie bisher).
- **Steuerpflichtiger Teil** nach Satz 2 bis 5 (gelesen, §10): Im Beginnjahr selbst `p(S) · Jahresrente`. **Ab dem Folgejahr** ist der steuerfreie Teil ein fester Euro-Betrag `F = (1 − p(S)) · J_ref`, mit `J_ref` = Jahresbetrag der Rente im Jahr `S+1`. Spätere regelmäßige Anpassungen sind voll steuerpflichtig (Satz 7).
- `J_ref` aus dem Feld `firstFullYearAnnual`; fehlt es, Näherung `J_ref = 12 · R · (1+g)^(S+1−currentYear)` (bei `S+1 < currentYear` also die heutige Rente zurückgerechnet). Hinweis `first_full_year_estimated`.
- Der Euro-Betrag `F` bleibt nominal fest; in Kaufkraft heute schrumpft er mit der Inflation (wie `docs/assumptions.md` Phase 6a). Übrige Abzüge, Tarif und Abgaben wie `netPension`/`retirementIncomeTax`.
- Szenarien: identisch (wie bisher).

### 5.3 bAV, Depot
- **Laufende bAV-Rente:** wie ein Eintrag "Sonstige Einkünfte" mit Basis `today`, Anpassung fest oder `pension`, Beginn heute, Ende `annuityEndAge` oder lebenslang, Steuer voll, Abgaben `likeOccupational` (KV-Freibetrag 197,75 €/Monat, Pflege-Freigrenze alles oder nichts, beides `confirmed` in `social-de.json`). Sie bleibt ein eigenes Produkt `occupational` (nicht `otherIncome`), damit die gemeinsame Schwelle (`15` §5.2) und die Seite unverändert funktionieren.
- **bAV-Restkapital und Depot-Restkapital:** `payoutPlan(capitalToday, a₀, endAge, payoutPhaseReturnPercent)` mit **heutigem** Kapital als Startwert (nominal gleich real heute), konstante nominale Rate bis `endAge`, danach 0; Steuer und Abgaben wie die jeweilige Art (bAV: Freibetrag/Freigrenze; Depot: voll steuerpflichtig mit Satz aus Tarif, KV 0 bei Pflichtversicherten, beides ungeprüft wie bisher). Real mit der Inflation ab heute wie im Verlauf bisher.
- Keine Garantie, keine Zulagen, keine Beitragsphase.

### 5.4 ETF-Bestand
- Eingaben: `K = holdingValue`, `E = holdingContributions`. Kein Sparplan, `grossFinalValue = K`.
- Entnahme ab heute: Annuität `payoutPlan(K, a₀, payoutEndAge, r)` mit Rendite der Auszahlphase `r`, oder Prozent (`F-16`, `10` §5.4). Steuer wie `10` §5.1: Gewinnanteil `g = max(0, K − E)/K`, `12·W·g·(1 − Teilfreistellung)`, minus Sparerpauschbetrag, mal Abgeltungsteuersatz; Vorabpauschale nur mit der Option. Werte aus `config/tax-de.json`.
- Eigener Projektor `etfHoldingProjector` (reine Funktion im Ordner `pension/`), der die Sparphase überspringt; `etfProjector` bleibt für die Planung unverändert.

### 5.5 Splitting im Mischfall
`isJointlyAssessed(year)` aus AP-16 bleibt: gemeinsam ab dem Jahr, in dem **beide** in Rente sind. Mit `retired` ist das effektive Beginnjahr der Rentnerin `retirementStartYear` (in der Vergangenheit), die Bedingung wird also zum Beginnjahr der zweiten Person erfüllt. Davor Einzelbesteuerung der Rentnerin mit Hinweis `joint_assessment_transition` ("bis Ben in Rente ist, wird Marta einzeln besteuert; sein Gehalt ist nicht modelliert"). Folge: In den Übergangsjahren ist die Steuer der Rentnerin eine Näherung (weder sicher zu hoch noch zu niedrig). Kein neues Feld.

### 5.6 Kinderlosenzuschlag
Pflegesatz für Kinderlose 4,2 % gilt nicht für Personen mit `birthYear < 1940` (Wert `careChildlessExemptBeforeBirthYear` in `config/social-de.json`, §10); diese zahlen 3,6 %. Gilt in allen Modi; sonst unverändert.

### 5.7 Rechenbeispiele
Annahmen: Heute 2026, Inflation 2 %, Rentenanpassung 2,5 %, Werte aus `config/` (Tarif §32a, 102 €, 36 €, KV 7,3 % + 1,45 % Zusatzbeitrag, Pflege 3,6 %, Teilfreistellung 30 %, Abgeltungsteuer 26,375 %, Sparerpauschbetrag 1.000 €). Erfundene Rentnerin **Marta**, Jahrgang 1955, KVdR-pflichtversichert mit Kindern, Frührente mit Beginn **2019** (Alter 64).

**1. Gesetzliche Rente, Steuer.** Bescheid: 1.650 €/Monat brutto, Beginn 2019. Besteuerungsanteil 2019 = 78,0 %. `J_ref` (Näherung): `1.650·12/1,025^6` = 17.073,48 €; steuerfreier Betrag `F = 0,22 · 17.073,48 = 3.756,17 €`. Jahresrente 2026 = 19.800 €, steuerpflichtig `19.800 − 3.756,17 = 16.043,83 €` (81,0 %, nicht 78 % und nicht 84 %). KV/Pflege: `1.650·(0,073 + 0,0145) = 144,38 €` und `1.650·0,036 = 59,40 €`, zusammen 203,78 €/Monat = 2.445,30 €/Jahr. Zu versteuern: `16.043,83 − 102 − 2.445,30 − 36 = 13.460,53 €` → Tarif **166 €/Jahr = 13,83 €/Monat**. Netto: `1.650 − 203,78 − 13,83 = 1.432,39 €/Monat`. Zum Vergleich: mit dem Anteil 84 % des Jahres 2026 (falsch für Beginn 2019) wären es 264 € Steuer.

**2. ETF-Bestand.** Depotwert 80.000 €, eingezahlt 50.000 €, Alter heute 71, Endalter 90 (Lebenserwartung), Rendite Auszahlphase 2 %: `n = 228` Monate, `i = 1,02^(1/12) − 1`, Rate `W = 421,36 €/Monat`. Gewinnanteil `g = 30.000/80.000 = 37,5 %`; steuerpflichtig pro Jahr `12 · 421,36 · 0,375 · 0,7 = 1.327,29 €`, nach Freibetrag 327,29 €, Steuer `327,29 · 0,26375 = 86,32 €/Jahr = 7,19 €/Monat`, Netto **414,17 €/Monat**. Ohne Einzahlungssumme wäre `g` unbekannt, deshalb Pflichtfeld.

**3. bAV laufend.** 250 €/Monat, Marta KVdR: Freibetrag 197,75 €: KV `(14,6 % + 2,9 %) · (250 − 197,75) = 9,14 €`, Pflege (über der Freigrenze, auf die ganze Rente) `3,6 % · 250 = 9,00 €`, Abgaben 18,14 €. Bei 180 €/Monat (unter der Schwelle) sind es 0 €.

**4. bAV-Restkapital.** 20.000 € bei Alter 71, bis 85, 2 %: `n = 168`, Rate **136,42 €/Monat**; nach dem Endalter 0.

**5. Paar im Übergang.** Marta (Beispiel 1) und der erfundene **Jonas**, Jahrgang 1962, Rentenbeginn mit 67 = 2029, Wunsch 3.000 € netto. Jahre 2026 bis 2028: Übergang (Band, keine Lücke, Jonas' Gehalt nicht modelliert), Kachel "Heute schon in Rente: Marta 1.432 €". Snapshot 2029: Martas Brutto real `1.650·(1,025/1,02)^3 = 1.674,38 €`; steuerpflichtig real `(1.650·1,025^3·12 − 3.756,17)/1,02^3 = 16.553,08 €`, SV `206,79 €/Monat`, zu versteuern `13.933,65 €`, Steuer 244 €/Jahr, **Netto 1.447,26 €/Monat** real. Hat Jonas (erfundener Vektorwert: 1.554 € brutto, Netto 1.350,67 €) einen Rentenbeginn 2029, ist die Summe 2.797,93 € und die Lücke 202,07 € gegen 3.000 € (Golden `rh01`). Splitting (falls "Ja"): ab 2029.

**6. Beginn im laufenden Jahr.** Bescheid ab 2026, 1.800 €/Monat: im Beginnjahr steuerpflichtig `84 % · 21.600 = 18.144 €`; ab 2027 gilt `F = 0,16 · J_ref` mit `J_ref = 21.600 · 1,025 = 22.140 €` (Näherung), also 3.542,40 €.

## 6. Splitting im Mischfall (Klärung)
Die offene Frage aus AP-16 ("Gehälter vor dem Rentenbeginn modellieren") bleibt **bewusst offen**: Ohne Gehalt der arbeitenden Person ist weder die gemeinsame Veranlagung noch die Einzelbesteuerung in den Übergangsjahren exakt. Festlegung: (1) gemeinsame Veranlagung nur ab dem Jahr, in dem beide in Rente sind (AP-16 unverändert), (2) bis dahin Einzelbesteuerung der Rentnerin mit Hinweis (§5.5), (3) die Übergangsjahre zählen nicht zur Gesamtlücke (§4.2), (4) ein optionales Gehaltsfeld (zu versteuerndes Einkommen bis zum Rentenbeginn) ist Backlog. Die Antwort "Ja/Nein" der Haushaltsfrage bleibt eine ausdrückliche Antwort; im Rentner-Mischfall ist sie ab dem ersten Jahr beider Renten wirksam.

## 7. Wirkung auf alle Seiten
| Seite | Bei Person in Rente |
|---|---|
| Profil | Schalter "Ich beziehe bereits Rente" (Mini-Hilfe), Feld "Rentenbeginn (Jahr laut Bescheid)" statt Wunsch-Rentenalter; Lebenserwartung, Kinder, Wunscheinkommen, KV-Angaben bleiben; Gehalt und Grenzsteuersatz heute (nur bAV-Ansparphase) ausgeblendet; Meldung "Als Rentner führen" ersetzt die Fehlermeldung bei Beginn in der Vergangenheit |
| Gesetzliche Rente | Nur Ist-Rente: Bruttorente, Rentenbeginn (kommt aus dem Profil, nur Anzeige), optional Jahresrente im Folgejahr; Abschlag, Regelalter, Renteninformation entfallen |
| Betriebliche AV | Auswahl "Laufende Rente" oder "Restkapital mit Auszahlplan"; Ansparfelder (Umwandlung, Zuschuss, Start, Kosten, Garantie) entfallen |
| Altersvorsorgedepot | Nur "Restkapital mit Auszahlplan" (Kapital heute, Endalter); Zulagen, Beiträge, Variante, Beginn entfallen; Hinweis, dass der Vertrag erst ab 2027 möglich ist |
| ETF | Nur "Bestand und Entnahme": Depotwert, Einzahlungssumme, Entnahmestrategie, Endalter, Vorabpauschale-Option; Sparplan-Felder und Rückwärtsrechner "Zielvermögen" entfallen |
| Sonstige Einkünfte | Unverändert, Basis fest "heute" (Auswahl ausgeblendet), Beginn "mit meinem Rentenbeginn" heißt "seit Rentenbeginn" |
| Sparziele | Unverändert |
| Rentenplan (Person) | Hero "Heute", Verlauf ab heutigem Alter; "Was wäre wenn" ohne Rentenbeginn-Regler; Karte "Lücke schließen" ohne Sparrate (kein Sparplan), stattdessen Hinweis |
| Rentenplan (Haushalt) | Kachel "Heute schon in Rente", Übergangsband im Verlauf, Snapshot im Jahr der letzten Rente; Splitting-Hinweis bis dahin |
| Seitenleiste, "Eingaben"-Blatt | Status je Seite wie bisher (`empty`/`done`/`hint`); ETF "empty", solange die Einzahlungssumme fehlt |
| Annahmen | Neue Rechenregelzeile "Personen in Rente"; neue Werte im Bereich "Gesetzliche Rente" und "Sozialversicherung" |
| Daten | Unverändert; Beispiele um eine Rentnerin und ein Paar erweitert |
| Rechenweg | Auf den Bausteinseiten zeigt "Rechenweg" die Ist-Werte (z. B. steuerfreier Betrag `F` mit Näherung) |

## 8. Workspace-Format
- **Neue optionale Felder:** `Person.retired`, `Person.retirementStartYear`; in den Blöcken `statutory`, `occupational`, `depot` und `etfPayout` die Felder aus §3. Keine neuen Blöcke und keine neuen Speicherschlüssel; die Blockzustände behalten ihre lokale `schemaVersion: 1` (nur additive optionale Felder).
- **Versionierung:** `Workspace.schemaVersion` **2 auf 3**, `WORKSPACE_MIGRATIONS[2]` ist die Identität (Dateien der Versionen 1 und 2 haben die Felder nicht und laden mit `retired = false`). Grund: Eine ältere App würde die Felder still verwerfen und die Rentnerin als Fehlerfall rechnen; mit Version 3 lehnt sie die Datei ab (wie `15` §7). Test-Muster mit einer Beispieldatei der Version 2 (`12` §4). Beispieldateien in `examples/` auf Version 3 anheben (eine Rentnerin, ein Paar mit einer Person in Rente, `meta.synthetic: true`); Format-Golden neu erzeugen.
- **App-Version:** MINOR (`0.1.0` auf `0.2.0`; neue Funktion, alte Dateien bleiben lesbar, `docs/releasing.md`). Die Version erhöht, committet und pusht nur der Autor; AP-20 pflegt höchstens `## [Unreleased]` im `CHANGELOG.md` und streicht die Zeile "There is no retiree mode yet" unter "Known limitations".
- **Import-Grenzen:** `retired` strikt `boolean` (null, Zahlen und Text sind Importfehler wie bei `jointAssessment`); `retirementStartYear` ganzzahlig und im Bereich (§3.1), sonst Person ungültig; alle Beträge endlich und im Bereich (§3.2 bis §3.5); Enumerationen nur aus der Liste; unbekannte Felder werden verworfen; verbotene Schlüssel (`__proto__`, `constructor`, `prototype`) auf jeder Ebene abgelehnt, Felder einzeln in neue Objekte kopiert; Dateigrenzen unverändert (2 MB, 20 Personen). Fachfehler (z. B. `retired_start_in_future` beim Import einer Datei aus einem späteren Jahr) sind **kein** Importfehler: Die Person wird gespeichert, der Fehler steht am Feld.
- **Datenformat-Hinweis in `docs/releasing.md`:** Ein Formatbruch wäre MINOR (`0.x`); hier gibt es keinen Bruch, nur eine Erweiterung, deshalb ebenfalls MINOR.

## 9. UI (Mockup `docs/mockups/rentner-modus.html`, vom Autor freizugeben)
- Profil: Schalter und Beginnjahr, die Meldung statt des heutigen Fehlers; Rentenplan einer Person in Rente und eines Paares mit einer Person in Rente; angepasste Bausteinseiten (nur Ist-Werte); Seitenleiste und "Eingaben"-Blatt mit Status.
- Beispieldaten erfunden: Marta (Jahrgang 1955) und das Paar Marta und Jonas (Jahrgang 1962).
- Texte in `apps/web/src/i18n/de/` (Bau in AP-20), keine neue Farbe, nur vorhandene Tokens.

## 10. Konfiguration (`config/`)
Neu nötig, alle Werte mit `source`, `sourceDe` und Status; **kein Wert aus dem Gedächtnis als gesichert**:
| Datei | Wert | Inhalt | Quelle | Status |
|---|---|---|---|---|
| `pension-de.json`, Abschnitt `retired` | `taxableShareTable` (`tiers` nach Jahr des Rentenbeginns) | bis 2005 50 %, 2006 52 % und je Jahr +2 Punkte bis 2020 (80 %), 2021 81 %, 2022 82 %, 2023 82,5 %, 2024 83 %, 2025 83,5 %; 2026 bis 2058 wie `taxableShareBasePercent` (84 % + 0,5 je Jahr, 100 % ab 2058) | § 22 Nr. 1 Satz 3 Buchst. a aa Satz 3 EStG, `gesetze-im-internet.de/estg/__22.html`, am 2026-11-24 selbst im eingebauten Browser gelesen (Tabelle vollständig bis 2058, keine Abweichung zur Planung) | `confirmed` |
| `pension-de.json`, Abschnitt `retired` | Regel `taxFreeAmountFixedFromYearAfterStart` (`unit` `rule`) | Der steuerfreie Teil wird ab dem Jahr nach dem Rentenbeginn aus dem Jahresbetrag festgeschrieben, regelmäßige Anpassungen ändern ihn nicht | § 22 Nr. 1 Satz 3 Buchst. a aa Sätze 4, 5 und 7 EStG, am 2026-11-24 selbst gelesen (alle drei wörtlich). **Einschränkung:** der Wortlaut nennt kein Bezugsjahr für den Jahresbetrag; das erste volle Jahr (Folgejahr des Beginns, `J_ref`) ist Annahme der App; Satz 6 und 8 nicht modelliert | `confirmed`, mit sichtbarem Einschränkungstext in `source`/`sourceDe` |
| `social-de.json`, Abschnitt `retired` | `careChildlessExemptBeforeBirthYear` = 1940 | Kein Zuschlag für Kinderlose bei Geburt vor dem 1.1.1940 | § 55 Abs. 3 Satz 2 SGB XI, `gesetze-im-internet.de/sgb_11/__55.html`, am 2026-11-24 selbst gelesen (wörtlich) | `confirmed` |
Nicht neu, weil schon vorhanden und `confirmed`: Tarif, Pauschbeträge, KV/Pflege-Sätze, Freibetrag und Freigrenze der bAV, Teilfreistellung, Abgeltungsteuer, Sparerpauschbetrag, Mindest-Endalter 85 des Depots. **Ungeprüft im Konzept (nicht als Config-Wert):** Folgerente nach § 22 Satz 8 (Erwerbsminderungsrente in Altersrente, §12); die App-Näherung für `J_ref`; Altersentlastungsbetrag (§ 24a: ab dem Kalenderjahr nach Vollendung des 64. Lebensjahres, 2026 12,8 % mit Höchstbetrag 608 €, zählt nicht für Renten, Satz 2 Nr. 2; gelesen 2026-11-24, nur Backlog, kein Wert in der Config). Die Tabelle gilt nur für **Altersrenten und gleichartige Leibrenten**; für andere Renten entfällt sie (Eintragstyp bei Sonstigen Einkünften).

## 11. Tests (Definition für "korrekt")
- **Zeitbezug:** Person mit `retired` und Geburtsjahr 1950: Snapshot im laufenden Jahr, kein `retirement_in_past`, Verlauf ab heutigem Alter; Beginn im laufenden Jahr (Beispiel 6) im Planungs- und im Rentner-Modus; `retired_start_in_future`; `life_expectancy_in_past` für beide Modi; Schalter zurück liefert das alte Ergebnis bit-gleich.
- **Gesetzliche Rente:** Beispiel 1 (Anteil 78 %, `F`, Steuer 166 €), `firstFullYearAnnual` gesetzt gegen Näherung, Beginnjahr 2005/2020/2025/2026/2058, Beginn im laufenden Jahr (Anteil nur im ersten Jahr), Anteil nie unter 50 %, `F` bleibt nominal fest, Rente 0.
- **bAV und Depot:** Annuität an 197,75/197,76 €, Restkapital `W` (Beispiel 4) gegen die geschlossene Formel, Endalter, Kapital 0, Anpassung fest und `pension`, Roundtrip.
- **ETF-Bestand:** Beispiel 2, `E ≥ K` (Gewinnanteil 0), Prozent-Entnahme mit Erschöpfung, Vorabpauschale, `holdingContributions` fehlt.
- **Kinderlosenzuschlag:** 1939/1940, Kinderlose und Eltern.
- **Gesamtsicht und Haushalt:** Paar mit einer Rentnerin (Beispiel 5): Übergangsjahre ohne Lücke, `transition`, Snapshot im Jahr der letzten Rente, Kachel "Heute schon in Rente", Splitting erst ab beiden in Rente, Hinterbliebene mit `actual`, beide in Rente (Snapshot heute), eine Person unverändert (Regressionsvektoren aller bestehenden Familien bleiben **bit-gleich**).
- **Validierung und Workspace:** je Regel aus §3.6, `retired` als `null` und Text, `__proto__` im Block, Version 2 lädt mit `retired = false`, Version 4 wird abgelehnt, Round-trip, Format-Golden, Beispieldateien parsen ohne Warnungen.
- **Property-Tests (`fast-check`):** alle Ergebnisse endlich (Extremwerte: Rente 20.000, Beginnjahr `birthYear + 50`, Endalter 120, Depot 50 Mio.); Netto ≤ Brutto; Netto monoton in der Bruttorente (Steuer ohne Abgabensprung); späteres Beginnjahr (bei gleichem Betrag) senkt den Besteuerungsanteil nie und die Steuer nie; Haushalt: Reihenfolge der Personen ändert nichts.
- **Playwright-Smoke (wenige):** Schalter am Profil, Rentenplan zeigt "Heute"; Meldung "Als Rentner führen"; Paar mit einer Rentnerin (Übergangsband, Kachel); Seiten der Bausteine zeigen nur Ist-Felder; axe hell und dunkel; Handy-Layout 375 px.

## 12. Golden-Vektoren (Python-Generator und Excel)
Neue Familie `r01` bis `r08` (Person) und `rh01`, `rh02` (Paar), erfundene Werte, `synthetic: true`, erzeugt von `tools/generate_golden.py` (zweite Implementierung) und als neue Blätter in `tools/golden-check.xlsx` (mit Formeln; die Excel-Prüfung bleibt eine **Stichprobe des Autors**):
| Vektor | Inhalt |
|---|---|
| `r01` | Gesetzliche Rente Frührente 2019, Beispiel 1, `J_ref` Näherung |
| `r02` | Wie `r01` mit `firstFullYearAnnual` |
| `r03` | Beginn im laufenden Jahr, Beispiel 6, Übergang zum Euro-Betrag im Folgejahr |
| `r04` | ETF-Bestand mit Annuität, Beispiel 2 |
| `r05` | ETF-Bestand mit Prozent-Entnahme und Erschöpfung |
| `r06` | bAV laufend 250 € und 180 €, Beispiel 3 |
| `r07` | bAV- und Depot-Restkapital, Beispiel 4 |
| `r08` | Kinderlose vor und ab 1940 |
| `rh01` | Paar Marta und Jonas, Beispiel 5, Übergangsjahre, Snapshot 2029 |
| `rh02` | Wie `rh01` mit Splitting "Ja" ab 2029 und Hinterbliebenen |
Regressionsvektoren: alle bestehenden Familien (`s`, `o`, `h`, `e`, `gs`, `oi`, `j`, `jh`) bleiben bit-gleich.

## 13. Abgrenzung zu später (nur beschrieben, nicht gebaut)
- **Erwerbsminderungsrente:** eigener Typ mit Zurechnungszeiten, Hinzuverdienst und Folgerente. Heute als "Sonstige Einkünfte" mit `pensionShare` und Beginnjahr erfassbar. Für die Folgerente in dieselbe Versicherung (§ 22 Nr. 1 Satz 3 Buchst. a aa Satz 8, Untergrenze 2005 = 50 %) sagt die Norm nicht ausdrücklich, ob der Wechsel von Erwerbsminderungs- in Altersrente darunter fällt; offen, nicht modelliert.
- **Bezogene Witwenrente, Beamtenpension:** nur als Einträge der Sonstigen Einkünfte (Versorgungsfreibetrag fehlt wie bekannt).
- **Gehalt der arbeitenden Person** und gemeinsame Veranlagung in den Übergangsjahren (§6).
- **Freiwillig gesetzlich und privat Versicherte:** Beitragsbemessung (Kapitalerträge, Mieten), Beitragszuschuss der Rentenversicherung, feste Prämien.
- **Altersentlastungsbetrag** (§ 24a EStG) für Mieten und Nebeneinkünfte.
- **Rentenanpassung zum 1. Juli** statt jährlich pauschal; Wert der Anpassung je Rentenart.
- **Rentensplitting unter Ehegatten**, Vererbung von ETF/Depot/bAV an Hinterbliebene.
- **Kinderzuschläge und Sterbevierteljahr** (wie bisher nicht modelliert).

## 14. Arbeitsschritte (AP-20, Abhaken in `PROGRESS.md`; Schritte 1 bis 5 = Teil A, erledigt 2026-11-24; Schritte 6 und 7 = Teil B, offen)
1. Config (`taxableShareTable`, Regel, `careChildlessExemptBeforeBirthYear`), Tests, Normen selbst lesen und Status prüfen
2. Typen und Validierung (Profil, `statutory`, `occupational`, `depot`, `etfPayout`), `life_expectancy_in_past`, `retirement_in_past` nur ohne `retired`
3. Projektoren (`statutory actual`, bAV laufend/Restkapital, Depot Restkapital, `etfHoldingProjector`), Kinderlosenzuschlag, Tests, Golden `r01`–`r08`
4. `overview` und `householdOverview` (Zeitbezug heute, Übergangsjahre, Kachel), Splitting-Anpassung, Golden `rh01`, `rh02`, Regressionsvektoren
5. Workspace Version 3, Migration, Import-Grenzen, Beispieldateien, Format-Golden
6. Web: Profil-Schalter und Meldung, vier Bausteinseiten, Rentenplan, Haushalt, Seitenleiste, Texte in `i18n/de/`, Beispieldaten
7. E2E und axe, `docs/assumptions.md`, README, `CHANGELOG.md` (nur `Unreleased`), Excel-Stichprobe des Autors anfragen
Voraussetzung wie im Bericht: AP-04, AP-05, AP-06, AP-09 erledigt, dieses Konzept und das Mockup freigegeben. Zwei Sessions (Kern, Web) wie bei AP-15 sind wahrscheinlich nötig; Entscheidung beim Start von AP-20.

## 15. Offene Punkte
1. **Besteuerungstabelle und Satz 4:** Die Tabelle (bis 2040) wurde über einen Seitenabruf gelesen, Satz 4 nur sinngemäß; AP-20 liest § 22 selbst und stuft die Werte hoch. Wortlaut der Fassung nicht geprüft (kein Fassungsdatum auf der Seite).
2. **Näherung `J_ref`:** Bei Rente vor 2026 stimmt die Rückrechnung mit pauschal 2,5 % nur grob (die echten Anpassungen weichen je Jahr ab, 2020 bis 2025 unterschiedlich). Das optionale Feld `firstFullYearAnnual` ist der genaue Weg; Hinweis `first_full_year_estimated` zeigt die Näherung. Prüfen, ob der Hinweistext klar genug ist, und mit echten Renteninformationen vergleichen (Autor).
3. **Beginn mitten im Jahr und Wartezeit:** Beginn im laufenden Jahr rechnet das ganze Jahr als Rentenjahr (wie bisher, kein Monatsmodell).
4. **Gewinnanteil des ETF-Bestands:** konstant über die Entnahme angenommen (wie `10` §5.1), obwohl er mit jeder Entnahme sinkt.
5. **Lebenserwartung für Rentner:** Standard 90; bei Personen über 85 sinnvoller Wert offen (Eingabe bleibt Pflicht, kein Alter-abhängiger Vorschlag).
6. **Hinweis "Rentenbescheid liegt vor?"** ab 12 Monaten vor Rentenbeginn: Schwelle (12 Monate) ist eine Planerannahme.
7. **Kinderlosenzuschlag vor 1940:** wirkt praktisch nur bei Personen über 86; Eintrag trotzdem, damit nichts stillschweigend falsch ist.
8. **Depot 2027:** Seite soll vor 2027 den Hinweis zeigen, dass der Vertrag erst dann möglich ist; Verhalten bei Daten in 2026 (Backlog AP-23 zu `validFrom`) mitbewerten.
9. **Mockup:** Die Reihenfolge der Felder auf der Profilseite und der Text der Meldung "Als Rentner führen" werden im Mockup festgelegt.

**Entschieden in AP-20 Teil A (2026-11-24, alle wie empfohlen):** Punkt 2: Näherung `J_ref` mit pauschaler Rentenanpassung plus optionalem Feld `firstFullYearAnnual`, Hinweis `first_full_year_estimated` (entfällt, wenn das Folgejahr des Beginns das laufende Jahr ist, dann ist die Näherung exakt). Punkt 3: Beginn im Jahr rechnet das ganze Jahr. Punkt 4: Gewinnanteil konstant. Punkt 5: Lebenserwartung ohne altersabhängigen Vorschlag. Punkt 6: Schwelle als Kernkonstante `RETIREMENT_NOTICE_LEAD_MONTHS = 12` (Planerannahme), Hinweistext in Teil B. Punkt 8: Depot-Restkapital wird vor 2027 gerechnet und trägt den Hinweis `depot_before_first_contribution_year` (kein Fehler, kein Eingriff in `validFrom`). Punkt 1 ist durch das eigene Lesen der Normen erledigt (§10).

## 16. Festlegungen des Baus (Teil A)
- **Config:** die drei neuen Werte stehen im Abschnitt `retired` von `pension-de.json` und `social-de.json`, nicht in `values` (die Annahmen-Seite und ihre E2E-Zählungen bleiben so unverändert; Teil B zeigt sie an). `resolveLegalParameters` liest sie nur mit dem 8. Parameter `includeRetired` (`true` in `apps/web/src/lib/legalConfig.ts`); `LegalParameters.retired` trägt `taxableShareTiers`, die Regel und `careChildlessExemptBeforeBirthYear`. `validFrom` ist 2026-01-01 wie bei den Nachbarwerten.
- **Typen:** `Person` und `Profile` bekommen `retired?` und `retirementStartYear?`; die Blockfelder aus §3 stehen als `StatutoryActualFields`, `OccupationalRetiredFields`, `DepotRetiredFields`, `EtfHoldingFields` (`pension/retired.ts`) und sind optionale Teile der Blockzustände. Neue Codes: `retired_start_in_future`, `life_expectancy_in_past`, `end_not_after_today`, `legal_values_missing`. `validateProfile` prüft `retired` (strikt boolean), `retirementStartYear` (`required`, ganzzahlig, `birthYear + 50` bis `+ 75`) und für Rentner die Lebenserwartung gegen das Alter beim Beginn; `validateRetirementTiming` kennt `retired_start_in_future` und `life_expectancy_in_past` (Letztere nicht zusätzlich zu `retirement_in_past`).
- **Projektoren:** `projectStatutoryActual` (Ergebnis trägt `fixedTaxFreeMonthlyReal` = `F/12` und, wenn die Rente im laufenden Jahr beginnt, `fixedTaxFreeFromNextYear`), `projectOccupationalRetired` (Form `annuity`/`capital`), `projectDepotRetired`, `projectEtfHolding`; Pflegezuschlag über `careRatePercentFor` (alle Pfade, die den Kinderlosensatz nutzen, geben das Geburtsjahr weiter).
- **Gesamtsicht:** `overview` rechnet Personen mit `retired` ab dem heutigen Alter (`payoutStartAgeOf`), `OverviewResult.targetRetirementAge` ist dann das heutige Alter; `buildRetiredProducts` (`overview/retiredProducts.ts`) baut die vier Produkte aus den Blöcken. `householdOverview`: Beginnjahr je Person über `payoutStartYearOf`, Punkte vor dem Snapshot-Jahr tragen `transition: true` und keine Lücke (nur wenn mindestens eine Person `retired` ist), `HouseholdScenario.retiredToday` (nur dann); die gemeinsame Veranlagung beginnt im Jahr, in dem der spätere Rentenbeginn liegt (`pensionStartYearOf`).
- **Workspace:** Version 3, `WORKSPACE_MIGRATIONS[2]` ist die Identität; Person-Felder strikt, Blockfelder mit Bereichsprüfung (ein Fehler ersetzt den Block mit Warnung `block_replaced`).
- **Nicht in Teil A:** alles aus Teil B (Seiten, Texte, Mockup-Umsetzung, E2E, Doku, Changelog), der Lückenlöser für Haushalte mit Rentnern ohne Sparrate (Web-Bau), `buildPersonProducts` im Web kennt den Modus noch nicht.

## 17. Festlegungen des Baus (Teil B)
- **Seiten:** Die Bausteinseiten der Planung bleiben unverändert; für Personen mit `retired` wählt `PersonWorkspace` die Seiten in `pages/retired/` (gleiche Vorlage `BlockPage`, nur Ist-Felder, Ergebnis und Rechenweg als Faktenliste ohne Diagramm).
- **Rentenplan Person:** "Netto-Rente heute", keine Karte mit Sparrate (Erklärung mit Link zu den Sparzielen), kein Was-wäre-wenn. Haushalt: Lückenlöser nur für Personen ohne `retired`.
- **Hinweise:** `first_full_year_estimated` und `depot_before_first_contribution_year` sind Hintergrundhinweise (Info). Der Hinweis "Rentenbescheid liegt vor?" erscheint im Rentenplan der Person, wenn der Beginn höchstens `RETIREMENT_NOTICE_LEAD_MONTHS` Monate entfernt ist (der Beginn zählt als Januar des Beginnjahres). `joint_assessment_transition` ist ein reiner Web-Text im Haushalt.
- **Annahmen-Seite:** die drei Werte aus `retired` stehen in ihren Gruppen (die Tabelle als ein Eintrag), dazu die Regelzeile "Personen in Rente".
- **Beispiele:** `retired` und `couple-retired` mit den Knöpfen "Rentnerin" und "Paar, eine Person in Rente".
- **Offen** (Backlog in Bericht 14, Abschnitt 8): Seitenname "ETF-Sparplan" in der Navigation auch für Rentner, Diagramme auf den Rentner-Seiten, Excel-Stichprobe des Autors, Entscheidung zu `1.0.0`.
