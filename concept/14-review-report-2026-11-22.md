# 14 – Review-Bericht (2026-11-22): Design, Code, Sicherheit, Funktionen, Doku, Bedienung, Smartphone

Dieser Bericht ist in **Arbeitspakete (AP)** geschnitten. Jedes AP passt in **eine Session**, hat eigene Aufgaben zum Abhaken und eigene Abnahmekriterien. Wer ein AP umsetzt, liest nur Abschnitt 0 (Regeln), die Befunde, die das AP nennt, und das AP selbst.

Vorgänger: `13-review-report.md` (2026-11-18). Dessen Punkte sind bis auf S-3, S-5, C-8 und F-10 bis F-14 umgesetzt (Stand `PROGRESS.md`). Dieser Bericht prüft den **heutigen** Stand neu und doppelt nichts davon.

---

## 0. So wird diese Datei benutzt

**Auftrag an eine Session (Vorlage):**

> Lies `CLAUDE.md`, `concept/PROGRESS.md` (nur Checkliste und Notizen der letzten Tage) und `concept/14-review-report-2026-11-22.md` Abschnitt 0 sowie AP-xx. Setze nur AP-xx um. Prüfe vorher in der Statustabelle (Abschnitt 4), ob die Voraussetzungen erledigt sind. Hake am Ende die Aufgaben im AP ab, setze die Statuszeile, aktualisiere die Statustabelle und schreibe einen Eintrag ins Session-Protokoll (Abschnitt 10) mit einem Commit-Vorschlag. Committe und pushe nicht selbst.

**Pflichten jeder Session (aus `CLAUDE.md`):**

- Vor größeren Änderungen kurz planen und beim Autor nachfragen; kleine Schritte, danach `npm run typecheck && npm run lint && npm run format:check && npm test`; bei UI-Änderungen zusätzlich `npm run e2e`.
- UI-Texte nur in `apps/web/src/i18n/de.ts`, Code und Tests Englisch, Rechtswerte nur in `config/`, keine neuen Abhängigkeiten ohne konkreten Nutzen.
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
| 04 | Robustheit: Eingaben, Speichern, Daten | P0 | – | Hooks, Kern (Validierung), `DataPage` | [ ] offen |
| 05 | Kern-Ordnerstruktur | P1 | 04, 01 | alle Dateien in `packages/core` | [ ] offen |
| 06 | Web-Ordnerstruktur, i18n- und CSS-Split | P1 | 02, 03, 04, 05 | alle Dateien in `apps/web` | [ ] offen |
| 07 | Design-Mockup v2 | P1 | – | nur `docs/mockups/` | [ ] offen |
| 08 | Design-Umsetzung: Tokens, Typografie, Navigation, Diagramme | P2 | 06, 07 (Freigabe) | `styles/`, Layout, Diagramme | [ ] offen |
| 09 | Rentenplan "Ergebnis zuerst" | P2 | 08 | Rentenplan, Haushaltsansicht, Personenumschalter | [ ] offen |
| 10 | Bausteinseiten-Vorlage und ETF-Seite | P2 | 08 | gemeinsame Komponenten, `EtfPage` | [ ] offen |
| 11 | Depot, bAV, gesetzliche Rente auf die Vorlage | P2 | 10 | die drei Seiten | [ ] offen |
| 12 | Annahmen-Seite und Texte entschlacken | P2 | 08 | `AssumptionsPage`, `AssumptionsPanel`, Texte | [ ] offen |
| 13 | Geführter Einstieg und Fortschritt | P2 | 09 | Seitenleiste, Willkommenskarte, leere Zustände | [ ] offen |
| 14 | Generischer Baustein: Konzept und Mockup | P3 | – | `concept/`, `docs/mockups/` | [ ] offen |
| 15 | Generischer Baustein: Kern und Web | P3 | 05, 06, 14 (Freigabe) | Kern, Seiten, Config, Golden | [ ] offen |
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
Status: offen

**Warum:** B-3 bis B-7, B-9, B-10, U-H.

