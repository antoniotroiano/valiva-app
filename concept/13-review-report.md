# 13 – Review-Bericht (2026-11-18): Code, Sicherheit, Berechnung, Usability, Design, fehlende Funktionen

Dieser Bericht ist so geschrieben, dass eine **neue Session ihn allein abarbeiten kann**. Jeder Punkt hat: Befund, Beleg (Datei/Zeile oder Reproduktion), konkrete Umsetzung, Abnahmekriterium. Ids (`C-1`, `S-1`, …) dienen als Todo-Schlüssel. Reihenfolge der Abarbeitung: Abschnitt 8.

Pflichtlektüre vor dem Start: `CLAUDE.md` (Regeln), `PROGRESS.md`, `03-domain-rules.md`, `12-phase-5-persistence-and-release.md` §9. Regeln aus `CLAUDE.md` gelten weiter: Rechenkern rein und getestet, Rechtswerte nur in `config/`, UI-Texte nur in `apps/web/src/i18n/de.ts`, Code und Tests Englisch, Abweichungen vom Konzept in `PROGRESS.md` (Notizen) eintragen, vor größeren Änderungen kurz Rückfrage an den Autor, keine neuen Abhängigkeiten ohne Nutzen. Git/GitHub ist noch nicht eingerichtet (Phase 5d).

## 0. Methode und Gesamturteil

Geprüft: gesamter Rechenkern (`packages/core/src`, ca. 4.200 Zeilen) gelesen; Sicherheits-Grep über `apps/web/src`; Konfig und CI gelesen; App im Browser (Chrome, Desktop 1280 px und Smartphone 390 px) per Playwright aufgerufen und Screenshots aller Seiten angesehen; `typecheck`, `lint`, `vitest`, `build`, `npm audit` ausgeführt; Rechenkern punktuell mit eigenen Probeläufen gegengerechnet (geschlossene Formel, Randfälle).

**Ergebnisse der automatischen Läufe:** Typecheck sauber, Lint sauber, 356 Tests in 26 Dateien grün, Build ok (Bundle 880 kB, Warnung > 500 kB). `npm audit --omit=dev`: 0 Schwachstellen; `npm audit` gesamt: 9 moderate, alle in Dev-Tools (eslint → minimatch), nicht im ausgelieferten Code. Playwright-Läufe (`npm run e2e`) wurden in diesem Review **nicht** ausgeführt.

**Gesamturteil:**
- **Rechenkern:** Die ETF-Mathematik ist korrekt (Probelauf 200 €/Monat, 30 Jahre, 5 %: App 163.739,5699 €, geschlossene Formel 163.739,5699 €; Steuer 16.673,67 € ebenfalls nachgerechnet). Die gesetzlichen Werte in `config/` stimmen, soweit ich sie aus eigenem Wissen prüfen kann. **Ein echter Rechenfehler (NaN) und mehrere fachliche Vereinfachungen, die das Ergebnis spürbar verfälschen** (Abschnitt 2).
- **Sicherheit:** Der Code selbst ist unauffällig (kein `innerHTML`, kein `eval`, kein Netzwerkzugriff, Import sehr gut abgesichert). Die Risiken liegen im **Hosting auf GitHub Pages** (Abschnitt 1): kaputte Asset-Pfade, gemeinsamer `localStorage` aller Seiten desselben Kontos, keine CSP, unfertige Repo-Reife.
- **Usability/Design:** Solide, ruhig, gut lesbar, barrierearm. Schwächen: kein Einstieg für neue Nutzer, Startseite zeigt Zahlen aus Platzhalterdaten, rohe technische Texte in Hinweisen, widersprüchliche Zahlen auf der ETF-Seite (Abschnitt 3 und 4).

Schweregrade: **Hoch** = falsche/irreführende Ergebnisse oder Deploy bricht; **Mittel** = spürbarer Mangel; **Niedrig** = Politur.

---

## 1. Sicherheit und Deployment (GitHub / GitHub Pages)

Die App ist reines Client-Side-JavaScript ohne Backend. Eine klassische Server-Angriffsfläche gibt es nicht. Relevant sind: Datenabfluss aus dem Browser des Nutzers, Manipulation über Import-Dateien, Lieferkette, Repo-Inhalt.

### Was gut ist (nicht ändern)
- Kein `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `window.open`, `fetch`, `XMLHttpRequest` im gesamten `apps/web/src` und `packages/core/src` (per Grep geprüft). Nutzertexte (z. B. Personennamen) werden von React escaped.
- Import (`packages/core/src/workspace.ts`): Größenlimit 2 MB (auch vorab `file.size` in `DataPage.tsx:88`), Tiefenlimit, verbotene Schlüssel `__proto__`/`constructor`/`prototype`, Format- und Versionsprüfung, Validierung jedes Blocks, Personen-ID-Muster `^[A-Za-z0-9_-]{1,32}$`, Rückfall auf Standardwerte, Wiederherstellung bei Speicherfehler. Das ist überdurchschnittlich gut.
- Produktionsabhängigkeiten ohne bekannte Schwachstellen. `package-lock.json` vorhanden. CI mit `permissions: contents: read`.
- Hash-Navigation wird gegen eine Whitelist (`PAGES`) geprüft (`App.tsx:62`).

### S-1 (Hoch) Build bricht auf GitHub Pages: fehlender `base`-Pfad
- Beleg: `apps/web/vite.config.ts` setzt kein `base`. `apps/web/dist/index.html` lädt `/assets/index-….js` absolut. Auf `https://<user>.github.io/<repo>/` liefert das 404, die Seite bleibt leer.
- Umsetzung: `base` in `vite.config.ts` setzen. Empfehlung `base: './'` (funktioniert unter jedem Unterpfad und mit Custom Domain; Hash-Routing macht das möglich). Alternativ `'/<repo-name>/'` per Umgebungsvariable.
- Zusätzlich: `<link rel="icon">` ergänzen (Konsole zeigt 404 für `/favicon.ico`), `apps/web/index.html` um `<meta name="description">` und `<noscript>`-Hinweis ("Diese App benötigt JavaScript") ergänzen. Favicon als kleines SVG in `apps/web/public/`.
- Abnahme: `npm run build -w @pathwise/web && npx vite preview --base ./` bzw. Auslieferung unter einem Unterpfad (z. B. `npx serve` mit Unterordner) lädt die App fehlerfrei; keine 404 in der Konsole.

