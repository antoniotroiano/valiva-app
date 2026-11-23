# 15 – Phase 6: Generischer Baustein "Sonstige Einkünfte im Alter"

Entscheidungen vom 2026-11-23 (Review 14, Frage 6 und Fachfragen a bis l der Planungssession AP-14, alle wie empfohlen). Baut auf Phase 3 (`09`), 4 (`10`), 4b (`11`) und Phase 5 (`12`) auf. Umsetzung in AP-15. **Stand: Konzept, noch nichts gebaut; Rechts- und Sozialversicherungsaussagen sind, soweit nicht ausdrücklich "bestätigt", ungeprüft.**

## 1. Ziel und Abgrenzung
Ein wiederverwendbarer **Eintragstyp "Sonstige Einkünfte im Alter"** mit einheitlichen Feldern: Altverträge und weitere Einkünfte werden erfasst, ohne jedes Produkt einzeln nachzubauen. Mehrere Einträge je Person. Der Eintrag nimmt einen **gegebenen** Betrag (laut Standmitteilung, Vertrag, Mietvertrag, Bescheid) und rechnet ihn über Zeit, Steuer, Abgaben und Haushalt in die Gesamtsicht ein. Er prognostiziert **kein Kapital** und hat keine Renditeszenarien (alle drei Szenarien liefern denselben Wert, wie die gesetzliche Rente).

Beispiele: bestehende **Riester-Rente** laut Standmitteilung, **private Rentenversicherung**, **Basisrente (Rürup)**, **Pension/Versorgungsbezug**, **Mieteinnahmen**, Sonstiges.

**Nicht Teil dieser Phase (nur beschrieben, siehe §12):** ein echtes Riester-, Rürup- oder Lebensversicherungs-Modell (Beitragsphase, Garantie, Überschüsse, Zulagen, Kündigung), eine Immobilie mit Restschuld und Instandhaltung, Einmalbeträge, Werbungskosten, Versorgungsfreibetrag, Kapitalerträge.

Betroffen sind: Rechenkern (neuer Projektor, Erweiterung von `overview` und `householdOverview`), Workspace-Format (neuer Block, Version), Web (eine Seite, Seitenleiste, Rentenplan, Haushalt), `config/` (nur Regelannahmen, §9).

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| (a) Betrag | **Beides wählbar:** `today` (Kaufkraft heute, Standard) oder `nominalAtStart` (wie in Standmitteilungen). Jährliche Anpassung: `inflation` (Standard), `pension` (globale Rentenanpassung) oder `fixed` (fester Satz, 0 % = Festbetrag). Basis `today`: Betrag wächst ab heute mit der Anpassung (bei `inflation` real konstant); Basis `nominalAtStart`: wächst erst ab Beginn |
| (b) Beginn und Ende | **Alter in ganzen Jahren**; Ende als Alter oder **`lifelong`** (eigener Fall, bis zur Lebenserwartung). Kalenderjahre werden nur angezeigt. Begründung: Gesamtsicht und Haushalt rechnen in Jahresschritten, ein Monatsdatum würde nichts ändern |
| (c) Steuer | Vier Modi: `none`, `full`, `percent` (fester Anteil des Betrags), `pensionShare` (wie gesetzliche Rente: Anteil nach Beginnjahr aus `config/`, steuerfreier Betrag in Euro ab Beginn fest, spätere Steigerungen voll steuerpflichtig). Der steuerpflichtige Teil geht als eigene `TaxableIncome` in `retirementIncomeTax` (Steuer auf die Summe, Verteilung nach steuerpflichtigem Anteil) |
| (d) KV/Pflege | `none` (Standard) oder `likeOccupational` (wie bAV). Freibetrag (KV) und Freigrenze (Pflege) gelten **gemeinsam** mit dem bAV-Baustein der Person (Annahme, ungeprüft); bei `health.mode = other` greift der Satz aus dem Profil auf den ganzen Betrag |
| (e) Einmalbeträge | **Nein**, nur laufende Zahlungen. Einmalbeträge später (§12) |
| (f) Hinterbliebene | Feld `survivorPercent` je Eintrag (0 bis 100, Standard 0 = fällt weg), nur bei genau **zwei** Personen wirksam; der Anteil zählt bei der überlebenden Person als Einkommen (Steuer dort) und als anrechenbares Einkommen für die Witwenrente (Annahme, ungeprüft) |
| (g) Beginn | **Beliebiges Beginnalter**, dazu Schalter "mit meinem Rentenbeginn" (folgt dem Profil). Gesamtsicht und Verlauf starten am Rentenbeginn |
| (h) Anzahl | **Höchstens 10 Einträge je Person** (Import und Oberfläche); Personengrenze 20 und Dateigrenze 2 MB unverändert |
| (i) Vereinfachung | Sparerpauschbetrag (betrifft nur Kapitalerträge) und **Werbungskosten werden nicht berücksichtigt**; die UI nennt das. Bei Mieten gibt der Nutzer den Betrag **nach** Kosten ein |
| (j) Workspace | Neuer optionaler Block `otherIncome`, `Workspace.schemaVersion` **1 auf 2** mit leerer Migration, damit ältere App-Versionen neue Dateien ablehnen statt Einträge beim Export still zu verlieren |
| (k) Art | Auswahl `riester`, `basisPension`, `privateAnnuity`, `civilServicePension`, `rent`, `other`; setzt **nur Vorbelegungen und Hinweise**, die Rechnung kennt nur die allgemeinen Felder |
| (l) Darstellung | Ein Segment "Sonstige Einkünfte" je Person in einer neuen Farbe; Einträge einzeln in Tabelle und "Mehr dazu" |
| Vorgeschlagen (Planer) | Jeder Eintrag ist intern ein eigenes Produkt (`otherIncome:<id>`), damit die vorhandene Gesamtsicht-Mechanik (Beginn, Ende, Anpassung, Steuer) wiederverwendet wird (§5.1) |
| Vorgeschlagen (Planer) | Regelannahmen ohne Betrag stehen in `config/other-income-de.json` mit Status `unverified`, damit sie auf der Annahmen-Seite sichtbar sind (§9) |