**Aufgaben:**
- [ ] **B-3:** Im Kern prüfen, wie eine Person mit Rentenbeginn in der Vergangenheit behandelt wird. Vorschlag: Validierungsfehler am Profilfeld ("Mit diesem Geburtsjahr liegt der Rentenbeginn in der Vergangenheit"), und im Rentenplan: Ist eine Person ungültig, zeigt die Hauptzahl **keinen** Lückenwert, sondern einen deutlichen Hinweis mit Sprung zur Person. Test im Kern und E2E.
- [ ] Rentner-Modus ist entschieden (Abschnitt 9, Frage 3) und kommt in AP-19/AP-20. Hier nur die klare Meldung, mit Hinweis "Der Modus für Personen, die schon in Rente sind, folgt".
- [ ] **B-4:** Zentrale Speicherfunktion mit Rückmeldung; schlägt ein Schreibvorgang fehl, erscheint eine dauerhafte Hinweisleiste ("Speichern im Browser nicht möglich. Exportiere deine Daten."). Alle `catch { /* ignore */ }` in Hooks und `onboarding.ts` darauf umstellen.
- [ ] **B-5:** `storage`-Ereignis abhören: Wurde der Haushalt in einem anderen Tab geändert, Hinweis "In einem anderen Fenster wurde etwas geändert. Neu laden?" statt stilles Überschreiben.
- [ ] **B-6:** Bei `pagehide` und `visibilitychange` (hidden) die ausstehenden Eingaben sofort sichern (`usePersist` erweitern).
- [ ] **B-7:** Nebenwirkung aus dem `setState`-Updater von `removePerson` herausziehen.
- [ ] **B-9:** Eine Hilfsfunktion `todayLocal()` (lokales Datum) und die drei Stellen darauf umstellen.
- [ ] **B-10:** Exportmahnung: Hinweisleiste, wenn nie exportiert oder letzter Export älter als 90 Tage (zuerst Safari-Verhalten gegen aktuelle WebKit-Doku prüfen und im Text korrekt formulieren).
- [ ] Neue Tests: Kern (Validierung), Hook-Test für Speicherfehler (Storage-Mock wirft), E2E für Hinweis bei ungültiger Person.

**Fertig wenn:** Eine ungültige Person erzeugt nie ein scheinbar gültiges Haushaltsergebnis; ein fehlgeschlagenes Speichern ist sichtbar; keine Eingabe geht beim Tab-Schließen verloren.
**Nicht Teil davon:** Rentner-Modus (AP-19/AP-20).

---

## 6. Arbeitspakete P1 und P2

### AP-05 Kern-Ordnerstruktur
Status: offen · Voraussetzung: AP-04 erledigt, **keine andere Code-Session offen**

**Warum:** Abschnitt 2.4. Reine Verschiebungen, damit ein Mensch den Kern ordnerweise prüfen kann.

**Aufgaben:**
- [ ] Zielstruktur aus 2.4 mit dem Autor abstimmen (Ordnernamen, Zuordnung der 34 Dateien).
- [ ] Dateien mit `mv` verschieben (Git erkennt Umbenennungen beim Commit des Autors selbst; kein `git mv`, kein `git add`), interne relative Importe und `index.ts` anpassen; öffentliche Schnittstelle bleibt unverändert.
- [ ] Tests spiegeln die Ordner (`packages/core/test/<ordner>/…`), Golden-Vektoren bleiben, Ladepfade in den Tests anpassen.
- [ ] `tools/generate_golden.py` und Verweise in Doku (`README.md`, `docs/`, `concept/`) auf neue Pfade prüfen.
- [ ] `docs/architecture.md` (eine Seite): Ordnerkarte, Abhängigkeitsrichtung (`shared` ← `tax` ← `etf`/`goals`/`pension` ← `overview`), Hinweis "Kern ohne UI/DB/HTTP".
- [ ] ESLint-Regel gegen Importe quer durch Ordner nur wo sinnvoll (optional, keine neue Abhängigkeit).

**Fertig wenn:** `typecheck`, `lint`, `format:check`, 547 Tests und Build sind unverändert grün, `git diff --stat` zeigt nur Verschiebungen und Importzeilen, `apps/web` brauchte keine Änderung.

### AP-06 Web-Ordnerstruktur, i18n- und CSS-Split
Status: offen · Voraussetzung: AP-02, AP-03, AP-04, AP-05, keine andere Code-Session offen

