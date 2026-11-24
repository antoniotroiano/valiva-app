# Sicherheit

## Sicherheitsprobleme melden

Bitte melde Sicherheitsprobleme **nicht öffentlich** als Issue, sondern privat über GitHub:

1. Öffne den Reiter **Security** dieses Repos.
2. Wähle **Report a vulnerability** ("Private vulnerability reporting").
3. Beschreibe, was du gefunden hast und wie man es nachstellt. Schreibe keine echten persönlichen Finanzdaten in die Meldung.

Die Meldung sehen nur du und der Autor. Es gibt keinen Anspruch auf eine Antwort oder auf eine bestimmte Frist; der Autor pflegt die App privat in seiner Freizeit.

## Was die App ist

Valiva läuft komplett im Browser. Es gibt keinen eigenen Server, keine Konten und kein Tracking. Die Eingaben liegen im lokalen Speicher des Browsers. Die Sicherheitsrichtlinie der Seite (Content Security Policy) verbietet der App nach dem Laden jede Verbindung (`connect-src 'none'`). Die Seite wird über GitHub Pages ausgeliefert. Mehr dazu steht im Abschnitt "Datenschutz" der [README](README.md).

Relevant sind deshalb vor allem Fehler, durch die fremder Code in der Seite laufen könnte (zum Beispiel über eine importierte Datei), durch die Daten die App verlassen könnten, oder durch die der Browserspeicher verfälscht würde. Rechenfehler und falsche Rechtswerte sind keine Sicherheitsprobleme; dafür gibt es normale Issues (siehe "Mitwirken" in der README).

## Unterstützte Versionen

Unterstützt wird nur die **neueste veröffentlichte Version** (die öffentliche Seite zeigt immer diese). Ältere Versionen bekommen keine Korrekturen.
