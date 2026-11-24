# Entwicklungsunterlagen (intern, Deutsch)

**Für Besucher ist dieser Ordner nicht nötig.** Was die App kann und wie man sie benutzt, steht in der [README im Wurzelordner](../README.md) und in den Nutzerseiten unter [`docs/`](../docs/). Hier liegen die Planungs- und Arbeitsunterlagen, nach denen die App gebaut wurde: Konzept, Fachregeln, Fortschrittsprotokoll und Review-Berichte. Sie sind auf Deutsch und für den Autor und die Bau-Sessions geschrieben.

**Ordnung:**
- **Oben:** die aktuell gültigen Dateien (`01` bis `03`, `05` bis `07`, `15`, `16`), das Fortschrittsprotokoll `PROGRESS.md` und der laufende Review-Bericht `14`.
- **`archive/`:** erledigte Phasenkonzepte (`04`, `08` bis `12`), der ältere Review-Bericht `13` und die langen Notizen aus `PROGRESS.md` (`archive/PROGRESS-notes-archive.md`). Die Dateinamen und Nummern sind unverändert, in den Texten gelten die Nummern weiter (z. B. "`09` §5.2").
- Das ursprüngliche Dokument `../docs/archive/ETF_Investment_Tracker_Technische_Architektur_und_Umsetzung.md` ist überholt.

Das Konzept ist die **einzige gültige Version**. Änderungen am Konzept direkt hier machen und in `07-decisions-and-open-points.md` festhalten. Fortschritt steht in `PROGRESS.md`.

## Kurzfassung
- Private App (TypeScript, React, Vite) zur Prognose von ETF-Sparplänen und zur Planung der Gesamtrente aus gesetzlicher Rente, betrieblicher Altersvorsorge, ETF-Sparplan und Altersvorsorgedepot (ab 2027), später weitere Bausteine
- Kurzfristige Sparziele mit Tagesgeld-Zins und Zieldatum
- Rechenkern als reine Funktionen im Browser, Daten lokal als JSON, später Desktop und Sync
- Steuern vereinfacht, Ergebnisse in Kaufkraft von heute, Szenarien pessimistisch/neutral/optimistisch
- Code Englisch, UI Deutsch. Keine Anlage- oder Steuerberatung

## Dateien

| Datei | Stand | Inhalt |
|---|---|---|
| `PROGRESS.md` | laufend | Checkliste je Phase, Notizen und Abweichungen |
| `01-scope-and-roadmap.md` | aktuell | Ziel, Funktionsumfang, Roadmap, Namen, Risiken |
| `02-architecture.md` | aktuell | Architektur, Stack, Datenhaltung, Tests |
| `03-domain-rules.md` | aktuell | Rechenregeln und Fachregeln-Recherche (bestätigt/unsicher, Quellen) |
| `archive/04-phase-1-etf-calculator.md` | Archiv | Phase 1 im Detail: Struktur, Regeln, Tests, Arbeitsschritte |
| `05-ui-concept.md` | aktuell | Navigation, Seitenmuster, Startseite, Barrierefreiheit |
| `06-data-model.md` | aktuell | Entitäten, Produktvertrag, Speicherformat, Phasenzuordnung |
| `07-decisions-and-open-points.md` | aktuell | Entscheidungslog und offene Punkte |
| `archive/08-phase-2-savings-goals.md` | Archiv | Phase 2 im Detail: Sparziele, Zinssteuer, Rückwärtsrechner, Budget, Arbeitsschritte |
| `archive/09-phase-3-pension-blocks.md` | Archiv | Phase 3 im Detail: gesetzliche Rente, Altersvorsorgedepot, bAV, Profil, Config, Teilphasen 3a/3b/3c |
| `archive/10-phase-4-overview.md` | Archiv | Phase 4 im Detail: Gesamtsicht, Rentenlücke, ETF-Entnahme, Lücke schließen, Teilphasen 4a-1 bis 4a-4 |
| `archive/11-phase-4b-household.md` | Archiv | Phase 4b im Detail: Haushalt mit mehreren Personen, Haushaltslücke, Zustandsmigration, Teilphasen 4b-1 bis 4b-3 |
| `archive/12-phase-5-persistence-and-release.md` | Archiv | Phase 5 im Detail: Workspace-Format, Export/Import, Repo-Reife (Beispieldaten, README, Lizenz, CI), Git/GitHub, Teilphasen 5a bis 5d |
| `archive/13-review-report.md` | Archiv | Review-Bericht 2026-11-18: Sicherheit/GitHub Pages, Rechenfehler, Usability, Design, fehlende Funktionen, Umsetzungsreihenfolge |
| `14-review-report-2026-11-22.md` | laufend | Review-Bericht 2026-11-22 in 18 Arbeitspaketen (je eine Session, mit Abhaken): Smartphone-Fehler, Navigation, Struktur, Design, Rentenplan, Bausteinseiten, neue Funktionen, Release |
| `16-retired-mode.md` | Konzept (AP-19, Mockup freigegeben, Bau in AP-20) | Rentner-Modus: Personen, die schon in Rente sind, allein und im Paar (Schalter am Profil, Ist-Rente laut Bescheid, bAV und Depot in Auszahlung, ETF-Bestand, Übergangsjahre im Paar, Workspace-Version 3, Rechenbeispiele, Golden-Vektoren `r`/`rh`), Mockup `docs/mockups/rentner-modus.html` |
| `15-phase-6-generic-block.md` | aktuell | Phase 6b im Detail: generischer Baustein "Sonstige Einkünfte im Alter" (Felder, Validierung, Gesamtsicht und Haushalt, Workspace-Format, Rechenregeln mit Beispielen, Tests, Golden-Vektoren, Abgrenzung), Mockup `docs/mockups/sonstige-einkuenfte.html` |