**Aufgaben:**
- [ ] Ordner `app/`, `state/`, `lib/` anlegen und die 28 Wurzeldateien zuordnen (siehe 2.4).
- [ ] `components/` in `charts/`, `forms/`, `layout/`, `cards/` gliedern.
- [ ] Je Seite ein Ordner (`pages/depot/DepotPage.tsx`, `DepotResults.tsx`, …); Dateien über ca. 300 Zeilen aufteilen (Formular, Ergebnis, Tabellen).
- [ ] `i18n/de.ts` in `i18n/de/<seite>.ts` zerlegen, `i18n/de/index.ts` setzt `de` unverändert zusammen (Zugriffe `de.xyz` bleiben gleich).
- [ ] `styles.css` in `styles/tokens.css`, `base.css`, `layout.css`, `components.css`, `pages.css` aufteilen; Dunkel-Tokens **einmal** definieren (z. B. über ein gemeinsames Selektorpaar oder eine kleine Build-Hilfe), ohne Verhalten zu ändern.
- [ ] Verweise in Doku und E2E anpassen.

**Fertig wenn:** Alle Checks und E2E grün, Oberfläche pixelgleich (Screenshot-Vergleich zweier Seiten hell/dunkel), keine Datei im Web über 400 Zeilen außer reinen Textdateien.

### AP-07 Design-Mockup v2
Status: offen · Voraussetzung: keine (nur `docs/mockups/`)

**Aufgaben:**
- [ ] Mockup `docs/mockups/design-v2.html` mit: Rentenplan (Hero zuerst, Haushalt mit zwei Personen), einer Bausteinseite (Depot) in Vorlage "Eingaben | Ergebnis | Rechenweg", Smartphone-Ansicht (375 px) mit Kopfleiste oder Tab-Leiste, hell und dunkel.
- [ ] Vorschläge aus 2.5 darstellen: Typografie-Skala, Abstandsskala, Navigations-Icons, Baustein- und Statusfarben (Chips), leerer Zustand.
- [ ] Palette rechnerisch auf Kontrast prüfen (Text 4,5:1, Bedienelemente und Linien 3:1) und die Werte im Mockup notieren.
- [ ] Smartphone-Navigation: **untere Tab-Leiste** (entschieden, Abschnitt 9, Frage 5; in AP-03 schon gebaut) in das Gesamtdesign einpassen: Icons, aktiver Zustand, "Mehr"-Blatt, hell und dunkel. Keine Varianten mehr nötig.
- [ ] Freigabe des Autors ("Ja, bauen") und Entscheidung in `PROGRESS.md` und `docs/design.md` eintragen.

**Fertig wenn:** Autor hat freigegeben oder Änderungen genannt; die Entscheidung steht schriftlich im Repo.

### AP-08 Design-Umsetzung: Tokens, Typografie, Navigation, Diagramme
Status: offen · Voraussetzung: AP-06, AP-07 (freigegeben)

**Aufgaben:**
- [ ] Tokens: Abstandsskala, Typografie-Skala (16 px Basis), Bausteinfarben, Statusfarben; alte Werte ersetzen, keine festen Farben in Komponenten.
- [ ] Navigation: Inline-SVG-Icons (kleine Komponente, keine Bibliothek), aktiver Eintrag als getönte Pille; Smartphone-Navigation nach Mockup-Entscheidung.
- [ ] `KpiTile` und Hauptzahl größer, Status-Chips-Komponente (`ok`, `hint`, `warn`).
- [ ] Diagramme: Bausteinfarben und Personenvarianten, zusätzlich Muster oder Beschriftung (nicht Farbe allein), Legenden prüfen.
- [ ] Leere-Zustand-Komponente (Text, Knopf).
- [ ] `docs/design.md` aktualisieren (Tokens, Komponenten, Verlauf).
- [ ] Axe-Tests hell und dunkel, Kontrast der neuen Farben, Sichtprüfung Desktop und 375 px.

**Fertig wenn:** Oberfläche entspricht dem freigegebenen Mockup, E2E und axe grün, `design.md` aktuell.

### AP-09 Rentenplan "Ergebnis zuerst"
Status: offen · Voraussetzung: AP-08