### S-2 (Hoch) Kein Deploy-Workflow
- Beleg: `.github/workflows/ci.yml` baut nur und lädt nichts hoch.
- Umsetzung: Eigener Workflow `.github/workflows/pages.yml`: Trigger `push` auf `main` plus `workflow_dispatch`; Job `build` (`npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact` mit `path: apps/web/dist`), Job `deploy` mit `needs: build`, `environment: github-pages`, `actions/deploy-pages`. Berechtigungen **nur** im Deploy-Job: `pages: write`, `id-token: write`; global `contents: read`. In den Repo-Einstellungen "Pages → Source: GitHub Actions".
- Actions auf **Commit-SHA pinnen** (statt `@v4`) und `.github/dependabot.yml` für `github-actions` und `npm` (wöchentlich) anlegen. Das gilt auch für `ci.yml`.
- Abnahme: Push auf `main` → Pages-URL zeigt die App.

### S-3 (Hoch, Entscheidung des Autors) Gemeinsamer `localStorage` auf `<user>.github.io`
- Hintergrund: `localStorage` ist an den **Origin** (`https://<user>.github.io`) gebunden, nicht an den Unterpfad `/repo/`. Jede andere Seite desselben Kontos (andere Repos mit Pages) kann die Finanzdaten (`pathwise.household.v2`, `pathwise.p.<id>.<block>.v1`) lesen und überschreiben. Auch ein später entdeckter XSS in einem anderen Projekt desselben Kontos würde die Daten preisgeben.
- Umsetzung (Autor wählen lassen, per `ask_user`): (a) **Eigene (Sub-)Domain** für diese App (eigener Origin; Pages unterstützt Custom Domain), oder (b) **eigener GitHub-Account/Organisation** nur für diese App, oder (c) bewusst akzeptieren und im README unter "Datenschutz" dokumentieren: "Auf `github.io` teilen sich alle Seiten des Kontos den Browser-Speicher; hoste keine fremden Seiten unter demselben Konto".
- Unabhängig davon: README-Hinweis, dass Daten unverschlüsselt im Browser liegen (auf gemeinsam genutzten Rechnern "Alle Daten löschen" nutzen). Optional später (Phase 7): Passwort-Verschlüsselung der Exportdatei per Web Crypto (AES-GCM, PBKDF2/Argon2) — nur mit Rückfrage, weil neues Dateiformat.

### S-4 (Mittel) Keine Content Security Policy
- Beleg: `apps/web/index.html` hat keine CSP. GitHub Pages erlaubt keine eigenen HTTP-Header; eine `<meta http-equiv="Content-Security-Policy">` im `<head>` funktioniert aber.
- Umsetzung: Meta-CSP, z. B. `default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`. Recharts setzt Inline-Styles (Attribute) → `style-src-attr 'unsafe-inline'` ist vermutlich nötig; im Browser testen (Konsole auf CSP-Verstöße prüfen, alle Seiten und Diagramme aufrufen, Export-Download und Datei-Import testen — der Download nutzt eine `blob:`-URL, ggf. `'self' blob:` für den Link nötig; bei Problemen gezielt lockern, nicht pauschal). `<meta name="referrer" content="no-referrer">` ergänzen. Hinweis: `frame-ancestors` und `X-Frame-Options` lassen sich per Meta nicht setzen (Clickjacking-Risiko gering, da keine Aktionen mit Außenwirkung).
- Abnahme: App läuft unter strikter CSP ohne Konsolenfehler, E2E (`npm run e2e`) grün.

### S-5 (Mittel) Repo-Inhalt vor dem Öffentlichmachen
- GitHub Pages ist **immer öffentlich erreichbar** (auf Free-Konten muss das Repo dafür öffentlich sein; private Repos + Pages brauchen einen bezahlten Plan). Damit wird alles im Repo sichtbar. Vorher entscheiden/prüfen (Checkliste `12` §9 abarbeiten):
  - `LICENSE` enthält noch den Platzhalter `<COPYRIGHT HOLDER – to be decided by the author>` → Urheber eintragen oder Lizenz neu wählen. Name "Pathwise" auf Namenskonflikte prüfen (nur Arbeitstitel).
  - `CLAUDE.md`, `.claude/launch.json`, `concept/`, das Archiv `ETF_Investment_Tracker_…md` und `tools/golden-check.xlsx` werden öffentlich. Archivdatei laut `PROGRESS.md` "noch nicht entschieden": löschen oder ausnehmen. Inhalte auf Persönliches prüfen (bei diesem Review keine Treffer auf Namen/Pfade außerhalb der ignorierten `.claude/settings.local.json` und `.idea/`).
  - `.gitignore` deckt `.idea/`, `.claude/settings.local.json`, `*.workspace.json` (außer `examples/`), `test-results/`, `dist` ab. `.DS_Store` ist ignoriert, liegt aber im Ordner; vor `git init` kein Problem.
  - Vor dem ersten Commit `github-run_secret_scanning`/Secret-Scan über alle Dateien; später "Secret scanning" und "Push protection" im Repo aktivieren.
- Repo-Einstellungen nach dem Push: Branch-Schutz auf `main` (PR + grüne CI), Dependabot-Alerts, Actions-Standardrechte "read".

