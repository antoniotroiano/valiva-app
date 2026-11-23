# 07 – Entscheidungen und offene Punkte

## 1. Entscheidungslog

| Datum | Thema | Entscheidung | Folge |
|---|---|---|---|
| 2026-11-08 | Nutzung | Erst nur für den Autor, dann GitHub-Repo zum Selbstnutzen, dann Desktop + Browser mit Daten überall | Phasen A/B/C |
| 2026-11-08 | Rentenberechnung | Brutto-Prognose, Steuern vereinfacht (pauschale Sätze) | kein vollständiges Steuermodell |
| 2026-11-08 | V1-Bausteine | Gesetzliche Rente, bAV, ETF-Sparplan, Altersvorsorgedepot | übrige Bausteine ab Phase 6 |
| 2026-11-08 | Ausgabe | Netto-Rente real, Rentenlücke, Entnahmeplan, Szenarien | siehe `01-scope-and-roadmap.md` |
| 2026-11-09 | Stack | **TypeScript-Fullstack** | Rechenkern läuft im Browser; Desktop später per Tauri/Electron |
| 2026-11-09 | Phase B | Lokal ausführen, Daten bleiben beim Nutzer | kein Hosting, Beispieldaten im Repo |
| 2026-11-09 | Detailtiefe V1 | Altersrente mit Abschlägen/Zuschlägen | Erwerbsminderung/Hinterbliebene nicht in V1 |
| 2026-11-09 | Mehrere Personen | Partner/Haushalt gewünscht (Phase 4b) | `Person`-Ebene ab Phase 1 |
| 2026-11-09 | UI | Deutsch, nüchternes Dashboard | Texte zentral, Englisch später möglich |
| 2026-11-09 | Name | 2026-11-22: "Valiva" (vorher Arbeitstitel "Pathwise") | Name nur an zentraler Stelle |
| 2026-11-09 | Sprachregel | Code und Konfig auf Englisch, UI-Texte Deutsch | `docs/glossary.md` DE → EN |
| 2026-11-09 | Phase 1 | Depotgebühr als Betrag und/oder Prozent; Rückwärtsrechner später (Phase 2/4); Recharts | siehe `04-phase-1-etf-calculator.md` |
| 2026-11-09 | Unsichere Fachwerte | Vor Phase 3 gegen Primärquellen prüfen | siehe `03-domain-rules.md` |
| 2026-11-09 | UI-Konzept | Seitenleiste, Muster "Formular + Live-Ergebnis", Hell/Dunkel, WCAG AA | `05-ui-concept.md` |
| 2026-11-09 | Datenmodell | Globale Annahmen + Override je Baustein; Sparziele getrennt mit gemeinsamer Sparrate; JSON mit `schemaVersion` | `06-data-model.md` |
| 2026-11-09 | Dokumentation | Konzept in `concept/` aufgeteilt, `PROGRESS.md` für Fortschritt, `CLAUDE.md` mit Regeln | Git/GitHub erst in Phase 5 |
| 2026-11-10 | Phase 2: Rückwärtsrechner | Für Sparziele **und** ETF-Plan, gemeinsamer Solver im Kern | `08-phase-2-savings-goals.md` |
| 2026-11-10 | Phase 2: Zinsmodell | Effektiver Jahreszins, geometrisch auf Monat umgerechnet (wie ETF) | `08` |
| 2026-11-10 | Phase 2: Zinssteuer | Optional, laufend bei Gutschrift, Freibetrag je Kalenderjahr pro Ziel wählbar (Default 1.000 €), nicht geteilt | `08`, `03` Abschnitt 9 |
| 2026-11-10 | Phase 2: Budget | Anzeige und Warnung, keine automatische Verteilung | `08` |
| 2026-11-11 | Fachwerte geprüft | Zulagen, Mindesteigenbeitrag, Produkte und Auszahlphase aus dem BGBl. bestätigt; Zuschuss 15 % (§ 1a BetrAVG), Pflege, Zusatzbeitrag bestätigt; Rest bleibt `unverified` | `03` Abschnitt 12 |
| 2026-11-11 | Phase 3: Rente-Eingabe | Hochrechnung aus der Renteninformation, keine Entgeltpunkte | `09-phase-3-pension-blocks.md` |
| 2026-11-11 | Phase 3: Auszahlphase | Auszahlplan bis Alter X mit Rendite in der Rentenphase (Default 2 %), gemeinsame Funktion `payoutPlan` | `09` |
| 2026-11-11 | Phase 3: Netto | Pauschale Sätze, Besteuerungsanteil, KV-Status (KVdR oder andere) | `09` |
| 2026-11-11 | Phase 3: bAV | Netto-Aufwand vereinfacht, Arbeitgeberzuschuss 15 % | `09` |
| 2026-11-11 | Phase 3: Aufteilung | Teilphasen 3a (Profil, gesetzliche Rente), 3b (Depot), 3c (bAV); Depot-Varianten nur über Kosten und Garantie, kein Glide Path (Vorschlag) | `09` |
| 2026-11-18 | Phase 4: ETF-Entnahme | Konstante nominale Rate bis Alter X über `payoutPlan`; Steuer vereinfacht auf den Gewinnanteil | `10` §5.1 |
| 2026-11-18 | Phase 4: Rentenlücke | Snapshot zum Rentenbeginn plus Verlauf je Alter bis Lebenserwartung; Wunsch = Netto in Kaufkraft heute | `10` §5.2 |
| 2026-11-18 | Phase 4: Lücke schließen | Rückwärtsrechner für zusätzliche ETF-Sparrate (`solveRequiredContribution`) | `10` §5.3 |
| 2026-11-18 | Phase 4: Personen | Eine Person in 4a, mehrere Personen als 4b | `10` |
| 2026-11-18 | Kaufkraft-Basis | "real" überall = Kaufkraft des aktuellen Jahres; die gesetzliche Rente deflationiert nicht mehr ab Stand-Jahr (Abweichung von `09` §5.2) | `10` §3 |
| 2026-11-18 | Phase 4: ETF-Annahmen (Vorschlag Planer) | ETF nutzt globale Szenarien und Inflation mit Override-Schalter; Laufzeit aus Rentenbeginn | `10` §2 |
| 2026-11-18 | Phase 4b: Wunsch | Ein gemeinsames Netto-Wunscheinkommen für den Haushalt | `11` §2 |
| 2026-11-18 | Phase 4b: Steuer | Pauschal je Person, keine Zusammenveranlagung | `11` §2 |
| 2026-11-18 | Phase 4b: Sparziele | Pro Person mit eigenem Budget; Haushaltssumme nur Anzeige | `11` §2 |
| 2026-11-18 | Phase 4b: Personenzahl | Beliebig viele, UI für Paare | `11` §2 |
| 2026-11-18 | Phase 4b: Annahmen, Zeitachse, Snapshot (Vorschläge Planer) | Haushaltsweite und persönliche Annahmen getrennt; Kalenderjahre; Snapshot im Jahr der letzten Rente | `11` §2 |
| 2026-11-23 | Phase 6: Generischer Baustein | Ein wiederverwendbarer Eintragstyp "Sonstige Einkünfte im Alter" statt je eines Bausteins pro Produkt; Review 14 Frage 6, Konzept `15` | `15-phase-6-generic-block.md` |
| 2026-11-23 | Phase 6: Betrag und Anpassung | Basis `today` oder `nominalAtStart`; Anpassung `inflation`, `pension` oder `fixed` (0 % = Festbetrag) | `15` §2 |
| 2026-11-23 | Phase 6: Beginn, Ende | Alter in ganzen Jahren, `lifelong` als eigener Fall, beliebiger Beginn plus Schalter "mit Rentenbeginn"; Rechnung ab Rentenbeginn | `15` §2, §5.3 |
| 2026-11-23 | Phase 6: Steuer | `none`/`full`/`percent`/`pensionShare` (fester steuerfreier Betrag in Euro ab Beginn wie bei der gesetzlichen Rente); Einträge gehen als eigene Einkünfte in `retirementIncomeTax` (Steuer auf die Summe) | `15` §2, §5.1 |
| 2026-11-23 | Phase 6: Abgaben | `none` oder `likeOccupational` mit gemeinsamer Schwelle zusammen mit der bAV der Person (Annahme, ungeprüft) | `15` §5.2 |
| 2026-11-23 | Phase 6: Einmalbeträge | Nicht in V1, nur laufende Zahlungen | `15` §2, §12 |
| 2026-11-23 | Phase 6: Hinterbliebene | `survivorPercent` je Eintrag, wirksam nur bei genau zwei Personen und gesetztem `survivorPension`; Steuer bei der überlebenden Person; zählt als anrechenbares Einkommen (Annahme, ungeprüft) | `15` §4.2 |
| 2026-11-23 | Phase 6: Grenzen und Vereinfachung | Höchstens 10 Einträge je Person; Sparerpauschbetrag und Werbungskosten nicht berücksichtigt (UI nennt es) | `15` §2, §7 |
| 2026-11-23 | Phase 6: Format und Darstellung | Neuer Block `otherIncome`, Workspace-Version 1 auf 2 (leere Migration); ein Segment "Sonstige Einkünfte" je Person, neue Farbe `--b-oth` Olivgrün; Mockup `docs/mockups/sonstige-einkuenfte.html` vom Autor mit "Ja, bauen" freigegeben | `15` §7, §8 |
| 2026-11-10 | Phase 2: Solver | Bisektion über ganze Cent statt Toleranz 0,005 €; Ergebnis = kleinster Cent-Betrag, der das Ziel erreicht | `08` §4 |