**Aufgaben (Befunde U-A, U-B, U-E, U-G):**
- [ ] Reihenfolge: Hero (Hauptzahl, Status-Chip, Balken, ein Satz) mit dem **Wunscheinkommen-Feld direkt daneben**; darunter Szenarioschalter, Zusammensetzung, Verlauf, "Lücke schließen".
- [ ] "Bausteine in der Gesamtsicht" als kompakte Chips oder einklappbar ("Bausteine anpassen") unter dem Hero.
- [ ] Tabellen, Statusliste und Hinweise in einklappbare Abschnitte ("Details", "Hinweise (4)"); wichtige Hinweise (ungültige Person, `important`) bleiben sichtbar und stehen oben.
- [ ] Alten ETF-Endwert (Phase 1) unten **entfernen**; Sparziele-Karte durch einen Link ersetzen (entschieden: Abschnitt 9, Frage 4).
- [ ] Ein einziger Personenumschalter: Reiter bleiben auf der Startseite, das Auswahlfeld in der Seitenleiste entfällt oder ersetzt sie (Entscheidung im Mockup); aktive Person steht in der Überschrift der Bausteinseiten.
- [ ] Hinweis zu geteilten Werten **unter** die Überschrift (U-G).
- [ ] Seitenhöhe vorher/nachher messen (Ziel: Haushalt unter 1.600 px am Desktop, unter 2.400 px am Smartphone mit eingeklappten Details). E2E anpassen (Smoke-Tests nutzen teils Texte aus den verschobenen Bereichen).

**Fertig wenn:** Ein neuer Nutzer sieht ohne Scrollen: Ergebnis, Status, Wunsch, nächste Handlung. Alle Tests grün.

### AP-10 Bausteinseiten-Vorlage und ETF-Seite
Status: offen · Voraussetzung: AP-08

**Aufgaben (Befund U-D):**
- [ ] Gemeinsame Vorlage `BlockPage`: Kopf (Titel, Person, Zweck in einem Satz), Spalte "Eingaben", Spalte "Ergebnis" (am Desktop mitlaufend), Abschnitt "Rechenweg" einklappbar; am Smartphone Reiter "Eingaben | Ergebnis | Rechenweg" oder gestapelt mit festem Ergebnis-Kopf.
- [ ] Gemeinsame Komponenten aus den doppelten Hilfen: `StepsTable`, `ScenarioTable`, `Results`-Rahmen, `WarningList` (aus Depot, bAV, Rente).
- [ ] **ETF-Seite** in zwei Teile trennen: "Sparphase" (Rechner) und "Ruhestand" (Entnahme für den Rentenplan), je mit eigenem Ergebnis nebenan; Schalter "Annahmen aus dem Profil" als reiner Hinweis mit Link.
- [ ] Ergebnisse "oben, kurz"; Detailtabellen darunter einklappbar.
- [ ] Tests und axe, Sichtprüfung Desktop/Smartphone.

**Fertig wenn:** Die ETF-Seite hat höchstens ca. 350 sichtbare Wörter im Ausgangszustand, die Vorlage ist von den anderen drei Seiten nutzbar, Ergebnisse stehen ohne Scrollen neben bzw. über dem Formular.

### AP-11 Depot, bAV und gesetzliche Rente auf die Vorlage
Status: offen · Voraussetzung: AP-10

**Aufgaben:**
- [ ] `DepotPage` (906 Wörter), `OccupationalPage` (693), `StatutoryPage` (440) auf `BlockPage` umstellen; Zulagentabelle und Rechenweg einklappbar, Hinweise gebündelt mit Gewicht (`important` sichtbar, `info` eingeklappt).
- [ ] Zulagentabelle auf dem Smartphone als Kartenliste statt siebenspaltiger Tabelle.
- [ ] Hilfetexte kürzen: ein Satz je Feld, Details hinter "Mehr erfahren" (Begriffe über `withTerms`).
- [ ] Alle drei Seiten auf höchstens ca. 450 sichtbare Wörter im Ausgangszustand bringen.
- [ ] Tests, axe, Sichtprüfung.

**Fertig wenn:** Drei Seiten nutzen dieselbe Vorlage, Wortzahl unter Ziel, keine Funktion verloren (alle Eingaben und Ergebnisse weiter erreichbar).

### AP-12 Annahmen-Seite und Texte entschlacken
Status: offen · Voraussetzung: AP-08

