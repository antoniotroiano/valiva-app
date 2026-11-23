# Konzept: Persönlicher Vorsorge- und Sparplaner

Diese Dateien sind die **einzige gültige Version** des Konzepts. Es gibt keine weitere Kopie. Änderungen am Konzept direkt hier machen und in `07-decisions-and-open-points.md` festhalten. Fortschritt steht in `PROGRESS.md`.

## Kurzfassung
- Private App (TypeScript, React, Vite) zur Prognose von ETF-Sparplänen und zur Planung der Gesamtrente aus gesetzlicher Rente, betrieblicher Altersvorsorge, ETF-Sparplan und Altersvorsorgedepot (ab 2027), später weitere Bausteine
- Kurzfristige Sparziele mit Tagesgeld-Zins und Zieldatum
- Rechenkern als reine Funktionen im Browser, Daten lokal als JSON, später Desktop und Sync
- Steuern vereinfacht, Ergebnisse in Kaufkraft von heute, Szenarien pessimistisch/neutral/optimistisch
- Code Englisch, UI Deutsch. Keine Anlage- oder Steuerberatung

## Dateien

| Datei | Inhalt |
|---|---|
| `PROGRESS.md` | Checkliste je Phase, Notizen und Abweichungen |
| `01-scope-and-roadmap.md` | Ziel, Funktionsumfang, Roadmap, Namen, Risiken |
| `02-architecture.md` | Architektur, Stack, Datenhaltung, Tests |
| `03-domain-rules.md` | Rechenregeln und Fachregeln-Recherche (bestätigt/unsicher, Quellen) |
| `04-phase-1-etf-calculator.md` | Phase 1 im Detail: Struktur, Regeln, Tests, Arbeitsschritte |
| `05-ui-concept.md` | Navigation, Seitenmuster, Startseite, Barrierefreiheit |
| `06-data-model.md` | Entitäten, Produktvertrag, Speicherformat, Phasenzuordnung |
| `07-decisions-and-open-points.md` | Entscheidungslog und offene Punkte |
| `08-phase-2-savings-goals.md` | Phase 2 im Detail: Sparziele, Zinssteuer, Rückwärtsrechner, Budget, Arbeitsschritte |
| `09-phase-3-pension-blocks.md` | Phase 3 im Detail: gesetzliche Rente, Altersvorsorgedepot, bAV, Profil, Config, Teilphasen 3a/3b/3c |
| `10-phase-4-overview.md` | Phase 4 im Detail: Gesamtsicht, Rentenlücke, ETF-Entnahme, Lücke schließen, Teilphasen 4a-1 bis 4a-4 |
| `11-phase-4b-household.md` | Phase 4b im Detail: Haushalt mit mehreren Personen, Haushaltslücke, Zustandsmigration, Teilphasen 4b-1 bis 4b-3 |
| `12-phase-5-persistence-and-release.md` | Phase 5 im Detail: Workspace-Format, Export/Import, Repo-Reife (Beispieldaten, README, Lizenz, CI), Git/GitHub, Teilphasen 5a bis 5d |
| `13-review-report.md` | Review-Bericht 2026-11-18: Sicherheit/GitHub Pages, Rechenfehler, Usability, Design, fehlende Funktionen, Umsetzungsreihenfolge |
| `14-review-report-2026-11-22.md` | Review-Bericht 2026-11-22 in 18 Arbeitspaketen (je eine Session, mit Abhaken): Smartphone-Fehler, Navigation, Struktur, Design, Rentenplan, Bausteinseiten, neue Funktionen, Release |
| `15-phase-6-generic-block.md` | Phase 6b im Detail: generischer Baustein "Sonstige Einkünfte im Alter" (Felder, Validierung, Gesamtsicht und Haushalt, Workspace-Format, Rechenregeln mit Beispielen, Tests, Golden-Vektoren, Abgrenzung), Mockup `docs/mockups/sonstige-einkuenfte.html` |

## Lesereihenfolge je Aufgabe
- **Phase 1 bauen:** `04`, dann `02` (Abschnitt Stack/Tests), `03` (Abschnitte 1 und 8), `06` (Abschnitte 3 bis 5 und 7), `05` (Abschnitt 3 und 6), dabei `PROGRESS.md` pflegen
- **Phase 2 bauen:** `08`, dann `04` (Rechenregeln und Struktur als Vorbild), `03` (Abschnitte 8 und 9), `06` (SavingsGoal, Validierung), `05` (Abschnitte 3 und 7), dabei `PROGRESS.md` pflegen
- **Phase 3 bauen (je Teilphase 3a, 3b, 3c):** `09`, dann `03` (Abschnitte 3 bis 7 und 12, Status der Werte), `06` (GlobalAssumptions, Person, ProjectionResult, ProductProjector), `05` (Abschnitte 3 und 8), `08` und `04` als Vorbild für Struktur, Tests und Golden-Vektoren, dabei `PROGRESS.md` pflegen
- **Phase 4 bauen (je Teilphase 4a-1 bis 4a-4):** `10`, dann `09` (Abschnitte 5.1 und 5.2, `payoutPlan`, `netPension`), `06` (ProjectionResult, ProductProjector), `05` (Abschnitte 4 und 9), `03` (Steuerwerte), `08` (Solver) als Vorbild, dabei `PROGRESS.md` pflegen
- **Phase 4b bauen (je Teilphase 4b-1 bis 4b-3):** `11`, dann `10` (`overview`, Lücke schließen), `06` (Household, Person, Migration), `05` (Abschnitte 2 und 9), `09` (`Profile`, `GlobalAssumptions`), dabei `PROGRESS.md` pflegen
- **Phase 5 bauen (je Teilphase 5a bis 5d):** `12`, dann `06` (§7 Speicherformat, Migration), `02` (Abschnitte 3 und 4), `05` (Abschnitt 2, Seite Daten), `11` (§5 Zustände und Schlüssel), dabei `PROGRESS.md` pflegen
- **Phase 6b bauen (AP-15):** `15`, dann `10` (§5.2 `overview`), `11` (§4.1a Hinterbliebene), `09` (§5.2 Besteuerungsanteil, §5.4 bAV-Abgaben), `12` (§3 und §4 Workspace), `06` (§3 und §4), `03` (§4, §5), `docs/design.md` (Farben, `BlockPage`), dabei `PROGRESS.md` pflegen
- **Neue Phase planen:** `PROGRESS.md`, `01` (Roadmap), `06` (Phasenzuordnung), betroffene Fachabschnitte in `03`
- **Fachwerte prüfen:** `03`, danach `07` (offene Punkte)
- **UI bauen:** `05`, danach `04` Abschnitt 7

## Regeln
- Abweichungen vom Konzept zuerst in `PROGRESS.md` (Notizen) eintragen, bei Dauerhaftem die Konzeptdatei und `07` anpassen
- Gesetzliche Werte nie im Code, sondern in `config/` mit Quelle und Status
- Das Originaldokument `../ETF_Investment_Tracker_Technische_Architektur_und_Umsetzung.md` ist Archiv; nicht weiterpflegen
