# 14 – Review-Bericht (2026-11-22): Design, Code, Sicherheit, Funktionen, Doku, Bedienung, Smartphone

Dieser Bericht ist in **Arbeitspakete (AP)** geschnitten. Jedes AP passt in **eine Session**, hat eigene Aufgaben zum Abhaken und eigene Abnahmekriterien. Wer ein AP umsetzt, liest nur Abschnitt 0 (Regeln), die Befunde, die das AP nennt, und das AP selbst.

Vorgänger: `13-review-report.md` (2026-11-18). Dessen Punkte sind bis auf S-3, S-5, C-8 und F-10 bis F-14 umgesetzt (Stand `PROGRESS.md`). Dieser Bericht prüft den **heutigen** Stand neu und doppelt nichts davon.

---

## 0. So wird diese Datei benutzt

**Auftrag an eine Session (Vorlage):**

> Lies `CLAUDE.md`, `concept/PROGRESS.md` (nur Checkliste und Notizen der letzten Tage) und `concept/14-review-report-2026-11-22.md` Abschnitt 0 sowie AP-xx. Setze nur AP-xx um. Prüfe vorher in der Statustabelle (Abschnitt 4), ob die Voraussetzungen erledigt sind. Hake am Ende die Aufgaben im AP ab, setze die Statuszeile, aktualisiere die Statustabelle und schreibe einen Eintrag ins Session-Protokoll (Abschnitt 10) mit einem Commit-Vorschlag. Committe und pushe nicht selbst.

**Pflichten jeder Session (aus `CLAUDE.md`):**

- Vor größeren Änderungen kurz planen und beim Autor nachfragen; kleine Schritte, danach `npm run typecheck && npm run lint && npm run format:check && npm test`; bei UI-Änderungen zusätzlich `npm run e2e`.
- UI-Texte nur in `apps/web/src/i18n/de/`, Code und Tests Englisch, Rechtswerte nur in `config/`, keine neuen Abhängigkeiten ohne konkreten Nutzen.
- Neue oder stark geänderte Seiten: **erst Mockup in `docs/mockups/`, Freigabe durch den Autor ("Ja, bauen")**, dann bauen (so lief es in allen Phasen).
- Abweichungen vom Konzept zuerst in `PROGRESS.md` unter "Notizen und Abweichungen" eintragen.
- Nur das eigene AP anfassen. Was auffällt, aber nicht dazugehört, kommt in Abschnitt 8 (Backlog), nicht in den Code.

**Abhaken (Pflicht am Ende jedes AP):**

1. Aufgaben im AP: `- [ ]` → `- [x]`.
2. Statuszeile im AP: `Status: offen` → `Status: erledigt (JJJJ-MM-TT)` oder `teilweise (Rest: …)`.
3. Statustabelle in Abschnitt 4 nachziehen.
4. Eintrag im Session-Protokoll (Abschnitt 10): Datum, AP, was gemacht, Abweichungen, was offen blieb, Commit-Vorschlag.
5. Eine Zeile in `PROGRESS.md` (Notizen).

**Git-Regeln (Entscheidung des Autors, 2026-11-22):**

- **Committen, pushen, Branches wechseln, taggen macht ausschließlich der Autor** (in GitHub Desktop), nach jeder Session. Eine Session führt **keinen** `git commit`, `git push`, `git tag`, `git checkout`/`switch`, `git reset`, `git stash` oder `git rebase` aus. Lesende Befehle (`git status`, `git diff`, `git log`) sind erlaubt.
- Am Ende jeder Session steht im Session-Protokoll (Abschnitt 10) ein **Commit-Vorschlag** (eine englische Zeile, wie in `CLAUDE.md` verlangt) plus die Liste der geänderten Ordner. Der Autor übernimmt oder ändert ihn.
- Der Autor committet nach **jeder** Session. Deshalb laufen Sessions, die Dateien ändern, **nacheinander**, nicht gleichzeitig: Sonst landen zwei Pakete in einem Commit.
- Es gilt der **private** SSH-Zugang (siehe AP-01 und AP-17). Die Session fragt nach dem genauen Remote-Link und rät ihn nicht.

**Parallel arbeiten:** Sessions, die dieselben Ordner ändern, laufen nacheinander. Die Spalte "Ändert" in Abschnitt 4 zeigt, wo es kollidiert. Reine Mockup- und Konzept-Sessions (AP-07, AP-14, AP-19) dürfen neben anderen laufen, weil sie nur `docs/mockups/` und `concept/` anfassen.

---

## 1. Gesamturteil

| Bereich | Note | Kurzurteil |
|---|---|---|
| Rechenkern und Tests | sehr gut | 547 Unit-Tests, 76 E2E-Tests (davon 44 axe), Golden-Vektoren, strikte Typen, kein `any`, kein `@ts-ignore`. Keine neuen Rechenfehler gefunden. |
| Sicherheit (von außen) | sehr gut | Keine Server-Komponente, kein Netzwerkzugriff, strenge CSP, Import gehärtet. Restrisiken nur beim Hosting (Abschnitt 2.3). |
| Smartphone | **mangelhaft** | Auf 6 von 10 Seiten läuft der Inhalt bei 375 px seitlich über den Bildschirm hinaus (gemessen). Kein Test fängt das. |
| Bedienung | befriedigend bis gut | Gute Bausteine (Willkommenskarte, Fachbegriffe, Eingabefehler direkt am Feld). Aber Textwände auf einzelnen Seiten, kein Scroll-Reset beim Seitenwechsel, doppelte Personenumschalter. |
| Design | befriedigend | Sauber, ruhig, kontrastreich, aber ohne eigenen Charakter: kleine Zahlen, einfarbige Diagramme, reine Textnavigation. |
| Code-Struktur | befriedigend | Einzelne Dateien gut lesbar und kommentiert, aber 34 Dateien flach in `core/src`, 28 flach in `web/src`, `de.ts` mit 1.528 Zeilen. |
| Funktionsumfang | gut | Kern vollständig. Lücken: bestehende Altverträge (Riester, private Rente, Mieteinnahmen), Paar-Steuer, "schon in Rente". Etwas zu viel: Doppelungen auf der Startseite. |
| Doku | gut, aber schwer lesbar | Vollständig, aber `PROGRESS.md` hat 67 KB (Notizen mit bis zu 3 KB je Zeile). Git fehlt. |

**Das Wichtigste in drei Sätzen:** Die Rechnung und die Sicherheit sind in einem Zustand, den man so lassen kann. Der größte echte Mangel ist die Smartphone-Darstellung, den man in wenigen Stunden beheben kann (AP-02). Danach lohnt sich das Aufräumen der Oberfläche (weniger Text pro Seite, Ergebnis zuerst, modernere Gestaltung) mehr als jede neue Funktion.

---

## 2. Befunde

Belegt = ich habe es in dieser Review selbst gemessen oder gelesen. Ungeprüft ist als solches markiert.

### 2.1 Fehler (Bugs)

| Id | Schwere | Befund | Beleg | AP |
|---|---|---|---|---|
| B-1 | hoch | **Seitliches Überlaufen auf dem Smartphone.** Bei 375 px Breite sind sechs Seiten breiter als der Bildschirm: Depot 679 px, Rentenplan 606, bAV 574, ETF 472, Sparziele 414, gesetzliche Rente 396. Eingabefelder und Hilfetexte sind abgeschnitten. | Messung im Browser (`scrollWidth` gegen `clientWidth`). Ursachen: (a) `.grid { grid-template-columns: 1fr }` und `fieldset` ohne `min-width: 0`, dadurch bläht breiter Inhalt die Spalte auf; (b) Tabellen ohne `.table-wrap` (`RetirementOverview` 3x, `HouseholdOverview` 2x, `WhatIfCard`, `DataPage`, `EtfPage.tsx:417`, `GoalsPage.tsx:204`). Mit einer Test-CSS (`minmax(0,1fr)`, `min-width: 0`) fielen vier Seiten sofort auf 375 px; Rentenplan und ETF brauchen zusätzlich die Tabellen-Wrapper. | 02 |
| B-2 | mittel | **Kein Scroll-Reset und kein Fokus beim Seitenwechsel.** Wer auf einer langen Seite unten ist und im Menü eine andere Seite wählt, landet mitten auf der neuen Seite. Screenreader hören den Wechsel nicht. | `App.tsx`: `hashchange` setzt nur den State, kein `scrollTo`, kein Fokus auf `main`/`h1`, kein `document.title`. Im Browser reproduziert (Profil und Depot öffneten in der Mitte). | 03 |
| B-3 | mittel | **Ungültige Person verfälscht das Haushaltsergebnis still.** Geburtsjahr 1950 (Rentenbeginn 2017) wird im Profil ohne Fehlermeldung angenommen ("Jahre bis zum Rentenbeginn: −9"). Der Rentenplan zeigt dann Anna mit 0 € in allen Bausteinen, aber groß "Gedeckt sind 63 % des Wunsches. Es fehlen 1.564 €". Der Hinweis "Der Rentenbeginn liegt in der Vergangenheit" steht nur weit unten in der Hinweisliste. | Reproduziert (Beispiel "Paar", Geburtsjahr Person 1 auf 1950). | 04 |
| B-4 | niedrig | **Speicherfehler bleiben unsichtbar.** Alle `localStorage`-Schreibzugriffe enden in `catch { /* ignore */ }` (Hooks in `apps/web/src/use*.ts`, `onboarding.ts`). Bei vollem Speicher oder im privaten Modus glaubt die Nutzerin, es sei gespeichert. | Code gelesen. | 04 |
| B-5 | niedrig | **Zwei offene Tabs überschreiben sich** (letzter Schreiber gewinnt). Es gibt keinen `storage`-Listener. | `grep` nach `storage`-Ereignis: kein Treffer. | 04 |
| B-6 | niedrig | **Letzte Eingabe geht beim Schließen des Tabs verloren**, wenn das innerhalb von 250 ms nach dem Tippen passiert: `usePersist` sichert nur beim Unmount, nicht bei `pagehide`. | `useDebounced.ts` gelesen. | 04 |
| B-7 | niedrig | `removePerson` ruft `localStorage.removeItem` **innerhalb** der `setState`-Funktion auf (`useHousehold.ts:147`). Updater sollen rein sein. Wirkt heute harmlos, weil es idempotent ist. | Code gelesen. | 04 |
| B-8 | niedrig | Leere Datei `apps/web/src/arningText.ts` (0 Byte, Tippfehler-Rest von `warningText.ts`). | `ls -la`. | 01 |
| B-9 | niedrig | Heutiges Datum aus `toISOString().slice(0, 10)` ist UTC und kann um Mitternacht einen Tag abweichen (`legalConfig.ts:27`, `taxConfig.ts:19`, `AssumptionsPanel.tsx:118`). Schon in Review 13 genannt, nicht behoben. | `grep`. | 04 |
| B-10 | Hinweis | **Safari löscht lokale Daten**, wenn die Seite länger (laut WebKit-Regel etwa 7 Tage) nicht besucht wurde (ungeprüft, bitte vor Umsetzung gegen aktuelle WebKit-Doku prüfen). Für eine App, deren einzige Ablage `localStorage` ist, ist das ein echtes Datenverlustrisiko. Der Hinweis "zuletzt exportiert" existiert, mahnt aber nicht aktiv. | Konzeptionell. | 04 |

Nicht gefunden: Rechenfehler im Kern, `NaN`-Pfade (Eingabe von `-50` und Extremwerte wurden sauber am Feld gemeldet), Abstürze beim Import.

Automatische Läufe heute: `typecheck` sauber, `lint` sauber, `format:check` sauber, 547 Unit-Tests grün, Build ok (Hauptbundle 277 kB, Diagramm-Bibliothek 357 kB getrennt), 76 E2E-Tests grün, `npm audit` 0 Funde.

### 2.2 Messwerte Smartphone (375 × 812, Beispiel "Paar")

| Seite | Seitenbreite | Überlauf | Wörter (sichtbar) |
|---|---|---|---|
| Rentenplan | 606 px | Tabellen | 396 |
| ETF-Sparplan | 472 px | Tabelle | 509 |
| Gesetzliche Rente | 396 px | Formularkarte | 440 |
| Altersvorsorgedepot | 679 px | Formular | 906 |
| Betriebliche AV | 574 px | Formular | 693 |
| Sparziele | 414 px | Karte | 363 |
| Profil, Haushalt, Annahmen, Daten | 375 px | – | 216 / 224 / 3.080 / 133 |

Weitere Smartphone-Befunde:

- **Eingabefelder haben 15 px Schrift.** iOS Safari zoomt dann beim Antippen die Seite heran. Grenze ist 16 px.
- **Zu kleine Tippflächen:** `summary` 31 px, Schaltflächen 39 px, Eingaben 41 px hoch (Richtwert mindestens 44 px).
- **Navigation scrollt mit.** Auf Seiten mit 2.500 bis 11.000 px Höhe muss man zum Öffnen des Menüs ganz nach oben. Es gibt keine feste Kopfleiste und keine untere Tab-Leiste.
- Es fehlt `theme-color` und der Umgang mit der Notch (`viewport-fit`, `env(safe-area-inset-*)`).
- Siebenspaltige Tabellen (z. B. Zulagen je Jahr) sind auf dem Handy nur seitlich scrollend lesbar.
- **Kein Test prüft Smartphone-Breite.** In `PROGRESS.md` steht für Phase 2 "Smartphone-Größe vom Autor bestätigt": Es ist danach eine Regression entstanden, die kein Test bemerkte.

### 2.3 Sicherheit (ist die App von außen angreifbar?)

Kurzantwort: **Nein, praktisch nicht.** Es gibt keinen Server, keine Anmeldung, keine API und keinen Netzwerkzugriff der App.

Gut (nicht ändern):

- CSP im Produktions-Build: `default-src 'none'`, `connect-src 'none'`, `script-src 'self'`, `form-action 'none'`, `base-uri 'none'`, `object-src 'none'`. Selbst eingeschleuster Code könnte keine Daten senden.
- Kein `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`, `fetch`, `XMLHttpRequest`, `window.open` im Quellcode (per Suche geprüft). React maskiert alle Ausgaben.
- Import (`workspace.ts`) ist streng: Größenlimit 2 MB, Tiefenlimit 12, verbotene Schlüssel (`__proto__`, `constructor`, `prototype`), Personen-IDs nur `[A-Za-z0-9_-]{1,32}`, höchstens 20 Personen, Zahlen und Texte begrenzt, jeder Block validiert, Vorschau und automatische Sicherung vor dem Ersetzen.
- Download per `Blob` und `URL.revokeObjectURL`; `referrer: no-referrer`; Actions auf Commit-SHAs gepinnt; Dependabot vorbereitet; `npm audit` sauber.

Restrisiken:

| Id | Risiko | Einschätzung | AP |
|---|---|---|---|
| S-A | **Gemeinsamer `localStorage` auf `<name>.github.io`** (alle Seiten desselben Kontos teilen sich den Ursprung). Eine zweite, schädliche Seite desselben Kontos könnte die Daten lesen. | Offen seit Review 13 (S-3). Lösung: eigene Domain/eigenes Konto oder nur lokal betreiben. | 17 |
| S-B | **Clickjacking-Schutz fehlt** (`frame-ancestors` lässt sich nicht per Meta-Tag setzen, GitHub Pages erlaubt keine Header). Risiko gering, die App hat keine gefährlichen Aktionen. | Mit Hosting-Entscheidung lösen (anderer Host mit Headern) oder akzeptieren. | 17 |
| S-C | **Daten liegen unverschlüsselt** im Browser und in der Exportdatei. Wer Zugriff auf Gerät oder Datei hat, liest alles. | README und Seite "Daten" warnen. Optional: verschlüsselter Export. | 18 |
| S-D | Repo-Inhalt vor dem Veröffentlichen (`CLAUDE.md`, `concept/`, Archivdatei, Urheber in `LICENSE`). | Offen seit Review 13 (S-5). | 17 |
| S-E | Das **Projekt liegt nicht unter Git**. Kein Verlauf, kein Zurück, keine Absicherung gegen Überschreiben durch parallele Sessions. Das ist ein Betriebsrisiko, kein Angriff. | Siehe AP-01. | 01 |

### 2.4 Code-Struktur und Prüfbarkeit durch einen Menschen

**Was gut ist:** kleine, fokussierte Kernmodule (größtes: `blocks.ts` mit 543 Zeilen), Kommentare erklären das Warum, Fehler als Daten, Kern ohne UI-Abhängigkeit. Das Web importiert nur aus `@pathwise/core` (Wurzel), die Kerntests nur aus `../src` (Wurzel): **Ordner im Kern lassen sich also verschieben, ohne dass Web-Code oder Tests angepasst werden müssten** (nur `index.ts` und interne relative Importe).

**Was ein Review heute unnötig schwer macht:**

| Problem | Beleg |
|---|---|
| Alles flach: `packages/core/src` hat 34 Dateien in einem Ordner (ETF, Sparziele, Rente, Steuer, Haushalt, Speicherformat gemischt), `packages/core/test` hat 36 Testdateien flach. | `ls` |
| `apps/web/src` hat 28 Dateien direkt im Wurzelordner (Hooks, Speicher, Konfig-Lader, Formatierung gemischt) neben `components/` (25 Dateien) und `pages/` (10). | `ls` |
| `i18n/de.ts` mit **1.528 Zeilen** in einer Datei, `styles.css` mit 877 Zeilen in einer Datei; die Farbvariablen für Dunkel stehen **zweimal** (`[data-theme='dark']` und `prefers-color-scheme`) und müssen von Hand synchron bleiben. | Zeilenzählung, `styles.css:36-80` |
| Seitendateien mit 400 bis 600 Zeilen, in denen Formular, Ergebnis und Tabellen zusammenliegen (`OccupationalPage` 613, `DepotPage` 605, `GoalsPage` 491, `EtfPage` 473). Dreimal fast gleiche Hilfskomponenten: `StepsTable` (Depot, bAV, Rente), `Results` (3x), `ScenarioTable` (2x). | Funktionslisten |
| `PROGRESS.md` hat 67 KB; einzelne Notizen sind 1 bis 3 KB lang. Das liest kein Mensch. | `wc` |
| Es gibt keine Einstiegskarte ("Wo liegt was, wie fließen die Daten?"). | – |

**Vorschlag (reine Verschiebungen, kein Verhalten ändert sich, 547 Tests sind das Sicherheitsnetz):**

```text
packages/core/src/
  etf/        etf, etfProjector, etfTarget, advanceLumpSum, projection, calculate
  goals/      goal, goalTypes, goalValidation, allowance
  pension/    statutory, depot, occupational, payout, netPension
  overview/   overview, householdOverview, gapSolver, householdGapSolver
  household/  household, profile, householdMigration
  workspace/  blocks, workspace
  tax/        tax, taxConfig, incomeTax, retirementTax, legalConfig
  shared/     types, months, issues, solver, validation
  index.ts    bleibt die einzige öffentliche Schnittstelle
apps/web/src/
  app/        main, App, appConfig, createStore
  state/      use*-Hooks, personStorage, workspaceStore, workspaceFiles, onboarding
  lib/        format, legalConfig, taxConfig, warningText, personProducts, etfRetirement, examples
  components/ charts/, forms/, layout/, cards/
  pages/      je Seite ein Ordner (Page, Results, Tabellen)
  i18n/de/    je Seite eine Datei, index.ts setzt zusammen
  styles/     tokens.css, base.css, layout.css, components.css, pages.css
docs/architecture.md   eine Seite: Ordnerkarte und Datenfluss Speicher → Hooks → Kern → Seiten
```

### 2.5 Design

**Bewertung:** Das Design ist ruhig, konsistent und gut lesbar (Kontrast geprüft, axe ohne Funde). Es wirkt aber wie ein Entwicklerwerkzeug, nicht wie ein Produkt, dem man seine Altersvorsorge anvertraut.

| Beobachtung | Wirkung |
|---|---|
| Hauptzahl nur 26 bis 28 px, Fließtext 15 px, ähnliche Gewichtung aller Karten | Das Wichtigste ("Wie viel habe ich im Alter?") hebt sich kaum ab. |
| Navigation nur Text, 10 Einträge, "Bausteine" als kleine graue Zwischenüberschrift | Wenig Orientierung, kein Wiedererkennen. |
| Diagramme einfarbig (Teal und Grau): bei zwei Personen und vier Bausteinen schwer unterscheidbar | Zusammensetzung nach Baustein ist optisch kaum lesbar. |
| Statusinformationen (Baustein leer, ungültig, ungeprüft) als gleich aussehende Aufzählung | Wichtiges und Nebensächliches sehen gleich aus. |
| Karte neben Karte, überall dieselbe Rahmen- und Schattenstärke, keine Abstandsskala | Gleichförmig, wenig Rhythmus. |
| Leere Zustände nur als Satz Text | Kein Hinweis, was der nächste Schritt ist. |

**Vorschlag "modern, aber nicht aufdringlich"** (Umsetzung in AP-07 und AP-08; zuerst Mockup):

1. **Typografie:** 16 px Basis (löst nebenbei den iOS-Zoom), Hauptzahl 40 bis 48 px, klare Stufen für Überschriften. Systemschrift beibehalten (keine neue Abhängigkeit, CSP-freundlich).
2. **Ergebnis zuerst:** Eine "Hero"-Karte oben: große Zahl, Status-Chip ("Lücke 1.564 €" oder "Ziel erreicht"), Balken, ein Satz in Klartext. Alles andere darunter.
3. **Navigation mit schlichten Linien-Icons** (Inline-SVG, keine Bibliothek), aktiver Eintrag als getönte Pille. Am Smartphone feste Kopfleiste mit Menü-Taste oder untere Tab-Leiste (Rentenplan, Eingaben, Haushalt, Mehr).
4. **Farbe mit Bedeutung:** je Baustein eine feste, unterscheidbare Farbe (Diagramme, Chips, Tabellenkopf), je Person ein Muster oder eine Variante; Statusfarben (ok, Hinweis, Warnung) als kleine Chips. Palette im Mockup festlegen und rechnerisch auf Kontrast prüfen.
5. **Ruhiger Rhythmus:** Abstandsskala als Tokens (4/8/12/16/24/32), Karten ohne doppelte Rahmen, Schatten nur bei Hervorhebung, mehr Weißraum zwischen Abschnitten.
6. **Leere Zustände** mit einem Satz und einem Knopf ("Gesetzliche Rente eintragen").
7. **Dunkelmodus:** Tokens nur einmal definieren (Duplikat entfernen).
8. Bewegung bleibt minimal (150 ms, `prefers-reduced-motion` respektiert).