## 2. Offene Punkte

1. **Name:** Entscheidung vor der Veröffentlichung auf GitHub; dann Verfügbarkeit (GitHub, Domain, Marke) prüfen
2. **Beispielwerte für Golden-Tests:** anonymisierte Werte aus der eigenen Renteninformation und den Verträgen
3. **Unsichere Gesetzeswerte:** am 2026-11-11 größtenteils bestätigt (`03` Abschnitt 12). Offen: Besteuerung der Depot-Leistungen (§ 22 Nr. 5), Altersgrenze der Kinderzulage, Bonus unter 25 "einmalig", KV/Pflege auf private und betriebliche Renten, § 26a BetrAVG; vor Release erneut prüfen
4. **Speicherformat A/B:** JSON-Datei ist Standard; SQLite nur bei Bedarf (Entscheidung in Phase 5)
5. **Lizenz** (z. B. MIT) vor Veröffentlichung
6. **Gesetzliche Rente:** Phase 3 nutzt die Hochrechnung der Renteninformation (entschieden); ein Entgeltpunkte-Modell bleibt spätere Option
7. **Phase C:** Konfliktlösung beim Sync, optionale Verschlüsselung der Datei
8. **UI:** Farbpalette und Schrift (bei Umsetzung, mit Kontrastprüfung)
9. **Git/GitHub:** Einrichtung zu Beginn der GitHub-Phase (Phase 5)
10. **Spätere Option:** automatische Verteilung freiwerdender Sparraten nach Priorität und geteilter Sparerpauschbetrag über Ziele und ETF (nicht in Phase 2)
12. **Phase 4b, später:** Hinterbliebenenrente (seit Review `13` F-5 als Schalter umgesetzt, Rest siehe Punkt 13), Zusammenveranlagung mit gemeinsamem Sparerpauschbetrag, gemeinsame Sparziele (bewusst ausgenommen)
11. **Zinssteuer-Werte** (`capitalGainsTaxRate`, `taxFreeAllowance`) bleiben `unverified`; Prüfung zusammen mit den übrigen Werten vor Phase 3
13. **Spätere Option, bewusst nicht gebaut (Entscheidung 2026-11-20): Zusammenveranlagung beim Paar, Review `13` F-6 Stufe 2.** Stufe 1 (ein gemeinsamer Jahresfreibetrag über die Sparziele einer Person, nach Priorität) ist umgesetzt. Offen und bei Bedarf nachzuholen:
    - **Idee:** Bei einem Haushalt mit genau zwei Personen und Zusammenveranlagung teilen sich beide einen Pool von 2.000 € (Wert aus `config/tax-de.json`, dort heute nur der Einzelwert; ein zweiter Config-Wert mit Quelle wäre nötig). Haushaltsfeld analog zu `survivorPension`, optional, Dateiformat-Version unverändert.
    - **Sparziele:** Die Ziele beider Personen werden gemeinsam in Prioritätsreihenfolge abgearbeitet (bei Gleichstand nach Personenreihenfolge); `projectGoals` bekäme dafür eine Liste über Personen hinweg. Die Sparziel-Seite einer Person müsste die gespeicherten Ziele des Partners mitlesen (`loadPersonBlocks`), die Ergebnisse hängen dann voneinander ab. Mockup und Golden-Vektoren (Python und Excel, wie `gs01` bis `gs03`) sind nötig.
    - **ETF-Entnahme (eigener, größerer Schritt):** Beim Paar teilen sich beide auch dort die 2.000 €. `householdOverview` besteuert den ETF bisher je Person; eine gemeinsame Besteuerung bräuchte eine Jahressimulation über beide Personen (siehe auch Review `13` C-8, ETF-Entnahme vereinfacht).
    - **Nutzen:** Gering, solange beide Partner ihren Freibetrag je selbst weitgehend nutzen; spürbar, wenn die Zinsen oder Gewinne einer Person deutlich über 1.000 € liegen und die des Partners kaum.
    - **Nicht Teil davon:** Verteilung des Freibetrags zwischen Sparzielen und ETF-Sparplan einer Person (Stufe 1 rechnet nur die Ziele; der ETF wird meist Jahre später verkauft).