**Aufgaben (Befund U-C):**
- [ ] Seite zweiteilen: oben **"Deine Annahmen"** (Inflation, Renditen, Rentenanpassung, Entnahmerendite, aus dem Profil, nur lesend, mit Link zum Ändern), darunter **"Gesetzliche Werte"** als Aufklappliste je Bereich (Steuern, Rente, Sozialversicherung, Altersvorsorgedepot, Einkommensteuer) mit Statusabzeichen in der Kopfzeile ("2 ungeprüft").
- [ ] Dateinamen (`config/tax-de.json` usw.) aus der Oberfläche entfernen (bleiben in der Doku). Quellenangabe je Wert einklappbar, Text auf Deutsch und ohne Prüfprotokoll ("geprüft am … auf …" nur als kleines Datum).
- [ ] Rechenregeln (Fließtext) in eigene einklappbare Abschnitte je Baustein, nicht als eine lange Seite.
- [ ] Ungeprüfte Werte bleiben deutlich markiert (Regel aus `CLAUDE.md`).
- [ ] Seitenhöhe messen (Ziel unter 2.500 px mit eingeklappten Abschnitten), axe.

**Fertig wenn:** Die Seite beginnt mit Klartext, `unverified` bleibt sichtbar, kein Entwicklerpfad in der Oberfläche.

### AP-13 Geführter Einstieg und Fortschritt
Status: offen · Voraussetzung: AP-09

**Aufgaben (Befund U-F):**
- [ ] Seitenleiste zeigt je Eingabeseite einen Status: leer, ausgefüllt, mit Hinweis (kleines Zeichen plus Text für Screenreader).
- [ ] Nach der ersten Eingabe ersetzt eine Karte "Nächster Schritt" die Willkommenskarte (z. B. "Gesetzliche Rente eintragen", "Wunscheinkommen festlegen", "Daten exportieren"), ausblendbar.
- [ ] Leere Zustände in Bausteinseiten und im Rentenplan mit Knopf zum nächsten Schritt (Komponente aus AP-08).
- [ ] Reihenfolge der Seitenleiste mit dem Ablauf abstimmen (Profil, Bausteine, Rentenplan); Begriff "Bausteine" in der Oberfläche erklären oder durch einen Klartext ersetzen (Entscheidung Autor).
- [ ] E2E: Erststart, erste Eingabe, Karte wechselt, Status in der Leiste.

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
Status: offen · Voraussetzung: keine

**Aufgaben:**
- [ ] Konzeptdatei `concept/15-phase-6-generic-block.md` (Muster wie `09`): Felder (Name, Art, Betrag pro Monat in heutiger Kaufkraft oder nominal, Beginnalter, Endalter, jährliche Anpassung, steuerpflichtig ja/nein/Anteil, Kranken-/Pflegeversicherung ja/nein), Zuordnung zu Gesamtsicht, Haushalt, Workspace-Format (neuer Block, Versionierung), Rechenregeln, Tests, Golden-Vektoren.
- [ ] Mehrere Einträge je Person (Liste), Beispiele: Riester-Rente laut Standmitteilung, private Rentenversicherung, Mieteinnahmen, Pension.
- [ ] Abgrenzung zu später (echte Riester-/Rürup-Modelle, Immobilie mit Restschuld): nur beschreiben, nicht bauen.
- [ ] Mockup `docs/mockups/sonstige-einkuenfte.html`; Freigabe des Autors.
- [ ] `01`, `06`, `07` und `PROGRESS.md` (Phase 6) ergänzen.

**Fertig wenn:** Konzept und Mockup liegen vor und sind freigegeben, Offene Punkte stehen in `07`.

### AP-15 Generischer Baustein: Kern und Web
Status: offen · Voraussetzung: AP-05, AP-06, AP-14 (freigegeben)

**Aufgaben:** (Detail nach `15-phase-6-generic-block.md`)
- [ ] Kern: Typen, Validierung (Fehler als Daten), Projektor für das Rentenplan-Modell, Anbindung an `overview` und `householdOverview`, Block-Validator und Workspace-Format (Version, Migration).
- [ ] Tests, Property-Tests (Endlichkeit), Golden-Vektoren mit Python-Generator und Excel-Blatt.
- [ ] Web: Seite, Hook, Eintrag in Seitenleiste und Gesamtsicht, Texte in `de.ts`, Beispieldaten ergänzen.
- [ ] E2E-Smoke und axe, README und `docs/assumptions.md`.

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
- Dunkelmodus nur per axe geprüft, nicht visuell durchgesehen: im Rahmen von AP-08 nachholen.
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

---

## 10. Session-Protokoll (jede Session hängt hier einen Eintrag an)

Format: `JJJJ-MM-TT – AP-xx – was gemacht – Abweichungen – was offen blieb – Commit-Vorschlag`

