# 12 – Phase 5: Speichern, Export/Import, Repo-Reife, Git/GitHub

Entscheidungen vom 2026-11-18. Baut auf Phase 4b auf (`11`). Startet nach Abschluss von 4b.

## 1. Ziel und Abgrenzung
Die App soll Daten **sichern, wiederherstellen und zwischen Rechnern bewegen** können, und das Repo soll **teilbar** werden (Phase B aus `07`). Vier Teilphasen: **5a** Workspace-Format im Kern, **5b** Export/Import in der Web-App, **5c** Repo-Reife (Beispieldaten, README, Lizenz, Name, CI), **5d** Git/GitHub zusammen mit dem Autor.

Nicht in Phase 5: Sync, Login, Server, Verschlüsselung der Datei (Phase 7), neue Bausteine (6), Autospeichern in eine Datei auf der Platte (File System Access API), Mehrsprachigkeit.

## 2. Entscheidungen
| Thema | Entscheidung |
|---|---|
| Speichern im Browser | **Export als Download, Import per Dateiauswahl.** `localStorage` bleibt der Arbeitsspeicher der App; die Datei ist Backup und Transportweg (Autor, 2026-11-18) |
| Validierung | **Handgeschriebene Validatoren im Kern**, Fehler als Daten, keine neue Abhängigkeit (Autor, 2026-11-18); weicht von der Zod-Erwähnung in `06` §7 ab |
| Dateiformat | Eine JSON-Datei, `schemaVersion` startet bei 1 (`06` §7), enthält den ganzen Workspace (Haushalt, alle Personen, alle Bausteine) |
| Vorgeschlagen (Planer) | Dateiendung `.workspace.json` (steht schon in `.gitignore`); Dateiname `<appName>-YYYY-MM-DD.workspace.json`, Name aus `appConfig.ts` |
| Vorgeschlagen (Planer) | Import **ersetzt** den Workspace komplett, nach Bestätigung und mit Sicherungs-Download der aktuellen Daten; kein Zusammenführen |
| Vorgeschlagen (Planer) | Nur Eingaben in der Datei, keine Ergebnisse (wie bisher) und keine Werte aus `config/`; `appVersion` und Exportdatum dienen der Diagnose |
| Vorgeschlagen (Planer) | Theme (`valiva.theme`) ist Geräteeinstellung und nicht in der Datei |
| Vorgeschlagen (Planer) | Lizenz MIT, Name offen (Autor entscheidet in 5c), CI mit GitHub Actions |

## 3. Workspace-Format (Ergänzung zu `06` §7)
```ts
type Workspace = {
  format: string;                        // constant from appConfig, not hard-coded in the validator
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;                    // ISO 8601
  meta?: { synthetic?: boolean };        // true for files in examples/
  household: Household;                  // from HouseholdState.household
  activePersonId: string;
  byPerson: Record<string, Partial<Record<PersonBlock, unknown>>>; // block states, validated per block
};
```
- `byPerson` nutzt die vorhandenen `PERSON_BLOCKS` (`etfPlan`, `etfPayout`, `etfTarget`, `goals`, `statutory`, `depot`, `occupational`, `overview`). Das Dateiformat führt keine Version je Block; ändert sich ein Block, steigt `schemaVersion`, und `migrate_n_to_n+1` überführt ihn
- Der Kern definiert **Validatoren je Block** (heute prüfen das die Lader in den Hooks; sie wandern in den Kern, die Hooks rufen sie auf). Ungültige Blöcke ergeben Issues mit Personen-ID und Blockname, nie Exceptions
- Unbekannte Felder werden verworfen (Importdateien sind nicht vertrauenswürdig)
- `HouseholdState.schemaVersion` (heute 2, `valiva.household.v2`) und `Workspace.schemaVersion` (1) sind getrennt; die Migration aus 4b bleibt bestehen

## 4. Kern (5a)
Neue Datei `packages/core/src/workspace.ts` (rein, ohne `localStorage`, `File`, `Blob`):
- `buildWorkspace(state, blocks, meta)`, `serializeWorkspace(workspace)` (stabile Schlüsselreihenfolge, 2 Leerzeichen Einrückung)
- `parseWorkspace(raw, currentYear)` → `{status: 'ok', workspace, warnings} | {status: 'error', issues}`
- Prüfreihenfolge (`06` §7): Größe ≤ 2 MB → JSON → `format` → `schemaVersion` (neuer als bekannt: Meldung "Datei stammt aus neuerer Version", kein Import) → Migrationskette → `validateHousehold` (eindeutige IDs, aktive Person vorhanden) → Block-Validatoren → Zahlenbereiche (endlich, kein `NaN`), Stringlängen, Personenzahl ≤ 20
- Einzelner fehlerhafter **Block**: Warnung und Defaults für diesen Block, solange der Haushalt gültig ist. Ungültiger Haushalt: Abbruch. Das Ergebnis nennt, was ersetzt wurde
- `applyWorkspace(workspace)` liefert `HouseholdState` und Blockdaten je Person für die Web-Schicht
- Migrationskette `migrations: Record<number, (w) => w>`, leer für Version 1, mit Test-Muster
- Sicherheit: kein `eval`; `__proto__`, `constructor`, `prototype` als Schlüssel ablehnen; Personen-IDs auf `[A-Za-z0-9_-]{1,32}`