### S-6 (Niedrig) Lieferkette Dev-Tools
- `npm audit` meldet 9 moderate (minimatch via eslint). Nur Dev-Abhängigkeit, kein Laufzeitrisiko. Mit `npm audit fix` (ohne `--force`) versuchen, danach Tests/Lint laufen lassen. Nichts erzwingen.

### S-7 (Niedrig) Bundle-Größe
- 880 kB Hauptbundle (245 kB gzip). Kein Sicherheits-, aber ein Ladezeitthema auf Mobilfunk. Option: Seiten per `React.lazy`/dynamischem `import()` aufteilen, `recharts` in eigenen Chunk (`build.rolldownOptions.output.codeSplitting`). Beispieldaten (`examples/*.json`) werden mit ausgeliefert (gewollt, ca. wenige kB).

---

## 2. Berechnungsfehler und fachliche Abweichungen (höchste Priorität neben Sicherheit)

Legende "Beleg": Datei im Repo. Alle Zahlen wurden in diesem Review nachgerechnet oder per Probelauf reproduziert, sofern angegeben.

### C-1 (Hoch, bestätigter Fehler) `NaN`-Ergebnisse bei extremer Kostenwahl
- Beleg: Probelauf `calculateEtfPlan` mit `ter: 100`, Rendite `-50 %` in allen Szenarien: Eingabe gilt als gültig (`ok: true`), aber `value` ist `NaN`/`null` in der Reihe. Ursache: `projectEtfScenario` (`etf.ts`) rechnet `Math.pow(1 + (rendite − ter)/100, 1/12)`; bei `rendite − ter ≤ −100` ist die Basis ≤ 0 → `NaN`. Validierung prüft Rendite (−50…100) und TER (0…100) nur einzeln (`validation.ts`).
- Gleiche Lücke: `depot.ts` (`gross − cost`, Kosten 0…100, Rendite ab −50), `occupational.ts` (`modelNet = gross − costPercentPerYear`), `etfProjector.ts` (nutzt `projectEtfScenario`). Vorsicht bei `custodyFeePercentPerYear` (kein NaN, aber Wert wird auf 0 geklemmt).
- Umsetzung: In `validateEtfPlanInput` je Szenario prüfen: `returnScenarios[x] − ter > −100`, sonst Issue `{ field: 'ter', code: 'out_of_range', max: … }` (bestehender Code genügt). Gleiche Prüfung in `validateDepot` (nach Kostendeckel: `gross − cost > −100`, je Szenario und für `returnOverridePercent`) und `validateOccupational`. Sinnvoller: TER/Kosten zusätzlich auf z. B. ≤ 10 % begrenzen und Rendite-Plausibilitätswarnung ab > 12 % ergänzen (Warnung, kein Fehler).
- Tests: je Projektor ein Test "TER 100 %, Rendite −50 % → Validierungsfehler, nie NaN"; Property-Test mit `fast-check`: für alle gültigen Eingaben sind alle Ausgabewerte `Number.isFinite`.
- Abnahme: Kein Pfad liefert `NaN`/`Infinity`; Formular zeigt verständliche Fehlermeldung (Text in `de.ts` prüfen).

### C-2 (Hoch, fachlich) Pauschaler Steuersatz auf Renten ohne Grundfreibetrag und ohne Progression
- Beleg: `netPension.ts`: `tax = Brutto × Besteuerungsanteil × retirementTaxRatePercent`; Standard 20 % (`profile.ts` `defaultAssumptions`). Beispiel aus Probelauf: gesetzliche Rente 1.800 € heute (netto-real ca. 1.158 € bei Rente mit 63; 1.371 € bei 67): Die App rechnet bei Rente 67 ca. **19 % Steuer** vom Brutto (571 € von 3.023 € nominal) plus 12,35 % Kranken-/Pflegeabgaben ⇒ netto ca. 69 % vom Brutto. In Wirklichkeit liegt die Steuer bei typischen Renten (Brutto-Real 1.500–2.500 €) wegen Grundfreibetrag (2025: 12.096 €, 2026 laut Gesetz höher) und Progression bei **0–10 %**, also deutlich niedriger. Die App **unterschätzt das Netto systematisch** und verteilt den Satz zusätzlich je Baustein einzeln, obwohl die Einkommensteuer auf die **Summe** aller Einkünfte berechnet wird.
- Die Profilseite weist im Hilfetext darauf hin ("Dein tatsächlicher Satz hängt von allen Einkünften ab"), aber der Standardwert 20 % ist für die meisten zu hoch und wirkt wie eine Empfehlung.
- Umsetzung (mit Autor abstimmen, da größere Änderung; als eigene Teilphase "6a Einkommensteuer im Alter"):
  1. `config/income-tax-de.json` mit Grundfreibetrag und Tarifparametern nach §32a EStG (Zonen, Koeffizienten; je Veranlagungsjahr), Status `unverified` bis gegen BMF-Programmablaufplan/Gesetzestext geprüft.
  2. Kernfunktion `incomeTax(taxableIncomeYear, year, legal, { jointAssessment })` (reine Funktion, mit Tests: Grundfreibetrag-Grenze, Zonenübergänge, Splitting).
  3. Gesamtsicht: steuerpflichtige Einkünfte je Jahr **aufsummieren** (gesetzliche Rente × Besteuerungsanteil − Werbungskostenpauschale 102 €, bAV/Depot voll, ETF-Gewinnanteil nach Teilfreistellung separat über Abgeltungsteuer), Steuer auf die Summe, auf Bausteine verursachergerecht verteilen. Sonderausgaben-Pauschale und Kranken-/Pflegevorsorgeabzug als einfache Annahme (Pauschale) oder bewusst vernachlässigen und ausweisen.
  4. Bis dahin (Sofortmaßnahme, klein): Standard `retirementTaxRatePercent` auf einen realistischeren Wert (z. B. 10 %) senken **oder** das Feld mit Beispielwerten beschriften ("bei Rente bis ca. 2.000 €/Monat meist 5–12 %") und auf der Startseite einen sichtbaren Hinweis "Steuer im Alter wird pauschal angesetzt" einblenden. Änderung des Standards ist eine Abweichung → `PROGRESS.md`-Notiz, Golden-Vektoren (`tools/generate_golden.py`) und Beispieldaten anpassen.
