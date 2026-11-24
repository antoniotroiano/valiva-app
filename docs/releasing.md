# Eine Version veröffentlichen

Kurzfassung: Changelog füllen, Version in `package.json` erhöhen, committen, pushen. Den Rest macht GitHub: Es erzeugt Tag und Release und aktualisiert danach die öffentliche Seite. Eine Claude-Session erhöht die Version, committet oder pusht nicht; das macht nur der Autor.

## Grundlagen

- **Schema:** Semantic Versioning `MAJOR.MINOR.PATCH`, immer genau `x.y.z` (kein `-beta`, kein `v` im `package.json`). Der Tag heißt `v<version>`, zum Beispiel `v0.1.0`.
- **Eine Quelle:** `version` im Wurzel-`package.json`. Die Pakete unter `apps/` und `packages/` sind `private` und behalten `0.0.0`. Die Oberfläche zeigt die Version am Fuß der Seite "Daten", und die Exportdatei trägt sie im Feld `appVersion` (nur zur Information, sie entscheidet nie über den Import).
- **Zwei getrennte Nummern:** Die App-Version (`package.json`) und die Version des Dateiformats (`schemaVersion` im Workspace) sind nicht dasselbe. Die Formatversion steigt nur, wenn sich das Dateiformat ändert, und hat eine Migration.
- **`0.x` heißt "in Entwicklung":** Verhalten und Dateiformat können sich ändern. `1.0.0` erst, wenn das Datenformat als stabil zugesagt ist und die offenen Punkte geklärt sind (Rentner-Modus, die fünf ungeprüften Rechtswerte).

## Welche Ziffer steigt

| Ziffer                                  | Wann                                                                                          | Beispiel                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| PATCH (`0.1.0` auf `0.1.1`)             | Fehlerkorrektur, jährliche Aktualisierung der Rechtswerte, reine Textänderung                 | Basiszins 2027 eingetragen          |
| MINOR (`0.1.0` auf `0.2.0`)             | neue Funktion oder neuer Baustein, ohne dass alte Dateien unlesbar werden                     | Rentner-Modus                       |
| MAJOR (`0.x` auf `1.0.0`, dann `2.0.0`) | Bruch des Datenformats (alte Dateien lassen sich nicht mehr importieren oder nur mit Verlust) | neue `schemaVersion` ohne Migration |

Solange die Version unter `1.0.0` liegt, gilt für einen Formatbruch die MINOR-Ziffer, und der Changelog sagt es deutlich.

## So veröffentliche ich eine Version

1. **Changelog füllen:** In `CHANGELOG.md` die Einträge aus `## [Unreleased]` in einen neuen Abschnitt `## [x.y.z] - JJJJ-MM-TT` verschieben (Englisch, Gruppen wie `Added`, `Changed`, `Fixed`). `## [Unreleased]` bleibt leer stehen. Unten die Links ergänzen: `[Unreleased]` zeigt auf `compare/v<x.y.z>...HEAD`, dazu eine Zeile `[x.y.z]: …/releases/tag/vx.y.z`.
2. **Version erhöhen:** `version` in `package.json` auf `x.y.z` setzen (und im `package-lock.json` die beiden Zeilen mit der Wurzelversion, oder `npm install --package-lock-only` laufen lassen).
3. **Lokal prüfen:** `npm run check:release` (Version gültig, Changelog-Abschnitt vorhanden), dann die üblichen Prüfungen (`npm run typecheck && npm run lint && npm run format:check && npm test`).
4. **Committen und pushen** auf `main` (GitHub Desktop), zum Beispiel `chore: release 0.1.0`.
5. **Prüfen** (siehe unten): Actions, Releases, Tags, Seite.

## Was GitHub danach tut