## 5. Web (5b)
- Schnittstelle `WorkspaceStore { load(); save(workspace) }` (`06` §7) mit `BrowserWorkspaceStore` über `localStorage` (bündelt `valiva.household.v2` und `valiva.p.<id>.<block>.v1`). Die Hooks greifen weiter direkt auf die Schlüssel zu; der Store dient Export, Import und Reset. Eine tiefere Umstellung der Hooks ist nicht Teil der Phase
- **Seite "Daten"** (`05` §2):
  - Export: "Daten exportieren", Download per `Blob`; Hinweis, dass die Datei persönliche Finanzdaten enthält und unverschlüsselt ist
  - Import: Dateiauswahl, Vorschau (Personen, Bausteine je Person, Exportdatum, Warnungen), "Ersetzen" mit Bestätigung; vorher Sicherungs-Download der aktuellen Daten
  - Zurücksetzen: "Alle Daten löschen" mit Bestätigung, bietet vorher den Export an
  - Beispieldaten laden aus `examples/*.workspace.json` (5c), gleiche Vorschau und Bestätigung
- Nach dem Import müssen alle Hooks neu laden (einfachster Weg `location.reload()`; Bau-Session bewertet einen sauberen Zustands-Reset)
- Import schreibt erst nach vollständiger Validierung; schlägt `setItem` fehl (Quota), werden die alten Werte wiederhergestellt und eine Meldung gezeigt
- Hinweis "Zuletzt exportiert: …" (`valiva.lastExport`) und dezenter Hinweis, wenn noch nie exportiert wurde (Browserdaten löschen = Daten weg)
- Texte zentral in `de.ts`, verständliche Fehlermeldungen ohne technische Codes
- Barrierefreiheit: Dateiauswahl per Tastatur, Ergebnis per `role="status"`, Bestätigungsdialog mit Fokusführung
- Mockup `docs/mockups/daten.html` vor dem Bauen vom Autor freigeben lassen

## 6. Repo-Reife (5c)
1. **Beispieldaten** `examples/`: mindestens drei komplett erfundene Workspaces (Einzelperson, Paar, Paar mit Lücke), `meta.synthetic: true`; ein Test lädt jede Datei durch `parseWorkspace` und rechnet `householdOverview`
2. **Format-Golden:** feste Beispieldatei: parsen, serialisieren ergibt identische Bytes
3. **README** (Englisch): Zweck, Start, Datenschutz (alles lokal), Export/Import und Backup-Hinweis, Struktur, Disclaimer, Lizenz, Beitragen. Der lange Annahmenteil wandert nach `docs/assumptions.md`
4. **Lizenz:** `LICENSE` (MIT als Vorschlag); Urhebername klärt der Autor; Abhängigkeitslizenzen prüfen
5. **Name:** Entscheidung des Autors vor dem ersten Push; Prüfung GitHub, Domain, Marke (`01` §4). Umbenennung betrifft `appConfig.ts`, `package.json` (`@valiva/*`), README und den `localStorage`-Präfix. Ein neuer Präfix würde bestehende Daten unsichtbar machen: Präfix `valiva.` bleibt, oder einmalige Schlüsselmigration mit Test (Autor entscheidet)
6. **CI** `.github/workflows/ci.yml`: `npm ci`, `typecheck`, `lint`, `format:check`, `test`, `build`; Playwright-Smoke als eigener Job mit Chromium (lokal `channel: 'chrome'`, in CI per Umgebungsvariable umschaltbar)
7. **Repo-Hygiene:** `.gitignore` prüfen (`data/`, `*.workspace.json` mit Ausnahme `!examples/*.workspace.json`, `test-results/`, `playwright-report/`), `package.json` (`description`, `license`, `engines`), kurze `CONTRIBUTING.md` (Regeln aus `CLAUDE.md`)
8. **Datenscan** vor dem ersten Commit: keine echten Nutzerdaten in `golden-vectors/`, `docs/`, `tools/`, `concept/`, `test-results/`; `tools/golden-check.xlsx` auf Metadaten (Autor, Pfade) prüfen; Secret-Scan. Archivdatei `ETF_Investment_Tracker_…md` entfernen oder nach `docs/archive/` (Autor entscheidet)
9. **`CLAUDE.md`:** Autor entscheidet, ob sie ins öffentliche Repo gehört; `.claude/settings.local.json` bleibt ignoriert