Nicht vorgeschlagen: Animationen, Verläufe, Illustrationen, Glas-Effekte, eigene Webfonts.

### 2.6 Bedienung (Benutzerführung)

Ziel des Autors: Wer die App öffnet, erkennt sofort, was er wo eingeben muss, und wird geführt.

**Gut:**

- Willkommenskarte mit drei Schritten, Beispieldaten-Knopf, Hinweis "Beispielwerte" (U-1 erledigt).
- Fachbegriffe werden erklärt (`withTerms`), Hilfetexte unter den Feldern, Fehler direkt am Feld ("Der Wert darf nicht negativ sein").
- Rechtswerte mit Quelle und Status, Disclaimer überall, Drucken/PDF, Export/Import mit Vorschau.
- Fortgeschrittenes (Kosten, Vorabpauschale, Entnahmestrategie) liegt in einklappbaren Gruppen.

**Nicht gut:**

| Id | Befund | Beleg | AP |
|---|---|---|---|
| U-A | **Der Rentenplan ist überladen.** Reihenfolge heute: Hinweiskarte, Karte mit Baustein-Häkchen, Statusliste, Szenarioschalter, Hauptzahl, Tabelle, Wunscheinkommen-Feld, Zusammensetzung, Verlauf, Hinweise, "Was wäre wenn", "Lücke schließen", dazu darunter der alte ETF-Endwert (Phase 1, doppelt) und die Sparziele (anderes Thema). Haushalt-Ansicht: 2.279 px am Desktop, 3.490 px am Smartphone. | Seite im Browser durchgegangen | 09 |
| U-B | **Ergebnis kommt nach den Einstellungen.** Die Häkchen "Bausteine in der Gesamtsicht" stehen *über* der Hauptzahl. Das Wunscheinkommen, das über Lücke oder Überschuss entscheidet, steht versteckt zwischen Tabelle und Zusammensetzung. | Screenshots | 09 |
| U-C | **Annahmen-Seite = Textwand:** 3.080 Wörter, 10.905 px. Beginnt mit `Steuerwerte (config/tax-de.json)` und Quellenangaben wie "geprüft am 19.11.2026 auf gesetze-im-internet.de". Das ist Entwicklersprache. | Seite im Browser | 12 |
| U-D | **Depot (906 Wörter) und bAV (693 Wörter)** zeigen Formular, drei Tabellen, Rechenweg und Hinweise untereinander. Die ETF-Seite mischt zwei Zwecke ("Sparplan-Rechner" und "ETF im Ruhestand") in einer Formularspalte, das Ergebnis des zweiten steht weit unten. | Seiten im Browser | 10, 11 |
| U-E | **Zwei Personenumschalter** gleichzeitig: Auswahlfeld "Aktive Person" in der Seitenleiste und Reiter "Haushalt, Anna, Ben" über der Überschrift. Die aktive Person steht auf den Bausteinseiten nicht in der Überschrift, der Wechsel wirkt still auf alle Seiten. | Screenshots | 09 |
| U-F | **Keine Führung nach dem Start.** Die Drei-Schritte-Anleitung verschwindet nach der ersten Eingabe. Die Seitenleiste zeigt nicht, welche Bausteine schon ausgefüllt sind. | Code und Browser | 13 |
| U-G | Die Profilseite zeigt den Hinweis zu geteilten Werten **über** der Überschrift (`PageShell`-Reihenfolge). | Screenshot | 09 |
| U-H | Rentenbeginn in der Vergangenheit wird im Profil nicht beanstandet (siehe B-3). Die App kennt **keinen Modus für Menschen, die schon in Rente sind**. | Reproduziert | 04 |

### 2.7 Funktionsumfang

**Vorhanden und vollständig für V1:** ETF-Sparplan (Rate, Steigerung, Einmalzahlungen, Kosten, Steuer, Vorabpauschale, Kirchensteuer, drei Szenarien, Zielvermögen-Rückwärtsrechner), gesetzliche Rente, Altersvorsorgedepot mit Zulagen, bAV, Rentenplan mit Lücke und "Lücke schließen", Was-wäre-wenn, Haushalt mit Hinterbliebenenrente, Sparziele mit gemeinsamem Sparerpauschbetrag, Export/Import, Druck, Beispieldaten, Barrierefreiheit.

**Es fehlt (nach Nutzen sortiert):**

| Id | Funktion | Warum | AP |
|---|---|---|---|
| F-A | **Generischer Baustein** ("Sonstige Einkünfte im Alter": bestehende Riester-/Rürup-/private Rente, Mieteinnahmen, Pension; je Betrag, Beginn, Ende, steuerpflichtig ja/nein, Anpassung). | Viele Menschen haben Altverträge, die heute nirgends hineinpassen. Der generische Baustein deckt Riester, Rürup, private Rentenversicherung und mietfreies Wohnen ab, ohne jedes Produkt einzeln nachzubauen. Das ist der beste Weg in Phase 6. | 14, 15 |
| F-B | **Zusammenveranlagung (Splitting) beim Paar.** Die Einkommensteuer im Alter rechnet je Person einzeln. Bei Paaren mit ungleichem Einkommen ist die Steuer dadurch zu hoch, das Netto zu niedrig. | In `07` Nr. 12/13 bewusst verschoben, aber der Effekt auf die Rentenlücke ist größer als der des Sparerpauschbetrags. | 16 |
| F-C | **"Schon in Rente" / Rentenbeginn nah.** | Zielgruppe 55+; heute schlägt es als stille Verfälschung durch (B-3). Erst Fehlermeldung (AP-04), dann Entscheidung. | 04 |
| F-D | Szenarien speichern und vergleichen ("Plan A / Plan B"). Was-wäre-wenn speichert nichts. | Nützlich, aber nicht dringend. | Backlog |
| F-E | Verschlüsselter Export, Installation als App (PWA), Offline. | Komfort und Datenschutz. | 18 |

**Zu viel bzw. doppelt:**

- Der alte **ETF-Endwert (Phase 1)** unten auf dem Rentenplan doppelt die ETF-Seite. Entfernen.
- Die **Sparziele-Karte** auf dem Rentenplan mischt ein kurzfristiges Thema (Auto, Urlaub) in die Altersvorsorge. Verlinken statt einbetten.
- **Annahmen stehen an vier Orten** (Profil, Annahmen-Seite, ETF-Seite mit Schalter, Haushalt). Profil bleibt die Eingabestelle, die Annahmen-Seite die Leseansicht, die ETF-Seite zeigt nur noch "gilt aus dem Profil, hier ändern" (AP-10).
- **Erweiterte Steueroptionen** (Vorabpauschale, Kirchensteuer, Entnahmestrategie) sind richtig, gehören aber hinter "Erweitert" (teils schon so, vereinheitlichen).
- **Nicht bauen:** Monte-Carlo (Review 13 F-10). Drei Szenarien plus prozentuale Entnahme reichen und vermeiden eine Scheingenauigkeit. Mehrsprachigkeit (F-14) erst bei Bedarf.

### 2.8 Doku: was ist noch nicht umgesetzt?

Aus `PROGRESS.md`, `07`, `12`, `13`:

| Offen | Quelle | AP |
|---|---|---|
| Git/GitHub einrichten (init, Commit, privates Repo, Push, CI grün, Branch-Schutz, Dependabot) | `PROGRESS` 5d | 01 (lokal), 17 (GitHub) |
| Name, Lizenz-Urheber, Präfix `pathwise.`; Archivdatei und `CLAUDE.md` ins Repo oder nicht | `PROGRESS` 5c, `12` §11 | 17 |
| Release-Checkliste (`12` §9), Abnahme mit eigenen Daten, Sichtprüfung der Seite "Daten" | `PROGRESS` Phase 5 | 17 |
| **Excel-Stichprobe des Autors** für `s…`, `d…`, `b…`, `o…`, `e…`, `h…` und die neueren Vektoren (`va`, `vap`, `w`, `gs`); Excel wurde nie berechnet | `PROGRESS` Notizen | 17 |
| Unsichere Rechtswerte (`unverified`) erneut prüfen, Status in der UI sichtbar | `07` Nr. 3, `12` §9 | 17 |
| Beispielwerte für Golden-Tests vom Autor | `PROGRESS` Phase 0 | 17 |
| Hosting-Ursprung (S-3), Repo-Inhalt (S-5) | Review 13 | 17 |
| ETF-Entnahme als Jahressimulation (C-8, Steuer eher zu niedrig, als `etf_tax_simplified` ausgewiesen) | Review 13 | Backlog |
| Paar-Pool Sparerpauschbetrag (Stufe 2) | `07` Nr. 13 | Backlog |
| Phase 6 (weitere Bausteine), Phase 7 (Desktop, Sync, Login) | `PROGRESS` | 14, 15 / Backlog |
| `docs/design.md` beschreibt noch den Stand vom 2026-11-18 | `docs/design.md` | 08 |

---

## 3. Priorisierung

| Stufe | Pakete | Warum jetzt |
|---|---|---|
| **P0 – sofort** | AP-01 Git, AP-02 Smartphone-Layout, AP-03 Navigation, AP-04 Robustheit | Echter Mangel (Smartphone), Betriebsrisiko (kein Git), stille Fehlergebnisse. Klein und sicher. |
| **P1 – Fundament und Richtung** | AP-05 Kern-Struktur, AP-06 Web-Struktur, AP-07 Design-Mockup | Aufräumen *vor* dem Umbau der Oberfläche, damit spätere Sessions nicht in verschobenen Dateien arbeiten. Das Mockup kann parallel laufen. |
| **P2 – Oberfläche** | AP-08 Design-Umsetzung, AP-09 Rentenplan, AP-10 Bausteinseiten-Vorlage mit ETF, AP-11 Depot/bAV/Rente, AP-12 Annahmen, AP-13 Führung | Hebt die Bedienbarkeit am stärksten an. Reihenfolge wie nummeriert. |
| **P3 – Funktionen** | AP-14/15 Generischer Baustein, AP-19/20 Rentner-Modus, AP-16 Paar-Steuer (nach P2) | Neuer Nutzen, erst wenn die Oberfläche trägt. AP-14 und AP-19 (Konzept und Mockup) können früher und parallel laufen. |
| **Gate – mit dem Autor** | AP-17 GitHub-Release | **Letzte Session.** Fragt die Release-Entscheidungen (Abschnitt 9, Frage 8) selbst beim Autor ab. |
| **Optional** | AP-18 Komfort (verschlüsselter Export, PWA) | Nach der Smartphone-Reparatur sinnvoll, nicht dringend. |

---

## 4. Statusübersicht (nach jedem AP aktualisieren)

| AP | Titel | Stufe | Voraussetzung | Ändert | Status |
|---|---|---|---|---|---|
| 01 | Git einrichten und Aufräumen | P0 | Repo-Link und privater SSH-Alias vom Autor | Wurzel, `PROGRESS.md` | [x] erledigt 2026-11-22 (Commit/Push offen beim Autor) |
| 02 | Smartphone-Layout reparieren | P0 | – | `styles.css`, Tabellen in Seiten, Playwright | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 03 | Navigation: Scroll, Fokus, Titel, untere Tab-Leiste | P0 | 02 | `App.tsx`, `PageShell`, CSS | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 04 | Robustheit: Eingaben, Speichern, Daten | P0 | – | Hooks, Kern (Validierung), `DataPage` | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 05a | Umbenennung auf "Valiva" | P1 (vor 05) | Entscheidung des Autors (Abschnitt 9) | Wurzel, `apps/web`, `packages/core`, `e2e`, `examples`, Doku | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 05 | Kern-Ordnerstruktur | P1 | 04, 01 | alle Dateien in `packages/core` | [x] erledigt 2026-11-22 (Commit offen beim Autor; ESLint-Regel nicht gebaut, optional) |
| 06 | Web-Ordnerstruktur, i18n- und CSS-Split | P1 | 02, 03, 04, 05 | alle Dateien in `apps/web` | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 07 | Design-Mockup v2 | P1 | – | nur `docs/mockups/` (und `docs/design.md`, `PROGRESS.md`) | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 08 | Design-Umsetzung: Tokens, Typografie, Navigation, Diagramme | P2 | 06, 07 (Freigabe) | `styles/`, Layout, Diagramme | [x] erledigt 2026-11-22 (Commit offen beim Autor) |
| 09 | Rentenplan "Ergebnis zuerst" | P2 | 08 | Rentenplan, Haushaltsansicht, Personenumschalter | [x] erledigt 2026-11-22, U-G in AP-10 nachgetragen (Commit offen beim Autor) |
| 10 | Bausteinseiten-Vorlage und ETF-Seite | P2 | 08 | gemeinsame Komponenten, `EtfPage` | [x] erledigt 2026-11-23 (Commit offen beim Autor) |
| 11 | Depot, bAV, gesetzliche Rente auf die Vorlage | P2 | 10 | die drei Seiten | [x] erledigt 2026-11-23 (Commit offen beim Autor) |
| 12 | Annahmen-Seite und Texte entschlacken | P2 | 08 | `AssumptionsPage`, `AssumptionsPanel`, Texte | [x] erledigt 2026-11-23 (Commit offen beim Autor) |
| 13 | Geführter Einstieg und Fortschritt | P2 | 09 | Seitenleiste, Willkommenskarte, leere Zustände | [x] erledigt 2026-11-23 (Commit offen beim Autor) |
| 14 | Generischer Baustein: Konzept und Mockup | P3 | – | `concept/`, `docs/mockups/` | [x] erledigt 2026-11-23 (Commit offen beim Autor) |
| 15 | Generischer Baustein: Kern und Web | P3 | 05, 06, 14 (Freigabe) | Kern, Seiten, Config, Golden | [x] erledigt (2026-11-23, Teile A und B; Excel-Stichprobe des Autors: passt) |
| 16 | Paar-Besteuerung (Splitting) | P3 | 05 | Steuerkern, Haushaltsansicht, Config | [ ] offen |
| 17 | GitHub-Release mit dem Autor | Gate (zuletzt) | 01, alle anderen | Wurzel, `.github/`, Doku | [ ] offen |
| 18 | Komfort: verschlüsselter Export, PWA | optional | 02, 06 | `DataPage`, Kern (Format), Service Worker | [ ] offen |
| 19 | Rentner-Modus: Konzept und Mockup | P3 | – | `concept/`, `docs/mockups/` | [ ] offen |
| 20 | Rentner-Modus: Kern und Web | P3 | 04, 05, 06, 09, 19 (Freigabe) | Kern, Profil, Seiten, Config, Golden | [ ] offen |

**Parallel möglich:** AP-07, AP-14 und AP-19 (nur Mockup/Konzept) laufen neben allen anderen. AP-02, AP-03 und AP-04 berühren teils dieselben Web-Dateien: nacheinander. AP-05 und AP-06 verschieben Dateien und laufen **allein**, ohne andere offene Code-Session. AP-09 bis AP-13 ändern verschiedene Seiten, laufen wegen des Commits nach jeder Session aber **nacheinander** (Kollisionen außerdem in `de.ts` und CSS).

---

## 5. Arbeitspakete P0: sofort

### AP-01 Git einrichten und aufräumen
Status: erledigt (2026-11-22) · Rest beim Autor: erster Commit, Tag `baseline-2026-11-22`, Push (GitHub Desktop)

**Warum:** Es gibt keinen Verlauf (S-E). Ohne Git lässt sich ein Fehler nicht zurücknehmen. `CLAUDE.md` sah Git erst in Phase 5 vor; der Autor hat die Einrichtung vorgezogen. **Aufgabenteilung:** Die Session richtet das lokale Repository **vorbereitend** ein und verbindet es mit dem Remote, sobald der Autor den Link liefert. **Alles Weitere** (erster Commit, Push, Tags, Branches, Pull Requests) macht der Autor in GitHub Desktop.

**Aufgaben:**
- [x] **Autor fragen**, bevor irgendetwas angelegt wird: (a) Remote-Link des vom Autor angelegten (leeren, privaten) Repos, (b) welcher **SSH-Host-Alias** für das **private** Konto gilt. Die SSH-Konfiguration kennt zwei Zugänge (Arbeit und privat), also muss der Link den privaten Alias enthalten (Form `git@<privater-alias>:<konto>/<repo>.git`, nicht `git@github.com:…`). Nicht raten, nicht aus Dateien ableiten: der Autor nennt den genauen Link. Die Datei `~/.ssh/config` und Schlüssel werden **nicht** gelesen oder verändert.
- [x] (c) **Name und E-Mail für Commits** im privaten Konto erfragen und nur im lokalen Repository (`git config --local`) setzen, nie global. Der Autor soll die privaten, nicht die dienstlichen Angaben nennen. *Erledigt auf Wunsch des Autors nachträglich: `git config --local` mit `antoniotroiano` und der GitHub-noreply-Adresse (GitHub Desktop zeigte sie in diesem Repo nicht automatisch an); global unberührt.*
- [x] `CLAUDE.md` anpassen: Zeile "Git/GitHub noch nicht eingerichtet" ersetzen durch: Git ist lokal eingerichtet, **Commits, Pushes und Tags macht nur der Autor**, Sessions committen nicht; GitHub-Veröffentlichung erst in AP-17 (Phase 5).
- [x] `.gitignore` prüfen (enthält `node_modules`, `dist`, `.idea/`, `.claude/settings.local.json`, `*.workspace.json` außer `examples/`, `.DS_Store`, `apps/web/dist`).
- [x] Datenscan vor dem ersten Commit (keine echten Nutzerdaten, keine Schlüssel, keine Zugangsdaten); Ergebnis im Protokoll nennen.
- [x] `git init` mit Standard-Branch `main`; `git remote add origin <Link des Autors>` **ohne** `fetch` oder `push`. Kein `git add`, kein `git commit`: Der Autor macht den ersten Commit selbst und setzt den Tag `baseline-2026-11-22`.
- [x] Leere Datei `apps/web/src/arningText.ts` löschen (B-8).
- [x] `PROGRESS.md` entlasten: Abschnitt "Notizen und Abweichungen" unverändert nach `concept/PROGRESS-notes-archive.md` verschieben, in `PROGRESS.md` pro Notiz eine Zeile (Datum, Thema, Verweis auf Archiv). Die Checkliste oben bleibt unverändert.
- [x] Kurze Regel für Sessions in `CONTRIBUTING.md`: ein AP pro Session, **ein Commit pro Session durch den Autor**, vor dem Commit laufen `typecheck`, `lint`, `format:check`, `test`; Commit-Vorschlag steht im Protokoll.
- [x] Dem Autor sagen, was er jetzt in GitHub Desktop tun muss (Repository hinzufügen, ersten Commit, Push).

**Fertig wenn:** `git status` zeigt ein sauberes, vorbereitetes Arbeitsverzeichnis mit konfiguriertem `origin` (privater Alias), `PROGRESS.md` ist unter ca. 25 KB, `npm test` weiter grün; der Autor hat den ersten Commit gemacht (erst danach beginnt AP-02).
**Nicht Teil davon:** Commit, Push, Tag, CI-Lauf, GitHub-Einstellungen (AP-17).

### AP-02 Smartphone-Layout reparieren
Status: erledigt (2026-11-22) · Rest beim Autor: Commit (GitHub Desktop)

**Warum:** B-1 und Abschnitt 2.2: sechs Seiten laufen auf 375 px seitlich über.

**Aufgaben:**
- [x] `.grid` auf `grid-template-columns: minmax(0, 1fr)` (einspaltig) und `.grid > * { min-width: 0 }`; `fieldset { min-width: 0 }`; `.card { min-width: 0 }`.
- [x] Alle `<table>` in einen gemeinsamen Wrapper (Komponente `ScrollTable` oder Klasse `.table-wrap` überall): `RetirementOverview` (3), `HouseholdOverview` (2), `WhatIfCard`, `DataPage`, `EtfPage.tsx:417`, `GoalsPage.tsx:204`. Wrapper ist fokussierbar und hat eine Beschriftung (`role="region"`, `tabIndex={0}`, `aria-label`), wie in `DepotPage` schon vorhanden.
- [x] Eingabefelder und Auswahlfelder auf mindestens 16 px Schrift (verhindert iOS-Zoom).
- [x] Tippflächen mindestens 44 px hoch: `summary`, `.btn`, Eingaben, Menü-Taste, Segmentschalter.
- [x] `<meta name="theme-color">` (hell und dunkel) und `viewport-fit=cover` mit `env(safe-area-inset-*)` für Kopfleiste und Fuß.
- [x] Neuer E2E-Test `e2e/mobile.spec.ts` (Playwright-Projekt oder `test.use` mit 375 × 812): lädt das Beispiel "Paar", ruft alle zehn Seiten auf und prüft `document.documentElement.scrollWidth <= clientWidth`. Zusätzlich 320 px für Rentenplan und Depot.
- [x] Sichtprüfung Smartphone hell und dunkel (je Seite ein Screenshot), Notiz in `PROGRESS.md`.

**Fertig wenn:** Der neue Test ist grün auf allen zehn Seiten, die Messung zeigt `scrollWidth` gleich Fensterbreite, kein Abschneiden von Labels, Hilfetexten oder Feldern.
**Nicht Teil davon:** neues Design, neue Navigation (AP-03/08).
**Hinweis:** Erst die Ursachen (Grid, Fieldset, Tabellen) beheben, dann messen. Mit Test-CSS in der Konsole ließ sich das bereits bestätigen.

### AP-03 Navigation: Scroll, Fokus, Titel, Smartphone-Leiste
Status: erledigt (2026-11-22) · Rest beim Autor: Commit (GitHub Desktop)

**Warum:** B-2 und Smartphone-Befund "Navigation scrollt mit".