## 3. Felder und Validierung

### 3.1 Eintrag (`OtherIncomeEntry`)
| Feld | Typ | Bereich / Standard |
|---|---|---|
| `id` | string | `[A-Za-z0-9_-]{1,32}`, eindeutig je Person |
| `name` | string | 1 bis 60 Zeichen (Standard: Name der Art) |
| `kind` | enum | `riester` · `basisPension` · `privateAnnuity` · `civilServicePension` · `rent` · `other` |
| `enabled` | boolean | Standard `true` (wie `overview.enabled`) |
| `amountMonthly` | number | 0 bis 100.000 €, brutto vor Steuer und Abgaben |
| `amountBasis` | enum | `today` (Standard) · `nominalAtStart` |
| `adjustment` | `{mode: 'inflation'}` · `{mode: 'pension'}` · `{mode: 'fixed', percent}` | Standard `inflation`; `percent` −50 bis 100 |
| `start` | `{mode: 'retirement'}` · `{mode: 'age', age}` | Standard `retirement`; `age` ganzzahlig 18 bis 100 |
| `end` | `{mode: 'lifelong'}` · `{mode: 'age', age}` | Standard `lifelong`; `age` ganzzahlig, größer als der Beginn, höchstens 120 |
| `taxMode` | enum | `none` · `full` (Standard) · `percent` · `pensionShare` |
| `taxSharePercent` | number | nur bei `percent`, 0 bis 100 |
| `contributions` | enum | `none` (Standard) · `likeOccupational` |
| `survivorPercent` | number | 0 bis 100, Standard 0 |

**Vorbelegung je Art** (nur Formularstart, im Zustand steht immer der volle Eintrag):
| Art | Basis, Anpassung | Beginn/Ende | Steuer | Abgaben |
|---|---|---|---|---|
| Riester-Rente | `nominalAtStart`, fest 0 % | Alter, lebenslang | `full` | `none` |
| Basisrente | `nominalAtStart`, fest 0 % | Alter, lebenslang | `pensionShare` | `none` |
| Private Rentenversicherung | `nominalAtStart`, fest 0 % | Alter, lebenslang | `percent` (Anteil vom Nutzer, Ertragsanteil) | `none` |
| Pension | `today`, `pension` | Rentenbeginn, lebenslang | `full` | `none` |
| Mieteinnahmen | `today`, `inflation` | Rentenbeginn, lebenslang | `full` | `none` |
| Sonstiges | `today`, `inflation` | Rentenbeginn, lebenslang | `full` | `none` |

Hinweise je Art (Texte in `i18n/de/`, Rechtsbezug als `unverified` gekennzeichnet): Riester laut Standmitteilung "Rente ab Alter X"; Basisrente wird nach Annahme wie die gesetzliche Rente besteuert (§22 Nr. 1 Satz 3 Buchstabe a aa EStG); private Leibrente mit Ertragsanteil (§22 Nr. 1 Satz 3 Buchstabe a bb EStG), Anteil laut Versicherer oder Steuerbescheid eintragen; Pension voll steuerpflichtig, **Versorgungsfreibetrag nicht berücksichtigt** (§19 Abs. 2 EStG); Mieten: Betrag nach Instandhaltung, Zinsen und Abschreibung.

### 3.2 Liste je Person (`OtherIncomeState`, lokal `valiva.p.<id>.otherIncome.v1`)
`{ entries: OtherIncomeEntry[] }`, höchstens 10, Reihenfolge = Anzeigereihenfolge. Leere Liste = Seite im leeren Zustand, Baustein trägt 0 bei und wird in der Gesamtsicht nicht als fehlend gemeldet.

### 3.3 Validierung (Fehler als Daten, keine Exceptions)
`validateOtherIncomeEntry(entry, profile, assumptions, currentYear)` liefert `ValidationIssue[]` (`field`, `code`, optional `min`/`max`), `validateOtherIncomeState` zusätzlich Listenregeln. Wie überall: Struktur und Endlichkeit zuerst (`not_finite`, `not_integer`, `out_of_range` aus `IssueCollector`), dann Fachregeln:
| Regel | Feld | Code |
|---|---|---|
| mehr als 10 Einträge | `entries` | `too_many_entries` |
| doppelte `id` | `entries[i].id` | `duplicate_id` |
| Name leer (nach Trim) oder über 60 Zeichen | `name` | `name_invalid` |
| Ende nicht nach Beginn | `end.age` | `end_not_after_start` |
| `nominalAtStart` mit Beginn in der Vergangenheit (`geburtsjahr + beginnAlter < currentYear`) | `amountBasis` | `nominal_start_in_past` |
| `taxMode = percent` ohne `taxSharePercent` | `taxSharePercent` | `required` |
| `taxMode = pensionShare` bei `Beginnjahr` vor Basisjahr der Config | `taxMode` | Warnung `taxable_share_before_base_year` (kein Fehler, wie bei `statutory`) |
| `survivorPercent > 0` bei einem Haushalt ohne genau zwei Personen | `survivorPercent` | Hinweis `survivor_needs_pair` (kein Fehler, Wert bleibt gespeichert) |
Ein ungültiger Eintrag fehlt im Ergebnis, der Grund steht in `issues` je Eintrag (Status `invalid`), die übrigen Einträge rechnen weiter. Beginn und Ende vor dem Rentenbeginn sind erlaubt (§5.3).

