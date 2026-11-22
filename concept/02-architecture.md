# 02 – Architektur, Stack, Datenhaltung, Qualität

## 1. Architektur (stack-neutral gedacht)

Kernidee: **Rechenkern als reine, zustandslose Funktionen** ohne UI/DB/HTTP. Eingabe → Ergebnis.

```text
UI (Eingaben, Diagramme)
   ↓
Anwendungsschicht (Profil, Bausteine, Ziele laden/speichern)
   ↓
Rechenkern  ← reine Funktionen, deterministisch, voll unit-getestet
   ↓
Parameter-Konfig (Gesetze/Annahmen, versioniert)
Persistenz (austauschbar: Datei / SQLite / Server-DB)
```

- Ein gemeinsamer Vertrag je Baustein (`project(input, context, scenario) → Zeitreihe + Endwert + Rentenstrom`, Details in `06-data-model.md`)
- Gesamtsicht aggregiert die Ergebnisse der Bausteine
- **Golden-Test-Vektoren** (JSON mit Eingaben und erwarteten Ausgaben, per Excel gegengeprüft) machen den Kern sprachunabhängig
- Kein Microservice-Ansatz, keine Message-Broker o. Ä.

## 2. Stack (entschieden: TypeScript, 2026-11-09)

Begründung: Vorkenntnisse in beiden Sprachen kaum, Ergebnis zählt; die Kriterien sprechen für TypeScript.

| Kriterium | TypeScript-Fullstack | Python-Backend + React |
|---|---|---|
| Sprachen | 1 | 2 |
| Berechnung im Browser (offline, kein Server) | ja, direkt | nur über Server/Pyodide |
| GitHub-Self-Use für Fremde | `npm install && npm run dev` | Python-Env + Node für Frontend |
| Desktop-App später | Tauri/Electron, gleicher Code | aufwendiger (Server bündeln) |
| Finanzmathe-Bibliotheken | ausreichend (IRR selbst, kleine Libs) | sehr gut (numpy, pandas) |
| Daten überall (Phase C) | Backend (z. B. Node/Hono) oder BaaS ergänzen | FastAPI passt natürlich |

Monte-Carlo-Simulationen sind auch in TypeScript machbar. Konkrete Projektstruktur und Bibliotheken für Phase 1: `04-phase-1-etf-calculator.md`.

## 3. Datenhaltung

| Phase | Speicher | Begründung |
|---|---|---|
| A (nur Autor, lokal) | JSON-Datei hinter einer Schnittstelle (SQLite nur, wenn Abfragen nötig werden) | keine Installation, Backup = Datei kopieren |
| B (andere checken aus) | wie A, **keine Daten im Repo** (`.gitignore`, Beispieldaten separat) | Datenschutz, einfacher Start |
| C (überall erreichbar) | Server-DB (Postgres) oder Sync-Dienst, Login, Verschlüsselung, Backups | echte Mehrgeräte-Nutzung |

Persistenz hinter einer Schnittstelle kapseln, damit A → C ohne Umbau des Rechenkerns geht. Phase C braucht Auth, TLS, Verschlüsselung at rest und Backup-Konzept; Self-Hosted vs. Cloud wird später entschieden. Format und Versionierung: `06-data-model.md`.

## 4. Qualität und Tests

- Unit-Tests für jeden Rechner, Golden-Vektoren, Property-Tests (z. B. Rate 0 → Endwert = Einzahlungen)
- Plausibilitätsprüfung der Eingaben (z. B. Rentenalter > aktuelles Alter)
- E2E (Playwright) für wenige Kernabläufe; Gauge bleibt zurückgestellt
- CI auf GitHub (Tests, Lint) ab Phase B
- Lizenz-Entscheidung vor Veröffentlichung (z. B. MIT) und README mit Disclaimer

## 5. Verifikation (übergreifend)

- Golden-Vektoren gegen unabhängige Excel-Berechnung prüfen
- Gesetzliche Parameter gegen BMF/DRV-Quellen prüfen und Stand vermerken
- Smoke-Test: Eingabe → Gesamtrente → Export/Import ergibt identische Zahlen
