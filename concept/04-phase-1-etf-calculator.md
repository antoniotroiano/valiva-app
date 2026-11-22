# 04 – Phase 1: Rechenkern + ETF-Sparplan-Rechner

## 1. Ziel und Abgrenzung
Lauffähiger ETF-Rechner mit Diagramm und Tabelle, **ohne Speichern** (Eingaben optional im Browser merken). Kein Backend, keine DB. Steuer nur beim Verkauf am Ende. Rückwärtsrechner (Zielvermögen → Rate) ist nicht Teil von Phase 1.

## 2. Projektstruktur (TypeScript, npm-Workspaces)
```text
/packages/core      reine Rechenfunktionen, keine UI/DB-Abhängigkeit, Vitest-Tests
/packages/core/test golden-vectors/*.json  (Eingabe + erwartetes Ergebnis)
/apps/web           React + Vite + TypeScript, Recharts für Diagramme
/config             legal parameters (z. B. tax-de.json: rate, partial exemption, allowance, source, status, valid-from)
/docs               glossary.md (DE → EN), assumptions
README.md           Start: npm install && npm run dev
```
Zahlentyp: Fließkomma genügt (siehe `03-domain-rules.md`); Tests prüfen mit Toleranz (z. B. 0,01 €).

## 3. Sprachkonvention
- **Gesamter Code auf Englisch**: Bezeichner, Kommentare, Dateinamen, Testnamen, Commit-Messages, Konfig-Schlüssel, JSON-Felder, Entwickler-Teil des README
- **UI-Texte Deutsch**, zentral in einer Übersetzungsdatei (z. B. `apps/web/src/i18n/de.ts`), keine Strings im Komponentencode
- Fachbegriffe im Code englisch (`savingsPlan`, `taxFreeAllowance`, `partialExemption`); Glossar Deutsch → Englisch in `docs/glossary.md`

## 4. Datenmodell (Phase 1, englische Bezeichner)
Gesamtmodell siehe `06-data-model.md`. Für Phase 1:
- `Person` (id, name, birthYear): in Phase 1 genau eine, UI blendet sie aus
- `EtfPlanInput`: initialCapital, monthlyContribution, annualContributionIncreasePercent, durationYears, lumpSums[{month, amount}], ter, entryFeePercent, custodyFeeEurPerYear, custodyFeePercentPerYear, returnScenarios {pessimistic 3, neutral 5, optimistic 7} (% p. a. vor Kosten, änderbar), inflationPercent (global, Default 2)
- `TaxAssumptions` (aus Konfig): capitalGainsTaxRate 26.375 %, partialExemptionRate 30 %, taxFreeAllowance 1,000 €, enabled flag
- `EtfPlanResult` je Szenario: monthly series {month, contributed, value}, grossFinalValue, totalContributions, gainBeforeTax, tax, finalValueAfterTax, finalValueReal, yearly summary

## 5. Rechenregeln (vor Umsetzung gegenprüfen)
1. Monatliche Schritte, n = durationYears · 12
2. Nettorendite p. a. = Bruttorendite − TER (dokumentierte Vereinfachung); monatlicher Faktor g = (1 + Nettorendite)^(1/12)
3. Reihenfolge je Monat: Beitrag zu Monatsbeginn (nach Abzug Ausgabeaufschlag), danach Wachstum um g, danach Depotgebühr abziehen (Betrag/12 plus Wert · Prozent/12)
4. Rate steigt einmal pro Jahr zum Jahreswechsel um die Dynamik
5. Einmalzahlungen kommen im angegebenen Monat dazu (ebenfalls mit Ausgabeaufschlag)
6. Steuer am Ende: Gewinn = Endwert − Einzahlungen (Startkapital + Raten + Einmalzahlungen); steuerpflichtig = Gewinn · (1 − Teilfreistellung) − Freibetrag, mindestens 0; Steuer = pflichtig · 26,375 %. Kirchensteuer nur auf Wunsch im Profil. Die Vorabpauschale ist eine spätere Option je Plan (Review `13` F-7b, Standard aus): jährlich aus dem Depot, beim Verkauf angerechnet, siehe `03` §8 und `docs/assumptions.md`
7. Real: Endwert / (1 + Inflation)^Laufzeit
8. Eingabevalidierung im Kern (Laufzeit 1–60, Raten ≥ 0, Prozentwerte plausibel); Fehler als Daten statt Exceptions

## 6. Tests (Definition für "korrekt")
- Geschlossene Formel bei konstanter Rate ohne Kosten: FV = S·g^n + R·g·(g^n−1)/(g−1) als Referenz
- Property-Tests: Rendite 0 → Endwert = Einzahlungen; Endwert monoton in Rate und Rendite; Szenarien geordnet pessimistisch ≤ neutral ≤ optimistisch
- Golden-Vektoren (mind. 8): ohne/mit Dynamik, mit Einmalzahlung, mit Kosten, mit Steuer, Freibetrag-Grenze (Gewinn < Freibetrag → Steuer 0), Laufzeit 1 Jahr, Randwerte; unabhängig in Excel nachgerechnet
- Web: ein Playwright-Smoke-Test (Eingabe → Ergebnis sichtbar, Szenarien-Diagramm vorhanden)

## 7. UI Phase 1
Details in `05-ui-concept.md` (Abschnitt Phase-1-UI). Kurz: Formular links, Kennzahl-Kacheln, Liniendiagramm mit 3 Szenarien plus Einzahlungslinie, Jahrestabelle, Live-Neuberechnung mit Debounce, Disclaimer, Zahlenformat de-DE.

## 8. Diagramme
Recharts. Bei Problemen mit Lesbarkeit oder Barrierefreiheit wechseln; der Rechenkern kennt keine Diagrammbibliothek. Jedes Diagramm hat eine Tabellen-Alternative (Jahrestabelle).

## 9. Arbeitsschritte (Abhaken in `PROGRESS.md`)
1. Repo-Skelett (Workspaces, TS strict, Vitest, Lint, Prettier)
2. Kernfunktionen + Unit-Tests + Golden-Vektoren (zuerst, ohne UI)
3. Steuer-Konfig und Steuerberechnung
4. Web-App: Formular, Ergebnis, Diagramm, Tabelle
5. Playwright-Smoke, README mit Annahmen und Disclaimer
6. Abnahme: Excel-Gegenprüfung, manuelle Sichtprüfung im Browser

## 10. Entschiedene Detailfragen
- Depotgebühr: beides optional (Betrag und Prozent), Default 0
- Rückwärtsrechner: später (Phase 2/4); der Kern wird so gebaut, dass ein Solver (Bisektion über die Vorwärtsfunktion) ohne Umbau aufsetzt
- Diagrammbibliothek: Recharts
- Offen: Beispielwerte für Golden-Tests (`07-decisions-and-open-points.md`)