**Aufgaben:**
- [x] Bei Seitenwechsel (`hashchange`) nach oben scrollen und den Fokus auf die `h1` (mit `tabIndex={-1}`) oder `main` setzen; `prefers-reduced-motion` beachten (kein weiches Scrollen).
- [x] `document.title` je Seite ("ETF-Sparplan – Pathwise"); Name aus `appConfig`, Seitentitel aus `de.nav`.
- [x] Skip-Link und Fokusreihenfolge nach dem Wechsel prüfen.
- [x] Smartphone: **untere Tab-Leiste** (Entscheidung des Autors, Abschnitt 9, Frage 5) mit vier Zielen: Rentenplan, Eingaben, Haushalt, Mehr (öffnet das volle Menü mit allen Bausteinen, Annahmen, Daten, Profil). Darüber eine schmale Kopfzeile mit Name und aktiver Person. Leiste auf Desktop ausgeblendet; `env(safe-area-inset-bottom)` beachten, Mindesthöhe 48 px, Inhalt bekommt unten Abstand, damit nichts verdeckt wird. **Vorher kleines Mockup der Leiste** (`docs/mockups/mobile-nav.html`) zur Freigabe; AP-07 übernimmt die Leiste dann in das Gesamtdesign.
- [x] Das "Mehr"-Menü schließt nach Auswahl und per Escape; Fokus kehrt zur "Mehr"-Taste zurück; aktives Ziel hat `aria-current`.
- [x] E2E-Test: Seite scrollen, Menüpunkt wählen, `scrollY === 0` und Fokus auf der Überschrift.

**Fertig wenn:** Seitenwechsel landet immer oben, Screenreader-Fokus steht auf der neuen Überschrift, die Navigation ist auf langen Smartphone-Seiten jederzeit erreichbar (untere Leiste, ohne Seitenverlust beim Scrollen), E2E und axe grün.

### AP-04 Robustheit: Eingaben, Speichern, Daten
Status: erledigt (2026-11-22) · Rest beim Autor: Commit (GitHub Desktop)

**Warum:** B-3 bis B-7, B-9, B-10, U-H.

**Aufgaben:**
- [x] **B-3:** Im Kern prüfen, wie eine Person mit Rentenbeginn in der Vergangenheit behandelt wird. Vorschlag: Validierungsfehler am Profilfeld ("Mit diesem Geburtsjahr liegt der Rentenbeginn in der Vergangenheit"), und im Rentenplan: Ist eine Person ungültig, zeigt die Hauptzahl **keinen** Lückenwert, sondern einen deutlichen Hinweis mit Sprung zur Person. Test im Kern und E2E.
- [x] Rentner-Modus ist entschieden (Abschnitt 9, Frage 3) und kommt in AP-19/AP-20. Hier nur die klare Meldung, mit Hinweis "Der Modus für Personen, die schon in Rente sind, folgt".
- [x] **B-4:** Zentrale Speicherfunktion mit Rückmeldung; schlägt ein Schreibvorgang fehl, erscheint eine dauerhafte Hinweisleiste ("Speichern im Browser nicht möglich. Exportiere deine Daten."). Alle `catch { /* ignore */ }` in Hooks und `onboarding.ts` darauf umstellen.
- [x] **B-5:** `storage`-Ereignis abhören: Wurde der Haushalt in einem anderen Tab geändert, Hinweis "In einem anderen Fenster wurde etwas geändert. Neu laden?" statt stilles Überschreiben.
- [x] **B-6:** Bei `pagehide` und `visibilitychange` (hidden) die ausstehenden Eingaben sofort sichern (`usePersist` erweitern).
- [x] **B-7:** Nebenwirkung aus dem `setState`-Updater von `removePerson` herausziehen.
- [x] **B-9:** Eine Hilfsfunktion `todayLocal()` (lokales Datum) und die drei Stellen darauf umstellen.
- [x] **B-10:** Exportmahnung: Hinweisleiste, wenn nie exportiert oder letzter Export älter als 90 Tage (zuerst Safari-Verhalten gegen aktuelle WebKit-Doku prüfen und im Text korrekt formulieren).
- [x] Neue Tests: Kern (Validierung), Hook-Test für Speicherfehler (Storage-Mock wirft), E2E für Hinweis bei ungültiger Person.

**Fertig wenn:** Eine ungültige Person erzeugt nie ein scheinbar gültiges Haushaltsergebnis; ein fehlgeschlagenes Speichern ist sichtbar; keine Eingabe geht beim Tab-Schließen verloren.
**Nicht Teil davon:** Rentner-Modus (AP-19/AP-20).

---

## 6. Arbeitspakete P1 und P2

### AP-05 Kern-Ordnerstruktur
Status: erledigt (2026-11-22) ·  Voraussetzung: AP-04 erledigt, **keine andere Code-Session offen**

**Warum:** Abschnitt 2.4. Reine Verschiebungen, damit ein Mensch den Kern ordnerweise prüfen kann.

**Aufgaben:**
- [x] Zielstruktur aus 2.4 mit dem Autor abstimmen (Ordnernamen, Zuordnung der 34 Dateien).
- [x] Dateien mit `mv` verschieben (Git erkennt Umbenennungen beim Commit des Autors selbst; kein `git mv`, kein `git add`), interne relative Importe und `index.ts` anpassen; öffentliche Schnittstelle bleibt unverändert.
- [x] Tests spiegeln die Ordner (`packages/core/test/<ordner>/…`), Golden-Vektoren bleiben, Ladepfade in den Tests anpassen.
- [x] `tools/generate_golden.py` und Verweise in Doku (`README.md`, `docs/`, `concept/`) auf neue Pfade prüfen.
- [x] `docs/architecture.md` (eine Seite): Ordnerkarte, Abhängigkeitsrichtung (`shared` ← `tax` ← `etf`/`goals`/`pension` ← `overview`), Hinweis "Kern ohne UI/DB/HTTP".
- [ ] ESLint-Regel gegen Importe quer durch Ordner nur wo sinnvoll (optional, keine neue Abhängigkeit).

**Fertig wenn:** `typecheck`, `lint`, `format:check`, 547 Tests und Build sind unverändert grün, `git diff --stat` zeigt nur Verschiebungen und Importzeilen, `apps/web` brauchte keine Änderung.

### AP-06 Web-Ordnerstruktur, i18n- und CSS-Split
Status: erledigt (2026-11-22) · Voraussetzung: AP-02, AP-03, AP-04, AP-05, keine andere Code-Session offen

**Aufgaben:**
- [x] Ordner `app/`, `state/`, `lib/` anlegen und die 28 Wurzeldateien zuordnen (siehe 2.4).
- [x] `components/` in `charts/`, `forms/`, `layout/`, `cards/` gliedern.
- [x] Je Seite ein Ordner (`pages/depot/DepotPage.tsx`, `DepotResults.tsx`, …); Dateien über ca. 300 Zeilen aufteilen (Formular, Ergebnis, Tabellen).
- [x] `i18n/de.ts` in `i18n/de/<seite>.ts` zerlegen, `i18n/de/index.ts` setzt `de` unverändert zusammen (Zugriffe `de.xyz` bleiben gleich).
- [x] `styles.css` in `styles/tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css` aufteilen; Dunkel-Tokens **einmal** definieren (z. B. über ein gemeinsames Selektorpaar oder eine kleine Build-Hilfe), ohne Verhalten zu ändern.
- [x] Verweise in Doku und E2E anpassen.

**Fertig wenn:** Alle Checks und E2E grün, Oberfläche pixelgleich (Screenshot-Vergleich zweier Seiten hell/dunkel), keine Datei im Web über 400 Zeilen außer reinen Textdateien.

### AP-07 Design-Mockup v2
Status: erledigt (2026-11-22) · Rest beim Autor: Commit (GitHub Desktop)

**Aufgaben:**
- [x] Mockup `docs/mockups/design-v2.html` mit: Rentenplan (Hero zuerst, Haushalt mit zwei Personen), einer Bausteinseite (Depot) in Vorlage "Eingaben | Ergebnis | Rechenweg", Smartphone-Ansicht (375 px) mit Kopfleiste oder Tab-Leiste, hell und dunkel.
- [x] Vorschläge aus 2.5 darstellen: Typografie-Skala, Abstandsskala, Navigations-Icons, Baustein- und Statusfarben (Chips), leerer Zustand.
- [x] Palette rechnerisch auf Kontrast prüfen (Text 4,5:1, Bedienelemente und Linien 3:1) und die Werte im Mockup notieren.
- [x] Smartphone-Navigation: **untere Tab-Leiste** (entschieden, Abschnitt 9, Frage 5; in AP-03 schon gebaut) in das Gesamtdesign einpassen: Icons, aktiver Zustand, "Mehr"-Blatt, hell und dunkel. Keine Varianten mehr nötig.
- [x] Freigabe des Autors ("Ja, bauen") und Entscheidung in `PROGRESS.md` und `docs/design.md` eintragen.

**Fertig wenn:** Autor hat freigegeben oder Änderungen genannt; die Entscheidung steht schriftlich im Repo.

### AP-08 Design-Umsetzung: Tokens, Typografie, Navigation, Diagramme
Status: erledigt (2026-11-22) · Rest beim Autor: Commit (GitHub Desktop) · Voraussetzung: AP-06, AP-07 (freigegeben)

**Aufgaben:**
- [x] Tokens: Abstandsskala, Typografie-Skala (16 px Basis), Bausteinfarben, Statusfarben; alte Werte ersetzen, keine festen Farben in Komponenten.
- [x] Navigation: Inline-SVG-Icons (kleine Komponente, keine Bibliothek), aktiver Eintrag als getönte Pille; Smartphone-Navigation nach Mockup-Entscheidung.
- [x] `KpiTile` und Hauptzahl größer, Status-Chips-Komponente (`ok`, `hint`, `warn`).
- [x] Diagramme: Bausteinfarben und Personenvarianten, zusätzlich Muster oder Beschriftung (nicht Farbe allein), Legenden prüfen.
- [x] Leere-Zustand-Komponente (Text, Knopf).
- [x] `docs/design.md` aktualisieren (Tokens, Komponenten, Verlauf).
- [x] Axe-Tests hell und dunkel, Kontrast der neuen Farben, Sichtprüfung Desktop und 375 px.

**Fertig wenn:** Oberfläche entspricht dem freigegebenen Mockup, E2E und axe grün, `design.md` aktuell.

### AP-09 Rentenplan "Ergebnis zuerst"
Status: erledigt (2026-11-22; U-G in AP-10 nachgetragen, 2026-11-23) · Rest beim Autor: Commit (GitHub Desktop) · Voraussetzung: AP-08

**Aufgaben (Befunde U-A, U-B, U-E, U-G):**
- [x] Reihenfolge: Hero (Hauptzahl, Status-Chip, Balken, ein Satz) mit dem **Wunscheinkommen-Feld direkt daneben**; darunter Szenarioschalter, Zusammensetzung, Verlauf, "Lücke schließen".
- [x] "Bausteine in der Gesamtsicht" als kompakte Chips oder einklappbar ("Bausteine anpassen") unter dem Hero.
- [x] Tabellen, Statusliste und Hinweise in einklappbare Abschnitte ("Details", "Hinweise (4)"); wichtige Hinweise (ungültige Person, `important`) bleiben sichtbar und stehen oben.
- [x] Alten ETF-Endwert (Phase 1) unten **entfernen**; Sparziele-Karte durch einen Link ersetzen (entschieden: Abschnitt 9, Frage 4).
- [x] Ein einziger Personenumschalter: Reiter bleiben auf der Startseite, das Auswahlfeld in der Seitenleiste entfällt oder ersetzt sie (Entscheidung im Mockup); aktive Person steht in der Überschrift der Bausteinseiten.
- [x] Hinweis zu geteilten Werten **unter** die Überschrift (U-G). In AP-10 nachgetragen: `PageShell` zeigt ihn unter der Überschrift (Profil, Annahmen).
- [x] Seitenhöhe vorher/nachher messen (Ziel: Haushalt unter 1.600 px am Desktop, unter 2.400 px am Smartphone mit eingeklappten Details). E2E anpassen (Smoke-Tests nutzen teils Texte aus den verschobenen Bereichen).

**Fertig wenn:** Ein neuer Nutzer sieht ohne Scrollen: Ergebnis, Status, Wunsch, nächste Handlung. Alle Tests grün.

### AP-10 Bausteinseiten-Vorlage und ETF-Seite
Status: erledigt (2026-11-23) · Rest beim Autor: Commit (GitHub Desktop) · Voraussetzung: AP-08

**Aufgaben (Befund U-D):**
- [x] Gemeinsame Vorlage `BlockPage`: Kopf (Titel, Person, Zweck in einem Satz), Spalte "Eingaben", Spalte "Ergebnis" (am Desktop mitlaufend), Abschnitt "Rechenweg" einklappbar; am Smartphone Reiter "Eingaben | Ergebnis | Rechenweg" oder gestapelt mit festem Ergebnis-Kopf.
- [x] Gemeinsame Komponenten aus den doppelten Hilfen: `StepsTable`, `ScenarioTable`, `Results`-Rahmen, `WarningList` (aus Depot, bAV, Rente).
- [x] **ETF-Seite** in zwei Teile trennen: "Sparphase" (Rechner) und "Ruhestand" (Entnahme für den Rentenplan), je mit eigenem Ergebnis nebenan; Schalter "Annahmen aus dem Profil" als reiner Hinweis mit Link.
- [x] Ergebnisse "oben, kurz"; Detailtabellen darunter einklappbar.
- [x] Tests und axe, Sichtprüfung Desktop/Smartphone.

**Fertig wenn:** Die ETF-Seite hat höchstens ca. 350 sichtbare Wörter im Ausgangszustand, die Vorlage ist von den anderen drei Seiten nutzbar, Ergebnisse stehen ohne Scrollen neben bzw. über dem Formular.

### AP-11 Depot, bAV und gesetzliche Rente auf die Vorlage
Status: erledigt (2026-11-23) · Rest beim Autor: Commit (GitHub Desktop) · Voraussetzung: AP-10

**Aufgaben:**
- [x] `DepotPage` (906 Wörter), `OccupationalPage` (693), `StatutoryPage` (440) auf `BlockPage` umstellen; Zulagentabelle und Rechenweg einklappbar, Hinweise gebündelt mit Gewicht (`important` sichtbar, `info` eingeklappt).
- [x] Zulagentabelle auf dem Smartphone als Kartenliste statt siebenspaltiger Tabelle.
- [x] Hilfetexte kürzen: ein Satz je Feld, Details hinter "Mehr erfahren" (Begriffe über `withTerms`).
- [x] Alle drei Seiten auf höchstens ca. 450 sichtbare Wörter im Ausgangszustand bringen.
- [x] Tests, axe, Sichtprüfung.

**Fertig wenn:** Drei Seiten nutzen dieselbe Vorlage, Wortzahl unter Ziel, keine Funktion verloren (alle Eingaben und Ergebnisse weiter erreichbar).

### AP-12 Annahmen-Seite und Texte entschlacken
Status: erledigt (2026-11-23) · Rest beim Autor: Commit (GitHub Desktop) · Voraussetzung: AP-08

**Aufgaben (Befund U-C):**
- [x] Seite zweiteilen: oben **"Deine Annahmen"** (Inflation, Renditen, Rentenanpassung, Entnahmerendite, aus dem Profil, nur lesend, mit Link zum Ändern), darunter **"Gesetzliche Werte"** als Aufklappliste je Bereich (Steuern, Rente, Sozialversicherung, Altersvorsorgedepot, Einkommensteuer) mit Statusabzeichen in der Kopfzeile ("2 ungeprüft").
- [x] Dateinamen (`config/tax-de.json` usw.) aus der Oberfläche entfernen (bleiben in der Doku). Quellenangabe je Wert einklappbar, Text auf Deutsch und ohne Prüfprotokoll ("geprüft am … auf …" nur als kleines Datum).
- [x] Rechenregeln (Fließtext) in eigene einklappbare Abschnitte je Baustein, nicht als eine lange Seite.
- [x] Ungeprüfte Werte bleiben deutlich markiert (Regel aus `CLAUDE.md`).
- [x] Seitenhöhe messen (Ziel unter 2.500 px mit eingeklappten Abschnitten), axe.

**Fertig wenn:** Die Seite beginnt mit Klartext, `unverified` bleibt sichtbar, kein Entwicklerpfad in der Oberfläche.

### AP-13 Geführter Einstieg und Fortschritt
Status: erledigt (2026-11-23) · Voraussetzung: AP-09

**Aufgaben (Befund U-F):**
- [x] Seitenleiste zeigt je Eingabeseite einen Status: leer, ausgefüllt, mit Hinweis (kleines Zeichen plus Text für Screenreader).
- [x] Nach der ersten Eingabe ersetzt eine Karte "Nächster Schritt" die Willkommenskarte (z. B. "Gesetzliche Rente eintragen", "Wunscheinkommen festlegen", "Daten exportieren"), ausblendbar.
- [x] Leere Zustände in Bausteinseiten und im Rentenplan mit Knopf zum nächsten Schritt (Komponente aus AP-08).
- [x] Reihenfolge der Seitenleiste mit dem Ablauf abstimmen (Profil, Bausteine, Rentenplan); Begriff "Bausteine" in der Oberfläche erklären oder durch einen Klartext ersetzen (Entscheidung Autor: "Einkommensquellen", Rentenplan bleibt oben).
- [x] E2E: Erststart, erste Eingabe, Karte wechselt, Status in der Leiste.

**Fertig wenn:** Ein neuer Nutzer weiß zu jedem Zeitpunkt, was als Nächstes zu tun ist; erledigte Schritte sind erkennbar.

---

## 7. Arbeitspakete P3, Gate und optional

### AP-19 Rentner-Modus: Konzept und Mockup
Status: offen · Voraussetzung: keine (nur `concept/` und `docs/mockups/`)

**Warum:** Entscheidung des Autors (Abschnitt 9, Frage 3): Personen, die schon in Rente sind, sollen abbildbar sein. Heute ist das ein Fehlerfall (B-3, in AP-04 nur als Meldung abgefangen).

**Aufgaben:**
- [ ] Konzeptdatei `concept/16-retired-mode.md` (Muster wie `09`): Wann gilt eine Person als "in Rente" (Schalter am Profil oder automatisch, wenn Rentenbeginn erreicht), welche Felder entfallen (Sparplan-Laufzeit, Beiträge, Beginnmonat), welche neu hinzukommen (aktuelle Rente laut Rentenbescheid, laufende bAV-Auszahlung, vorhandenes Depot- und ETF-Kapital mit Entnahme).
- [ ] Rechenregeln: Besteuerungsanteil nach Rentenbeginnjahr (festgeschrieben), Kranken-/Pflegeversicherung der Rentner, jährliche Rentenanpassung, Lebenserwartung als Entnahmehorizont; Mischfall Paar (eine Person in Rente, eine nicht) in der Gesamtsicht.
- [ ] Alle Seiten durchgehen: Was wird bei einer Person in Rente ausgeblendet, was vereinfacht (Eingaben nur noch Ist-Werte)?
- [ ] Mockup `docs/mockups/rentner-modus.html` (Profil mit Schalter, Rentenplan eines Paares mit einer Person in Rente); Freigabe des Autors.
- [ ] `01`, `06`, `07` und `PROGRESS.md` ergänzen; Offene Punkte in `07`.

**Fertig wenn:** Konzept und Mockup liegen vor und sind freigegeben.

### AP-20 Rentner-Modus: Kern und Web
Status: offen · Voraussetzung: AP-04, AP-05, AP-06, AP-09, AP-19 (freigegeben)

**Aufgaben:** (Detail nach `16-retired-mode.md`)
- [ ] Kern: Personenstatus, Validierung (kein Fehler mehr für Rentenbeginn in der Vergangenheit bei Rentner-Modus), Projektion ohne Ansparphase, Anbindung an `overview` und `householdOverview`, Workspace-Format (Version, Migration, Import-Grenzen).
- [ ] Tests, Property-Tests, Golden-Vektoren (Python-Generator und Excel-Blatt).
- [ ] Web: Profil-Schalter, angepasste Bausteinseiten, Rentenplan, Texte in `de.ts`, Beispieldaten (erfundene Rentnerin), E2E und axe.
- [ ] Meldung aus AP-04 ("Modus folgt") durch den Modus ersetzen.

**Fertig wenn:** Eine Person mit Geburtsjahr 1950 wird korrekt als Rentnerin gerechnet; Haushalt mit einer Rentnerin und einer Berufstätigen liefert eine plausible Gesamtsicht; Excel-Stichprobe des Autors angefragt.

### AP-14 Generischer Baustein: Konzept und Mockup
Status: erledigt (2026-11-23) · Voraussetzung: keine

**Aufgaben:**
- [x] Konzeptdatei `concept/15-phase-6-generic-block.md` (Muster wie `09`): Felder (Name, Art, Betrag pro Monat in heutiger Kaufkraft oder nominal, Beginnalter, Endalter, jährliche Anpassung, steuerpflichtig ja/nein/Anteil, Kranken-/Pflegeversicherung ja/nein), Zuordnung zu Gesamtsicht, Haushalt, Workspace-Format (neuer Block, Versionierung), Rechenregeln, Tests, Golden-Vektoren.
- [x] Mehrere Einträge je Person (Liste), Beispiele: Riester-Rente laut Standmitteilung, private Rentenversicherung, Mieteinnahmen, Pension.
- [x] Abgrenzung zu später (echte Riester-/Rürup-Modelle, Immobilie mit Restschuld): nur beschreiben, nicht bauen.
- [x] Mockup `docs/mockups/sonstige-einkuenfte.html`; Freigabe des Autors.
- [x] `01`, `06`, `07` und `PROGRESS.md` (Phase 6) ergänzen.

**Fertig wenn:** Konzept und Mockup liegen vor und sind freigegeben, Offene Punkte stehen in `07`.

### AP-15 Generischer Baustein: Kern und Web
Status: erledigt (2026-11-23, Teil A und Teil B; Excel-Stichprobe des Autors: passt) · Voraussetzung: AP-05, AP-06, AP-14 (freigegeben)

AP-15 läuft in **zwei Sessions** (Abweichung von "ein AP pro Session", weil das Paket zu groß ist; eingetragen in `PROGRESS.md`): **Teil A** = `15` §13 Schritte 1 bis 4 (Kern, Workspace, keine UI), **Teil B** = Schritte 5 und 6 (Web, E2E, Doku, Excel-Stichprobe). Umsetzungsnotizen zu Teil A: `15` §15.