1. Der Push startet das **CI** (`ci.yml`). Es führt auch `npm run check:release` aus. Ist die Version ungültig oder fehlt der Changelog-Abschnitt, ist das CI rot, und es entsteht nichts.
2. Ist das CI auf `main` **grün**, startet der **Release-Workflow** (`release.yml`, Auslöser `workflow_run`). Er läuft nur für einen erfolgreichen Push-Lauf auf `main` im eigenen Repository, nicht für Pull Requests oder Forks.
3. Er holt **genau den Commit** des CI-Laufs, prüft Version und Changelog erneut und liest den Abschnitt der Version als Release-Text.
4. Er fragt, ob der Tag `v<version>` schon existiert. **Existiert er, tut der Workflow nichts** (jeder normale Push ohne neue Version endet hier). Existiert er nicht, erzeugt er mit der `gh`-Befehlszeile Tag und Release auf diesem Commit.
5. Nur wenn ein Release entstanden ist, ruft er `pages.yml` auf: Das baut genau diesen Commit (mit Tests) und aktualisiert die Seite.

Nur der Job `release` hat Schreibrechte (`contents: write`), alle anderen nur Lesen. Die Actions sind auf Commit-SHAs festgelegt wie im CI. Der Workflow veröffentlicht nie etwas, was das CI nicht bestanden hat.

**Wichtig:** Ein normaler Push auf `main` veröffentlicht die Seite **nicht** mehr. Die öffentliche Seite zeigt immer die letzte freigegebene Version. Eine Korrektur erscheint dort erst mit der nächsten Version (zum Beispiel einer PATCH-Version); bis dahin ist sie auf der Beta-Seite (unten) zu sehen.

## Beta-Seite (jeder Stand von `main`)

Weil ein Push ohne neue Version die öffentliche Seite nicht ändert, gibt es eine **Beta-Seite** zum Ausprobieren: <https://antoniotroiano.github.io/valiva-app-beta/>.

- **Ablauf:** Ist das CI auf `main` grün, baut `beta.yml` die App im Beta-Modus (`VALIVA_CHANNEL=beta`) und schiebt das Ergebnis per Deploy-Key in das Repo `antoniotroiano/valiva-app-beta` (Branch `main`, jedes Mal ein neuer Einzel-Commit, kein Verlauf). Die Pages-Seite dieses Repos zeigt es. Mit einer neuen Version veröffentlicht `main` natürlich auch die Beta.
- **Eigener Speicher:** Die Beta nutzt den Präfix `valiva-beta.` statt `valiva.`. Beide Seiten liegen unter `antoniotroiano.github.io`, teilen sich also den Browserspeicher, aber nie einen Schlüssel. Die Beta sieht deine echten Daten nicht und überschreibt sie nicht. Sie trägt oben einen Hinweis "Beta-Version zum Testen", den Titel "Valiva Beta", `noindex` und exportiert Dateien als `valiva-beta-….workspace.json` (dasselbe Format, also in die echte App importierbar).
- **Lokal prüfen:** `VALIVA_CHANNEL=beta npm run build` baut die Beta, `npm run preview -w @valiva/web` zeigt sie.
- **Einmalige Einrichtung** (macht der Autor, die Session kann Schlüssel und Secrets nicht anlegen):
  1. Schlüsselpaar erzeugen: `ssh-keygen -t ed25519 -N "" -C "valiva-beta-deploy" -f ~/valiva-beta-key`.
  2. Beta-Repo, Settings, Deploy keys, "Add deploy key": Inhalt von `~/valiva-beta-key.pub` einfügen, **"Allow write access"** anhaken.
  3. Haupt-Repo `valiva-app`, Settings, Secrets and variables, Actions, "New repository secret": Name `BETA_DEPLOY_KEY`, Inhalt von `~/valiva-beta-key` (der private Schlüssel).
  4. Beide Schlüsseldateien löschen: `rm ~/valiva-beta-key ~/valiva-beta-key.pub`.
  5. Nach dem ersten Lauf von `beta.yml`: Beta-Repo, Settings, Pages, Quelle "Deploy from a branch", Branch `main`, Ordner `/ (root)`.
- **Fehler:** "Secret BETA_DEPLOY_KEY is missing": Secret fehlt oder falsch benannt. "Permission denied (publickey)" oder "The key you are trying to use does not have write access": Deploy-Key im Beta-Repo ohne Schreibrecht oder falscher Schlüssel. Nach der Korrektur im Lauf "Publish beta" "Re-run all jobs".
- **Hinweis:** Das Beta-Repo ist öffentlich (GitHub Pages im kostenlosen Konto) und enthält nur den gebauten Stand, keinen Quellcode und keine Daten.