## 4. Zuordnung zu Gesamtsicht und Haushalt

### 4.1 Rentenlücke und Zusammensetzung
- Jeder aktivierte, gültige Eintrag wird ein Produkt der **Gesamtsicht** (`overview`) mit der Id `otherIncome:<id>`. Seine Netto-Rente zählt in Snapshot, Verlauf je Alter, Lücke und `solveGapContribution` mit; die Lücke ist wie bisher `max(0, Wunsch − Summe)`.
- **Zusammensetzung:** Diagramme und Kacheln fassen alle Einträge einer Person zu **einem Segment "Sonstige Einkünfte"** zusammen (neue Baustein-Farbe `--b-oth` mit Muster, §8). Die einzelnen Einträge stehen in der Tabelle "Zusammensetzung" (eine Zeile je Eintrag) und im Rechenweg.
- **Status je Eintrag** (wie bei den Bausteinen): `included`, `later` (Beginn nach dem Rentenbeginn, im Snapshot 0 mit Hinweis), `disabled`, `invalid` (mit Gründen) und **neu `ended`** (Ende vor dem Rentenbeginn, trägt 0 bei, Hinweis). Ein Eintrag mit Betrag 0 gilt wie ein leerer Baustein (`paysNothing`).
- Hinweise (`warnings`) der Einträge erscheinen gebündelt (Gewicht `info`/`important` nach `warningWeight`); `unverified:otherIncome.*` kommen aus der Config (§9).

### 4.2 Haushalt
- `householdOverview` ruft je Person `overview` mit deren Einträgen auf. Die Zeitachse in Kalenderjahren und die Wunschlinie bleiben unverändert; ein Eintrag trägt vom Jahr `Geburtsjahr + Beginnalter` bis vor `Geburtsjahr + Endalter` bei (Alter am Jahresende wie bisher: Beitrag, wenn `Alter ≥ Beginn` und `Alter < Ende`).
- **Hinterbliebene** (nur bei genau zwei Personen **und** gesetztem Haushaltsfeld `survivorPension`, wie die Hinterbliebenenrente selbst; ohne beides bleibt `survivorPercent` gespeichert, ohne Wirkung, mit Hinweis `survivor_needs_pair`): Ab dem Jahr nach dem ersten Todesfall (Jahr `Geburtsjahr + Lebenserwartung` der Person mit der kleineren Zahl) trägt jeder Eintrag der verstorbenen Person mit `survivorPercent > 0` den Anteil `survivorPercent/100 ·` (Brutto des Eintrags im Todesjahr, in Kaufkraft von heute, danach mit seinem Aktivitätsfaktor weiter) zur **überlebenden Person** bei, bis zum Ende des Eintrags (`lifelong`: bis zur Lebenserwartung der überlebenden Person). Dieser Anteil geht mit dem Steueranteil des Eintrags (`taxMode`) als eigene `TaxableIncome` in die Einkommensteuer der überlebenden Person (Summe, nicht Näherung über das Netto des Verstorbenen); Abgaben auf den weitergezahlten Anteil: keine (Vereinfachung).
- Der weitergezahlte Anteil zählt zum **anrechenbaren Einkommen** der überlebenden Person bei der Witwenrente (`11` §4.1a; Netto, Kaufkraft heute), gleichrangig mit gesetzlicher Rente, bAV und Depot. Annahme: Erwerbsersatz- und Vermögenseinkommen zählen (§97 SGB VI, §§18a ff. SGB IV; ungeprüft, Config-Regel `survivorIncomeCredited`).
- Der weitergezahlte Anteil steht gesondert im Ergebnis (`survivorOtherIncome`, analog `survivorPension`) und in `byPerson`/`total`. Ohne zwei Personen oder bei `survivorPercent = 0` ändert sich nichts.
- UI-Hinweis wie bei der Hinterbliebenenrente: Ohne Weiterzahlung fällt der Eintrag mit dem Tod der Person weg, die Haushaltslücke danach ist eher zu groß.

### 4.3 Eingaben-Übersicht, Seitenleiste, Status
- Seite "Sonstige Einkünfte" in der Gruppe "Einkommensquellen" der Seitenleiste und im "Eingaben"-Blatt (Hash `#other`, Seitentitel, Seitenliste in `app/pages.ts` **und** `MobileNav.tsx`, Backlog AP-03/AP-06).
- Status wie `NavStatus` (AP-13): `empty` (keine Einträge), `done` (mindestens ein gültiger Eintrag), `hint` (mindestens ein Eintrag mit wichtigem Hinweis oder Fehler; `unverified:` allein zählt nicht). Karte "Nächster Schritt" bleibt unverändert (kein neuer Pflichtschritt).
- Rentenplan: Chip je Quelle "Sonstige Einkünfte: n Einträge" bzw. Link zur leeren Seite wie bei den anderen Bausteinen.