**Aufgaben:** (Detail nach `15-phase-6-generic-block.md`)
- [x] Teil A, Kern: Typen, Validierung (Fehler als Daten), Projektor für das Rentenplan-Modell, Anbindung an `overview` und `householdOverview`, Block-Validator und Workspace-Format (Version 2, Migration).
- [x] Teil A, Tests, Property-Tests (Endlichkeit), Golden-Vektoren `oi01`–`oi08` mit Python-Generator und Excel-Blättern.
- [x] Teil B, Web: Seite, Hook, Eintrag in Seitenleiste und Gesamtsicht, Texte in `i18n/de/`, Beispieldaten in der App, Annahmen-Seite (sechste Gruppe), Farbe `--b-oth`.
- [x] Teil B, E2E-Smoke und axe, README, Excel-Stichprobe des Autors angefragt.

**Fertig wenn:** Eine bestehende Riester-Rente lässt sich als Eintrag erfassen und erscheint korrekt in Rentenplan und Haushalt; Excel-Stichprobe des Autors angefragt.

### AP-16 Paar-Besteuerung (Splitting)
Status: offen · Voraussetzung: AP-05 · Entscheidung des Autors liegt vor (Abschnitt 9, Frage 7: ja)

**Was das ist (Erklärung in einfachen Worten):** Verheiratete können beim Finanzamt **gemeinsam** veranlagt werden. Dabei werden die zu versteuernden Einkommen beider addiert, halbiert, die Einkommensteuer auf die Hälfte berechnet und das Ergebnis verdoppelt ("Splitting"). Weil der Steuersatz mit steigendem Einkommen wächst, zahlt ein Paar mit **ungleichen** Einkommen zusammen weniger als bei getrennter Berechnung. Beispiel: Eine Person hat 40.000 € zu versteuern, die andere 10.000 €. Getrennt: Steuer auf 40.000 plus Steuer auf 10.000. Gemeinsam: zweimal die Steuer auf 25.000. Das zweite ist niedriger. Bei gleichen Einkommen gibt es keinen Unterschied.
**Heute:** Pathwise rechnet jede Person **einzeln**. Für Paare mit sehr unterschiedlichen Renten ist die Steuer im Alter daher **leicht zu hoch**, die Nettorente zu niedrig geschätzt (auf der sicheren Seite). Die Gesamtsicht weist darauf hin ("nicht gemeinsam veranlagt").
**Verhalten (festgelegt):**
- **Single (ein Haushaltsmitglied):** Kein Schalter, keine Frage, keine Änderung. Splitting gibt es für Alleinstehende nicht, die Einzelberechnung ist bereits das richtige Ergebnis.
- **Zwei Personen:** Die App kann nicht wissen, ob das Paar verheiratet ist (ein unverheiratetes Paar bekommt kein Splitting). Deshalb eine **ausdrückliche Frage** auf der Haushaltsseite: "Werdet ihr gemeinsam veranlagt (Ehe oder eingetragene Lebenspartnerschaft)?" mit den Antworten Ja / Nein. **Kein stilles Vorbelegen**: Solange nicht beantwortet, rechnet die App einzeln (sichere Seite) und zeigt in der Gesamtsicht einen kurzen Hinweis mit Sprung zur Frage. Bei Nein ändert sich nichts gegenüber heute.
- **Beispieldaten** ("Anna und Ben") sind verheiratet gedacht: dort ist die Antwort Ja gesetzt, damit die Beispiele den Effekt zeigen.
- Neue Haushalte mit zwei Personen: Frage erscheint im geführten Einstieg (AP-13) und auf der Haushaltsseite.

**Nutzen gegen Aufwand:** Wirkt nur bei Paaren mit ungleichen Einkommen, ändert den Steuerkern und die Golden-Vektoren. Deshalb erst nach P2.

**Aufgaben:**
- [ ] Reichweite bestätigen (nur Einkommensteuer auf Renten, Sparerpauschbetrag bleibt je Person; siehe `07` Nr. 13); Verhalten wie oben.
- [ ] Config: Splitting-Verfahren aus §32a Abs. 5 EStG als Beschreibung (verdoppelte Steuer auf das halbe Einkommen), kein neuer Rechtswert nötig außer `status`/Quelle.
- [ ] Kern: `retirementIncomeTax` um gemeinsame Veranlagung erweitern (reine Funktion, Tests: Splitting-Vorteil bei ungleichem Einkommen, bei gleichem Einkommen gleich wie getrennt), Verteilung der Steuer auf Personen.
- [ ] Haushaltsfeld `jointAssessment` (`true`/`false`, fehlt = nicht beantwortet; optional, Workspace-Format-Version unverändert, Import-Grenzen und Tests anpassen), Frage auf der Haushaltsseite nur bei genau zwei Personen; Wechsel von zwei auf eine Person setzt das Feld zurück.
- [ ] `householdOverview` und Golden-Vektoren (Python und Excel) anpassen, Hinweis in der Gesamtsicht aktualisieren (heute: "nicht gemeinsam veranlagt").
- [ ] Mockup-Freigabe, E2E.

**Fertig wenn:** Bei einem Paar mit ungleichen Renten ist das Netto mit Splitting nachweislich höher, Test deckt es ab, Hinweistext stimmt.

### AP-17 GitHub-Release mit dem Autor
Status: offen · Voraussetzung: AP-01 (Git eingerichtet, erster Commit vom Autor) · **letzte Session**

**Ablauf-Regel (Entscheidung des Autors):** Die Release-Fragen (Abschnitt 9, Frage 8) werden **jetzt noch nicht** entschieden. **Diese Session fragt den Autor am Anfang danach**, bevor sie irgendetwas vorbereitet. Pushen, Tags, Releases und alle Einstellungen auf GitHub macht der Autor selbst (GitHub Desktop bzw. Weboberfläche); die Session bereitet Dateien vor und gibt Schritt-für-Schritt-Anleitungen.

**Aufgaben:**
- [ ] Autor fragen und Antworten in `PROGRESS.md` festhalten: Name der App (heute Arbeitstitel "Pathwise"), Urheber der Lizenz, Präfix der Speicherschlüssel (`pathwise.`), Archivdatei und `CLAUDE.md` im Repo behalten oder entfernen, Repository privat oder öffentlich, Hosting-Ursprung (S-A, S-B).
- [ ] Prüfen, dass der Remote den **privaten** SSH-Alias nutzt (nicht den Arbeitszugang), und dass der Autor weiß, welches Konto beim Push verwendet wird.
- [ ] Anleitung für den Autor: privates Repo, Push in GitHub Desktop, CI läuft grün, Branch-Schutz, Dependabot aktiv, Pages-Quelle "GitHub Actions" (`pages.yml` ist vorbereitet). Session führt davon nichts selbst aus.
- [ ] Release-Checkliste `12` §9 abarbeiten; unsichere Rechtswerte erneut prüfen (`07` Nr. 3).
- [ ] **Excel-Stichprobe durch den Autor** je Baustein (`s`, `d`, `b`, `o`, `e`, `h`, `va`, `vap`, `w`, `gs`); Ergebnis in `PROGRESS.md` festhalten.
- [ ] Abnahme mit eigenen Daten (Export/Import) und Sichtprüfung der Seite "Daten" (Desktop, Smartphone, dunkel, Tastatur).
- [ ] README (Disclaimer, Datenschutz, Start), Lizenz mit Urheber.

**Fertig wenn:** Alle Punkte der Release-Checkliste sind abgehakt oder bewusst verschoben und begründet.

### AP-18 Komfort: verschlüsselter Export, PWA (optional)
Status: offen · Voraussetzung: AP-02, AP-06

**Aufgaben:**
- [ ] Verschlüsselter Export (Passwort, Web Crypto API `AES-GCM` mit `PBKDF2` oder `scrypt`-Ersatz; keine neue Bibliothek), Import erkennt das Format, Dateiformat-Version und Migration, klare Warnung "Passwort nicht wiederherstellbar".
- [ ] PWA: `manifest`, Symbole, Service Worker mit Cache-Strategie, die zur CSP passt (`script-src 'self'`), Aktualisierung ohne Datenverlust; Installationshinweis am Smartphone. Beachten: installierte Web-Apps sind von der Safari-Löschregel ausgenommen (zu prüfen).
- [ ] Tests (Roundtrip, falsches Passwort, beschädigte Datei), E2E.

**Fertig wenn:** Exportdatei ist ohne Passwort unlesbar, Import mit Passwort funktioniert, die App startet installiert auch ohne Netz.

---

## 8. Backlog und bewusst nicht

- ETF-Entnahme als Jahressimulation (Review 13 C-8). Niedrige Priorität, ist als `etf_tax_simplified` ausgewiesen.
- Paar-Pool für den Sparerpauschbetrag (`07` Nr. 13, Stufe 2).
- Szenarien speichern und vergleichen (F-D).
- Mehrsprachigkeit (F-14), Ist-Werte statt Prognose, Kursdaten-Adapter, Phase 7 (Desktop, Sync, Login).
- **Nicht bauen:** Monte-Carlo (F-10), animierte Effekte, Webfonts, Icon-Bibliotheken.
- ~~Dunkelmodus nur per axe geprüft, nicht visuell durchgesehen~~: in AP-08 nachgeholt (2026-11-22, Screenshots Desktop und 375 px).
- (AP-01) Der erste Commit enthält auch `CLAUDE.md`, `concept/`, die Archivdatei `ETF_Investment_Tracker_…md` und `LICENSE` mit Urheber-Platzhalter. Das Repo ist privat, die Entscheidung dazu fällt in AP-17 (S-D).
- (AP-01) Repo heißt `valiva-app`, der Arbeitstitel in Code, Config und Speicher-Präfix ist `pathwise` (Namenssession des Autors, Abschnitt 9). Der Remote-Link ändert sich bei Umbenennung nur über `git remote set-url`.
- (AP-01) In `PROGRESS.md` standen unter "Notizen und Abweichungen" im Abschnitt "Offene Fragen aus dem Bau" weitere Notizen ohne eigene Überschrift. Beim Archivieren sind alle 70 Notizen in einer Reihe gelandet, "Offene Fragen aus dem Bau" ist wieder ein eigener, leerer Abschnitt.
- (AP-01) Die Checkliste Phase 5d in `PROGRESS.md` ("`git init`, erster Commit, …") bleibt bewusst offen bis AP-17; `git init` ist erledigt, der Rest nicht.

- (AP-02) `playwright.config.ts` fest auf Port 5173 mit `reuseExistingServer: !CI`: Läuft dort der Dev-Server eines anderen Projekts (so geschehen mit `fitness-app`), testet `npm run e2e` stillschweigend die falsche App und hängt. Vorschlag: eigener Port für dieses Projekt oder `reuseExistingServer: false`. Diese Session hat die Konfiguration nicht angefasst und mit einer temporären Konfiguration auf Port 5199 getestet.
- (AP-02) Auswahlfelder zeigen lange Optionstexte abgeschnitten ("Standarddepot (Kosten höch…", "Automatisch: 15 % auf den sozialabg…"). Lösung wäre kürzere Optionstexte (Texte: AP-11/AP-12).
- (AP-02) Annahmen-Seite auf dem Smartphone: Tabellen scrollen seitlich ("Gültig ab" angeschnitten) und die Zeilen sind sehr hoch (Ursache nicht untersucht, vermutlich die Mindestbreite von 14em in `.assumptions`). Lesbar, aber unschön; gehört zu AP-12.
- (AP-02) Segmentschalter "Pessimistisch | Neutral | Optimistisch" ist bei 320 px eng (Beschriftungen berühren fast die Ränder). Reicht für die Abnahme, passt besser in das neue Design (AP-08).
- (AP-02) Schaltflächen auf der Seite "Daten" ("Paar", "Paar mit Rentenlücke") sitzen ohne Abstand nebeneinander (`.btn` hat nur `margin-top`). Optik, AP-08.
- (AP-02) `theme-color` folgt nur der Systemeinstellung (`prefers-color-scheme`), nicht dem manuellen Hell/Dunkel-Umschalter der App. Für die Umschaltung per Hand müsste das Meta-Tag per Skript gesetzt werden (AP-03/AP-08).
- (AP-02) Textlinks (`.link`) und Checkboxen/Radios haben weiterhin weniger als 44 px Tippfläche (AP-02 verlangt es nur für `summary`, Schaltflächen, Eingaben, Menü-Taste, Segmentschalter).

- (AP-03) Die Bausteinseiten und `ViewSwitch` im Rentenplan zeigen die aktive Person weiter doppelt (Auswahlfeld in der Kopfzeile und Reiter "Haushalt, Anna, Ben"): U-E, gehört zu AP-09.
- (AP-03) `theme-color` folgt dem manuellen Hell/Dunkel-Umschalter weiterhin nicht (Backlog AP-02 bleibt offen): das Meta-Tag müsste per Skript gesetzt werden, passt zu AP-08.
- (AP-03) Das "Eingaben"-Blatt und die Seitenleiste führen die Seitenliste je einmal in `App.tsx` (`NAV`) und `MobileNav.tsx` (Seitengruppen). Bei neuen Seiten (AP-14/AP-19) an beiden Stellen nachziehen oder die Liste zusammenführen (AP-06/AP-08).
- (AP-03) Kein Wisch-nach-unten zum Schließen der Blätter (nur Schließen-Taste, Rand, Escape). Falls gewünscht, in AP-08.
- (AP-03) Der `webServer` in `playwright.config.ts` (Port 5173, `reuseExistingServer`) hat wieder mit einem fremden Dev-Server (`fitness-app`) kollidiert; E2E lief über eine temporäre Konfiguration auf Port 5199 (gelöscht). Siehe Backlog AP-02.

- (AP-04) `validateProfile` prüft nicht, ob `birthYear + lifeExpectancyAge` in der Vergangenheit liegt (Entscheidung des Autors: Backlog, nicht Teil von B-3).
- (AP-04) `BrowserWorkspaceStore.markExported` schluckt einen Schreibfehler weiter still. Folge: Die Exportmahnung bleibt bestehen, obwohl exportiert wurde. Die Klasse ist in `apps/web/src/workspaceStore.ts`; sie könnte `safeSetItem` nutzen.
- (AP-04) Nach `removePerson` schreibt der Unmount-Flush der entfernten Person ihre Schlüssel unter Umständen noch einmal (gleiches Verhalten wie vorher, da der Flush nach dem Entfernen läuft). Folge: verwaiste `pathwise.p.<id>.*`-Schlüssel, die der Export ignoriert (Warnung `unknown_person_blocks`). Nicht geprüft, ob es in der Praxis auftritt.
- (AP-04) Das Hinweisfeld der Exportmahnung hat keinen eigenen Platz auf Smartphone-Breite geprüft außer über die Overflow- und axe-Tests (sie laufen mit Beispieldaten, in denen die Mahnung sichtbar ist). Optik der gestapelten Leisten bei zwei gleichzeitig sichtbaren Hinweisen: AP-08.
- (AP-04) `git rm --cached components/LocalDataNotice.tsx` wurde versehentlich einmal ausgeführt (Datei ist ohnehin gelöscht); `git status` zeigt die Löschung als gestaged. Ohne Folgen für den Commit.
- (AP-05) Optionale ESLint-Regel gegen Importe quer durch Ordner nicht gebaut: Die Richtung steht in `docs/architecture.md`, ein Zyklen-Check lief als einmaliges Skript. Falls gewünscht, eigene kleine Session (`no-restricted-imports` je Ordner, keine neue Abhängigkeit).
- (AP-05) `shared/types.ts` mischt allgemeine Typen (`ScenarioName`, `ValidationIssue`) mit ETF-Typen (`EtfPlanInput`, `TaxAssumptions`); sauber wäre eine Trennung nach `etf/` (ändert Importe und `index.ts`-Reihenfolge, daher kein reines Verschieben).
- (AP-05) `pension/` hat 8 Dateien und ist der größte Ordner (`etfProjector` und `depot` über 370 Zeilen); eine Teilung (z. B. `pension/blocks`) wäre möglich, falls es unübersichtlich wird.
- (AP-05) `concept/`-Dokumente nennen Dateien teils nur mit Namen (z. B. `blocks.ts`) ohne Ordner; nur der volle Pfad in `12-…` wurde angepasst. `13-review-report.md` (Historie) bleibt unverändert.

- (AP-06) `e2e/robustness.spec.ts` "a person who retires in the past gets an error, not a household gap (B-3)" schlug im ersten Gesamtlauf vor dem Umbau einmal fehl und lief danach einzeln und im zweiten Gesamtlauf grün: vermutlich flackernd (nicht untersucht, Fehlerkontext lag in `test-results/`).
- (AP-06) Druck im Dunkelmodus: Der alte Druckblock überschrieb nur neun Farb-Tokens, die übrigen (u. a. `--accent-soft`, `--warn-soft`, Diagrammfarben) blieben bei manuellem Dunkel dunkel. Mit `light-dark()` setzt `color-scheme: light` im Druck jetzt alle Tokens auf Hell. Im Hellmodus unverändert; im Druck bei Dunkel nicht geprüft (kein Druckvorschau-Test).
- (AP-06) `light-dark()` braucht Safari ab 17.5, Chrome ab 123, Firefox ab 120; in älteren Browsern fehlten alle Farben. Falls die Zielbrowser älter sind: Rückfall auf zwei Dunkelblöcke.
- (AP-06) Tests in `apps/web/test/` bleiben flach (6 Dateien); sie spiegeln die neuen Ordner (`state/`, `lib/`) nicht. Bei mehr Tests nachziehen.
- (AP-06) Seiten dicht an der 300-Zeilen-Marke: `ProfilePage` 331, `DataPage` 321 (ein Komponentenblock, nicht geteilt), `DepotPage` 313, `EtfPage` 303, `OccupationalPage` 302, `HouseholdOverview` 370 (unter 400, nicht geteilt). Teilung wäre mehr als Verschieben (Komponenten extrahieren).
- (AP-06) Die Seitenliste steht weiter doppelt (`app/pages.ts` `NAV` und `MobileNav.tsx`, siehe Backlog AP-03); die Zusammenführung war kein reines Verschieben und blieb liegen.
- (AP-06) `components/cards/` enthält auch `ScrollTable`, `YearTable` und `Terms`, die in keine der vier Gruppen sauber passen; ein fünfter Ordner (`tables/`) wäre sauberer.
- (AP-06) Der Vite-Dev-Server hielt nach dem Löschen von `i18n/de.ts` (jetzt Ordner `i18n/de/`) den alten Pfad im Cache, bis er neu gestartet wurde. Nach dem Umbau einmal neu starten.
- (AP-07) Im Mockup sind AP-09-Fragen nur als Vorschlag gezeigt (eine Personenauswahl, keine in der Desktop-Seitenleiste); AP-09 entscheidet endgültig und legt dann auch fest, ob die Smartphone-Kopfzeile die Auswahl behält.
- (AP-07) `design-v2.html` braucht einen lokalen Webserver (JavaScript rendert Balken und Diagramme); `file://` im Browser-Pane zeigt nur einen statischen Schnappschuss. Ein Hintergrund-Server auf Port 5290 lief während der Session (endet mit dem Neustart).
- (AP-07) Segment-Beschriftungen in Balken erscheinen nur ab 64 px Breite, sonst nur Legende und Tabelle; in AP-08 als Regel in die Diagramm-Komponente übernehmen.
- (AP-07) Im Mockup fehlen: Fortschrittsmarken in der Seitenleiste (AP-13), Annahmen-Seite (AP-12), Rentner-Modus (AP-19). Der Bausteinpunkt in der Seitenleiste ist reine Farbzuordnung, kein Status.
- (AP-07) Lange Optionstexte (Backlog AP-02) im Mockup gekürzt ("Standarddepot (Kosten bis 1,0 %)"); Texte bei AP-11 nachziehen.

- (AP-08) Fokusring um die `h1` nach jedem Seitenwechsel (programmatischer Fokus aus AP-03) wirkt auf den Screenshots als großer Kasten; `h1:focus-visible` könnte dezenter sein oder nur bei Tastaturbedienung erscheinen.
- (AP-08) `theme-color` folgt weiter nur der Systemeinstellung, nicht dem manuellen Umschalter (Backlog AP-02/AP-03 bleibt offen): nicht aus dem Design ableitbar, braucht ein Skript.
- (AP-08) `EmptyState` und `KpiTile hero` sind gebaut, aber noch nirgends eingesetzt (Seiten: AP-09 bis AP-13). Das Seiten-Badge „Prognose, keine Garantie“ ist ein neutraler Chip ohne Icon und noch nicht rechts oben wie im Mockup (AP-09).
- (AP-08) Seitenleiste kennt nur die Gruppe „Bausteine“; das Mockup hat zusätzlich „Eingaben“ (Profil). Die Auswahl „Aktive Person“ bleibt, AP-09 entscheidet.
- (AP-08) Haushaltsdiagramme stapeln nach Person (Akzentfarbe + Muster); das Mockup zeigt Balken je Person nach Baustein. Falls gewünscht, eigenes Paket (Daten je Person × Baustein liegen im Kern vor, die Darstellung wäre neu).
- (AP-08) Legenden der Liniendiagramme (Recharts `Legend`) haben noch Standardgröße und -stil; ein eigener Legendenbaustein wie `ul.legend` wäre einheitlicher.
- (AP-08) Playwright-Konfiguration (Port 5173 mit `reuseExistingServer`) kollidierte wieder mit dem Dev-Server von `fitness-app`; Tests und Screenshots liefen über eine temporäre Konfiguration auf Port 5199 (gelöscht). Siehe Backlog AP-02.
- (AP-08) Kein Wisch-nach-unten zum Schließen der Sheets; der Griff am Sheet ist nur Dekoration.

