# So rechnet die App (Überblick)

Dies ist eine einfache Übersicht, kein Fachtext und keine Rechts- oder Steuerberatung. Die genauen Regeln stehen auf der Seite **Annahmen** in der App und in [`assumptions.md`](assumptions.md) (Englisch, mit allen Details). Die App rechnet **vereinfacht**: Sie ersetzt weder eine Beratung noch die Rentenauskunft der Rentenversicherung.

## Der Grundgedanke

Für jede Einkommensquelle rechnet die App aus, wie viel **netto pro Monat** ab deinem Rentenbeginn übrig bleibt, nach Steuern und Abgaben. Der Rentenplan zählt die Quellen zusammen und vergleicht die Summe mit deinem Wunscheinkommen. Die Differenz ist die Rentenlücke.

Alle Beträge im Rentenplan stehen in **Kaufkraft von heute**. Die App rechnet die Inflation heraus, damit du Zahlen in Jahrzehnten mit dem vergleichen kannst, was du heute kennst.

## Drei Szenarien statt einer Zahl

Wie sich Märkte entwickeln, ist unbekannt. Deshalb rechnet die App ETF, Depot und bAV in drei Szenarien (pessimistisch, neutral, optimistisch) mit jeweils einer angenommenen Rendite pro Jahr. Du stellst die Werte im Profil ein. Die gesetzliche Rente und feste Beträge sind in allen drei Szenarien gleich. Die "Spanne" im Rentenplan zeigt dir, wie weit die Ergebnisse auseinanderliegen.

## Die einzelnen Bausteine

- **ETF-Sparplan:** Die App rechnet Monat für Monat: Sparrate einzahlen, Rendite abzüglich Fondskosten gutschreiben, Depotgebühr abziehen. Die Steuer auf den Gewinn (Abgeltungsteuer, Teilfreistellung, Sparerpauschbetrag) fällt am Ende an; optional kannst du die Vorabpauschale und die Kirchensteuer berücksichtigen. Im Ruhestand wird das Kapital als gleichbleibende monatliche Rate bis zu einem Endalter ausgezahlt.
- **Gesetzliche Rente:** Ausgangspunkt ist der Betrag aus deiner Renteninformation. Er wird bis zum Rentenbeginn angepasst, bei früherem Beginn gibt es einen Abschlag, bei späterem einen Zuschlag. Vom Brutto gehen Einkommensteuer (nur ein Anteil der Rente ist steuerpflichtig, er hängt vom Jahr des Rentenbeginns ab) sowie Kranken- und Pflegeversicherung ab.
- **Altersvorsorgedepot:** Beiträge plus Zulagen, abzüglich Kosten, mit Garantie-Varianten. Die Auszahlung ist voll steuerpflichtig.
- **Betriebliche AV:** Entgeltumwandlung mit Arbeitgeberzuschuss. Die App schätzt, was dich die Umwandlung netto kostet, und rechnet die Abgaben im Alter ein.
- **Sonstige Einkünfte:** Ein von dir eingegebener Monatsbetrag, der durch die Zeit getragen und je nach Auswahl besteuert wird. Hier prognostiziert die App kein Kapital.
- **Sparziele:** Zinsen auf ein kurzfristiges Sparziel mit Zinssteuer, getrennt von der Rente.

**Steuer im Alter:** Die Einkommensteuer auf Renten rechnet die App nach dem Tarif auf die Summe aller deiner Renten. Nicht berücksichtigt sind unter anderem Solidaritätszuschlag und Kirchensteuer auf Renten.

## Gesetzliche Werte und was "ungeprüft" heißt

Steuersätze, Freibeträge und andere gesetzliche Werte stehen nicht im Programmcode, sondern in Dateien im Ordner `config/` (jeweils mit Gültigkeit, Quelle und Status). Auf der Seite **Annahmen** siehst du sie mit ihrem Status:

- **bestätigt:** Der Wert wurde gegen den Gesetzestext oder eine amtliche Quelle geprüft.
- **ungeprüft:** Der Wert ist eine Annahme oder wurde noch nicht gegen eine amtliche Quelle belegt. Die App markiert ihn überall dort, wo er in eine Rechnung eingeht, und zeigt einen Hinweis.

Aktuell sind **fünf Werte ungeprüft** (Kirchensteuersätze, Basiszins ab 2027, Altersgrenze der Kinderzulage, Riester voll steuerpflichtig). Wie die Prüfung lief, steht in [`legal-values-review.md`](legal-values-review.md). Gesetze ändern sich; prüfe Werte, die für dich wichtig sind, selbst nach.

## Wie die Rechnung geprüft wird

Der Rechenkern ist unabhängig von der Oberfläche und mit automatischen Tests abgesichert. Ausgewählte Fälle wurden von Hand gegen eine unabhängige Excel-Rechnung geprüft (`tools/golden-check.xlsx`). Das macht Rechenfehler unwahrscheinlicher, ersetzt aber nicht deine eigene Plausibilitätsprüfung mit deiner Renteninformation.

## Weiterlesen

- [Erste Schritte](getting-started.md)
- [Häufige Fragen](faq.md)