- Abnahme: Test mit bekannten Referenzfällen (Tarif 2026 aus offizieller Quelle), Gesamtsicht-Netto ist bei gleichem Brutto nicht mehr von der Aufteilung auf Bausteine abhängig.

### C-3 (Hoch, fachlich) Gesetzliche Rente bei frühem/spätem Beginn: Entgeltpunkte fehlen
- Beleg: `statutory.ts` (Kommentar "Known simplification") und `StatutoryPage` ("Vereinfachung"-Box): Bei Beginn mit 63 statt 67 wird nur der Abschlag 14,4 % angesetzt. Die Renteninformation rechnet aber "Rente bei Beitragszahlung bis zur Regelaltersgrenze" hoch; wer 4 Jahre früher aufhört, hat 4 Beitragsjahre weniger (ca. 4 × ~1 Entgeltpunkt weniger). Beispiel Probelauf: Rente 1.800 € heute, Beginn 63 → App 2.345 € brutto nominal bei Faktor 0,856, in Wirklichkeit zusätzlich ca. 8–10 % weniger durch fehlende Punkte ⇒ **Überschätzung um ca. 8–10 %**. Spätere Rente umgekehrt: App ignoriert zusätzliche Entgeltpunkte (Unterschätzung).
- Der Hinweis in der UI ist ehrlich, aber der Fehler steht in der Hauptzahl.
- Umsetzung: Optionales Feld "Rente, wenn ich schon zu meinem Wunschtermin aufhöre (aus der Renteninformation/Rentenauskunft)" und/oder Eingabe "Entgeltpunkte pro Jahr" (ca. 1,0 bei Durchschnittsverdienst; Rentenwert in `config/pension-de.json` ist vorhanden: `pensionValue 42.52`). Rechnung: `Rente = (EP_heute + EP_pro_Jahr × Beitragsjahre_bis_Rentenbeginn) × Rentenwert_zukunft × Zugangsfaktor`. Alternativ Näherung mit Faktor `(Beitragsjahre bis Beginn)/(Beitragsjahre bis Regelalter)` auf den noch zu erwerbenden Anteil. Beide Varianten mit Tests und Golden-Vektoren absichern; Abweichung von `09` §5.2 in `PROGRESS.md` notieren.
- Abnahme: Rente mit 63 liegt bei gleichen Eingaben sichtbar unter der Hochrechnung der Renteninformation minus Abschlag; Test deckt es ab.

### C-4 (Mittel, fachlich) Besteuerungsanteil der Bestandsrente wächst nicht mit
- Beleg: `netPension.ts`/`taxableShare`: Anteil wird auf die **gesamte** Rente zum Beginn festgelegt. Rechtlich ist der steuerfreie Teil ein fester Euro-Betrag (Rentenfreibetrag), spätere Anpassungen sind voll steuerpflichtig. Bei 2,5 % jährlicher Anpassung über 20 Rentenjahre steigt der steuerpflichtige Anteil real an. Wirkung klein bis mittel (verstärkt sich mit C-2 nicht, weil dort flach gerechnet wird).
- Umsetzung: In der Gesamtsicht-Verlaufsrechnung (`overview.ts`, `activityFactor`) für `statutory` den steuerfreien Betrag in € einfrieren und Folgejahre entsprechend besteuern. Erst zusammen mit C-2 sinnvoll; sonst als bekannte Vereinfachung in `docs/assumptions.md` nennen (prüfen, ob schon enthalten).

### C-5 (Mittel) Fehlende oder unklare Einmal-/Nebeneffekte bei bAV
- Entgeltumwandlung senkt die **gesetzliche Rente** (weniger Beitragspflichtiges Brutto → weniger Entgeltpunkte) und den Arbeitgeber-Zuschuss deckt das nur teilweise ab. `occupational.ts` modelliert das nicht. Ebenso: wird `employerContributionMonthly + subsidy + conversion` über 676 €/Monat (steuerfrei) gehoben, wird der Überschuss voll versteuert (aktuell nur Umwandlung ≤ 676 € geprüft, `validateOccupational`).
- Umsetzung: (1) Validierung/Hinweis: Summe aus Umwandlung, Zuschuss und AG-Beitrag > `occupationalTaxFreeMonthly` → Warnung. (2) Hinweis in der bAV-Seite "senkt gesetzliche Rente um ca. X €" mit Näherung (Umwandlung × Sozialabgaben-Ersparnisanteil über Rentenfaktor) oder zumindest textlich nennen.

### C-6 (Mittel) Beiträge im Depot und in der bAV bleiben nominal konstant
- Beleg: `depot.ts` und `occupational.ts`: feste Monatsrate über Jahrzehnte (`rate` konstant). Nur der ETF-Plan hat `annualContributionIncreasePercent`. Über 30 Jahre bei 2 % Inflation ist die reale Beitragsleistung ca. 45 % kleiner; für Nutzer mit steigendem Gehalt ist das Ergebnis eher zu pessimistisch, und die Zulage (Mindest-/Maximalbeitrag) ändert sich nicht mit.
- Umsetzung: Optionales Feld "jährliche Steigerung der Rate (%)" für Depot und bAV analog zum ETF (Default 0 → keine Verhaltensänderung, Golden-Vektoren bleiben gültig). Im Depot Höchstbeitrag pro Jahr (6.840 €) bei Steigerung prüfen.