## Prüfen nach dem Push

- **Actions:** Läuft "CI" grün, danach "Release" (Job `release`, dann `pages`). Beim Push ohne neue Version zeigt "Release" im Schritt "Create tag and release" nur "Tag … already exists, nothing to do".
- **Releases und Tags:** Es gibt `v<version>` mit dem Changelog-Text, der Tag zeigt auf den gepushten Commit.
- **Seite:** <https://antoniotroiano.github.io/valiva-app/>, Seite "Daten", unten steht die neue Version.

## Einmalig in GitHub prüfen

- **Settings, Actions, General, Workflow permissions:** Die Voreinstellung "Read repository contents and packages permissions" reicht. Der Release-Job fordert sein Schreibrecht selbst an. Steht dort etwas, das Workflow-Rechte begrenzt, oder verbietet eine Organisationsrichtlinie das Erzeugen von Releases, scheitert der Job mit "Resource not accessible by integration".
- **Settings, Rules (Tags, Branches):** Schützt eine Regel Tags nach dem Muster `v*`, muss sie das Erzeugen durch `github-actions` erlauben. Der Branch-Schutz von `main` stört nicht, der Workflow pusht nichts.
- **Settings, Pages:** Quelle "GitHub Actions" (so läuft es schon). **Settings, Environments, github-pages:** Die Bereitstellung muss von `main` aus erlaubt sein (Voreinstellung).
- **Settings, Actions, General, Actions permissions:** Erlaubt sind die verwendeten Actions (`actions/*`); sie sind per SHA festgelegt.

## Wenn etwas schiefgeht

- **CI rot nach dem Push:** Es entsteht kein Release. Fehler beheben, committen, pushen. Steht dieselbe Version noch in `package.json`, entsteht das Release mit dem grünen Lauf. Hängt es nur an einem flackernden Test: im CI-Lauf "Re-run all jobs", der Release-Workflow startet danach neu.
- **Release-Workflow rot:** Fehlermeldung im Lauf lesen. Meist Format der Version, fehlender Changelog-Abschnitt oder fehlende Rechte (siehe oben). Nach der Korrektur pushen oder den CI-Lauf erneut starten.
- **Release ist da, aber die Seite nicht aktualisiert (Job `pages` rot):** Im Lauf "Release" den Job `pages` erneut starten ("Re-run failed jobs"; der Job `release` läuft nicht noch einmal). Alternativ Actions, "Deploy to GitHub Pages", "Run workflow" von `main`, Feld `ref` mit dem Tag (`v0.1.0`).
- **Falsches Release (falsche Version, falscher Text):** Auf GitHub unter Releases das Release **löschen** und danach unter Tags den Tag `v<version>` **löschen** (Release und Tag sind zwei getrennte Dinge; bleibt der Tag, tut der Workflow bei der gleichen Version nichts). Dann `package.json` und Changelog korrigieren, committen, pushen. Der grüne CI-Lauf erzeugt das Release neu. Soll nur der Release-Text geändert werden, genügt es, das Release auf GitHub zu bearbeiten.
- **Version zu früh oder falsch erhöht, noch nicht gepusht:** `package.json` und Changelog zurücksetzen. `npm run check:release` meldet, wenn der Changelog einen Abschnitt hat, der neuer ist als die Version.
- **Tag existiert, aber kein Release:** Den Tag löschen (oder das Release von Hand auf diesem Tag anlegen). Der Workflow legt zu einem vorhandenen Tag nichts an.
- Ein Tag oder Release nie "überschreiben": Eine veröffentlichte Version bleibt, wie sie war. Für Korrekturen eine neue PATCH-Version erzeugen.

## Nicht Teil davon

Signierte Releases, Veröffentlichung auf npm und automatisches Hochzählen der Version gibt es nicht. Jede Version setzt der Autor selbst.