## 7. Git/GitHub (5d, zusammen mit dem Autor)
Erst nach 5a bis 5c und nach ausdrücklicher Freigabe (`CLAUDE.md`).
1. `git init`, Branch `main`, erster Commit nach Datenscan; Commit-Messages Englisch
2. Privates Repo anlegen, Remote setzen, Push; CI läuft grün
3. Branch-Schutz `main` (CI grün), Dependabot für npm und Actions
4. Öffentlich erst auf Entscheidung des Autors, vorher Release-Checkliste (§9)
5. `PROGRESS.md` und `CLAUDE.md` ("Git noch nicht eingerichtet") aktualisieren

## 8. Tests (Definition für "korrekt")
- **Round-trip:** `parse(serialize(w))` = `w` (Property-Test mit `fast-check`, 1 bis 5 Personen, zufällige Blockzustände)
- **Fehlerfälle:** leere Datei, kein JSON, falsches `format`, fehlende oder zu neue `schemaVersion`, Datei > 2 MB, doppelte Personen-IDs, unbekannte `activePersonId`, `NaN`/`Infinity`/Strings statt Zahlen, `__proto__` in `byPerson`, ungültiger einzelner Block (Warnung + Default), ungültiger Haushalt (Abbruch)
- **Migrationskette:** Test-Muster mit künstlicher Vorversion; jede spätere Migration bringt Beispieldateien der Vorversion mit
- **Beispieldateien:** jede Datei in `examples/` parst ohne Warnungen und ergibt eine `householdOverview` ohne Exceptions; `meta.synthetic` ist `true`
- **Store:** Export, Reset, Import stellt alle Schlüssel her; Rollback bei `setItem`-Fehler
- **Playwright-Smoke (wenige):** (1) zwei Personen anlegen, exportieren (Download abfangen), zurücksetzen, importieren, Haushaltssicht zeigt dieselbe Lücke; (2) fehlerhafte Datei zeigt verständliche Meldung und ändert nichts; (3) Beispieldatei laden
- **Regression:** bestehende Tests und Smokes bleiben grün

## 9. Release-Checkliste (vor "öffentlich")
- [ ] Name festgelegt, Verfügbarkeit geprüft
- [ ] Lizenz gewählt, `LICENSE` vorhanden, Abhängigkeitslizenzen geprüft
- [ ] Datenscan sauber, keine echten Nutzerdaten, keine Geheimnisse
- [ ] README mit Disclaimer, Datenschutz, Start, Export/Import
- [ ] Unsichere Gesetzeswerte in `config/` erneut geprüft (`07` Punkt 3), Status in der UI sichtbar
- [ ] CI grün, `npm audit` ohne offene hohe Funde
- [ ] Sichtprüfung der Seite "Daten" (Desktop, schmal, Dunkel, Tastatur)

## 10. Arbeitsschritte (Abhaken in `PROGRESS.md`)
**5a Kern**
1. Block-Validatoren aus den Hooks in den Kern, Tests
2. `workspace.ts` (Typen, `buildWorkspace`, `serializeWorkspace`, `parseWorkspace`, `applyWorkspace`, Migrationskette) mit Tests

**5b Web**
3. Mockup `daten.html` zur Freigabe
4. `BrowserWorkspaceStore`, Seite "Daten", Hinweis zuletzt exportiert, i18n; Smoke-Tests

**5c Repo-Reife**
5. `examples/`, `docs/assumptions.md`, README, `LICENSE`, `CONTRIBUTING.md`, `.gitignore`, `package.json`-Felder
6. CI-Workflow, Playwright-Konfiguration für CI
7. Name, Lizenz, Präfix beim Autor klären; Datenscan

**5d Git/GitHub (mit dem Autor)**
8. `git init`, erster Commit, privates Repo, Push, CI grün, Branch-Schutz, Dependabot

**Abschluss**
9. Release-Checkliste (§9), Abnahme durch den Autor (Export/Import mit eigenen Daten, Datei nicht ins Repo), Sichtprüfung

## 11. Offene Fragen an den Autor
1. **Name** und **Lizenz** (MIT als Vorschlag), Urhebername für `LICENSE`
2. **Präfix `valiva.`** bei Umbenennung beibehalten oder migrieren?
3. Archivdatei `ETF_Investment_Tracker_…md` und `CLAUDE.md` ins Repo oder ausschließen?
4. Repo zuerst **privat**, später öffentlich? (Vorschlag: ja)
5. Soll der Import später **zusammenführen** können (z. B. nur eine Person)? Vorschlag: nein, bei Bedarf später

## 12. Bewusst nicht in Phase 5
Sync und Login (7), Verschlüsselung der Datei (7), File System Access API und Autospeichern, Zusammenführen von Workspaces, Import fremder Formate (CSV, Excel), neue Bausteine (6), Desktop-Paket (7), Übersetzung der UI.