## 5. Rechenregeln

### 5.1 Projektor `otherIncomeProjector`
Reine Funktion im Kern (neuer Ordner `packages/core/src/pension/otherIncome.ts`, Ordnerregel aus `docs/architecture.md`). Eingabe: Eintrag, `ProjectionContext` (Profil, Annahmen, Rechtswerte, `currentYear`, `otherIncome` = gleichzeitige Einkünfte der übrigen Produkte). Ausgabe: `ProjectionResult` je Szenario (alle gleich) **zum Beginn**, wie die übrigen Produkte, plus `payoutStartAge`/`payoutEndAge` für `overview`:
- Anpassungssatz `g`: `inflation` → Inflation `i`, `pension` → `pensionAdjustmentPercent`, `fixed` → `percent`.
- Beginnjahr `S = Geburtsjahr + Beginnalter` (Beginn `retirement`: `targetRetirementAge`), `n = S − currentYear` (kann negativ sein: läuft schon).
- Nominal bei Beginn: Basis `today`: `A·(1+g)^n`; Basis `nominalAtStart`: `A` (erlaubt nur für `n ≥ 0`).
- Real (Kaufkraft von heute) bei Beginn: `nominal/(1+i)^n`.
- `indexationPercent = g`, damit `overview` den bestehenden Aktivitätsfaktor `((1+g)/(1+i))^(Alter − Beginn)` anwendet (wie bei der Prozent-Entnahme, `10` §5.4); `payoutEndAge` = Endalter oder bei `lifelong` abwesend (läuft bis `lifeExpectancyAge`).
- Steuerpflichtiger Teil real `taxableMonthlyReal`: `none` → 0; `full` → real; `percent` → `taxSharePercent/100 ·` real (bleibt bei Steigerungen derselbe Anteil, wie ein Ertragsanteil); `pensionShare` → `Anteil(Beginnjahr)/100 ·` real mit `Anteil` aus `taxableShare(Beginnjahr, legal)` (`09` §5.2; Basis `config/pension-de.json`, bestätigt für die gesetzliche Rente; **Übertragung auf die Basisrente ist Annahme, ungeprüft**).
- Abgaben `contributionsMonthlyReal` bei `none`: 0. Bei `likeOccupational`: Regel §5.2.
- Steuer: `netPension`-Muster mit `otherIncome` aus dem Kontext (Steuer auf die Summe, Anteil nach steuerpflichtigem Teil); `fixedTaxMonthlyReal = 0`, kein `lumpSum`, kein Kapital (`series` leer, `capitalAtRetirement` fehlt).
- **`pensionShare` im Verlauf:** wie bei der gesetzlichen Rente (`incomeAt`) ist der steuerfreie Teil ein fester **nominaler** Betrag ab Beginn (`real_bei_Beginn − taxable`); real schrumpft er mit der Inflation, spätere Steigerungen sind voll steuerpflichtig. `incomeAt` wird dafür von `productId === 'statutory'` auf ein Merkmal des Produkts (`fixedTaxFreeAmount`) verallgemeinert.
- Szenarien: identisch; die UI zeigt einen Wert.

### 5.2 Abgaben "wie bAV" (`likeOccupational`), gemeinsame Schwelle
Gruppe je Person und Alter: bAV-Rente (falls aktiv) plus alle aktiven Einträge mit `likeOccupational`. Die **Summe** (nominal, Schwellen mit der Inflation skaliert wie in `occupationalContributions`) wird einmal bewertet: KV `(Satz allgemein + Zusatzbeitrag)·max(0, Summe − 197,75 € skaliert)`, Pflege `Pflegesatz·Summe` sobald die Summe über der Freigrenze liegt (alles oder nichts); `health.mode = other`: `otherRatePercent · Summe`. Die Abgaben werden **nach Brutto** auf die Mitglieder verteilt. Folge: Die bAV-Seite bleibt bei ihrem Einzelwert, die Gesamtsicht rechnet die Gruppe gemeinsam; die Abweichung wird als Hinweis `shared_occupational_threshold` gezeigt. Werte aus `config/social-de.json` (Freibetrag und Freigrenze dort `confirmed`; **dass sie je Person über alle Versorgungsbezüge gemeinsam gelten, ist ungeprüft**, Regel `sharedBenefitThreshold` in `other-income-de.json`; Bezug: §226 Abs. 2 SGB V, §57 SGB XI).

### 5.3 Beginn, Ende, Zeitfenster
- Ein Eintrag zahlt im Alter `a`, wenn `a ≥ Beginn` und (`lifelong` oder `a < Ende`); `a` ist das Alter am Jahresende (wie `overview`). Rentenbeginn mitten im Jahr wird nicht modelliert.
- Beginn vor dem Rentenbeginn: zählt im Snapshot mit dem Aktivitätsfaktor ab seinem Beginn. Beginn nach dem Rentenbeginn: Status `later`, Snapshot 0. Ende vor oder gleich dem Rentenbeginn: Status `ended`, 0.
- Beitrag vor dem Rentenbeginn (Mieten im Erwerbsleben) ist **nicht** Teil der Rentenlücke; die App zeigt nur ab Rentenbeginn.