- ~~(AP-09) U-G offen~~ in AP-10 erledigt: Der Hinweis zu geteilten Werten steht auf Profil und Annahmen weiter über der Überschrift (`PersonWorkspace`, `shared`); er gehört unter die Überschrift.
- (AP-09) Ein Unit-Test schlug einmal fehl, während parallel die E2E-Tests liefen; drei Wiederholungen waren grün. Welcher Test es war, wurde nicht ermittelt (vermutlich Last).
- (AP-09) Fokusring um die `h1` nach dem Seitenwechsel bleibt ein großer Kasten (siehe AP-08), jetzt auch bei Überschriften mit Person.
- (AP-09) `playwright.config.ts` steht weiter fest auf Port 5173; E2E lief über eine temporäre Konfiguration auf Port 5199 (gelöscht). Siehe Backlog AP-02.
- (AP-09) "Verlauf" ist im Rentenplan standardmäßig eingeklappt, damit das Höhenziel erreicht wird (Mockup: offen). Aufgeklappt wären es im Haushalt 1.930 px Desktop / 2.895 px Smartphone.
- (AP-09) Haushalt-Hero und Wunschfeld des Haushalts wurden ohne eigenes Mockup nach dem Muster der Person gebaut; "Details und Tabellen" zeigt das Mockup nur als Zeile.
- (AP-09) Auf dem Smartphone stehen Hero-Zahl und Chip untereinander und der Druckknopf erscheint auch dort; Optik prüfen (AP-13).
- (AP-12) Das Prüfprotokoll steckt weiter als Freitext in `sourceDe` in `config/`; die Oberfläche trennt es per Parser (`lib/sourceText.ts`). Sauberer wäre ein eigenes Datumsfeld in `config/` (ändert Inhalte dort, braucht die Zustimmung des Autors). Der Hinweis auf die Website gesetze-im-internet.de erscheint nicht mehr in der Oberfläche.
- (AP-12) Aufgeklappte Bereiche der Annahmen-Seite sind hoch (Steuern und Depot, Quellen je Wert mit 44-px-Aufklapper): auf dem Smartphone rund 7.600 px mit allem offen. Falls gewünscht: Werte als kompakte Tabelle ab 640 px.
- (AP-12) Die Quellen-Aufklapper nutzen das Standard-Dreieck (`mobile.spec.ts` verlangt die Markierung), die übrigen Zeilen den Pfeil rechts; optisch uneinheitlich.
- (AP-12) Druckansicht der Annahmen-Seite nicht geprüft (Zeilen werden beim Drucken geöffnet, Quellen je Wert nicht).
- (AP-12) Playwright löscht `test-results/` bei jedem Lauf, auch bei Einzelläufen; Screenshots für die Abnahme daher in `playwright-report/` ablegen.
- (AP-12) Hilfetexte nennen feste Beträge (siehe Backlog AP-11); die Annahmen-Seite zeigt die Werte jetzt aus `config/`, die Hilfetexte bleiben davon getrennt.
- (AP-13) Der Rentenplan-Chip "ETF-Sparplan: zählt ab Alter 67" zählt die ETF-Vorgabewerte mit, die Seitenleiste zeigt den ETF-Sparplan dann "leer" (unverändert gegenüber den Vorgaben). Ein Chip "Vorgabe" wäre eine kleine Textänderung.
- (AP-13) "Leer" bei Profil und ETF heißt "unverändert gegenüber den Vorgaben": Wer genau die Vorgaben (40 Jahre alt, Rentenalter 67, ETF 250 €) bewusst übernimmt, sieht "leer". Ein gespeichertes "bestätigt" würde das ändern, braucht aber ein neues Datenfeld.
- (AP-13) Sparziele (`GoalList`) haben ihren eigenen leeren Zustand und nutzen `EmptyState` noch nicht; Druckansicht und Browser außer Chrome nicht geprüft.
- (AP-13) Die Seitenliste steht weiter in `app/pages.ts` (`NAV`) und `MobileNav.tsx` (Backlog AP-03/AP-06); die Sidebar ist von 248 auf 272 px gewachsen.

- (AP-14) Die Seitenliste muss für die neue Seite `#other` wieder an zwei Stellen nachgezogen werden (`app/pages.ts` `NAV` und `MobileNav.tsx`, Backlog AP-03/AP-06); Zusammenführung weiter offen.
- (AP-14) `docs/design.md` kennt `--b-oth` noch nicht (Tabelle der Bausteinfarben, Diagramme); in AP-15 zusammen mit `tokens.css` und `tokenContrast.test.ts` nachziehen. Kontrastwerte stehen im Mockup (5,50:1 hell, 9,87:1 dunkel gegen die Karte).
- (AP-14) `12` nennt `Workspace.schemaVersion: 1` als Literal und eine leere Migrationskette; mit Version 2 ändern sich Format-Golden, Beispieldateien und der Typ in `workspace.ts` (AP-15).
- (AP-14) Im Mockup sind Beschriftungen auf den schraffierten Segmenten (Person 2) knapp lesbar; die Diagrammkomponente prüft das in AP-15 mit.
- (AP-14) Der bestehende Pauschbetrag für Renteneinkünfte (102 €) in `retirementIncomeTax` wird nicht danach unterschieden, ob eine Einkunft rentenartig ist (relevant erst mit Mieten); siehe `07` Punkt 14.
- (AP-14) Mockups mit JavaScript (auch `sonstige-einkuenfte.html`) brauchen einen lokalen Webserver (Hinweis AP-07); `file://` zeigt nur das leere Gerüst.

- (AP-15 A) Bekannte Einschränkungen (auf Wunsch des Autors nicht gebaut, in `docs/assumptions.md` genannt): kein Versorgungsfreibetrag für Pensionen (`15` §14 Nr. 4, die Pension wird zu hoch besteuert), keine Ertragsanteil-Tabelle für private Leibrenten (Nr. 7, der Anteil wird selbst eingetragen), keine Abgaben auf den weitergezahlten Anteil an Hinterbliebene (Nr. 3). Alle Regelannahmen in `config/other-income-de.json` sind `unverified` (Nr. 6, vor einem Release gegen Primärquellen prüfen, `07` Punkt 14).
- (AP-15 A) Der Pauschbetrag für Renteneinkünfte (102 €) gilt für die Summe, auch bei reiner Miete (`15` §14 Nr. 5). Entschieden: nur Hinweis `rent_allowance_not_applicable`. Eine echte Aufteilung bräuchte ein Feld je Eintrag (z. B. "rentenartig") und eine Änderung an `retirementIncomeTax`; sie widerspräche der Entscheidung (k), dass die Art nur Vorbelegung ist.
- (AP-15 A) Pflege-Freigrenze der gemeinsamen Schwelle: Überschreiten um einen Cent schaltet den Pflegebeitrag auf die ganze Summe ein (Sprung um etwa 7 € im Netto); Folge: Netto ist im Betrag nur ohne `likeOccupational` monoton. Das ist die Regel der Config (alles oder nichts), die UI sollte es bei `likeOccupational` nennen (Teil B).
- (AP-15 A) Die bAV-Seite zeigt weiter den Einzelwert (`15` §14 Nr. 2); der Hinweis `shared_occupational_threshold` kommt nur aus der Gesamtsicht. Sobald ein Eintrag mit `likeOccupational` aktiv ist, rechnet die Gesamtsicht die bAV in Kaufkraft heute gegen die Summe; im Verlauf weicht das leicht von der Einzelrechnung ab (Skalierung mit dem Aktivitätsfaktor). `concurrentIncome` kennt die Gruppe nicht (betrifft nur die Steuer der Einzelseiten).
- (AP-15 A) Status `ended` gibt es nur für Einträge (`otherIncome:*`). Bestehende Produkte (bAV, Depot, ETF) mit einem Ende vor dem Rentenbeginn bleiben `included` mit Faktor 0, damit sich kein bestehendes Ergebnis ändert; falls gewünscht, auch dort `ended` (ändert Status, nicht Zahlen).
- (AP-15 A) Der weitergezahlte Anteil erscheint im Verlauf der überlebenden Person als Produkt `otherIncome:survivor:<person>:<eintrag>` und damit in deren `products` und `byPersonProduct`; die Oberfläche muss diese Produkte zu "Sonstige Einkünfte" zusammenfassen und die Statuszeilen darunter nicht als eigene Quelle zeigen (Teil B). Liegt der erste Todesfall vor dem Rentenbeginn der überlebenden Person, zählt der Anteil erst ab deren Pfad (Zeitachse der Person beginnt am Rentenbeginn); bei Altersunterschieden unter 20 Jahren kommt das nicht vor.
- (AP-15 A) Als anrechenbares Einkommen bei der Witwenrente zählen alle Einträge der überlebenden Person (Entscheidung des Autors vom 2026-11-23, Regel `survivorIncomeCredited`, ungeprüft); `15` §4.2 nannte nur den weitergezahlten Anteil, §9 die eigenen Einkünfte.
- (AP-15 A) `tools/generate_golden.py` schreibt die JSON-Dateien unformatiert; der Repo-Stand ist mit Prettier formatiert. Nach jedem Lauf `npx prettier --write packages/core/test/golden-vectors`, sonst zeigt `git status` scheinbar geänderte Vektoren. Mit Formatierung sind alle bestehenden Vektoren (`s`, `o`, `h`, `e`, `gs` und die übrigen) bitgleich zum Stand vor AP-15.
- (AP-15 A) Die Excel-Formeln der neuen Blätter (`oi01`–`oi08`) wurden einmalig mit einer unabhängigen Formel-Engine (Python-Paket `formulas`, nicht Teil des Repos) gegen die Python-Werte gerechnet: alle Differenzspalten 0, Status-Spalten gleich. Das ersetzt nicht die Stichprobe des Autors in Excel.
- (AP-15 A) Ein Unit-Test schlug einmal im Gesamtlauf nach einer Dateiänderung fehl (Prettier schrieb parallel); drei bis fünf Wiederholungen waren grün, nicht reproduziert (siehe AP-09).
- (AP-15 B) Die Fehlermeldung eines ungültigen Eintrags im Rentenplan nennt den Namen des Eintrags (`entryNames`), die Gesamtsicht kennt aber weiterhin nur "Sonstige Einkünfte" als Produktname; die Verlaufstabelle zeigt je Eintrag eine Spalte mit dem Namen.
- (AP-15 B) Mehrere `unverified:otherIncome.*` erscheinen als **eine** wichtige Zeile ("Ungeprüfter Rechtswert verwendet: A; B; C", `mergeOtherIncomeRules`), damit die Haushaltsseite am Handy nicht um fünf Zeilen wächst; trotzdem steigt ihre Höhe mit dem Paar-Beispiel (Wächter 2.400 → 2.550 px). Wenn die Seite wieder kürzer werden soll: die vier Depot-Hinweise ebenfalls zusammenfassen (neuer Punkt).
- (AP-15 B) Das Formular eines Eintrags hat bis zu 12 Felder in vier eingeklappten Gruppen (`15` §14 Nr. 8); am Handy lang, aber ohne Überlauf (E2E `mobile.spec.ts`). Nach Nutzung erneut bewerten.
- (AP-15 B) Im Haushaltsdiagramm (Person × Baustein) gibt es keine Bausteinfarben, nur Personenmuster; `--b-oth` erscheint daher nur im Rentenplan, in der Seitenleiste und auf der Seite selbst. Die Spalte "Sonstige Einkünfte" im Haushalt steht nur in der Tabelle.
- (AP-15 B) Die bAV-Seite zeigt ihren Einzelwert weiter; der Hinweis `shared_occupational_threshold` steht nur auf der Seite "Sonstige Einkünfte" und im Rentenplan (Info).
- (AP-15 B) `window.confirm` beim Entfernen eines Eintrags ist ein Browserdialog (wie bei keiner anderen Seite; dort gibt es `ConfirmDialog`); bei Gelegenheit auf `ConfirmDialog` umstellen.
- (AP-15 B) Auf der Seite fehlt eine Aktion "Eintrag duplizieren" und das Umsortieren der Einträge; Reihenfolge = Anlegereihenfolge.
- (AP-15 A) Die neuen Texte in `i18n/de` (`issues.ts`, `overview.ts` "Sonstige Einkünfte"/"Ende vor dem Rentenbeginn", `data.ts`) sind Platzhalter, damit der Build typsicher bleibt und der Import-Dialog den Block benennt; Teil B überarbeitet sie mit der Seite. `RetirementOverview` zeigt für Einträge noch keinen Link zur Seite (`pageOf`).

## 9. Entscheidungen des Autors

Stand 2026-11-22. Entschieden = in den Paketen eingearbeitet.

| # | Frage | Antwort des Autors | Wirkung |
|---|---|---|---|
| 1 | Git lokal jetzt (AP-01) | **Ja.** Der Autor legt das Repo an und gibt der Session den Link, wenn sie fragt. **Committen und Pushen macht nur der Autor**, nach jeder Session, in GitHub Desktop. Es muss der **private** SSH-Zugang gelten (zwei Konfigurationen: Arbeit und privat), der Link ist entsprechend anzupassen. | AP-01 neu geschnitten, Git-Regeln in Abschnitt 0, AP-17 |
| 2 | Ordnerumbau (AP-05, AP-06) | **Einverstanden**, Vorschlag aus 2.4. | Entschieden |
| 3 | Personen, die schon in Rente sind | **Ja, einbauen.** | Neu: AP-19 (Konzept, Mockup), AP-20 (Kern, Web); AP-04 liefert vorerst nur die Meldung |
| 4 | Sparziele aus dem Rentenplan nehmen, alten ETF-Endwert entfernen (AP-09) | **Ja**, wie vorgeschlagen (nur Link statt Karte, alter ETF-Endwert entfällt). | AP-09 setzt es um |
| 5 | Smartphone-Navigation | **Untere Tab-Leiste.** | AP-03 und AP-07 angepasst |
| 6 | Generischer Baustein (AP-14) | **Ja.** Gemeint: ein wiederverwendbarer Eintragstyp "Sonstige Einkünfte im Alter", der viele Fälle abdeckt (Riester, private Rente, Mieteinnahmen, Pension), statt je einen eigenen Baustein. | AP-14 und AP-15 bleiben |
| 7 | Zusammenveranlagung (AP-16) | **Ja, anbieten.** Single sollen sofort das richtige Ergebnis haben; für Paare ist es ein Schalter (siehe AP-16, Verhalten). Zeitpunkt: nach P2. | AP-16 freigegeben (Einstufung P3) |
| 8 | Release: Name, Urheber, Präfix, privat/öffentlich, Hosting, Archivdatei, `CLAUDE.md` | **Später.** AP-17 fragt den Autor am Anfang selbst. **Ausnahme Name:** Der Autor klärt den App-Namen vorab in einer eigenen Session (Arbeitstitel "Pathwise" ist unbefriedigend). | AP-17 als letzte Session; Namenssession siehe unten |

**Namenssession (Autor, vor AP-01 oder parallel):**
- Der **Repository-Name auf GitHub** hängt nicht am App-Namen und blockiert AP-01 nicht: Er kann zunächst neutral sein (z. B. der Ordnername `finanz-app`) und später in GitHub umbenannt werden. Dann ändert sich nur der Remote-Link (`git remote set-url`, GitHub leitet zusätzlich weiter).
- Wo der App-Name steckt: Config/README (zentral, billig zu ändern), aber auch der **Speicher-Präfix `pathwise.`** im Browser (`pathwise.household.v2`, `pathwise.p.<id>…`), Dateinamen beim Export, Archivdatei im Wurzelordner. Ändert sich der Präfix, braucht es eine kleine **Migration** (alte Schlüssel lesen, unter neuem Namen speichern), sonst sind bestehende Daten im Browser unsichtbar. Alternative: Präfix bewusst **behalten**, auch wenn der App-Name wechselt (intern, Nutzer sehen ihn nicht).
- Ergebnis der Namenssession hier eintragen: neuer Name, Präfix ändern ja/nein. Falls ja, kommt ein eigenes kleines AP ("Umbenennung") **vor AP-05/AP-06** (weil es Dateien in `apps/web` und `packages/core` berührt) und wird in Abschnitt 4 eingetragen.
- **Ergebnis (2026-11-22, AP-05-Session):** Neuer App-Name **Valiva**, "überall verwenden" (Anzeigename, Paketnamen `@pathwise/*`, Config, README, Doku). **Entschieden (Umbenennungs-Session):** Speicher-Präfix wechselt auf `valiva.*` mit Migration der alten Schlüssel; Export-Kennung wechselt hart auf `valiva-workspace` (alte Sicherungen mit `pathwise-workspace` lassen sich nicht mehr importieren). Entscheidung des Autors: **erst Umbenennung, AP-05 danach, in neuer Session.** Das Umbenennungs-AP lief als AP-05a (Abschnitt 4 und Session-Protokoll). AP-05 war bis dahin zurückgestellt; die Zuordnung der Dateien (Quellcode und Tests) hat der Autor bereits freigegeben, siehe Session-Protokoll.

---

## 10. Session-Protokoll (jede Session hängt hier einen Eintrag an)

Format: `JJJJ-MM-TT – AP-xx – was gemacht – Abweichungen – was offen blieb – Commit-Vorschlag`

- 2026-11-22 – Review erstellt (kein AP). Befunde in Abschnitt 2, Pakete AP-01 bis AP-18. Nichts davon umgesetzt.
- 2026-11-22 – Entscheidungen des Autors eingearbeitet (Abschnitt 9). Neu: AP-19/AP-20 (Rentner-Modus), AP-01 und Git-Regeln (nur der Autor committet), AP-03/AP-07 (untere Tab-Leiste), AP-16 zurückgestellt, AP-17 fragt Release-Entscheidungen selbst. Frage 4 und 7 offen. Kein Code geändert.
- 2026-11-22 – Entscheidungen nachgetragen: Frage 4 ja (Sparziele raus aus Rentenplan), Frage 7 ja (Splitting als ausdrückliche Paar-Frage, Single unberührt, kein stilles Vorbelegen). Name der App wird in separater Session des Autors geklärt; Repo-Name blockiert AP-01 nicht. Kein Code geändert.

- 2026-11-22 – AP-01 – Datenscan (keine echten Nutzerdaten, keine Schlüssel; Treffer nur Testcode für Import-Härtung; Beispiele `synthetic`, xlsx-Metadaten ohne Autor; `settings.local.json` ignoriert); `.gitignore` geprüft, unverändert; `git init -b main`, `origin` = `git@github.com-privat:antoniotroiano/valiva-app.git` (privater Alias aus `~/.ssh/config`, auf Wunsch des Autors gelesen, Schlüssel nicht angefasst), kein `add`/`commit`/`fetch`/`push`; `CLAUDE.md` und `CONTRIBUTING.md` angepasst; `apps/web/src/arningText.ts` gelöscht (B-8); 70 Notizen aus `PROGRESS.md` wortgleich nach `concept/PROGRESS-notes-archive.md` (per `cmp` geprüft), `PROGRESS.md` von 68 KB auf 20 KB; `typecheck`, `lint`, `format:check` und 547 Tests grün (kein E2E, keine UI-Änderung). Commit-Identität erst nicht, auf Wunsch des Autors dann doch lokal gesetzt (`user.name`, noreply-`user.email`). Offen: erster Commit, Tag `baseline-2026-11-22`, Push durch den Autor; erst danach AP-02. Commit-Vorschlag: `chore: prepare local git repository, add contribution rules and archive progress notes`. Geänderte Ordner: Wurzel (`CLAUDE.md`, `CONTRIBUTING.md`, neu `.git/`), `concept/` (`PROGRESS.md`, `PROGRESS-notes-archive.md`, dieser Bericht), `apps/web/src/` (eine leere Datei gelöscht).

- 2026-11-22 – AP-02 – Ursachen behoben: `.grid`/`.target-grid` einspaltig mit `minmax(0, 1fr)`, `min-width: 0` für Grid-Kinder, `.card`, `fieldset`; `.input-row`-Felder schrumpfbar (Sparziele: Schaltfläche "Datum entfernen" sprengte die Breite). Neue Komponente `ScrollTable` (`role="region"`, `tabIndex=0`, `aria-label`) ersetzt alle Tabellen-Wrapper, auch die schon vorhandenen `.table-wrap` (waren nicht fokussierbar); lange Tabellenüberschriften brechen um und bleiben beim Seitwärtsscrollen stehen. Eingaben 16 px, Tippflächen mindestens 44 px (`summary`, `.btn`, Menü-Taste, Eingaben, Segmentschalter; auf Smartphone-Breite), Segmentschalter füllt die Breite. `theme-color` hell/dunkel, `viewport-fit=cover`, `env(safe-area-inset-*)` für Kopfleiste und Inhalt. Neuer `e2e/mobile.spec.ts` (22 Tests: 10 Seiten × hell/dunkel bei 375 px, Rentenplan und Depot bei 320 px; prüft Seitenbreite, fokussierbare Scrollbereiche, 16 px, 44 px, Aufklapp-Dreiecke). Sichtprüfung 375 px (alle zehn Seiten) und 320 px (Rentenplan, Depot), hell und dunkel, per Screenshot: nichts abgeschnitten außer bewusst scrollenden Tabellen und langen Auswahltexten (Backlog). Eigene Regression beim Bauen gefunden und behoben: `display: flex` auf `summary` entfernte das Aufklapp-Dreieck. Gemessen vorher: bis 679 px, nachher überall = Fensterbreite. `typecheck`, `lint`, `format:check`, 547 Unit-Tests grün; E2E 98/98 grün, aber über temporäre Konfiguration auf Port 5199, weil Port 5173 von einem fremden Dev-Server (`fitness-app`) belegt war (Backlog). Abweichungen: `ScrollTable` auch für die bereits gewrappten Tabellen (Konzept nannte nur die ungewrappten); Backlog um sieben Punkte ergänzt. Offen: Commit durch den Autor; AP-03 kann folgen. Commit-Vorschlag: `fix(web): repair phone layout (grid min-width, ScrollTable, 16px inputs, 44px targets) and add mobile e2e test`. Geänderte Ordner: `apps/web/` (`index.html`, `src/styles.css`, `src/components/`, `src/pages/`), `e2e/` (neu `mobile.spec.ts`), `concept/` (dieser Bericht, `PROGRESS.md`).