## Lesereihenfolge je Aufgabe
- **Phase 1 bauen:** `04`, dann `02` (Abschnitt Stack/Tests), `03` (Abschnitte 1 und 8), `06` (Abschnitte 3 bis 5 und 7), `05` (Abschnitt 3 und 6), dabei `PROGRESS.md` pflegen
- **Phase 2 bauen:** `08`, dann `04` (Rechenregeln und Struktur als Vorbild), `03` (Abschnitte 8 und 9), `06` (SavingsGoal, Validierung), `05` (Abschnitte 3 und 7), dabei `PROGRESS.md` pflegen
- **Phase 3 bauen (je Teilphase 3a, 3b, 3c):** `09`, dann `03` (Abschnitte 3 bis 7 und 12, Status der Werte), `06` (GlobalAssumptions, Person, ProjectionResult, ProductProjector), `05` (Abschnitte 3 und 8), `08` und `04` als Vorbild für Struktur, Tests und Golden-Vektoren, dabei `PROGRESS.md` pflegen
- **Phase 4 bauen (je Teilphase 4a-1 bis 4a-4):** `10`, dann `09` (Abschnitte 5.1 und 5.2, `payoutPlan`, `netPension`), `06` (ProjectionResult, ProductProjector), `05` (Abschnitte 4 und 9), `03` (Steuerwerte), `08` (Solver) als Vorbild, dabei `PROGRESS.md` pflegen
- **Phase 4b bauen (je Teilphase 4b-1 bis 4b-3):** `11`, dann `10` (`overview`, Lücke schließen), `06` (Household, Person, Migration), `05` (Abschnitte 2 und 9), `09` (`Profile`, `GlobalAssumptions`), dabei `PROGRESS.md` pflegen
- **Phase 5 bauen (je Teilphase 5a bis 5d):** `12`, dann `06` (§7 Speicherformat, Migration), `02` (Abschnitte 3 und 4), `05` (Abschnitt 2, Seite Daten), `11` (§5 Zustände und Schlüssel), dabei `PROGRESS.md` pflegen
- **Phase 6b bauen (AP-15):** `15`, dann `10` (§5.2 `overview`), `11` (§4.1a Hinterbliebene), `09` (§5.2 Besteuerungsanteil, §5.4 bAV-Abgaben), `12` (§3 und §4 Workspace), `06` (§3 und §4), `03` (§4, §5), `docs/design.md` (Farben, `BlockPage`), dabei `PROGRESS.md` pflegen
- **Rentner-Modus bauen (AP-20):** `16`, dann `15` (§5.2 gemeinsame Schwelle, §7 Workspace), `10` (§5.1, §5.2 `overview`, §5.4 Entnahme), `11` (§4.1a Hinterbliebene), `09` (§5.2 Besteuerungsanteil, §5.4 bAV), `12` (§3, §4 Workspace), `docs/releasing.md` (Version), dabei `PROGRESS.md` pflegen
- **Neue Phase planen:** `PROGRESS.md`, `01` (Roadmap), `06` (Phasenzuordnung), betroffene Fachabschnitte in `03`
- **Fachwerte prüfen:** `03`, danach `07` (offene Punkte)
- **UI bauen:** `05`, danach `04` Abschnitt 7

## Regeln
- Abweichungen vom Konzept zuerst in `PROGRESS.md` (Notizen) eintragen, bei Dauerhaftem die Konzeptdatei und `07` anpassen
- Gesetzliche Werte nie im Code, sondern in `config/` mit Quelle und Status
- Das Originaldokument `../docs/archive/ETF_Investment_Tracker_Technische_Architektur_und_Umsetzung.md` ist Archiv; nicht weiterpflegen
