# Werkzeuge (intern)

- `generate_golden.py`: erzeugt die Golden-Vektoren für die Rechenkern-Tests (`packages/core/test/golden-vectors`) und die Prüftabelle `golden-check.xlsx`. Nach jedem Lauf `npx prettier --write packages/core/test/golden-vectors` ausführen.
- `golden-check.xlsx`: unabhängige Excel-Gegenrechnung der Testfälle. Alle Werte sind erfunden.

Für die Nutzung der App sind diese Dateien nicht nötig.