### 5.4 Rechenbeispiele
Annahmen: Heute 2026, Inflation 2 %, Rentenanpassung 2,5 %, Person geboren 1976 (Beginn mit 67 = Jahr 2043, `n = 17`), Werte aus `config/` (Besteuerungsanteil 84,0 % + 0,5 je Jahr ab 2026, Tarif §32a, Pauschbeträge 102 € und 36 €).

**1. Riester laut Standmitteilung:** 150 €/Monat, `nominalAtStart`, fest 0 %, Beginn 67, lebenslang, `full`. Real bei Beginn `150/1,02^17 = 107,12 €`; mit 80 Jahren (13 Jahre später) `150/1,02^30 = 82,81 €`: der Festbetrag verliert real an Kaufkraft.

**2. Mieteinnahme:** 600 €/Monat nach Kosten, `today`, `inflation`, Rentenbeginn, `full`. Real konstant 600 €, nominal bei Beginn `600·1,02^17 = 840,14 €`.

**3. Pension:** 1.200 €/Monat heute, `today`, `pension`: Nominal bei Beginn `1.200·1,025^17 = 1.825,94 €`, real `1.200·(1,025/1,02)^17 = 1.304,02 €` (wächst real, weil die Anpassung über der Inflation liegt).

**4. Basisrente mit `pensionShare`:** 400 €/Monat, `nominalAtStart`, fest 1 %, Beginn 2043. Anteil `84 + 0,5·17 = 92,5 %`, steuerpflichtig bei Beginn 370 €, steuerfrei fest 30 €. Zehn Jahre später: Brutto `400·1,01^10 = 441,85 €`, steuerpflichtig `441,85 − 30 = 411,85 €` (nicht 92,5 %).

**5. Summe und Steuer (Beginn 2043, alles in Kaufkraft heute, keine Abgaben):** Riester 107,12 € (voll), Miete 600 €, Basisrente real 285,67 € mit Anteil 92,5 % = 264,24 €, Pension 1.500 € real: steuerpflichtig zusammen `2.471,36 €`/Monat = 29.656 €/Jahr, nach Pauschbeträgen `29.656 − 102 − 36 ≈ 29.518 €`, Steuer nach Tarif **4.081 €/Jahr = 340,08 €/Monat**. Aufteilung nach steuerpflichtigem Anteil: Riester 14,74 €, Miete 82,57 €, Basisrente 36,36 €, Pension 206,41 €. Ohne die Pension wäre die Summe `971,36 €`/Monat und die Steuer 0 (unter Grundfreibetrag): Erst die Summe bringt die Steuer, deshalb gehören die Einträge in `retirementIncomeTax` und nicht einzeln besteuert.

**6. Gemeinsame Schwelle (`likeOccupational`):** bAV 150 € und Riester über Pensionskasse 107,12 € (real, beide Mitglieder, Pflichtversicherte KVdR, Zusatzbeitrag 2,9 %, mit Kindern). Einzeln läge die bAV unter 197,75 €: Abgaben 0. Gemeinsam 257,12 €: KV `17,5 % · (257,12 − 197,75) = 10,39 €`, Pflege `3,6 % · 257,12 = 9,26 €`, zusammen 19,65 €, verteilt 11,46 € (bAV) und 8,19 € (Riester).

**7. Hinterbliebene:** Pension 1.500 € (Beispiel 5) mit `survivorPercent = 55`, Person stirbt vor dem Partner: Der Partner erhält ab dem Folgejahr 55 % von 1.500 = 825 € real, versteuert in seiner Summe, zählt zusätzlich als anrechenbares Einkommen bei der Witwenrente.

## 6. Datenmodell (Ergänzung zu `06`)
`Product`-Union: `legacy` (Riester/Rürup/Versicherung) und `realEstate` bleiben für später reserviert (§12); neu ist der **Eintragstyp** `OtherIncomeEntry` (§3.1) mit eigener Liste je Person statt einer Union-Variante je Produkt. `OverviewProductKind` wird zu `OverviewProductId = OverviewProductKind | \`otherIncome:${string}\``. Ergebnistypen: `OverviewProductStatus.status` um `ended` erweitert; `HouseholdResult` um `survivorOtherIncome`. Ergebnisse werden nicht gespeichert.

## 7. Workspace-Format
- **Neuer Block** `otherIncome` in `PERSON_BLOCKS` (`household/householdMigration.ts`): `byPerson[id].otherIncome = { entries: [...] }`. Lokaler Schlüssel `valiva.p.<id>.otherIncome.v1`, Block-Validator in `workspace/blocks.ts` (`validateOtherIncomeBlock`), Zusatz in `applyWorkspace`/`buildWorkspace`.
- **Versionierung:** `Workspace.schemaVersion` **1 auf 2**, `migrations[1]` ist die Identität (alte Dateien haben den Block nicht und laden mit leerer Liste), dazu Test-Muster mit Beispieldatei der Vorversion (`12` §4). Der Wert in `appConfig`/`HOUSEHOLD_SCHEMA_VERSION`-Umfeld bleibt getrennt (Haushaltszustand bleibt `v2`). Beispieldateien in `examples/` werden auf Version 2 gehoben, eine bekommt Einträge (erfundene Werte, `meta.synthetic: true`). Format-Golden (Parse/Serialize ergibt identische Bytes) wird neu erzeugt.
- **Import-Grenzen:** höchstens 10 Einträge je Person (mehr: Block ungültig, Warnung `too_many_entries`, Defaults für **diesen** Block, Haushalt bleibt gültig); `id` nur `[A-Za-z0-9_-]{1,32}`; `name` höchstens 60 Zeichen, Steuerzeichen werden abgelehnt; alle Zahlen endlich und im Bereich (§3.1); Enumerationen nur aus der Liste; **unbekannte Felder werden verworfen**; Gesamtdatei weiter ≤ 2 MB, Personen ≤ 20 (Worst Case 20 · 10 Einträge ≈ 80 KB, weit unter der Grenze).
- **Verbotene Schlüssel:** `__proto__`, `constructor`, `prototype` werden auf **jeder** Ebene des Blocks abgelehnt (nicht nur in `byPerson`); Einträge werden aus der Datei in neue Objekte kopiert (Feld für Feld), nie durchgereicht.
- Ein Eintrag mit Fachfehlern (§3.3) ist **kein** Importfehler: Er wird gespeichert und in der Oberfläche mit Fehlermeldung gezeigt (wie die übrigen Bausteine), Struktur-/Bereichsfehler dagegen verwerfen den Block.