### C-7 (Mittel) ETF-Sparphase beginnt am 1. Januar des laufenden Jahres
- Beleg: `etfProjector.ts` `effectivePlan`: `durationYears = payoutYear − currentYear` (volle Jahre). Heute ist Mitte/Ende November; die Sparphase wird um bis zu 11 Monate zu lang gerechnet (und es wird Rate für bereits vergangene Monate angenommen). Depot/bAV nutzen dagegen `startMonth`.
- Umsetzung: Sparphase in Monaten ab aktuellem Monat bis Dezember vor dem Auszahlungsjahr, analog Depot (`months = payoutYear*12 − startIdx`). `EtfPlanInput.durationYears` bleibt für die ETF-Seite (Phase 1) ganzzahlig. Alternativ: dokumentierte Vereinfachung plus Hinweis auf der Seite. Golden-Vektoren `e01–e06` betroffen → Generator und Excel anpassen und Abweichung notieren.

### C-8 (Niedrig) ETF-Entnahmephase vereinfacht
- `etfProjector.ts`: Gewinnanteil konstant; während der Entnahme wächst das Restkapital mit der Rente der Auszahlungsphase (2 %), neuer Gewinn bleibt unbesteuert in der Rechnung; Sparerpauschbetrag jährlich fest nominal. Ergebnis: Steuer eher **zu niedrig**. Bereits als `etf_tax_simplified` ausgewiesen; für höhere Genauigkeit jährliche Simulation (Verkaufserlös, anteiliger Gewinn, Freibetrag je Jahr) im Kern ergänzen. Niedrige Priorität.

### C-9 (Niedrig) Regelaltersgrenze für Jahrgänge vor 1964 muss manuell eingegeben werden
- `StatutoryPage`: Feld nur für Jahrgang < 1964. Die Tabelle (Jahrgang 1947–1963 → 65 Jahre 1 Monat … 66 Jahre 10 Monate) ist gesetzlich fest. Umsetzung: Tabelle in `config/pension-de.json` (Wert je Jahrgang, `confirmed` nach Gesetzestext prüfen) und automatisch vorbelegen.

### C-10 (Niedrig) Kleinigkeiten
- Pflegeversicherung: Beitragssatz-Abschlag für Eltern mit mehreren Kindern (ab 2. Kind −0,25 Prozentpunkte je Kind) wird nicht modelliert (`netPension.ts`). Kinder-Geburtsjahre sind im Profil vorhanden → leicht ergänzbar. Rentner zahlen den Satz in voller Höhe; Satz 2026 laut Config 3,6 % (kinderlos 4,2 %) – jährlich prüfen.
- Statische Annahmen, die als `unverified` markiert sind (`referenceIncomeMonthly`, `occupationalHealthAllowanceMonthly`, `occupationalCareThresholdMonthly`, `childGrantMaxAge`, `youthBonusMaxAge`, Steuerwerte in `tax-de.json`): gegen Primärquellen prüfen (Bezugsgröße 2026 = 3.955 €, 1/20 = 197,75 € ist rechnerisch konsistent, Status kann nach Quellenprüfung auf `confirmed`). Altersvorsorgedepot-Werte (Zulagenstaffel, Höchstbeitrag 6.840 €, Auszahlalter 65–70) beruhen auf dem Gesetz laut Config (`2026-05-26`); ich konnte das Gesetz hier nicht unabhängig verifizieren – Autor/Folgesession soll den Gesetzestext gegen `config/altersvorsorge-de.json` prüfen, bevor die App öffentlich geht.
- Mehrere Golden-Vektor-Sätze stammen aus derselben Quelle wie der Code (`tools/generate_golden.py`, in `PROGRESS.md` offen so genannt). Die Excel-Stichprobe (`s…`, `d…`, `b…`, `o…`, `e…`, `h…`) steht laut `PROGRESS.md` teils beim Autor noch aus. Empfehlung: pro Baustein mindestens ein Fall vom Autor in Excel nachrechnen lassen, bevor das Ergebnis öffentlich als verlässlich dargestellt wird.

### C-11 (Mittel, bestätigter Anzeigefehler) Falsche Hinweise zur Gesamtsicht bei Bausteinen ohne Beträge
- Beleg: Startseite im Neu-Zustand (Screenshot): Es zählt nur der ETF-Sparplan (445 €), aber der Text "Ab Alter 85 endet die erste Auszahlung, danach wächst die Lücke." und die Linie "Auszahlung endet (85)" im Diagramm erscheinen, obwohl die ETF-Auszahlung erst mit 90 endet. Quelle: `overview.ts` berechnet `firstPayoutEndAge` aus **allen gültigen, aktivierten** Bausteinen, auch aus Depot/bAV mit Eigenbeitrag 0 (Endalter 85 aus Standardwerten). Ebenso erscheinen in der Hinweisliste Warnungen von Bausteinen mit 0 €.
- Umsetzung: In `overview.ts` Bausteine mit `monthlyPensionReal === 0` (in allen Szenarien) als "leer" behandeln: nicht in `firstPayoutEndAge` und nicht in `warnings` aufnehmen, in `RetirementOverview` Liste "zählt ab Alter 67" nur für Bausteine mit Betrag > 0 oder mit Zusatz "noch nichts eingetragen". Tests in `overview.test.ts` ergänzen.