- 2026-11-22 – Review erstellt (kein AP). Befunde in Abschnitt 2, Pakete AP-01 bis AP-18. Nichts davon umgesetzt.
- 2026-11-22 – Entscheidungen des Autors eingearbeitet (Abschnitt 9). Neu: AP-19/AP-20 (Rentner-Modus), AP-01 und Git-Regeln (nur der Autor committet), AP-03/AP-07 (untere Tab-Leiste), AP-16 zurückgestellt, AP-17 fragt Release-Entscheidungen selbst. Frage 4 und 7 offen. Kein Code geändert.
- 2026-11-22 – Entscheidungen nachgetragen: Frage 4 ja (Sparziele raus aus Rentenplan), Frage 7 ja (Splitting als ausdrückliche Paar-Frage, Single unberührt, kein stilles Vorbelegen). Name der App wird in separater Session des Autors geklärt; Repo-Name blockiert AP-01 nicht. Kein Code geändert.

- 2026-11-22 – AP-01 – Datenscan (keine echten Nutzerdaten, keine Schlüssel; Treffer nur Testcode für Import-Härtung; Beispiele `synthetic`, xlsx-Metadaten ohne Autor; `settings.local.json` ignoriert); `.gitignore` geprüft, unverändert; `git init -b main`, `origin` = `git@github.com-privat:antoniotroiano/valiva-app.git` (privater Alias aus `~/.ssh/config`, auf Wunsch des Autors gelesen, Schlüssel nicht angefasst), kein `add`/`commit`/`fetch`/`push`; `CLAUDE.md` und `CONTRIBUTING.md` angepasst; `apps/web/src/arningText.ts` gelöscht (B-8); 70 Notizen aus `PROGRESS.md` wortgleich nach `concept/PROGRESS-notes-archive.md` (per `cmp` geprüft), `PROGRESS.md` von 68 KB auf 20 KB; `typecheck`, `lint`, `format:check` und 547 Tests grün (kein E2E, keine UI-Änderung). Commit-Identität erst nicht, auf Wunsch des Autors dann doch lokal gesetzt (`user.name`, noreply-`user.email`). Offen: erster Commit, Tag `baseline-2026-11-22`, Push durch den Autor; erst danach AP-02. Commit-Vorschlag: `chore: prepare local git repository, add contribution rules and archive progress notes`. Geänderte Ordner: Wurzel (`CLAUDE.md`, `CONTRIBUTING.md`, neu `.git/`), `concept/` (`PROGRESS.md`, `PROGRESS-notes-archive.md`, dieser Bericht), `apps/web/src/` (eine leere Datei gelöscht).

- 2026-11-22 – AP-02 – Ursachen behoben: `.grid`/`.target-grid` einspaltig mit `minmax(0, 1fr)`, `min-width: 0` für Grid-Kinder, `.card`, `fieldset`; `.input-row`-Felder schrumpfbar (Sparziele: Schaltfläche "Datum entfernen" sprengte die Breite). Neue Komponente `ScrollTable` (`role="region"`, `tabIndex=0`, `aria-label`) ersetzt alle Tabellen-Wrapper, auch die schon vorhandenen `.table-wrap` (waren nicht fokussierbar); lange Tabellenüberschriften brechen um und bleiben beim Seitwärtsscrollen stehen. Eingaben 16 px, Tippflächen mindestens 44 px (`summary`, `.btn`, Menü-Taste, Eingaben, Segmentschalter; auf Smartphone-Breite), Segmentschalter füllt die Breite. `theme-color` hell/dunkel, `viewport-fit=cover`, `env(safe-area-inset-*)` für Kopfleiste und Inhalt. Neuer `e2e/mobile.spec.ts` (22 Tests: 10 Seiten × hell/dunkel bei 375 px, Rentenplan und Depot bei 320 px; prüft Seitenbreite, fokussierbare Scrollbereiche, 16 px, 44 px, Aufklapp-Dreiecke). Sichtprüfung 375 px (alle zehn Seiten) und 320 px (Rentenplan, Depot), hell und dunkel, per Screenshot: nichts abgeschnitten außer bewusst scrollenden Tabellen und langen Auswahltexten (Backlog). Eigene Regression beim Bauen gefunden und behoben: `display: flex` auf `summary` entfernte das Aufklapp-Dreieck. Gemessen vorher: bis 679 px, nachher überall = Fensterbreite. `typecheck`, `lint`, `format:check`, 547 Unit-Tests grün; E2E 98/98 grün, aber über temporäre Konfiguration auf Port 5199, weil Port 5173 von einem fremden Dev-Server (`fitness-app`) belegt war (Backlog). Abweichungen: `ScrollTable` auch für die bereits gewrappten Tabellen (Konzept nannte nur die ungewrappten); Backlog um sieben Punkte ergänzt. Offen: Commit durch den Autor; AP-03 kann folgen. Commit-Vorschlag: `fix(web): repair phone layout (grid min-width, ScrollTable, 16px inputs, 44px targets) and add mobile e2e test`. Geänderte Ordner: `apps/web/` (`index.html`, `src/styles.css`, `src/components/`, `src/pages/`), `e2e/` (neu `mobile.spec.ts`), `concept/` (dieser Bericht, `PROGRESS.md`).