## 8. UI (Mockup `docs/mockups/sonstige-einkuenfte.html`, vom Autor freizugeben)
- **Seite** in der Bausteinvorlage `BlockPage` (AP-10/11): links Eingaben (Liste der Einträge je Person, "Eintrag hinzufügen", Formular zu einem Eintrag, Gruppen eingeklappt), rechts Ergebnis (Hauptzahl "Netto pro Monat ab Rentenbeginn" mit Spanne entfällt, da alle Szenarien gleich; Kennzahlen Brutto, Steuer, Abgaben, Netto; Tabelle je Eintrag mit Beginn, Ende, Netto), Rechenweg und Hinweise eingeklappt. Smartphone: Ergebnis, Eingaben, Rechenweg.
- **Formular eines Eintrags:** Art (setzt Vorbelegung), Name, Betrag pro Monat, "Betrag in" (Kaufkraft heute / nominal bei Beginn), "Anpassung pro Jahr" (wie Inflation / wie gesetzliche Rente / fester Satz), Beginn (mit Rentenbeginn / ab Alter), Ende (lebenslang / bis Alter), Steuer (nicht / voll / Anteil in % / wie gesetzliche Rente), Abgaben (keine / wie bAV), Weiterzahlung an den Partner in % (nur bei zwei Personen sichtbar). Hilfetexte ein Satz, Details hinter "Mehr erfahren".
- **Hinweise im Formular:** "Sparerpauschbetrag und Werbungskosten sind nicht berücksichtigt"; bei Miete "Betrag nach Instandhaltung, Zinsen und Abschreibung"; bei Pension "Versorgungsfreibetrag nicht berücksichtigt".
- **Leerer Zustand** (`EmptyState`): Titel, zwei Sätze, Beispiele (Riester, Miete), Knopf "Ersten Eintrag anlegen".
- **Seitenleiste und "Eingaben"-Blatt:** Zeile "Sonstige Einkünfte" mit Status `NavStatus` und Farbpunkt `--b-oth`.
- **Rentenplan und Haushalt:** Segment "Sonstige Einkünfte" in Zusammensetzung (Person: Segment in Akzentmuster je Person; Haushalt: Balken je Person nach Baustein) und Verlauf; Tabelle mit einer Zeile je Eintrag unter "Mehr dazu". Neue Farbe nach `docs/design.md` (3:1 gegen Karte und `surface-2`, Beschriftungsfarbe 5:1, Prüfung im Kontrasttest `tokenContrast.test.ts` und Farbfehlsichtigkeit); das Mockup schlägt Olivgrün vor (Hell `#4d7c0f`, Dunkel `#a3d46b`), Werte nach Prüfung im Mockup.

## 9. Konfiguration (`config/`)
**Neu nötig für V1: kein Betrag.** Alle Beträge existieren (Besteuerungsanteil, Tarif, Pauschbeträge, KV/Pflege-Sätze, Freibetrag und Freigrenze). Neu sind nur **Regelannahmen**, die ohne Eintrag in der Config als gesichert erscheinen würden. Vorschlag: `config/other-income-de.json` im Schema der übrigen Dateien (`value` = 1, `unit` = `rule`, `validFrom`, `validTo`, `source`, `sourceDe`, `status`), alle **`unverified`**; die Annahmen-Seite (`legalGroups`) zeigt sie automatisch mit Abzeichen, der Kern liefert die Hinweiscodes `unverified:otherIncome.<key>`:
| Schlüssel | Regel | Quelle (nicht gelesen, nur genannt) |
|---|---|---|
| `basisPensionTaxShare` | Basisrente wird wie die gesetzliche Rente besteuert (Besteuerungsanteil nach Beginnjahr) | §22 Nr. 1 Satz 3 Buchst. a aa EStG |
| `privateAnnuityEarningsShare` | Private Leibrente mit Ertragsanteil; der Anteil wird vom Nutzer eingetragen, keine Tabelle in der App | §22 Nr. 1 Satz 3 Buchst. a bb EStG |
| `riesterFullyTaxable` | Leistungen aus Riester-Altverträgen voll steuerpflichtig | §22 Nr. 5 EStG (wie Depot) |
| `sharedBenefitThreshold` | KV-Freibetrag und Pflege-Freigrenze gelten je Person gemeinsam für alle Versorgungsbezüge | §226 Abs. 2 SGB V, §57 SGB XI |
| `survivorIncomeCredited` | Eigene Renten, Pensionen und Mieten zählen als anrechenbares Einkommen bei der Witwenrente | §97 SGB VI, §§18a ff. SGB IV |
Die Variante ohne eigene Datei (nur Hinweiscodes im Kern) ist möglich, verbirgt die Regeln aber vor der Annahmen-Seite; **Entscheidung in AP-15 beim Bau, siehe §14 Nr. 1**. Die App-Grenzen (10 Einträge, 60 Zeichen) sind **keine** Rechtswerte und stehen als Konstanten im Kern (`appConfig`-Stil), nicht in `config/`.
**Bei späterer Erweiterung wären neu nötig** (nicht V1): Ertragsanteil-Tabelle nach Alter (§22 Nr. 1 Satz 3 Buchst. a bb EStG), Versorgungsfreibetrag und Zuschlag nach Beginnjahr (§19 Abs. 2 EStG), Besteuerung von Kapitalauszahlungen, Werbungskosten-Pauschalen, Grenzwerte der Hinterbliebenenversorgung je Produkt.