14. **Phase 6b, Generischer Baustein (Konzept `15`, offene Punkte dort §14):**
    - **Regelannahmen ungeprüft** (alle `unverified`, Quellen nur genannt, nicht gelesen): Basisrente wie gesetzliche Rente besteuert (§22 Nr. 1 S. 3 Buchst. a aa EStG), Ertragsanteil der privaten Leibrente (a bb), Riester-Leistungen voll steuerpflichtig (§22 Nr. 5), gemeinsame KV-Freibetrag-/Pflege-Freigrenze-Schwelle je Person (§226 Abs. 2 SGB V, §57 SGB XI), Anrechnung auf die Witwenrente (§97 SGB VI, §§18a ff. SGB IV). Vor Release prüfen (Punkt 3).
    - **Eigene Config-Datei `config/other-income-de.json` für diese Regeln** oder nur Hinweiscodes: Vorschlag Datei, Entscheidung in AP-15.
    - **Gemeinsame Schwelle `likeOccupational`** koppelt Gesamtsicht und bAV-Seite (bAV-Seite zeigt weiter den Einzelwert, Hinweis `shared_occupational_threshold`); prüfen, ob der Hinweis genügt.
    - **Versorgungsfreibetrag** (Pension, §19 Abs. 2 EStG) und **Werbungskosten bei Mieten** nicht berücksichtigt; der Pauschbetrag von 102 € auf Renteneinkünfte wirkt in `retirementIncomeTax` auch auf Mieten. Abgaben auf den weitergezahlten Anteil an Hinterbliebene: keine (Vereinfachung).
    - **Ertragsanteil und Besteuerungsanteil der Basisrente:** Nutzer trägt den Anteil bei `percent` selbst ein; eine Tabelle mit Vorschlag wäre eine spätere Option.
    - **Formular am Smartphone** (bis zu 12 Felder) und **Farbe `--b-oth`** nach dem Bau erneut bewerten; die Grenze von 10 Einträgen ist eine App-Grenze, keine Rechtsgrenze.
    - **Bewusst später** (`15` §12): echte Riester-, Rürup- und Lebensversicherungsmodelle, Immobilie mit Restschuld, Einmalbeträge.
