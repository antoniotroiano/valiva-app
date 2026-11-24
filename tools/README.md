# Werkzeuge (intern)

- `generate_golden.py`: erzeugt die Golden-Vektoren für die Rechenkern-Tests (`packages/core/test/golden-vectors`) und die Prüftabelle `golden-check.xlsx`. Nach jedem Lauf `npx prettier --write packages/core/test/golden-vectors` ausführen.
- `golden-check.xlsx`: unabhängige Excel-Gegenrechnung der Testfälle. Alle Werte sind erfunden.
- `release-check.mjs`: prüft Version und `CHANGELOG.md` (`npm run check:release`, läuft im CI und im Release-Workflow), siehe `docs/releasing.md`. Test: `tools/test/`.

Für die Nutzung der App sind diese Dateien nicht nötig.