### C-12 (Mittel, bestätigter Anzeigefehler) Rohe technische Codes in Hinweisen
- Beleg: Startseite zeigt wörtlich "Ungeprüfter Rechtswert verwendet: depot.payoutTaxation.", "…social.occupationalHealthAllowanceMonthly." und "thresholds_indexed". Ursache: `warningText()` in `apps/web/src/components/RetirementOverview.tsx:25-32` kennt nur `unverified:tax`, `etf_*` und fällt sonst auf den Rohcode zurück; die Übersetzungen existieren aber auf den Bausteinseiten (`DepotPage.tsx:36`, `OccupationalPage.tsx:36`, `de.ts` ~890/1058).
- Umsetzung: Zentrale Funktion `warningText(code)` mit allen Codes (`unverified:depot.payoutTaxation`, `unverified:depot.noHealthContributions`, `thresholds_indexed`, `cost_capped`, `taxable_share_before_base_year`, `unverified:<group>.<key>` mit deutschem Anzeigenamen des Rechtswerts aus der Config) in eine gemeinsame Datei, von allen Seiten genutzt. Test: für jeden von den Projektoren erzeugten Code gibt es einen Text (Kern exportiert Liste aller Warncodes, Test prüft `de.ts` gegen die Liste). Unbekannte Codes in der UI nie roh anzeigen.

---

## 3. Usability und Verständlichkeit

Eindruck (Screenshots Desktop und Smartphone): Ruhige, klare Oberfläche mit gutem Kontrast, sinnvollen Hilfetexten unter jedem Feld und konsequentem Disclaimer. Bedienung per Tastatur laut Phasenabnahme geprüft. **Es fehlt aber die Führung für neue Nutzer.**

### U-1 (Hoch) Kein Einstieg / Onboarding
- Befund: Wer die App öffnet, landet auf "Rentenplan" mit der Überschrift "Gesamtsicht im Ruhestand" und einer Zahl "445 € pro Monat", die aus **vorbelegten Platzhalterwerten** stammt (Startkapital 5.000 €, 250 €/Monat). Nirgends steht "Das sind Beispielwerte, trage deine Daten ein". Der erste Schritt (Profil: Geburtsjahr, Rentenalter, Wunschrente) wird nicht angeboten; Beispieldaten verstecken sich auf der letzten Seite "Daten".
- Umsetzung: (1) Beim ersten Start (kein gespeicherter Zustand) eine Willkommenskarte auf der Startseite: Satz "Was kann die App?" (3 Stichpunkte), Schritte "1 Profil ausfüllen → 2 Bausteine eintragen → 3 Rentenlücke ansehen" als nummerierte Liste mit Links, Button "Mit Beispieldaten ausprobieren" (lädt `single`-Beispiel mit Bestätigung), Button "Mit meinen Daten beginnen" (Profil). (2) Solange der Nutzer nichts geändert hat, Ergebnisse mit Badge "Beispielwerte" kennzeichnen. (3) Wunscheinkommen auf der Startseite direkt abfragen (statt Verweis "Zum Profil"), weil ohne es die Kernaussage (Lücke) fehlt. Texte in `de.ts`; Mockup zuerst (Projektregel: Mockup → "Ja, bauen").

### U-2 (Mittel) Widersprüchliche Zahlen auf der ETF-Seite
- Befund: Oben "Endwert nach Steuer 103.916 €" (Laufzeit 20 Jahre), weiter unten "Kapital bei Entnahmebeginn 180.972 €" (27 Jahre). Beides korrekt erklärt, aber ein Laie hält es für einen Fehler.
- Umsetzung: Abschnitt "ETF im Ruhestand" klar absetzen (Überschrift mit Hinweis "gilt für Rentenplan, nutzt Entnahmealter statt Laufzeit"); oder Laufzeit-Feld, solange Schalter "Entnahme" aktiv, mit Hinweis "wird durch Entnahmealter überschrieben" versehen; Kennzahlen-Kacheln in "Sparplan-Rechner" und "Ruhestand" trennen.

### U-3 (Mittel) Fachbegriffe ohne Erklärung
- Befund: "KVdR", "bAV", "Entgeltumwandlung", "Teilfreistellung", "Vorabpauschale", "Besteuerungsanteil", "Glide Path", "Zugangsfaktor" erscheinen teils ohne Erklärung. Das Konzept sieht Hilfetexte vor, aber Kürzel wie "KVdR" stehen in der Profil-Zusammenfassung ("KVdR, mit Kindern").
- Umsetzung: Kleines Glossar-Muster: `<abbr title>` bzw. aufklappbares "Was heißt das?" an der ersten Verwendung je Seite; Texte in `de.ts`. Begriffe aus `docs/glossary.md` übernehmen.

### U-4 (Mittel) Lange Formulare ohne Fortschritts-/Prioritätsanzeige
- Profil-Seite ist ein sehr langes Formular (Person, Annahmen, Steuer, Kranken-/Pflegeversicherung). Pflichtangaben und Experteneinstellungen sind nicht getrennt.
- Umsetzung: "Person" offen; "Allgemeine Annahmen", "Steuer im Alter", "Kranken-/Pflegeversicherung" als standardmäßig eingeklappte Gruppen "Erweitert (Standardwerte sind gesetzt)" mit Kurzzusammenfassung der aktuellen Werte in der Kopfzeile.

### U-5 (Mittel) Leere Zustände und Nullwerte
- Rente-Seite: Feld "Voraussichtliche Monatsrente" steht auf 0 und die Hinweisbox sagt "Noch keine Renteninformation eingetragen". Gut. Depot/bAV mit 0 € Eigenbeitrag zeigen dennoch volle Ergebnisbereiche und Warnungen (siehe C-11). Umsetzung: Bei 0 € Beitrag Ergebnisbereich durch eine Leer-Karte ("Trage einen Beitrag ein, dann siehst du …") ersetzen.