- 2026-11-22 – AP-03 – Mockup `docs/mockups/mobile-nav.html` vom Autor mit "Ja, bauen" freigegeben; Rückfragen vorab: "Eingaben" öffnet ein Blatt (Profil, vier Bausteine, Sparziele), "Mehr" enthält Annahmen, Daten, Darstellung; Leiste bis 900 px (wie das bisherige einspaltige Layout). Umgesetzt: Seitenwechsel scrollt sofort nach oben (kein weiches Scrollen, also auch mit `prefers-reduced-motion`) und fokussiert die sichtbare `h1` (`tabIndex=-1`; wartet bei lazy geladenen Seiten, weil React die alte Seite versteckt im DOM lässt); `document.title` "Seite – Pathwise" (`de.nav.pageTitle`, Name aus `appConfig` über `de.appName`); neue Komponente `MobileNav` (schmale Kopfzeile mit Name und Auswahlfeld "Aktive Person", feste untere Leiste mit Rentenplan, Eingaben, Haushalt, Mehr, mindestens 56 px plus `env(safe-area-inset-bottom)`, Inhalt bekommt unten gleich viel Abstand); Blätter liegen über der Leiste, schließen nach Auswahl, per Escape, Schließen-Taste und Rand, Fokus kehrt zur Taste zurück, aktives Ziel hat `aria-current`, Seite dahinter ist `inert`. Das alte Hamburger-Menü entfällt (Texte `nav.menu`/`nav.close` entfernt). Es wird immer nur eine der beiden Navigationen gerendert (`useNarrowScreen`), sonst gäbe es doppelte Beschriftungen. Skip-Link: war ein Fehler (`#main` wurde vom Hash-Router als unbekannte Seite gelesen und sprang zum Rentenplan), jetzt Fokus auf `main` ohne Hash-Änderung. Neuer `e2e/navigation.spec.ts` (16 Tests: Scroll, Fokus, Titel, Leiste, Blätter, Escape, Fokus-Rückgabe, inert, Personenwechsel, Skip-Link, axe mit und ohne Blatt, hell und dunkel). Sichtprüfung 375 px hell und dunkel (Rentenplan, beide Blätter) per Screenshot. `typecheck`, `lint`, `format:check`, 547 Unit-Tests grün; E2E 114/114 grün, aber über temporäre Konfiguration auf Port 5199 (Port 5173 von `fitness-app` belegt, Backlog). Abweichungen: (1) Blatt ist nicht-modal (`role="dialog"` ohne `aria-modal`), damit die Leiste bedienbar bleibt; stattdessen `inert` auf Inhalt und Kopfzeile. (2) Nach einer Auswahl steht der Fokus auf der neuen Überschrift (B-2), nicht auf der "Mehr"-Taste; dorthin kehrt er bei Abbruch zurück. (3) Zusätzlich Darstellung (Hell/Dunkel/System) in "Mehr" und Personenauswahl in der Kopfzeile, beides im Mockup gezeigt. Offen: Commit durch den Autor; Backlog um vier Punkte ergänzt. Commit-Vorschlag: `feat(web): add phone bottom tab bar with sheets, scroll reset, heading focus and page titles`. Geänderte Ordner: `apps/web/` (`src/App.tsx`, `src/components/MobileNav.tsx` neu, `src/i18n/de.ts`, `src/styles.css`), `e2e/` (neu `navigation.spec.ts`), `docs/mockups/` (neu `mobile-nav.html`), `concept/` (dieser Bericht, `PROGRESS.md`).
