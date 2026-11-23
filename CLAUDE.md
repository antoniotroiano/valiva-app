# Projekt: Persönlicher Vorsorge- und Sparplaner

Private App zur ETF-Sparplan-Prognose, Rentenplanung (gesetzliche Rente, bAV, ETF, Altersvorsorgedepot) und für kurzfristige Sparziele. Stack: TypeScript (React + Vite im Frontend, Rechenkern als eigenes Paket).

## Quelle der Wahrheit

- Konzept: `concept/README.md` (Index und Lesereihenfolge) und die Dateien `concept/01` bis `11`
- Fortschritt: `concept/PROGRESS.md`. Nach jedem abgeschlossenen Arbeitsschritt abhaken
- Abweichungen vom Konzept in `PROGRESS.md` unter "Notizen und Abweichungen" eintragen, nicht stillschweigend umsetzen
- Das alte `ETF_Investment_Tracker_...md` in `docs/archive/` ist Archiv und gilt nicht mehr

## Regeln

- **Sprache:** Code, Kommentare, Dateinamen, Testnamen, Commit-Messages, Konfig-Schlüssel und JSON-Felder auf Englisch. UI-Texte auf Deutsch, zentral in einer Übersetzungsdatei (keine Strings im Komponentencode). Glossar Deutsch → Englisch in `docs/glossary.md`
- **Rechenkern** (`packages/core`): reine, deterministische Funktionen, keine Abhängigkeit zu UI, DB oder HTTP, voll unit-getestet. Fehler als Daten, keine Exceptions für Validierung
- **Gesetzliche Werte** nur in `config/` mit `value`, `validFrom`, `validTo`, `source`, `status` (`confirmed`/`unverified`). Nie im Code. Unsichere Werte dürfen nicht stillschweigend als gesichert erscheinen
- **Keine echten Nutzerdaten** im Repo. Beispieldaten sind komplett erfunden und liegen in `examples/`
- **Tests:** Golden-Vektoren gegen unabhängige Excel-Rechnung, Property-Tests, wenige Playwright-Smoke-Tests
- **Disclaimer:** Die App gibt keine Anlage- oder Steuerberatung; Prognosen sind keine Garantie. Hinweis in der UI und im README
- **Name:** "Valiva" steht an zentraler Stelle (Config/README), damit Umbenennen billig bleibt
- **Git** ist lokal eingerichtet (Branch `main`, `origin` mit dem privaten SSH-Alias). **Committen, pushen, taggen, Branches wechseln macht nur der Autor** (GitHub Desktop), nach jeder Session. Sessions führen kein `git commit`, `push`, `tag`, `checkout`/`switch`, `reset`, `stash`, `rebase` aus; lesende Befehle sind erlaubt. Am Ende steht ein englischer Commit-Vorschlag im Session-Protokoll. Die GitHub-Veröffentlichung (CI, Schutz, Hosting) folgt erst in AP-17 (Phase 5) zusammen mit dem Autor

## Arbeitsweise

- Vor größeren Änderungen kurze Planung und Rückfrage; kleine Schritte, danach Tests laufen lassen
- Keine neuen Abhängigkeiten ohne konkreten Nutzen
- Wenn Konzept und Code sich widersprechen: nachfragen oder Abweichung in `PROGRESS.md` notieren