## 10. Tests (Definition für "korrekt")
- **Projektor:** Basis `today`/`nominalAtStart`, Anpassung `inflation`/`pension`/`fixed`, `n` negativ (`today`), Fehler `nominal_start_in_past`, `lifelong` gegen Endalter, Beginn `retirement` folgt dem Profil, alle drei Szenarien gleich, Betrag 0.
- **Steuer:** `none`/`full`/`percent`/`pensionShare` je Mehr-Jahres-Verlauf (Beispiel 4: 411,85 € steuerpflichtig nach zehn Jahren), Summe zweier Einträge = Steuer der Summe (nicht Summe der Einzelsteuern), Aufteilung ergibt die Gesamtsteuer, Rückwärtsverträglichkeit (ohne Einträge unveränderte Ergebnisse aller bestehenden Vektoren).
- **Abgaben:** gemeinsame Schwelle bAV + Eintrag an den Grenzen 197,75/197,76 € (alle Mitglieder), `health.mode = other`, bAV ohne Einträge unverändert, Verteilung nach Brutto.
- **Gesamtsicht:** Summe = Summe der Produkte, Status `later`/`ended`/`disabled`/`invalid`, zehn Einträge, Snapshot und Verlauf an Stichprobenaltern, Lücke bei Überschuss 0, Zusammensetzung nach Einträgen und als Segment.
- **Haushalt:** zwei Personen, `survivorPercent` 0/55/100, erster Todesfall, Ende des Eintrags vor dem Tod des Partners, Anrechnung auf die Witwenrente, Steuer beim Hinterbliebenen, Paar ohne `survivorPension`, ein Einzelner unverändert (Regressionsvektoren).
- **Validierung und Workspace:** je Regel aus §3.3, 11 Einträge, doppelte Ids, Steuerzeichen im Namen, `__proto__` in Eintrag und Block, unbekanntes Feld, Version 1 lädt mit leerer Liste, Version 3 wird abgelehnt, Round-trip, Format-Golden, Beispieldateien parsen ohne Warnungen.
- **Property-Tests (`fast-check`):** alle Ergebnisse **endlich** (auch bei Extremwerten: Betrag 100.000, Anpassung −50 und 100 %, Beginn 18, Ende 120); Netto ≤ Brutto je Eintrag; Summe monoton im Betrag jedes Eintrags; höhere Anpassung → Netto nicht kleiner; Reihenfolge der Einträge ändert das Ergebnis nicht; Gruppierung einer Aufteilung eines Betrags auf zwei gleiche Einträge ergibt dieselbe Steuer; Haushalt: zusätzlicher Eintrag (≥ 0) vergrößert die Lücke nie.
- **Playwright-Smoke (wenige):** Eintrag Riester anlegen, erscheint im Rentenplan; Paar mit Weiterzahlung; leerer Zustand; axe hell und dunkel (Seite, Formular, Zusammensetzung).

## 11. Golden-Vektoren (Python-Generator und Excel)
Neue Familie `oi01` bis `oi08` (erfundene Werte, `synthetic: true`), erzeugt von `tools/generate_golden.py` (zweite Implementierung der Regeln) und als neue Blätter in `tools/golden-check.xlsx` (mit Formeln, wie `s01`/`o01`/`h01`; die Excel-Prüfung bleibt eine **Stichprobe des Autors**):
| Vektor | Inhalt |
|---|---|
| `oi01` | Riester `nominalAtStart`, fest 0 % (Beispiel 1), Werte bei 67 und 80 |
| `oi02` | Miete `today`/`inflation`, lebenslang, `full` (Beispiel 2) |
| `oi03` | Pension `today`/`pension` (Beispiel 3) |
| `oi04` | Basisrente `pensionShare`, 1 %, Alter 67 und 77 (Beispiel 4) |
| `oi05` | Vier Einträge, Steuer auf die Summe und Aufteilung (Beispiel 5) |
| `oi06` | bAV + Riester `likeOccupational`, gemeinsame Schwelle (Beispiel 6) |
| `oi07` | Paar, Weiterzahlung 55 %, Steuer und Anrechnung (Beispiel 7) |
| `oi08` | Statuswerte: Beginn nach, Ende vor Rentenbeginn, Betrag 0 |
Zusätzlich Regressionsvektoren: Alle bestehenden Vektoren (`s`, `o`, `h`, `e`, `gs`) bleiben ohne Einträge **bitgleich**.