### U-6 (Niedrig) Weitere Beobachtungen
- Navigation: "Rentenplan" (Seitenleiste) vs. "Gesamtsicht im Ruhestand" (Überschrift) vs. "Übersicht" (Code/Mockups). Einheitlicher Name (z. B. "Rentenplan" überall).
- Darstellung-Umschalter (System/Hell/Dunkel) ist ein `<select>` ganz unten in der Seitenleiste; auf dem Smartphone nur nach Öffnen des Menüs erreichbar – ok.
- Zahlenfelder: Dezimaltrenner/Eingaben mit Komma werden akzeptiert (Anzeige "2,5"), Tausenderpunkte nur im Anzeigefeld; Fehlerfall "123.456,7" beim Einfügen testen (Paste mit Tausenderpunkt) und tolerant parsen.
- Diagramme sind visuell, haben laut Phasenabnahme Textalternativen; Beschriftung "Auszahlung endet (85)" überlagert die Fläche (Lesbarkeit im Hell-Modus prüfen, ggf. Label oberhalb der Fläche platzieren).
- Export-Hinweis "Noch nie exportiert" ist gut. Zusätzlich auf der Startseite einmaliger Hinweis "Deine Daten sind nur in diesem Browser", sobald Nutzereingaben vorhanden sind (Verlust-Risiko durch Browserdaten löschen).
- Rechenergebnisse bei Eingabefehlern: Fehlermeldungen kommen als Daten aus dem Kern und werden angezeigt; bei Randfällen (C-1) prüfen, dass nie leere Diagramme ohne Erklärung erscheinen.

---

## 4. Design

Urteil: **angemessen und modern, eher zurückhaltend als langweilig.** Teal-Akzent, weiche Karten, große Radien, saubere Typografie (Systemschrift), ruhiger Hintergrund, Segment-Schalter, getrennte Kennzahlen-Kacheln. Für ein Finanztool mit Vertrauensanspruch passt das. Es wirkt aber an einigen Stellen **dokumentenhaft statt "Dashboard"**:

- D-1 (Mittel) Startseite: Die wichtigste Aussage (monatliche Netto-Rente, Lücke zum Wunscheinkommen) steht als einfache Textzeile "445 € pro Monat" in einer Karte. Vorschlag: Hero-Bereich mit großer Zahl, Fortschrittsbalken "Wunscheinkommen gedeckt zu X %", farblich getrennte Lücke/Überschuss, darunter Zusammensetzung. Die Zusammensetzung ("Zusammensetzung" als ein einziger flächiger Balken in Vollfarbe) ist bei einem Baustein nichtssagend; ab zwei Bausteinen gut.
- D-2 (Niedrig) Sehr viel Weißraum und lange Einspalten-Listen (Hinweise, Jahrestabellen). Jahrestabelle der ETF-Seite (20+ Zeilen) standardmäßig einklappen, wie der Verlauf auf der Startseite.
- D-3 (Niedrig) Hinweisliste auf der Startseite: lange Bullet-Liste in Standardschrift. Als einklappbare Gruppe "Hinweise und Annahmen (n)" mit Icon/Markierung nach Gewicht (wichtig/Info) gestalten.
- D-4 (Niedrig) Eigene Marke: Logo ist ein einfaches Quadrat-Symbol; Favicon fehlt (S-1). Dunkelmodus, schmale Bildschirme und Kontraste wurden laut `PROGRESS.md` geprüft; bei Änderungen erneut Kontrast ≥ 4,5:1 sicherstellen (`docs/design.md`).
- Umsetzungsregel: Design-Änderungen nur in `apps/web/src/styles.css` und Komponenten, Texte in `de.ts`, vorher Mockup in `docs/mockups/` zur Freigabe.

---

## 5. Fehlende Funktionen (Vorschläge, nach Nutzen sortiert)

| Id | Funktion | Nutzen | Aufwand |
|---|---|---|---|
| F-1 | Einkommensteuer-Modul im Alter (siehe C-2) | Netto-Genauigkeit | hoch |
| F-2 | Entgeltpunkte/Rente bei früherem Beginn (C-3) | Genauigkeit gesetzliche Rente | mittel |
| F-3 | Onboarding und Startassistent (U-1) | Verständlichkeit | mittel |
| F-4 | Steigende Beiträge in Depot/bAV (C-6) | Realismus | klein |
| F-5 | Hinterbliebenenrente/Tod des ersten Partners im Haushalt (`householdOverview.ts` rechnet ohne; in der Doku genannt) | Haushaltslücke wird sonst zu groß | mittel |
| F-6 | Sparerpauschbetrag über ETF, Sparziele und Depot **gemeinsam** verwalten (Konzept `06` sah geteilt vor, `08` weicht ab: je Ziel) | Steuergenauigkeit; aktuell kann der Freibetrag mehrfach genutzt werden | mittel |
| F-7 | **Erledigt 2026-11-20** (F-7a Kirchensteuer, F-7b Vorabpauschale, siehe `PROGRESS.md`): Vorabpauschale und Kirchensteuer als Option beim ETF | Genauigkeit, Wunsch vieler ETF-Sparer | mittel |
| F-8 | Druck-/PDF-Ansicht oder "Als Bild/PDF speichern" der Gesamtsicht | Weitergabe, Beratungsgespräch | klein–mittel |
| F-9 | Sensitivitätsanalyse ("Was wenn Rendite −1 %?", Sparrate ±50 €) als Schieberegler | Verständnis der Unsicherheit | mittel |
| F-10 | Monte-Carlo/Sequence-of-Returns-Risiko in der Entnahmephase (zusätzlich zu 3 festen Szenarien) | Realitätsnähe | hoch |
| F-11 | Weitere Bausteine (Phase 6): Riester/Rürup (Basisrente), private Rentenversicherung, Immobilie, Tagesgeld-Notgroschen | Vollständigkeit | hoch |
| F-12 | Verschlüsselter Export, optionale Passwort-Sperre der lokalen Daten | Datenschutz | mittel (neues Format, Rückfrage) |
| F-13 | PWA/Offline-Betrieb (Service Worker, Installieren auf dem Smartphone) | Komfort; Achtung CSP und Update-Strategie | mittel |
| F-14 | Mehrsprachigkeit (EN), da Code bereits i18n-fähig | Reichweite | klein–mittel |
| F-15 | Barrierefreiheit: automatischer Test (axe) im Playwright-Smoke | Qualitätssicherung | klein |
| F-16 | **Erledigt 2026-11-20** (Annuität und prozentuale Entnahme für ETF und Altersvorsorgedepot, „dynamische“ Entnahme bewusst nicht, siehe `PROGRESS.md`): Entnahmestrategien (z. B. prozentuale Entnahme, "dynamische" Entnahme) statt nur Annuität | bessere Planung | mittel |