- 2026-11-22 – AP-03 – Mockup `docs/mockups/mobile-nav.html` vom Autor mit "Ja, bauen" freigegeben; Rückfragen vorab: "Eingaben" öffnet ein Blatt (Profil, vier Bausteine, Sparziele), "Mehr" enthält Annahmen, Daten, Darstellung; Leiste bis 900 px (wie das bisherige einspaltige Layout). Umgesetzt: Seitenwechsel scrollt sofort nach oben (kein weiches Scrollen, also auch mit `prefers-reduced-motion`) und fokussiert die sichtbare `h1` (`tabIndex=-1`; wartet bei lazy geladenen Seiten, weil React die alte Seite versteckt im DOM lässt); `document.title` "Seite – Pathwise" (`de.nav.pageTitle`, Name aus `appConfig` über `de.appName`); neue Komponente `MobileNav` (schmale Kopfzeile mit Name und Auswahlfeld "Aktive Person", feste untere Leiste mit Rentenplan, Eingaben, Haushalt, Mehr, mindestens 56 px plus `env(safe-area-inset-bottom)`, Inhalt bekommt unten gleich viel Abstand); Blätter liegen über der Leiste, schließen nach Auswahl, per Escape, Schließen-Taste und Rand, Fokus kehrt zur Taste zurück, aktives Ziel hat `aria-current`, Seite dahinter ist `inert`. Das alte Hamburger-Menü entfällt (Texte `nav.menu`/`nav.close` entfernt). Es wird immer nur eine der beiden Navigationen gerendert (`useNarrowScreen`), sonst gäbe es doppelte Beschriftungen. Skip-Link: war ein Fehler (`#main` wurde vom Hash-Router als unbekannte Seite gelesen und sprang zum Rentenplan), jetzt Fokus auf `main` ohne Hash-Änderung. Neuer `e2e/navigation.spec.ts` (16 Tests: Scroll, Fokus, Titel, Leiste, Blätter, Escape, Fokus-Rückgabe, inert, Personenwechsel, Skip-Link, axe mit und ohne Blatt, hell und dunkel). Sichtprüfung 375 px hell und dunkel (Rentenplan, beide Blätter) per Screenshot. `typecheck`, `lint`, `format:check`, 547 Unit-Tests grün; E2E 114/114 grün, aber über temporäre Konfiguration auf Port 5199 (Port 5173 von `fitness-app` belegt, Backlog). Abweichungen: (1) Blatt ist nicht-modal (`role="dialog"` ohne `aria-modal`), damit die Leiste bedienbar bleibt; stattdessen `inert` auf Inhalt und Kopfzeile. (2) Nach einer Auswahl steht der Fokus auf der neuen Überschrift (B-2), nicht auf der "Mehr"-Taste; dorthin kehrt er bei Abbruch zurück. (3) Zusätzlich Darstellung (Hell/Dunkel/System) in "Mehr" und Personenauswahl in der Kopfzeile, beides im Mockup gezeigt. Offen: Commit durch den Autor; Backlog um vier Punkte ergänzt. Commit-Vorschlag: `feat(web): add phone bottom tab bar with sheets, scroll reset, heading focus and page titles`. Geänderte Ordner: `apps/web/` (`src/App.tsx`, `src/components/MobileNav.tsx` neu, `src/i18n/de.ts`, `src/styles.css`), `e2e/` (neu `navigation.spec.ts`), `docs/mockups/` (neu `mobile-nav.html`), `concept/` (dieser Bericht, `PROGRESS.md`).