## 12. Abgrenzung zu später (nur beschrieben, nicht gebaut)
- **Echtes Riester-Modell:** Beitragsphase mit Zulagen und Sonderausgabenabzug, Wohn-Riester, Auszahlphasen, Garantie und Überschussbeteiligung, Kapitalabfindung (30 %), Wechsel ins Altersvorsorgedepot. Heute: nur die Rente laut Standmitteilung als Betrag.
- **Echtes Rürup-/Basisrenten-Modell:** Beiträge und deren Absetzbarkeit, Beginnjahr-Staffel der Absetzbarkeit, Rentenfaktor. Heute: Betrag mit `pensionShare`.
- **Private Rentenversicherung und Lebensversicherung:** Garantie- und Prognosewerte, Kapitalwahlrecht, Besteuerung nach Ertragsanteil oder Halbeinkünfte-Regel, Rentengarantiezeit, Hinterbliebenenschutz je Vertrag. Heute: laufende Zahlung mit Anteil und `survivorPercent`.
- **Immobilie mit Restschuld:** Eigennutzung (ersparte Miete) und Vermietung mit Zinsen, Tilgung, Instandhaltung, Abschreibung, Werbungskosten, Verkauf. Heute: Netto-Miete als Betrag nach Kosten, ohne Verlauf der Restschuld. Reserviert: Produkte `legacy` und `realEstate` (`06` §4).
- **Einmalbeträge** am Beginn (Kapitalabfindung, Auszahlung): Besteuerung je Produkt sehr verschieden; würde `lumpSumTax` (`10`) nutzen, braucht eigene Regeln je Art.
- **Weiteres:** Versorgungsfreibetrag bei Pensionen, Sparerpauschbetrag/Kapitalerträge, Werbungskosten, Beitragspflicht von Mieten bei freiwillig Versicherten, Kapitalanlagen ohne Rendite-Szenarien (Tagesgeld, Gold, Krypto, `generic`), Frühstart-Rente, Zusammenveranlagung (AP-16).

## 13. Arbeitsschritte (AP-15, Abhaken in `PROGRESS.md`)
1. Config (`other-income-de.json`, falls entschieden), Typen, `validateOtherIncome*`, Tests
2. `otherIncomeProjector`, Erweiterung `overview` (`OverviewProductId`, `incomeAt`, gemeinsame Schwelle, Status `ended`), Tests, Golden-Vektoren `oi01` bis `oi06`
3. `householdOverview` (Hinterbliebene), Golden-Vektoren `oi07`, `oi08`, Regressionsvektoren
4. Workspace: Block, Validator, Version 2, Migration, Beispieldateien, Format-Golden, Tests
5. Web: Zustand `useOtherIncome` (`valiva.p.<id>.otherIncome.v1`), Seite `#other`, Seitenleiste und Eingaben-Blatt, Rentenplan und Haushalt, Texte in `i18n/de/`, Beispieldaten
6. E2E-Smoke und axe, README und `docs/assumptions.md`, Excel-Stichprobe des Autors anfragen

## 14. Offene Punkte
1. **Eigene Config-Datei für Regelannahmen** (§9) oder nur Hinweiscodes: Vorschlag Datei, Entscheidung beim Bau (Auswirkung: Annahmen-Seite zeigt die Regeln).
2. **Gemeinsame Schwelle `likeOccupational`** koppelt Gesamtsicht und bAV-Seite (§5.2); die bAV-Seite zeigt weiter den Einzelwert. Prüfen, ob Hinweis genügt oder die bAV-Seite die Einträge kennen soll.
3. **Abgaben auf den weitergezahlten Anteil** an Hinterbliebene: keine (Vereinfachung); tatsächlich gelten die Regeln des Hinterbliebenen (ungeprüft).
4. **Versorgungsfreibetrag** bei Pensionen fehlt (Pension wird zu hoch besteuert); gegen §19 Abs. 2 EStG prüfen, Config-Tabelle nach Beginnjahr nötig.
5. **Pauschbetrag auf Renteneinkünfte (102 €)** wirkt in `retirementIncomeTax` auch auf Mieten (nicht rentenartig); bei reiner Miete wäre der Betrag 0 nicht ganz richtig. Hinweis oder Aufteilung in AP-15 bewerten.
6. **Alle in §9 genannten Regeln** sind ungeprüft; vor Release gegen Primärquellen prüfen (`07` Punkt 3).
7. **Ertragsanteil und Besteuerungsanteil der Basisrente:** Nutzer trägt den Anteil bei `percent` selbst ein; ob eine Tabelle mit Vorschlag den Fehlerrisiko senkt (Config, ungeprüft).
8. **Schmaler Bildschirm:** Formular mit 12 Feldern je Eintrag ist lang; im Mockup als eingeklappte Gruppen gelöst, nach Abnahme erneut bewerten.
9. **Farbe `--b-oth`** und Muster im Haushaltsdiagramm (Person × Baustein): im Mockup vorgeschlagen, Freigabe mit dem Mockup.
10. **Bis zu 10 Einträge:** Grenze nach Nutzung bewerten (Zahl ist eine App-Grenze, keine Rechtsgrenze).