---

## 6. Weitere Code-Qualität

- Tests und Struktur: sehr gut (Kern rein, Fehler als Daten, Golden-Vektoren, Property-Tests, Round-trip-Tests). Keine Funde im Kern außer C-1.
- `RetirementOverview.warningText` und die Seitenfunktionen duplizieren Warntext-Logik (siehe C-12).
- Große Seitenkomponenten (`DepotPage.tsx` 563, `OccupationalPage.tsx` 597 Zeilen, `StatutoryPage.tsx` 396): bei weiterem Wachstum in Formular/Ergebnis/Hinweise aufteilen.
- `CURRENT_YEAR` wird beim Laden des Moduls gesetzt (`useHousehold.ts:25`); bei einer Sitzung über den Jahreswechsel hinweg veraltet das Jahr (praktisch irrelevant, kurz dokumentieren oder bei `visibilitychange` neu setzen).
- `new Date().toISOString().slice(0,10)` für das heutige Datum (`legalConfig.ts`, `taxConfig.ts`, `AssumptionsPanel.tsx`) liefert das UTC-Datum; um den Jahreswechsel kann das eine Stunde/Tag abweichen. Besser lokales Datum (`getFullYear/getMonth/getDate`) – bei Gelegenheit zentral in einer Hilfsfunktion.
- `playwright.config.ts` nutzt lokales Chrome (`channel: 'chrome'`); in CI per `PW_CHANNEL=chromium` gesetzt – passt.

---

## 7. Test- und Abnahmeplan für die Umsetzung

Nach **jeder** Änderung: `npm run typecheck && npm run lint && npm run format:check && npm test`. Nach UI-Änderungen zusätzlich `npm run e2e`, danach Sichtprüfung (Desktop, schmal ≈ 390 px, Dunkel, Tastatur). Bei Rechenänderungen: neue Unit-Tests, Property-Test (`Number.isFinite`), Golden-Vektoren in `tools/generate_golden.py` und `golden-check.xlsx` anpassen und die betroffenen Vektoren in `packages/core/test/golden-vectors/` neu erzeugen, Abweichung in `PROGRESS.md` notieren und den Autor um Excel-Stichprobe bitten.

Neue Tests (Mindestumfang):
1. `C-1`: Validierung verhindert NaN in ETF, Depot, bAV, ETF-Entnahme; Property-Test auf Endlichkeit.
2. `C-11`: Überblick ignoriert 0-€-Bausteine für `firstPayoutEndAge` und Warnungen.
3. `C-12`: Alle Kern-Warncodes haben deutschen Text (Test gegen Codeliste).
4. `S-1/S-4`: Build mit `base: './'` ausgeliefert unter Unterpfad; E2E startet gegen `vite preview` mit Unterpfad (Smoke: Seite lädt, Beispieldaten laden, Export-Button vorhanden).
5. `U-1`: E2E: Erststart zeigt Willkommenskarte, "Mit Beispieldaten ausprobieren" lädt Daten, Karte verschwindet danach.

## 8. Empfohlene Reihenfolge der Umsetzung

1. **Sofort (klein, hoher Nutzen):** C-1, C-12, C-11, S-1 (+ Favicon/Meta), S-4 (CSP).
2. **Vor dem Veröffentlichen (Phase 5d mit dem Autor):** S-2, S-3 (Entscheidung), S-5 (Lizenz/Name/Archivdatei/Repo-Inhalt), Dependabot, Branch-Schutz, Release-Checkliste `12` §9, Prüfung der Altersvorsorgedepot-Werte gegen Gesetzestext (C-10).
3. **Genauigkeit (neue Teilphase "6a Rechengenauigkeit", mit Rückfrage und Konzeptergänzung in `01`/`07`):** C-2 (Steuer), C-3 (Entgeltpunkte), C-7, C-6, C-5, C-4, C-9, C-10 (Pflege-Kinderabschlag).
4. **Verständlichkeit/Design (Mockup zuerst):** U-1, U-2, U-3, U-4, U-5, D-1…D-3.
5. **Weitere Funktionen:** F-5, F-6, F-8, F-9, danach Phase 6/7.

Alle Punkte, die vom Konzept abweichen, vorher als Notiz in `PROGRESS.md` ("Notizen und Abweichungen") eintragen; betroffene Konzeptdateien (`03`, `09`, `10`, `12`) und `docs/assumptions.md` mitziehen.

## 9. Offene Fragen an den Autor

1. Hosting: eigene Domain/Account für Pages (S-3) oder Risiko akzeptieren?
2. Repo öffentlich? (Pages braucht auf Free-Konten ein öffentliches Repo.) Was passiert mit `CLAUDE.md`, `concept/` und der Archivdatei?
3. Soll die Einkommensteuer im Alter (C-2) modelliert werden, oder genügt ein niedrigerer Standard-Pauschalsatz plus Hinweis?
4. Entgeltpunkte (C-3): Eingabe von "Rente bei Beginn zum Wunschtermin" aus der Renteninformation (einfach) oder Entgeltpunkte-Modell (genauer)?
5. Name, Urheber der Lizenz, Präfix `pathwise.` (offen laut `PROGRESS.md`).