- 2026-11-22 – AP-04 – Rückfragen vorab, Antworten des Autors: Rentenbeginn im laufenden Jahr bleibt gültig; Lebenserwartung in der Vergangenheit ins Backlog; Exportmahnung nach 90 Tagen, "Später" blendet sie 7 Tage aus; ein Import zählt nicht als Export. **B-3 Ursache:** `validateProfile` prüft Geburtsjahr und Rentenalter nur einzeln; die Prüfung "Rentenbeginn in der Vergangenheit" steckt nur in den Baustein-Validatoren, dort wird ein Fehler nur zu `status: 'invalid'`, und `householdOverview` addiert ungültige Bausteine als 0 € zu einem scheinbar gültigen Ergebnis (Lücke = voller Wunsch). **Abweichung vom Vorschlag im Bericht:** Die Regel steht nicht in `validateProfile`, sondern in der neuen Funktion `validateRetirementTiming` (Code `retirement_in_past`), die nur `overview`, `householdOverview` und das Profilformular aufrufen. Grund: `validateProfile`/`validateHousehold` schützen auch das Laden gespeicherter Daten (`parseHouseholdState`) und den Import; eine vom Kalender abhängige Regel dort würde einen gespeicherten Haushalt zum Jahreswechsel still verwerfen und durch Standardwerte ersetzen (Regressionstest dafür vorhanden). Gespeichert wird eine solche Person weiter, die Fehler stehen am Feld. Rentner-Modus nicht gebaut, die Meldung sagt, dass er folgt (AP-19/AP-20). **Umgesetzt:** B-3 (Kern, Profilfeld, Rentenplan Person mit Hinweisen statt Ergebnis, Haushaltsansicht mit Name und Sprung zum Profil der Person); B-4 zentrale `safeSetItem`/`safeRemoveItem` (`storageStatus.ts`), alle `catch { /* ignore */ }` in Hooks, `onboarding.ts`, Theme-Schalter und `EtfTargetSection` umgestellt, dauerhafte Warnleiste; B-5 `storage`-Listener mit Leiste "Neu laden / Ignorieren" (Flush ist währenddessen aus, damit "Neu laden" die andere Änderung nicht überschreibt); B-6 `useFlushOnHide` bei `pagehide` und `visibilitychange`, in `usePersist` und für den Haushalt; B-7 Nebenwirkung aus dem Updater gezogen; B-9 `todayLocal()` in `format.ts`, drei Stellen umgestellt; B-10 Exportmahnung (`exportReminder.ts`, `AppNotices.tsx`) ersetzt die alte einmalige `LocalDataNotice` (Komponente, Text und Schlüssel `pathwise.localNoticeDismissed` entfernt); alle drei Leisten nutzen die vorhandene Klasse `.notice` (`.info` für die Mahnung), stehen oben im Inhalt über der Überschrift, die Mahnung erscheint nicht auf der Seite "Daten" und nicht beim ersten Start; im Druck ausgeblendet. **B-10 Quelle:** WebKit, [Tracking Prevention in WebKit](https://webkit.org/tracking-prevention/) und [Full Third-Party Cookie Blocking and More](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/): Safari löscht schreibbaren Speicher (u. a. `localStorage`) nach 7 Tagen Safari-Nutzung ohne Interaktion mit der Seite; Home-Bildschirm-Web-Apps sind ausgenommen; der Text sagt nur "kann löschen". **Fehler beim Bauen, vom E2E-Test gefunden:** der neue `pagehide`-Flush überschrieb beim Import/Zurücksetzen (danach Neuladen) die frisch ersetzten Daten mit dem alten Zustand; behoben durch `suspendPersistence()` in `DataPage`. **Tests:** Kern `retirementTiming.test.ts` (7), Web `storageStatus.test.ts` (10: Speicherfehler, Mahnung, `todayLocal`, `suspendPersistence`), E2E `robustness.spec.ts` (8; Hook-Tests als Funktionstests ohne Render-Umgebung, da es kein jsdom gibt); `welcome.spec.ts` angepasst (neue Mahnung statt alter Hinweiszeile). `typecheck`, `lint`, `format:check` sauber, 565 Unit-Tests und 122 E2E-Tests grün (E2E über temporäre Konfiguration auf Port 5199, wieder gelöscht, siehe Backlog AP-02: auf 5173 läuft der Server des `fitness-app`). Nicht geprüft: Verhalten in echtem Safari, Speichervoll in einem realen Browser (nur simuliert). Offen: Commit durch den Autor. Commit-Vorschlag: `fix: reject retirement in the past, surface storage failures and add export reminder`. Geänderte Ordner: `packages/core/` (`src`, `test`), `apps/web/` (`src`, `test`), `e2e/`, `concept/` (Bericht 14, `PROGRESS.md`).

- 2026-11-22 – AP-05 – **nicht umgesetzt, nichts verschoben.** Voraussetzungen geprüft: AP-01 und AP-04 erledigt und committet, `git status` sauber; Testzahl seit AP-04 565 statt 547. Rückfrage zum App-Namen: Der Autor nennt **Valiva** und will den Namen überall verwenden; Umbenennung kommt **vor** AP-05 (eigenes kleines AP, noch nicht geschnitten; offen: Speicher-Präfix `pathwise.*` wechseln mit Migration oder intern behalten). **Freigegebene Zuordnung für AP-05 (Quellcode `packages/core/src`):** `shared/` = types, months, issues, profile; `tax/` = taxConfig, legalConfig, tax, incomeTax, retirementTax; `etf/` = etf, advanceLumpSum, calculate, validation; `goals/` = goal, goalTypes, goalValidation, etfTarget, solver; `pension/` = statutory, depot, occupational, payout, netPension, projection, allowance, etfProjector; `overview/` = overview, householdOverview, gapSolver, householdGapSolver; `household/` = household, householdMigration; `workspace/` = blocks, workspace; `index.ts` bleibt. Abweichungen von 2.4 (alle aus den realen Importen, per Skript zyklenfrei geprüft): profile nach `shared` (sonst hängt `pension` an `household`), validation nach `etf` (validiert `EtfPlanInput`), solver und etfTarget nach `goals` (solver importiert `goalTypes`), projection und etfProjector nach `pension` (sonst importiert `etf` aus `pension`), allowance nach `pension` (Altersvorsorgedepot-Zulage, nur von `depot` genutzt). Richtung: `shared ← tax ← etf ← goals/pension`, `household ← shared`, `overview` über goals/household/pension, `workspace` ganz oben. **Tests (`packages/core/test`):** `shared/` = retirementTiming; `tax/` = tax, incomeTax, retirementTax; `etf/` = etf, advanceLumpSum, advanceGolden, golden; `goals/` = goal, goalShared, goalGolden, etfTarget, goalFixtures.ts; `pension/` = pension, depot, depotGolden, occupational, occupationalGolden, statutoryGolden, etfProjector, etfPayoutGolden, withdrawal, withdrawalGolden; `overview/` = overview, overviewGolden, gapSolver, householdOverview, householdGapSolver, householdGolden, householdSurvivor; `household/` = household, householdMigration; `workspace/` = blocks, workspace; `fixtures.ts`, `pensionFixtures.ts` und `golden-vectors/` bleiben in `test/` (Ladepfade `'..', 'golden-vectors'`, Config `'../../../../config'`). Ohne ESLint-Querimport-Regel (optional im AP). Offen: Umbenennung, danach AP-05 in neuer Session. Commit-Vorschlag: `docs: record app name Valiva and approved core folder mapping for AP-05`. Geänderte Ordner: `concept/` (dieser Bericht).

- 2026-11-22 – AP-05a (Umbenennung auf Valiva, auf Wunsch des Autors vor AP-05) – Rückfragen vorab, Antworten: Speicher-Präfix **wechseln** (mit Migration), Export-Kennung **hart** auf `valiva-workspace`. Umgesetzt: Anzeigename (`APP_NAME`, `index.html`, Titel), Paketnamen `valiva`, `@valiva/core`, `@valiva/web` (alle Importe, `package-lock.json`, `playwright.config.ts`, `.claude/launch.json`, `node_modules` per `npm install --offline` neu verlinkt), Speicherschlüssel `valiva.*`, Export-Kennung und Dateiname `valiva-…workspace.json`, drei Beispieldateien in `examples/`, Tests und E2E, `README.md`, `CLAUDE.md`, `docs/`, Mockups, `concept/01` bis `12` und `concept/README.md`. **Bewusst nicht geändert** (Geschichte): `concept/13-review-report.md`, `concept/PROGRESS-notes-archive.md`, die Notizen in `PROGRESS.md` und der Text dieses Berichts (Befunde, AP-Texte und Protokolleinträge nennen weiter "Pathwise"/`pathwise.*`). **Neu:** `apps/web/src/storagePrefixMigration.ts` (`migrateStoragePrefix`, läuft in `main.tsx` vor dem ersten Lesen; kopiert `pathwise.*` nach `valiva.*`, vorhandene neue Schlüssel gewinnen, alte werden erst nach vollständigem Kopieren entfernt, bei Schreibfehler bleibt alles und der nächste Start versucht es erneut, wirft nie; die alten Einzelpersonen-Schlüssel `pathwise.*.v1` werden mit migriert, die bestehende Migration nach "Person 1" findet sie danach unter `valiva.*.v1`), 7 Unit-Tests und 1 E2E-Test. **Abweichung:** Das war ein Verhaltens-Paket (Migration), kein reines Umbenennen. Prettier hat 5 Dateien neu umbrochen (kürzerer Name). `typecheck`, `lint`, `format:check`, Build grün; 572 Unit-Tests (565 + 7 neue) und 123 E2E-Tests (122 + 1 neue) grün, E2E über temporäre Konfiguration auf Port 5199 (5173 ist von einem fremden Server belegt, siehe Backlog AP-02), danach gelöscht. **Nicht geprüft:** Migration in einem echten Browser mit echten alten Daten (nur Test mit Beispielschlüsseln); die GitHub-Repo-Umbenennung (`valiva-app` heißt schon so) und der Ordnername `finanz-app` blieben unberührt. Offen: Commit durch den Autor, danach AP-05 in neuer Session (Zuordnung ist freigegeben). Commit-Vorschlag: `refactor: rename app to Valiva, migrate storage prefix to valiva.* and switch workspace format to valiva-workspace`. Geänderte Ordner: Wurzel (`package.json`, `package-lock.json`, `CLAUDE.md`, `README.md`, `playwright.config.ts`, `.claude/`), `apps/web/` (`src`, `test`, `index.html`, `package.json`), `packages/core/` (`package.json`, ein Kommentar), `e2e/`, `examples/`, `docs/`, `concept/`.

- 2026-11-22 – AP-05 – Voraussetzungen geprüft (AP-01, AP-04, AP-05a erledigt und committet, `git status` vor dem Start sauber; Basis 572 Unit-Tests und 123 E2E-Tests). Zuordnung wie im Eintrag oben freigegeben und umgesetzt: 34 Dateien in `packages/core/src` in 8 Ordner (`shared`, `tax`, `etf`, `goals`, `pension`, `overview`, `household`, `workspace`), 35 Testdateien in dieselben Ordner (`test/<ordner>/`); `fixtures.ts`, `pensionFixtures.ts` und `golden-vectors/` bleiben in `test/`, `goalFixtures.ts` liegt in `test/goals/`. Mit `mv` verschoben (kein `git mv`, kein `git add`), relative Importe, `index.ts` (gleiche Exporte in gleicher Reihenfolge), Testimporte (`../../src`, `../pensionFixtures`), Ladepfade der Golden-Tests (`'..', 'golden-vectors'`) und Config-Pfade (`../../../../config`) angepasst. `tools/generate_golden.py` brauchte keine Änderung (Golden-Vektoren liegen unverändert in `packages/core/test/golden-vectors`); Verweise: `concept/12` (Pfad von `workspace.ts`) und `README.md` (Link auf die neue `docs/architecture.md`). Neu: `docs/architecture.md` (Ordnerkarte, Abhängigkeitsrichtung, Datenfluss). **Abweichungen von 2.4:** wie im Eintrag oben (profile → shared, validation → etf, solver und etfTarget → goals, projection, etfProjector und allowance → pension); keine ESLint-Regel (optional, Backlog). **Beweis:** `typecheck`, `lint`, `format:check`, Build grün; 572 von 572 Unit-Tests wie vorher (Anzahl der Testdateien 39 wie vorher); E2E 123 von 123 (temporäre Konfiguration auf Port 5199, gelöscht); ein Skript hat jede verschobene Datei gegen eine Kopie vor dem Verschieben verglichen: 35 Quell- und 127 Testdateien-Einträge (inkl. Golden-Vektoren), Unterschiede nur in Importzeilen und Ladepfaden, bei `householdSurvivor.test.ts` zusätzlich ein von Prettier umbrochener Import; `git diff -- apps e2e` ist leer (`apps/web` ohne Änderung). `git diff --stat` zeigt für die verschobenen Dateien Löschungen und `git status` neue unversionierte Ordner, weil ohne `git add` keine Umbenennung erkannt wird; Git erkennt sie beim Commit des Autors. Offen: Commit durch den Autor; ESLint-Regel (optional). Commit-Vorschlag: `refactor(core): group source and tests into shared, tax, etf, goals, pension, household, overview and workspace folders`. Geänderte Ordner: `packages/core/` (`src`, `test`), `docs/` (neu `architecture.md`), `README.md`, `concept/` (Bericht 14, `12-…`, `PROGRESS.md`).

- 2026-11-22 – AP-06 – Voraussetzungen geprüft (AP-02 bis AP-05 erledigt, `git status` sauber, keine andere Code-Session nach Auskunft des Autors); Plan als Tabelle vom Autor freigegeben, Entscheidung zu den Dunkel-Tokens (`light-dark()`, Abweichung bei Schattenkanten dokumentieren) vom Autor getroffen. **Vorher** gemessen: 572 Unit-Tests, 122 von 123 E2E grün (ein flackernder Test, Backlog), Baseline-Screenshots. **Umgesetzt (mit `mv` verschoben, Importe per Skript umgeschrieben, kein `git`-Schreibbefehl):** (1) `apps/web/src` in `app/` (`main`, `App`, `appConfig`, `createStore`; `App.tsx` 486 Zeilen geteilt in `App`, `pages.ts`, `PersonWorkspace`, `ViewSwitch`, `HouseholdOverviewPage`), `state/` (alle `use*`, `personStorage`, `workspaceStore`, `workspaceFiles`, `onboarding`, `storageStatus`, `exportReminder`, `storagePrefixMigration`), `lib/` (`format`, `legalConfig`, `taxConfig`, `warningText`, `personProducts`, `etfRetirement`, `examples`); `components/` in `charts/`, `forms/`, `layout/`, `cards/`; je Seite ein Ordner unter `pages/`, `RetirementOverview` (419 Zeilen) und `HouseholdOverview` in die Seitenordner `overview/` und `household/`. (2) Seiten geteilt: `depot`, `occupational`, `etf`, `statutory` in `*Page`, `*Results` (Komponente `Results` dabei in `DepotResults` usw. umbenannt, rein namentlich) und `*Tables`; `goals` in `GoalsPage`, `GoalList`, `GoalCards`, `GoalForm`, `GoalResults`; `profile` mit `ProfileChildren`; `overview` mit `RetirementGap` (dorthin auch `BudgetInfo` und `productName`). (3) `i18n/de.ts` (1.555 Zeilen) in `i18n/de/<abschnitt>.ts` (16 Abschnitte plus `common.ts`), `index.ts` setzt `de` mit `as const` zusammen, `de.xyz` und `issueMessage` unverändert; per temporärem Vergleichstest (alter gegen neuen Baum, rekursiv, Texte und Funktionsquelltexte) als gleich bestätigt, Test danach gelöscht. (4) `styles.css` (1.115 Zeilen) in `styles/tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css`, `print.css`, `index.css` (Reihenfolge der Regeln unverändert, an Abschnittsgrenzen geschnitten). Dunkel-Tokens stehen einmal (`light-dark()`, `color-scheme: light dark`, `data-theme` setzt die Seite von Hand); der Schatten ist in `--shadow-a`/`--shadow-b` geteilt. (5) Doku angepasst: `README.md`, `CONTRIBUTING.md`, `docs/architecture.md`, `docs/design.md`, Mockup-Kommentar, `concept/04`, `12`, Bericht 14 Abschnitt 0; E2E brauchte keine Änderung (Pfade nirgends genannt). **Abweichungen vom Plan:** sechste CSS-Datei `print.css` (sonst `pages.css` über 400 Zeilen; Druckregeln müssen zuletzt kommen); die Regel `.legend .swatch.hatched` stand hinter dem Druckblock und steht jetzt davor (keine Druckregel berührt sie); `App.tsx` und `RetirementOverview` zusätzlich geteilt (über 400 Zeilen). **Beleg gleiche Oberfläche:** Screenshots Rentenplan, Depot, ETF, Annahmen, je hell, dunkel (System), dunkel (manuell) und hell (manuell, System dunkel), Desktop 1280 px und 375 px, vorher und nachher (je 32 Bilder), Pixelvergleich: Hell bitgleich bis auf das Eigenrauschen der Diagramme (gleicher Zustand zweimal vor dem Umbau gemessen: bis 480 Pixel Unterschied je Bild); Dunkel mit Abweichungen an Rundungen von Elementen mit Schatten (aktiver Segmentschalter, Karten-Ecken), meist ±1 Farbstufe, an einzelnen Eckpixeln bis 14, insgesamt wenige hundert Pixel je Bild (Depot-Desktop dunkel zusätzlich Diagrammrauschen); Ursache: zweite, transparente Schattenschicht im Dunkelmodus (mit `--shadow` auf die alte Einzelschicht überschrieben wieder bitgleich). Autor hat diese Abweichung angenommen. **Checks:** `typecheck`, `lint`, `format:check`, 572 Unit-Tests, Build, 123 von 123 E2E (inklusive mobile und axe) grün, auf dem eigenen Dev-Server auf Port 5173 (frei), keine temporäre Konfiguration. Keine Datei in `apps/web` über 400 Zeilen (größte: `HouseholdOverview` 370, `pages.css` 365). Nicht geprüft: Druckvorschau, Browser außer Chrome. Offen: Commit durch den Autor; AP-07/AP-08 können folgen. Commit-Vorschlag: `refactor(web): split web folders, i18n and styles by domain (AP-06)`. Geänderte Ordner: `apps/web/` (`src`, `index.html`), `docs/`, `concept/` (Bericht 14, `PROGRESS.md`, `04`, `12`), Wurzel (`README.md`, `CONTRIBUTING.md`).

- 2026-11-22 – AP-07 – Voraussetzungen: keine; gelesen: `CLAUDE.md`, `PROGRESS.md`, `docs/design.md`, Bericht 14 (0, 2.2, 2.5, 2.6, 9, AP-07), `mobile-nav.html`, `rente`, `depot`, `haushalt`, `willkommen`. Vorab Plan und Entwurf als Text (Typografie, Abstände, Palette mit gerechneten Kontrastwerten, Icons); Kontrast per Skript (WCAG, Farbabstand mit Farbfehlsichtigkeits-Simulation). Umgesetzt: `docs/mockups/design-v2.html` (ein Dokument, hell/dunkel/System umschaltbar, Seiten einmal geschrieben und per Container-Abfrage desktop- und smartphone-tauglich): Grundlagen mit Paarungstabelle (alle Paarungen erfüllt: Text mindestens 4,5:1, Bedienelemente und Diagrammflächen mindestens 3:1), (a) Rentenplan mit Hero, Wunscheinkommen daneben, Zusammensetzung, Details, Sparziele nur als Link, (b) Depot "Eingaben | Ergebnis | Rechenweg", (c) leerer Zustand mit nächstem Schritt, (d) Smartphone 375 px mit der freigegebenen Tab-Leiste und beiden Blättern, (e) Dunkelmodus für alles. Beispielzahlen erfunden, Summen im Skript gerechnet. Screenshots hell/dunkel vom Autor gesehen; Fehler beim Prüfen gefunden und behoben (Feldüberlauf im Depot, Chip-Breite mobil, Beschriftung der Bausteinprobe). **Freigabe:** Autor "Ja, bauen" (ohne die fünf Rückfragen einzeln zu beantworten; sie gelten damit wie im Mockup vorgeschlagen: eine Personenauswahl, Depot zweispaltig, Farben Blau/Schiefer/Magenta/Ochsenbraun, Bausteinpunkte). `docs/design.md` um Abschnitt "Design v2" ergänzt, `PROGRESS.md` eine Zeile. **Abweichungen:** siehe Zeile in `PROGRESS.md` (Typografie 16/48 px, keine Kartenschatten, neue Farben, Seitenleiste mit Icons, Depot-Vorlage zweispaltig). Kein Code in `apps/` oder `packages/`, nichts committet. Offen: Commit durch den Autor; AP-08 kann folgen. Commit-Vorschlag: `docs: add design v2 mockup and record approved design decisions (AP-07)`. Geänderte Ordner: `docs/` (`mockups/design-v2.html` neu, `design.md`), `concept/` (Bericht 14, `PROGRESS.md`).
- 2026-11-22 – AP-08 – Voraussetzungen geprüft (AP-06, AP-07 erledigt, `git status` sauber, keine andere Code-Session nach Auskunft des Autors); Plan und vier Rückfragen vorab, Antworten: Diagramme nach Baustein in Bausteinfarben, nach Person Akzentfarbe plus Muster; „Aktive Person“ in der Seitenleiste bleibt bis AP-09; Beispieldaten aus `examples/`. **Umgesetzt:** (1) Tokens in `styles/tokens.css`: Abstandsskala `--s1…s6`, Typo-Skala `--fs-*`, Bausteinfarben `--b-*` mit `--on-block`, Statusfarben `--ok/hint/warn/bad-fg/-bg/-bd`, `--scrim`, `--wish`, `--field-border` etwas dunkler, Schatten nur für Hero, aktives Segment und Sheet; `--warn-soft` entfernt. (2) 16 px Basis, H1 28 (Handy 24), H2 22, H3 18, Hero 48 (Handy 40), tabellarische Ziffern, Karten ohne Schatten, Felder und Buttons 44 px, alle Schriften mindestens 13 px, Segment als Pille, Hinweise und Gap-Balken über Statustokens. (3) Navigation: neue Komponente `components/layout/Icon.tsx` (Inline-SVG, 24er Raster, keine Bibliothek), Seitenleiste mit Icons, getönter Pille und Bausteinpunkten (`BLOCK_OF` in `app/pages.ts`), untere Tab-Leiste und Sheets mit Icons, Bausteinpunkten und Griff, Verhalten unverändert. (4) Komponenten: `StatusChip` (`ok`, `hint`, `warn`, `error`; Icon + Text + Farbe, eingesetzt in der Statusliste des Rentenplans mit unveränderten Texten), `EmptyState` (Schritte, Hauptknopf, ruhige Zweitaktion), `KpiTile` mit Variante `hero`. (5) Diagramme: gemeinsame `components/charts/chartTheme.tsx` (Achsen, Tooltip, Bausteinfarben, 2-px-Lücke, Segmentwerte ab 64 px Breite, Personenmuster gefüllt/schraffiert/gepunktet/gekreuzt mit passenden Legenden-Mustern), Wunschlinie `--wish`. (6) Tests: neu `apps/web/test/tokenContrast.test.ts` (10 Tests, liest `tokens.css`, alle Paarungen hell und dunkel), neu axe-Test für Tab-Leiste und beide Sheets bei 375 px hell und dunkel in `e2e/a11y.spec.ts`. Ergebnis: typecheck, lint, format:check, 582 Unit-Tests (vorher 572), build und 125 E2E-Tests (vorher 123) grün; ein Fehler unterwegs (44-px-Tippfläche der Segmente auf dem Handy) behoben. Dunkelmodus erstmals visuell durchgesehen, Screenshots Desktop und 375 px hell und dunkel für Rentenplan, Depot, ETF, Betriebliche AV und Gesetzliche Rente in `test-results/ap08/` (nicht im Repo), Vergleich mit dem Mockup, Abnahme durch den Autor. **Abweichungen vom Mockup:** Seitenaufbau (Hero, Wunsch daneben, Bausteinvorlage) folgt in AP-09 bis AP-11; Haushaltsdiagramm nach Person statt nach Baustein; Sidebar ohne Gruppe „Eingaben“; Statuschips dürfen umbrechen; Seiten-Badge ein neutraler Chip ohne Icon. **Zusatz auf Wunsch des Autors (nicht AP-08):** Tabelle „Zulagen je Kalenderjahr“ auf der Depot-Seite ist standardmäßig eingeklappt (`de.depot.allowanceTable.toggle`, Smoke-Test klappt auf). **Offen:** siehe Backlog (AP-08). Commit-Vorschlag: `feat(web): implement design v2 foundations (tokens, type scale, nav icons, status chips, chart palettes)`. Geänderte Ordner: `apps/web/src/styles`, `apps/web/src/components/{layout,cards,charts}`, `apps/web/src/app`, `apps/web/src/pages/{overview,depot}`, `apps/web/src/i18n/de`, `apps/web/test`, `e2e`, `docs/design.md`, `concept/`.

- 2026-11-22 – AP-09 – Voraussetzungen geprüft (AP-08 erledigt, `git status` sauber, keine andere Code-Session nach Auskunft des Autors); Plan vorab, Ist-Zustand gemessen (Playwright, Chrome; Beispiele "Paar" und "Einzelperson"): Seitenhöhe Haushalt 2.401 px Desktop / 3.693 px Smartphone, Person 3.129 / 4.654, Einzelperson 3.069 / 4.586. Mockup `design-v2.html` zeigte die neue Reihenfolge nicht vollständig (Szenarioschalter, wichtige Hinweise oben, ungültiger Zustand, Einzelperson, Person ohne Bausteine, Personenumschalter); darum Ergänzung `docs/mockups/rentenplan-ap09.html`, vom Autor mit "Ja, bauen" freigegeben. **Umgesetzt:** Rentenplan Person und Haushalt als Hero mit Zahl, Status-Chip, Balken und Satz, Wunscheinkommen daneben (Haushalt: direkt eingebbar), Szenarioschalter unter dem Hero, Zusammensetzung, Liste "Mehr dazu" (Verlauf, Lücke schließen, Was wäre wenn, Details und Tabellen, Bausteine, Hinweise mit Anzahl); Baustein-Status als Chips im Hero; Sparziele nur als Link, alter ETF-Endwert entfernt; ungültige Person/Baustein und wichtige Hinweise als Meldung oben vor der Überschrift, die übrigen eingeklappt; leerer Zustand (`EmptyState`), wenn kein Baustein zählt; ein Personenumschalter im Seitenkopf (`PersonTabs`; Rentenplan "Haushalt | Person…", sonst "Person…", ab vier Personen Auswahlfeld), Person in der Überschrift von Profil, ETF, Rente, Depot, bAV und Sparziele; Auswahl in Seitenleiste und Smartphone-Kopfzeile entfallen; neu `Disclosure`, `PageHead` (Kontext), `PersonTabs`, `OverviewNotes`, `overview.css`; `PageShell` mit Kopfzeile, `above`, `tools`. Tastaturfokus: ein Wechsel tauscht die Seite, `PersonTabs` setzt den Fokus zurück. **Messung nachher** (eingeklappt): Haushalt 1.466 / 2.310 px (Ziel unter 1.600 / 2.400 erreicht), Person 1.638 / 2.529, Einzelperson 1.538 / 2.465. **Abweichungen:** "Verlauf" standardmäßig eingeklappt (Mockup: offen); U-G nicht umgesetzt. **E2E:** angepasst `smoke`, `survivor`, `data`, `robustness`, `welcome`, `navigation` (Texte jetzt in eingeklappten Zeilen, Umschalter per `click()`), neu `e2e/helpers.ts` und `e2e/overview.spec.ts` (8 Tests); für ETF-Endwert und Sparziele-Karte auf dem Rentenplan gab es keinen E2E-Test, der ETF-Endwert wird weiter auf der ETF-Seite getestet. Getestet: Geburtsjahr 1950 (Person und Haushalt, Meldung oben), Person ohne Bausteine. Screenshots Desktop und 375 px, hell und dunkel, vorher und nachher, vom Autor gesehen. `typecheck`, `lint`, `format:check`, Build, 582 Unit-Tests, 133 E2E-Tests (vorher 125) grün; E2E über temporäre Konfiguration auf Port 5199. Offen: Commit durch den Autor; U-G. Commit-Vorschlag: `feat(web): result-first retirement plan with hero, single person switcher and collapsible details (AP-09)`. Geänderte Ordner: `apps/web/src` (`app`, `components`, `pages/overview`, `pages/household`, `pages/goals`, `i18n/de`, `styles`), `e2e`, `docs/` (`mockups/rentenplan-ap09.html` neu, `design.md`), `concept/` (Bericht 14, `PROGRESS.md`).
- (AP-10) `e2e/navigation.spec.ts` "skip link focuses the content and keeps the page" schlägt gegen den Dev-Server fehl, auch auf dem unveränderten Stand von HEAD (geprüft mit `git archive` in eigenem Ordner): StrictMode führt den Fokus-Effekt von `App.tsx` doppelt aus und fokussiert die `h1` schon beim ersten Laden, dann springt Tab nicht zum Skip-Link. In der CI (Produktions-Build) vermutlich nicht betroffen, nicht geprüft.
- (AP-10) Die Hilfetexte von Depot, bAV und gesetzlicher Rente sind noch lang (AP-11). `NumberField` hat dafür jetzt `more` ("Mehr erfahren"); `WithdrawalFields` (percentHint, 60 Wörter) ist geteilt und wurde nicht gekürzt.
- (AP-10) `StepsTable`/`ScenarioTable` (gemeinsam) nutzt bisher nur die ETF-Seite; die doppelten Tabellen in `DepotTables`, `OccupationalTables`, `StatutoryTables` bleiben bis AP-11 bestehen.
- (AP-10) Die Sprungknöpfe "Sparphase | Ruhestand" scrollen nur (Hash-Router), ein Scroll-Spy (aktiver Abschnitt) fehlt.
- (AP-10) Druckansicht der neuen ETF-Seite nicht geprüft.
- ~~(AP-10) "Mehr erfahren" öffnet sich nicht bei einem Fehler im Feld~~ in AP-11 erledigt (`MoreInfo`, gilt für alle Seiten mit `NumberField`).

- (AP-11) Ein negativer Beitrag (z. B. −5) zeigt auf Depot und bAV "Noch kein Beitrag/keine Umwandlung eingetragen" statt der Eingabefehler-Meldung, weil die Prüfung "leer" (`!(x > 0)`) vor der Prüfung auf ungültige Eingabe läuft. Das Feld zeigt den Fehler trotzdem. Schon vor AP-11 so.
- (AP-11) Gesetzliche Beträge (570 €, 6.840 €, 676 €, 338 € …) stehen fest in den Hilfetexten (`i18n/de/depot.ts`, `occupational.ts`), nicht aus `config/`. Schon vorher so, bei Rechtsänderung von Hand nachziehen oder Texte mit Platzhaltern aus der Konfiguration füllen.
- (AP-11) Der Hinweiskasten "wichtig" ist beim Depot lang: `unverified:…`- und `payoutTaxation`-Codes zählen nach `warningWeight` als wichtig (5 Zeilen im Beispiel). Falls zu laut, Gewicht der Ungeprüft-Codes neu bewerten (eigene Entscheidung).
- (AP-11) bAV: "Die Umwandlung senkt deine gesetzliche Rente um X" ist `info` und damit eingeklappt, obwohl sie das Bild verändert. Gewicht ggf. auf wichtig setzen.
- (AP-11) Kennzahlen auf dem Smartphone stehen jetzt in 2 statt 3 Spalten (auch ETF-Seite), weil lange Beschriftungen mitten im Wort umbrachen.
- (AP-11) Druckansicht der drei Seiten nicht geprüft (Zulagen: im Druck Tabelle statt Karten per CSS, nicht im Druckvorschau-Test gesehen). Browser außer Chrome nicht geprüft.
- (AP-11) Summenkarte der Zulagen zeigt "Summe 2027 bis 2054" mit der Zulagensumme als Überschrift; "Kapital Jahresende" der Summenzeile ist das Modellkapital. Gleiche Werte wie die Summenzeile der Tabelle.
- (AP-11) Der Skip-Link-Test (`navigation.spec.ts:44`) ist weiter rot, mit unverändertem Fehler (Fokus bleibt `inactive`).
- (AP-11) Auf Port 5173 lief schon ein Vite-Dev-Server aus `apps/web` (Herkunft unklar, vermutlich Überbleibsel); Messungen und E2E liefen dagegen (`reuseExistingServer`).

- 2026-11-23 – AP-10 (mit U-G aus AP-09) – Voraussetzungen geprüft (AP-08 erledigt, `git status` sauber, keine andere Code-Session nach Auskunft des Autors; Port 5173 frei). **Ist-Zustand** (Playwright, Chrome, Beispiel "Einzelperson", sichtbare Wörter im Hauptbereich): ETF 540 Wörter, 2.843 px Desktop, 4.995 px 375 px; Depot 593 Wörter, 2.533 / 5.462 px. ETF vorher: Formular mit allen Gruppen, Ergebnis Sparplan rechts, "ETF im Ruhestand" erst bei 2.138 px, Zielvermögen bei 2.669 px. **Mockup:** `design-v2.html` zeigte `BlockPage` nur teilweise (kein Mitlaufen, kein fester Ergebnis-Kopf am Smartphone, keine Seite mit zwei Ergebnissen); Ergänzung `docs/mockups/etf-ap10.html` (Desktop, 375 px in zwei Varianten, hell und dunkel) vom Autor mit "Ja, bauen" freigegeben, mit den empfohlenen Antworten: Schalter "aus den Annahmen" bleibt als eingeklappte Zeile "Rendite und Inflation" mit Link und Schalter (als reiner Hinweis wären eigene Renditen unerreichbar); Smartphone Variante A (gestapelt, fester Ergebnis-Streifen mit beiden Zahlen); Zielvermögen als Zeile im Rechenweg der Sparphase, Steuer bleibt in der Sparphase, der Ruhestand verweist darauf. **Umgesetzt:** (1) `BlockPage`/`BlockSection` (`components/layout/BlockPage.tsx`, `styles/blocks.css`, `i18n/de/blocks.ts`). (2) `ResultFrame`, `ResultTable` (`StepsTable`, `ScenarioTable`), `WarningList` in `components/cards/`; `NumberField` mit `more`; `ScenarioChart`, `YearTable`, `WithdrawalChart` mit `bare`; `EtfTargetSection` ohne eigene Gruppe. (3) ETF-Seite in "Sparphase" und "Ruhestand" mit je eigenem Ergebnis, Rechenwege und Hinweise eingeklappt, Hilfetexte ein Satz. (4) U-G: `PageHead`-Kontext mit `note`, gesetzt in `PersonWorkspace`, angezeigt von `PageShell` unter der Überschrift (Profil, Annahmen). **API-Nachweis:** `apps/web/test/blockPage.test.ts` (8 Tests) rendert die unveränderten `DepotResults`, `OccupationalResults`, `StatutoryResults` in `BlockSection` und prüft, dass die gemeinsamen Tabellen und `ResultFrame` die Formen der drei Seiten abdecken; die drei Seiten sind nicht umgebaut. **Nachher:** ETF 270 Wörter, 2.078 px Desktop, 3.631 px Smartphone; Sparphase-Ergebnis am Desktop auf der ersten Bildschirmhöhe neben den Eingaben. **E2E:** angepasst `advance`, `churchtax`, `smoke`, `welcome`, `withdrawal` (neue Helfer `openGroup`, `planFinalValue`); neu `e2e/blockpage.spec.ts` (8 Tests). Axe für ETF hell und dunkel im bestehenden E2E grün. **Ergebnis:** typecheck, lint, format:check, Build grün; 590 Unit-Tests (vorher 582); 140 von 141 E2E (der rote Skip-Link-Test schlägt auch auf HEAD fehl, siehe Backlog). Screenshots Desktop und 375 px, hell und dunkel, vorher und nachher vom Autor gesehen und freigegeben. Beim Bauen gefunden und behoben: Kennzahl-Beschriftung überlappte am Smartphone. **Abweichungen:** Smartphone-Reihenfolge Ergebnis, Eingaben, Rechenweg statt Ergebnis, Rechenweg, Eingaben (`docs/design.md` angepasst); Steuer und "Rendite und Inflation" nicht mehr standardmäßig geöffnet. **Nicht geprüft:** Druckansicht, Browser außer Chrome. Offen: Commit durch den Autor; AP-11 kann folgen. Commit-Vorschlag: `feat(web): add block page template and split ETF page into saving and retirement parts (AP-10, U-G)`. Geänderte Ordner: `apps/web/src` (`components`, `pages/etf`, `app`, `i18n/de`, `styles`), `apps/web/test`, `e2e`, `docs/` (`mockups/etf-ap10.html` neu, `design.md`), `concept/` (Bericht 14, `PROGRESS.md`).
- 2026-11-23 – AP-11 – Voraussetzungen geprüft (AP-10 erledigt und committet, `git status` sauber; Dev-Server auf Port 5173 lief schon, Herkunft unklar). **Ist-Zustand** (Playwright, Chrome, sichtbare Wörter im `main`, Beispiel "Einzelperson"): gesetzliche Rente 471 Wörter, 2.148 px Desktop, 4.453 px Smartphone; Depot 596 / 2.533 / 5.462; bAV 728 / 2.978 / 6.173. Reihenfolge bei allen: Formular mit allen Gruppen offen, "Annahmen aus dem Profil", Karte "Vereinfachungen"; Ergebnis mit offenen Tabellen, Diagramm, Rechenweg untereinander. **Mockup:** `design-v2.html` zeigte keine Kartenliste; `docs/mockups/depot-ap11.html` (Zulagen: Tabelle am Desktop, Karten unter 640 px, Summe zuerst, 5 Jahre plus "Alle … Jahre anzeigen") vom Autor mit "Ja, bauen" freigegeben. **Umgesetzt:** (1) Drei Seiten auf `BlockPage`/`BlockSection` mit einklappbaren Eingabegruppen (`FieldGroup` mit Kurzfassung), `ResultFrame` (Hauptzahl Netto pro Monat mit Spanne, alle bisherigen Kennzahlen), Rechenweg als einklappbare Zeilen; Annahmen aus dem Profil und Vereinfachungen in den Rechenweg verschoben. (2) Hinweise gebündelt: `Note`, `ImportantNotes` (sichtbar über dem Ergebnis), `InfoNotes` (eingeklappt, mit Zahl), Gewicht für Kern-Codes über `warningWeight`, für Seitenhinweise nach bisheriger Klasse (`notice info` = info). (3) Tabellen der drei Seiten über die gemeinsamen `StepsTable`/`ScenarioTable`; `DepotTables`, `OccupationalTables`, `StatutoryTables` bauen nur noch Zeilen. (4) `AllowanceTable` mit Kartenliste (`.only-wide`/`.only-narrow`, Druck: Tabelle). (5) Hilfetexte ein Satz je Feld, Details über `more`; neue Komponente `MoreInfo` (öffnet bei Fehler selbst, behebt Backlog AP-10), auch in `WithdrawalFields` (gilt für die ETF-Seite mit). Charts mit `bare`. (6) Smartphone-Kennzahlen in 2 Spalten. **Nachher:** gesetzliche Rente 191 Wörter, 1.358 px Desktop, 2.434 px Smartphone; Depot 277 / 1.264 / 2.654; bAV 260 / 1.273 / 2.657 (Paar: 198 / 251 / 267 Wörter). **Vorher/nachher-Liste:** alle Eingaben und Kennzahlen weiter erreichbar (geprüft durch `e2e/blockpages.spec.ts`, Listen je Seite); Zulagen: alle 7 Spalten als Tabelle und als Karte. **Tests:** `blockPage.test.ts` auf die neuen Komponenten umgestellt (12 Tests), 594 Unit-Tests; E2E angepasst `smoke` (3), `withdrawal`, `a11y`; neu `e2e/blockpages.spec.ts` (22 Tests: Ergebnis, Wortzahl, Eingaben, Hilfetextlänge, leer, ungültig, Fehler in eingeklapptem Feld inkl. "Mehr erfahren", Zulagenkarten). Axe hell und dunkel grün. **Ergebnis:** typecheck, lint, format:check, Build grün; 163 von 164 E2E (Skip-Link-Test unverändert rot). Screenshots Desktop und 375 px, hell und dunkel, vorher und nachher vom Autor gesehen und freigegeben. **Abweichungen:** Hinweise `info` eingeklappt; Seitenhinweise bAV "senkt gesetzliche Rente" dadurch eingeklappt; Eingabegruppen außer der ersten eingeklappt (Gesetzliche Rente: beide offen). **Nicht geprüft:** Druckansicht, Browser außer Chrome. Offen: Commit durch den Autor. Commit-Vorschlag: `feat(web): move depot, occupational and statutory pages onto the block template with allowance cards (AP-11)`. Geänderte Ordner: `apps/web/src` (`pages/{depot,occupational,statutory}`, `components/{cards,charts,forms}`, `i18n/de`, `styles`), `apps/web/test`, `e2e`, `docs/` (`mockups/depot-ap11.html` neu, `design.md`), `concept/` (Bericht 14, `PROGRESS.md`).

- 2026-11-23 – AP-12 – Voraussetzungen geprüft (AP-08 erledigt, AP-11 committet, `git status` sauber; keine andere Code-Session nach Auskunft des Autors; auf Port 5173 lief schon ein Dev-Server aus `apps/web`). **Ist-Zustand** (Playwright, Chrome, Beispiel "Einzelperson", sichtbare Wörter im `main`): 3.093 Wörter, 10.472 px Desktop, 19.743 px bei 375 px. Reihenfolge: sechs offene Tabellen (84 Werte; Steuerwerte, Basiszins, Rente, Sozialversicherung, Depot, Einkommensteuer), "Begriffe", sechs offene Regelkarten (41 Regeln, 831 Wörter). Sichtbar: fünf Dateipfade (`config/…json`, sechsmal in Tabellentiteln), 34 Quellentexte mit "geprüft am …", dazu "(am … gelesen)" und "im BMF-Schreiben gelesen". **Mockup:** `docs/mockups/annahmen-ap12.html` (Desktop und 375 px, hell und dunkel, eingeklappt und aufgeklappt) vom Autor mit "Ja, bauen" freigegeben; Antworten: Quellentexte per Anzeige-Parser bei unveränderter `config/`, alle Bereiche eingeklappt, Glossar als eingeklappte Zeile, "Deine Annahmen" nur die vier gemeinsamen Werte. **Umgesetzt:** (1) `pages/assumptions/` neu: `YourAssumptions` (Inflation, drei Renditeszenarien, Rentenanpassung, Rendite in der Rentenphase, nur lesend, Link "Im Profil ändern"), `LegalValues` (fünf `Disclosure`-Zeilen mit Wertzahl und Abzeichen "n ungeprüft"/"alle bestätigt" in der Kopfzeile, Gesamtzeile "5 ungeprüft", je Wert Name, Betrag, "gültig ab", Abzeichen und getönter Rahmen bei `unverified`, Quelle einklappbar mit kleinem Datum), `CalculationRules` (sechs Zeilen, Wortlaut unverändert) und `Glossary`. (2) `lib/legalGroups.ts` (Gruppierung, Anzeige), `lib/sourceText.ts` (trennt "geprüft am … auf …" und "(am … gelesen)" ab, nicht passende Texte bleiben wortgleich), `formatDate`, `Disclosure` mit `badge`. (3) `AssumptionsPanel` gelöscht, Texte in `i18n/de/assumptions.ts` und `glossary.ts` (keine Dateipfade, Untertitel neu, Regeltexte und Wertnamen unverändert), `styles/assumptions.css`. **Tests:** neu `apps/web/test/assumptionsPage.test.ts` (17 Tests: 84 Werte, Zählung ungeprüft gegen die JSON-Dateien, Bereich mit `unverified` zeigt das Abzeichen eingeklappt, jeder ungeprüfte Wert markiert, keine Pfade und kein Prüfprotokoll, Regeln Wort für Wort, Parser an allen Quellen) und `e2e/assumptions.spec.ts` (11 Tests inkl. Höhe unter 2.500 px und Wortzahl, Desktop und 375 px); angepasst `smoke.spec.ts` (2), `advance.spec.ts` (1). Nichts wird versehentlich nicht mehr getestet: die alten Tabellenprüfungen (Steuerwerte, Rente, Sozialversicherung, Depot, Basiszins mit Status) laufen jetzt gegen die Aufklappzeilen. **Nachher:** 171 Wörter, 1.350 px Desktop, 147 Wörter, 1.782 px bei 375 px (eingeklappt); alles offen (Steuern, Depot, eine Regelzeile, zwei Quellen) 6.116 / 7.637 px. **Vorher/nachher je Bereich** (Werte; ungeprüft): Steuern 18 (3), Gesetzliche Rente 20 (0), Sozialversicherung 11 (0), Altersvorsorgedepot 20 (2), Einkommensteuer 15 (0); alle 84 Werte mit Gültigkeit und Quelle erreichbar. **Ungeprüfte Werte:** Kirchensteuer BW/Bayern, Kirchensteuer übrige Länder, Basiszins ab 2027, Kinderzulage "Kind jünger als", Bonus "Alter unter". **Ergebnis:** typecheck, lint, format:check, Build grün; 611 Unit-Tests (vorher 594); 174 von 175 E2E (Skip-Link-Test unverändert rot); axe hell und dunkel mit allen Bereichen geöffnet grün. Screenshots Desktop und 375 px, hell und dunkel, eingeklappt und aufgeklappt, vorher und nachher vom Autor gesehen und freigegeben (`playwright-report/ap12/`, nicht im Repo). **Abweichungen:** Mockup-Satz "gültig für das heutige Datum" ersetzt durch "mit Quelle und Gültigkeit" (nicht zutreffend); Szenario-Kachel "Rendite pessimistisch / neutral / optimistisch p. a." mit "3 / 5 / 7 %"; Gültigkeit als deutsches Datum statt ISO; Quellen-Aufklapper mit Standardmarkierung. **Nicht geprüft:** Druckansicht, Browser außer Chrome. Einmal `git rm --cached` auf der gelöschten `AssumptionsPanel.tsx` (Löschung steht im Index). Offen: Commit durch den Autor. Commit-Vorschlag: `feat(web): split assumptions page into own assumptions and collapsible legal values with unverified badges (AP-12)`. Geänderte Ordner: `apps/web/src` (`pages/assumptions`, `lib`, `components/cards`, `components/forms`, `i18n/de`, `styles`, `app`), `apps/web/test`, `e2e`, `docs/` (`mockups/annahmen-ap12.html` neu, `design.md`), `concept/` (Bericht 14, `PROGRESS.md`).

- 2026-11-23 – AP-13 – Voraussetzungen geprüft (AP-09 bis AP-12 erledigt, `git status` sauber, keine andere Code-Session im Projekt). **Ist-Zustand** (Browser, leerer Speicher, Desktop und 375 px): Willkommenskarte am Handy fast bildschirmfüllend, Schritte als schief umbrechende Textlinks; nach der ersten Eingabe verschwindet sie ohne Nachfolger, dafür erscheint der Exportstreifen; Seitenleiste und Tab-Leiste ohne Fortschritt; leere Bausteinseiten nur mit orangefarbenem Hinweis; ETF-Vorgabewerte rechnen sofort (424 €), der leere Rentenplan ist praktisch nie sichtbar. **Mockup** `docs/mockups/fuehrung-ap13.html` (Desktop und 375 px, hell und dunkel) vom Autor mit "Ja, bauen" freigegeben; Entscheidungen (empfohlene Varianten): Begriff "Einkommensquellen" statt "Bausteine" (nur Texte, ca. 19 Stellen), Rentenplan bleibt oben, Paar: Status für die aktive Person mit Zeile "Status für Anna", Karte je nach Ansicht, Exportstreifen entfällt auf dem Rentenplan, solange die Karte "Daten sichern" nennt. **Umgesetzt:** (1) `lib/inputStatus.ts`: Status je Seite (`empty`/`done`/`hint`) aus den gespeicherten Daten (Vorgabevergleich, Validierung, wichtige Kernhinweise ohne `unverified:`), `guidanceFor` mit Schrittliste `STEP_DEFS` (Profil, Gesetzliche Rente, Wunscheinkommen, Daten sichern; weitere Schritte wie Splitting = ein Eintrag). (2) `state/useGuidance.ts`, `useDataVersion` in `storageStatus.ts` (Neuberechnung nach jedem Speichern). (3) `NavStatus` (Zeichen, Wort im Handy-Blatt, Text für Screenreader), `NextStepCard`, `Icon` `open`, `.sr-only`; Seitenleiste in Gruppen "Eingaben" (Profil, Einkommensquellen) und "Sparen" wie das Handy-Blatt, Zeile "Status für …" bei mehreren Personen. (4) `valiva.onboarding` bekommt `hidden`. (5) Leere Zustände Rente, Depot, bAV mit `EmptyState` (Titel, Text, Knopf ins Feld, "Weiter: …"). (6) Willkommenskarte gekürzt, nummerierte Schritte. (7) Texte in `i18n/de/guidance.ts`, "Baustein" ersetzt. **Abweichungen:** Seitenleiste 272 px (vorher 248), `.nl` mit 8 px Innenabstand; "leer" bei Profil und ETF heißt "unverändert gegenüber den Vorgaben"; Hinweise zu ungeprüften Rechtswerten machen eine Seite nicht zu "mit Hinweis"; Export-Mahnung auf dem Rentenplan entfällt, solange die Karte den Schritt zeigt. **Tests:** neu `apps/web/test/inputStatus.test.ts` (10), `e2e/guidance.spec.ts` (15: Erststart, erste Eingabe, Karte wechselt, Schritte bis zum Verschwinden, Ausblenden gemerkt, Beispieldaten, Tastatur, Paar, leere Seiten, Gruppen und Reihenfolge, Handy-Blatt, axe hell und dunkel); angepasst `overview`, `smoke` (Umbenennung), `robustness`, `welcome` (Mahnung erst nach "Ausblenden" bzw. auf anderen Seiten); nichts wird weniger getestet. **Ergebnis:** typecheck, lint, format:check, Build grün; 621 Unit-Tests (vorher 611); 189 von 190 E2E (Skip-Link-Test unverändert rot, Backlog). Screenshots Desktop und 375 px, hell und dunkel, für Erststart, erste Eingabe, Einzelperson (Beispiel), Paar, leere Seite vom Autor gesehen und freigegeben (`playwright-report/ap13/`, nicht im Repo). **Nicht geprüft:** Druckansicht, Browser außer Chrome. Offen: Commit durch den Autor. Commit-Vorschlag: `feat(web): add guided start with input status, next-step card and empty states (AP-13)`. Geänderte Ordner: `apps/web/src` (`app`, `components/{cards,layout}`, `lib`, `state`, `pages/{depot,occupational,statutory,overview,household}`, `i18n/de`, `styles`), `apps/web/test`, `e2e`, `docs/` (`mockups/fuehrung-ap13.html` neu, `design.md`), `concept/` (Bericht 14, `PROGRESS.md`).

- 2026-11-23 – AP-14 – Voraussetzungen geprüft (keine). Gelesen: `CLAUDE.md`, `PROGRESS.md`, Bericht 14 (§0, §2.7, §9, AP-10 bis AP-14), `09`, `10`, `11` (§4.1a), `12` (Workspace), `01`, `03`, `06`, `07`, `docs/design.md`, bestehende Mockups, Steuer- und Übersichtskern (`retirementTax.ts`, `netPension.ts`, `overview.ts`) nur lesend. **Fachfragen** a bis l gestellt, alle wie empfohlen beantwortet: Betrag `today`/`nominalAtStart` mit Anpassung `inflation`/`pension`/`fixed`; Alter und `lifelong`; Steuer `none`/`full`/`percent`/`pensionShare`; Abgaben `none`/`likeOccupational` (gemeinsame Schwelle mit der bAV); keine Einmalbeträge; `survivorPercent`; beliebiger Beginn plus Schalter; höchstens 10 Einträge; Sparerpauschbetrag und Werbungskosten nicht berücksichtigt; Workspace-Version 2; Art nur als Vorbelegung; ein Segment je Person. **Umgesetzt:** (1) `concept/15-phase-6-generic-block.md` mit Zielen, Entscheidungen, Feldern, Validierung, Gesamtsicht, Haushalt, Workspace, Rechenregeln, sieben Rechenbeispielen (mit den Werten aus `config/` nachgerechnet: u. a. Steuer auf die Summe 4.081 €/Jahr, gemeinsame Schwelle 19,65 €), Tests, Property-Tests, Golden-Vektoren `oi01`–`oi08`, Abgrenzung (§12), offene Punkte (§14). (2) Mockup `docs/mockups/sonstige-einkuenfte.html` (Seite, Formular, leerer Zustand, Smartphone mit Blatt-Zeile, Rentenplan, Haushalt, neue Farbe `--b-oth` mit Kontrastwerten; hell und dunkel; Desktop und 375 px), vom Autor mit "Ja, bauen" freigegeben. (3) `01`, `06`, `07` (Entscheidungslog und Punkt 14), `README.md`, `PROGRESS.md` (Phase 6b) ergänzt. **Neue Config-Werte:** für V1 keine Beträge; vorgeschlagen `config/other-income-de.json` mit fünf Regelannahmen (alle `unverified`), Entscheidung in AP-15. **Abweichungen:** siehe `PROGRESS.md` Notiz vom 2026-11-23 (Workspace-Version, `OverviewProductId`, Hinterbliebene, `legacy`, Bezeichnung 6b, Validierungsebenen). **Ungeprüft:** alle in `15` §9 genannten Rechts- und Sozialversicherungsregeln (Quellen nur genannt, nicht gelesen). **Nicht geprüft:** Druckansicht, Browser außer Chrome (nur Mockup). Kein Code in `apps/` oder `packages/` geändert, kein Test gelaufen (nur `prettier --check` der neuen Dateien). Offen: Commit durch den Autor; AP-15 kann folgen. Commit-Vorschlag: `docs: add concept and mockup for generic "other income in retirement" block (AP-14)`. Geänderte Ordner: `concept/` (`15-phase-6-generic-block.md` neu, `01`, `06`, `07`, `README.md`, `PROGRESS.md`, Bericht 14), `docs/mockups/` (`sonstige-einkuenfte.html` neu).

- 2026-11-23 – AP-15 Teil A – Voraussetzungen geprüft (AP-05, AP-06, AP-14 erledigt und freigegeben, keine andere Code-Session offen, `git status` sauber). Gelesen: `CLAUDE.md`, `PROGRESS.md`, Bericht 14 (§0, §4, §9, AP-05/06/14/15, Protokoll AP-14), `15` vollständig, `11` §4.1a, `docs/architecture.md` und den Kern (`overview`, `householdOverview`, `netPension`, `occupational`, `retirementTax`, `legalConfig`, `blocks`, `workspace`, `householdMigration`, Gap-Löser). **Abweichung:** AP-15 in zwei Sessions (Teil A = `15` §13 Schritte 1 bis 4, Teil B = Schritte 5 und 6), in `PROGRESS.md` eingetragen. **Fragen und Entscheidungen** (alle wie empfohlen): (1) eigene Datei `config/other-income-de.json` mit fünf Regeln, alle `unverified`, nur Kernseite (die sechste Gruppe der Annahmen-Seite folgt in Teil B; die Annahmen-Seite leitet ihre Gruppen nicht automatisch aus `config/` ab, anders als `15` §9 sagte); (2) gemeinsame Schwelle nur in `overview`, bAV-Seite unverändert, Hinweis `shared_occupational_threshold`; (5) Pauschbetrag bei Miete unverändert, nur Hinweis `rent_allowance_not_applicable`; (10) Grenze 10 Einträge als Konstante. Zusätzlich während des Baus gefragt und entschieden: anrechenbares Einkommen bei der Witwenrente = alle Einträge der überlebenden Person (`15` §4.2 und §9 widersprachen sich). **Umgesetzt (Schritt 1):** `config/other-income-de.json`, `resolveLegalParameters` mit optionalem sechstem Parameter, Typen und `validateOtherIncomeEntry`/`validateOtherIncomeState` (`pension/otherIncome.ts`), sechs neue `ValidationIssue`-Codes mit deutschen Texten. **(Schritt 2):** `projectOtherIncome`/`otherIncomeProjector`, `sharedOccupationalContributions`, `overview` mit `OverviewProductId`, Status `ended`, `fixedTaxFreeMonthlyReal` (statt `productId === 'statutory'`), gemeinsame Schwelle über `OverviewProductInput.sharedThreshold`, `buildOtherIncomeProducts` (`overview/`); Golden `oi01`–`oi06` mit allen sieben Rechenbeispielen aus `15` §5.4 (Steuer 4.081 €/Jahr, Schwelle 19,65 €). **(Schritt 3):** `householdOverview` mit Weiterzahlung an Hinterbliebene (`survivorOtherIncome`, Produkte `otherIncome:survivor:...`), Golden `oi07` (Paar) und `oi08` (Status). **(Schritt 4):** Block `otherIncome` in `PERSON_BLOCKS`, `parseBlock` (Grenzen, verbotene Schlüssel auf jeder Ebene, Feld für Feld kopiert), Workspace-Version 2 mit Identitäts-Migration, drei Beispieldateien auf Version 2 (`couple` mit drei Einträgen), Format-Golden. **Tests:** 755 Unit-Tests (vorher 621; neu u. a. Validierung, Projektor, Gesamtsicht, Haushalt, Workspace mit bösartigen Eingaben, Property-Tests), alle bestehenden Tests und Vektoren unverändert grün, alle bestehenden Golden-Dateien bitgleich; Python-Generator und Excel-Blätter `oi01`–`oi08` (Formeln mit unabhängiger Engine gegen Python geprüft); `typecheck`, `lint`, `format:check`, `build` grün; E2E 189 von 190 (Skip-Link-Test unverändert rot, Backlog AP-10). **Web:** nur Typ- und Textanpassungen (`productName`, `pageOf`, Status `ended`, Issue-Texte, Blockname im Import), keine neue Seite, keine Logik: `buildPersonProducts` rechnet die Einträge noch nicht, ein importierter Block wird gespeichert und wieder exportiert, wirkt aber noch nicht auf den Rentenplan. **Abweichungen/Festlegungen:** siehe `15` §15 (u. a. `validate…(entry, ctx)`, Feldpfade mit Punkt, `schemaVersion` im Blockzustand, `ended` nur für Einträge, Monotonie nur ohne `likeOccupational`). **Ungeprüft:** alle Rechts- und Sozialversicherungsregeln in `config/other-income-de.json` (Quellen nur genannt), die Übertragung von `pensionShare` auf die Basisrente, die Anrechnung eigener Einträge bei der Witwenrente. **Nicht geprüft:** Excel selbst (Stichprobe des Autors steht aus), Druckansicht, Browser außer Chrome. **Offen:** Commit durch den Autor; Teil B (Schritte 5 und 6 aus `15` §13) in einer eigenen Session. Commit-Vorschlag: `feat(core): add generic other-income block with projector, household survivor share and workspace format v2 (AP-15 part A)`. Geänderte Ordner: `packages/core/src` (`pension`, `overview`, `shared`, `tax`, `workspace`, `household`, `index.ts`), `packages/core/test` (`pension`, `overview`, `workspace`, `golden-vectors/other-income` neu, `pensionFixtures.ts`), `apps/web/src` (`lib/legalConfig.ts`, `i18n/de/{issues,overview,data,index}.ts`, `pages/overview`, `state/useOverview.ts`), `config/` (`other-income-de.json` neu, `README.md`), `examples/`, `tools/` (`generate_golden.py`, `golden-check.xlsx`), `docs/` (`architecture.md`, `assumptions.md`, `glossary.md`), `concept/` (`15`, `PROGRESS.md`, Bericht 14).
- 2026-11-23 – AP-15 Teil B – Voraussetzungen geprüft (Teil A committet, Commit a1588e9; `git status` sauber; Mockup freigegeben, Farbwerte `--b-oth` laut Mockup `#47750a`/`#a3d46b`; auf Port 5173 lief ein Dev-Server einer anderen Sitzung). Gelesen: `15` (§3, §4, §8, §13 bis §15), Teil-A-Notizen, bestehende Bausteinseite (`OccupationalPage`), `BlockPage`, `inputStatus`, `personProducts`, `useOverview`, Rentenplan- und Haushaltsseite. **Fragen:** keine blockierenden; die offenen Punkte Nr. 8 und 9 aus `15` §14 waren mit dem Mockup entschieden. **Umgesetzt:** (1) `state/useOtherIncome.ts` (Schlüssel `valiva.p.<id>.otherIncome.v1`, speichert nicht bei halb getippten Zahlen), `lib/otherIncomeDefaults.ts` (Vorbelegung je Art nach `15` §3.1, kleinste freie Id), `buildPersonProducts` hängt `buildOtherIncomeProducts` an, `useOverview` bekommt die Einträge. (2) Seite `pages/other/` (Liste, Formular mit vier eingeklappten Gruppen, Ergebnis mit Brutto, Steuer und Abgaben, Netto, Tabelle je Eintrag, Rechenweg des gewählten Eintrags, leerer Zustand, Fehler je Feld aus den Gründen der Gesamtsicht), Seitenleiste und Handy-Blatt (`pages.ts`, `MobileNav.tsx`, Symbol), Status (`other` in `personStatus`, `empty`/`done`/`hint`). (3) Rentenplan: Segment "Sonstige Einkünfte" in Zusammensetzung und Verlauf, ein Chip "Sonstige Einkünfte: n Einträge", Tabelle je Eintrag unter "Details und Tabellen", Verlaufstabelle mit Eintragsnamen, Fehlerhinweis mit Sprung zur Seite; Haushalt: Spalte in der Tabelle, Hinweise zur Weiterzahlung. (4) Annahmen-Seite: sechste Gruppe "Sonstige Einkünfte (Regelannahmen)" (5 Werte, alle ungeprüft, Wert als "wird angenommen"), Regelzeile "Sonstige Einkünfte". (5) Farbe `--b-oth` in `tokens.css`, Seitenleiste, Diagramm, `tokenContrast.test.ts`, `docs/design.md`. (6) Texte `i18n/de/otherIncome.ts` (alle neuen Texte), Warntexte für `unverified:otherIncome.*`, `rent_allowance_not_applicable`, `shared_occupational_threshold`, `survivor_needs_pair`. (7) Tests: `otherIncomeDefaults.test.ts`, `inputStatus.test.ts` (Status der neuen Seite), `warningText.test.ts`, `assumptionsPage.test.ts`; E2E `otherincome.spec.ts` (leerer Zustand, erster Eintrag und Wirkung im Rentenplan, mehrere Einträge, Fehler, Entfernen, Paar mit Weiterzahlung, axe hell und dunkel), `a11y.spec.ts` und `mobile.spec.ts` mit der neuen Seite. **Geänderte bestehende Tests** (nur wegen neuer Inhalte, in `PROGRESS.md` begründet): `assumptions.spec.ts` (sechs Gruppen, 89 Werte, sieben Regelzeilen), `overview.spec.ts` (Höhenwächter 2.550 px). **Ergebnis:** typecheck, lint, format:check, build grün; 760 Unit-Tests grün; E2E 200 von 201 (Skip-Link, unverändert seit AP-10). **Ungeprüft:** alle Rechts- und Sozialversicherungsregeln der Einträge (Quellen nur genannt), die Excel-Stichprobe (steht aus: bitte `tools/golden-check.xlsx`, Blätter `oi01` bis `oi08`, mit Excel öffnen und eine Stichprobe gegen die Python-Werte prüfen), Druckansicht der neuen Seite, Browser außer Chrome. **Offen:** Commit durch den Autor. Commit-Vorschlag: `feat(web): add other income page and wire entries into retirement plan and household (AP-15 part B)`. Geänderte Ordner: `apps/web/src` (`pages/other` neu, `state/useOtherIncome.ts`, `lib/`, `i18n/de/`, `components/`, `pages/overview`, `pages/household`, `pages/assumptions`, `app/`, `styles/`), `apps/web/test`, `e2e/`, `docs/` (`design.md`, `architecture.md`, `assumptions.md`), `README.md`, `concept/` (`15` §16, `PROGRESS.md`, Bericht 14).

