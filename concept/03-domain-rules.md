# 03 – Fachliche Rechenregeln und Fachregeln-Recherche

Stand der Recherche: 2026-11-09. Nichts davon ersetzt den Gesetzestext oder eine Steuerberatung; die App muss das deutlich ausweisen ("keine Anlage- oder Steuerberatung").

## 1. Allgemeine Rechenregeln

- Zeitschritt monatlich; Rendite als p. a. geometrisch umgerechnet (nicht nominal/12)
- Kosten: TER laufend, optional Ausgabeaufschlag und Depotgebühr
- ETF-Steuer (vereinfacht): Abgeltungsteuer 26,375 % auf Gewinne, Teilfreistellung Aktienfonds 30 %, Sparerpauschbetrag 1.000 €; Vorabpauschale optional (Review `13` F-7b), sonst ignoriert
- Gesetzliche, betriebliche und Altersvorsorgedepot-Renten: nachgelagerte Besteuerung: **Einkommensteuer nach Tarif §32a EStG auf die Summe aller Renteneinkünfte einer Person** (seit Teilphase 6a, vorher pauschaler Satz), Abgaben als pauschaler Satz je Baustein; kein Solidaritätszuschlag, keine Kirchensteuer; Zusammenveranlagung (Splitting) nur nach ausdrücklicher Antwort bei zwei Personen (AP-16, `docs/assumptions.md`)
- Alle Beträge intern nominal; Darstellung nominal **und** real (deflationiert)
- Zahlentyp: Gleitkomma (double) genügt für Prognosen, gerundet wird nur bei der Anzeige. Dezimalarithmetik erst bei späterem Ist-Tracking (Käufe)
- Berechnungen deterministisch und ohne Zufall (außer eine spätere, explizite Monte-Carlo-Funktion mit festem Seed)

## 2. Umgang mit Rechtswerten

Alle gesetzlichen Werte kommen in `config/` mit Feldern `value`, `validFrom`, `validTo`, `source`, `status` (`confirmed`/`unverified`), nie in den Code. Die UI zeigt bei `unverified` einen Hinweis. Die Staffelung der Altersvorsorgedepot-Zulage ist ein Konfig-Array (Eigenbeitragsstufen mit Prozentsatz). Rentenwert-Entwicklung, Inflation und Renditen sind **Annahmen des Nutzers** mit Defaults, keine Rechtswerte. Phase 3 startet erst, wenn die als **unsicher** markierten Punkte unten gegen Primärquellen geprüft sind (BMF-FAQ, BGBl., BMG).

Status: **bestätigt** = mehrere übereinstimmende Quellen oder amtliche Quelle; **unsicher** = Ratgeberseiten, widersprüchlich oder nur ein Treffer.

## 3. Gesetzliche Rente

| Regel | Wert | Status |
|---|---|---|
| Aktueller Rentenwert ab 01.07.2026 | 42,52 € je Entgeltpunkt (vorher 40,79 €), +4,24 % | bestätigt (DRV, Bundesregierung) |
| Haltelinie Rentenniveau | bis einschließlich 01.07.2031 | bestätigt (DRV) |
| Regelaltersgrenze Jahrgang ab 1964 | 67 Jahre | bestätigt (DRV) |
| Abschlag bei vorzeitigem Beginn | 0,3 % pro Monat, dauerhaft, max. 14,4 % | bestätigt (DRV) |
| Zuschlag bei späterem Beginn | 0,5 % pro Monat nach Regelaltersgrenze (6 % pro Jahr) | bestätigt (DRV) |
| Beitragsbemessungsgrenze RV 2026 | 8.450 €/Monat, 101.400 €/Jahr, bundeseinheitlich | bestätigt |

Modellfolge: Rente = Entgeltpunkte · aktueller Rentenwert · (1 − Abschlag bzw. + Zuschlag). Künftige Rentenwerte sind eine Annahme (Default z. B. 2,5 % p. a.).

## 4. Besteuerung der Rente

- Besteuerungsanteil nach Rentenbeginn: 2026 = 84,0 %, 2027 = 84,5 %, +0,5 Prozentpunkte pro Jahr (Wachstumschancengesetz), 100 % für Rentenbeginn 2058 (bestätigt, DRV/mehrere Quellen). Der Anteil ist **kein Steuersatz**; der persönliche Satz ergibt sich erst nach Freibeträgen
- App: Besteuerungsanteil aus Rentenbeginnjahr berechnen, danach pauschaler persönlicher Steuersatz als Eingabe

## 5. Krankenversicherung/Pflege der Rentner (2026)

- KV allgemein 14,6 %, Rentner tragen die Hälfte (7,3 %) plus die Hälfte des Zusatzbeitrags (Durchschnitt 2,9 % für 2026 **und 2027**, BMG-Festlegung vom 30.10.2026): **bestätigt** (BMG, DRV). Der tatsächlich erhobene Schnitt liegt bei 3,13 % (vdek), die Sätze sind kassenindividuell
- Pflege 3,6 % (Kinderlose 4,2 %), Rentner tragen den vollen Beitrag: **bestätigt** (DRV, BMG); eine Quelle nennt den veralteten Satz 3,4 %
- Betriebsrente: KV-Freibetrag 2026 = 197,75 €/Monat = 1/20 der Bezugsgröße (3.955 €), nur für Pflichtversicherte KVdR, darüber voller KV-Satz: mehrere Quellen, Gesetzestext § 226 SGB V nicht direkt gelesen. Pflege hat eine Freigrenze statt eines Freibetrags (alles oder nichts): **weiter unsicher** (Ratgeber)
- Kapitalauszahlungen aus Direktversicherung gelten als Versorgungsbezug, beitragspflichtig verteilt über 120 Monate: **unsicher**
- App: pauschaler Abgabensatz im Alter pro Baustein als Eingabe, Default aus diesen Werten, Hinweis auf Kassenindividualität

## 6. Betriebliche Altersvorsorge

- Steuerfrei bis 8 % der BBG RV = 676 €/Monat (8.112 €/Jahr), SV-frei bis 4 % = 338 €/Monat (4.056 €/Jahr), 2026: bestätigt
- Pflichtzuschuss des Arbeitgebers bei Entgeltumwandlung: **15 %** des umgewandelten Entgelts, soweit der Arbeitgeber Sozialabgaben spart (§ 1a Abs. 1a BetrAVG, gesetze-im-internet.de): **bestätigt**. Stichtage für neue und bestehende Verträge stehen in § 26a und wurden nicht geprüft; das Modell wendet den Zuschuss auf alle Verträge an
- Der Wert "ca. 302 €/Monat" für die SV-freie Grenze aus einer Quelle ist veraltet (4 % der alten BBG); gültig ist 338 € (4 % von 8.450 €)
- Versicherungspflichtgrenze KV (6.450 €/Monat laut einer Quelle): **unsicher**, nicht verwenden, bis amtlich bestätigt

## 7. Altersvorsorgedepot (Altersvorsorgereformgesetz)

- Gesetz verkündet: BGBl. 2026 I Nr. 156, ausgegeben 29.05.2026 (Gesetz vom 26.05.2026): bestätigt. Start 01.01.2027 laut Quellen
- Seit 2026-11-11 gegen den Gesetzestext geprüft (BGBl.): Grundzulage, Kinderzulage, Mindesteigenbeitrag, Produkte und Auszahlphase sind **bestätigt**, Details in Abschnitt 12
- Grundzulage: 50 % auf Beiträge bis 360 €, 25 % auf 360,01–1.800 € → maximal **540 €/Jahr**; Kinderzulage 100 % der Beiträge bis 1.800 € je Kind, höchstens 300 € je Kind; Bonus 200 € "einmalig" unter 25 Jahren; Mindesteigenbeitrag **120 €/Jahr** ab 2027
- **Widerlegt:** Die Angaben "30 %/20 %, Kinderzulage 25 %" (Regierungsentwurf Dez. 2025) und "480 € bzw. 540 € ab 2029" (BMF-Monatsbericht) stehen nicht in der verkündeten Fassung; eine Jahresstaffel gibt es nicht
- Auszahlphase: Beginn frühestens 65, spätestens mit 70; Auszahlplan mindestens bis 85 oder lebenslange Rente; bis zu 30 % Einmalauszahlung; Standarddepot mit Effektivkosten höchstens 1,0 %/Jahr; Garantieprodukte mit 80 % oder 100 %
- Besteuerung der Auszahlungen: dem Grunde nach nachgelagert; der Volltext von § 22 Nr. 5 ist nicht gelesen, Steuersatz persönlich: **unsicher**
- Der BMF-FAQ-Abruf schlug weiterhin mit HTTP 503 fehl

## 8. ETF-Besteuerung (für Phase 1 relevant)

- Abgeltungsteuer 26,375 % (inkl. Soli), Teilfreistellung Aktienfonds (Quote ≥ 51 %) 30 %, Sparerpauschbetrag 1.000 € (2.000 € Zusammenveranlagung): gängige Werte, Quellen sind Ratgeber
- Basiszins 2026 = 3,20 % (BMF-Schreiben 13.01.2026; eine Quelle nennt fälschlich 2,29 %). Vorabpauschale = Fondswert · 3,20 % · 70 %, begrenzt auf den tatsächlichen Wertzuwachs, mit Teilfreistellung. Seit Review `13` F-7b als Option je ETF-Plan modelliert (Standard aus). Basiszins 2018 bis 2026 und Faktor 70 % am 20.11.2026 gegen §18 InvStG und die BMF-Schreiben geprüft (`confirmed`); Jahre ab 2027 sind eine Annahme (`unverified`). Die Zeile "2,29 %" gilt für 2024, nicht für 2026
- Sparerpauschbetrag und Teilfreistellung vor Release erneut gegen das aktuelle Gesetz prüfen

## 9. Zinsbesteuerung Tagesgeld (für Phase 2)

- Zinsen unterliegen der Abgeltungsteuer 26,375 % ohne Teilfreistellung; der Sparerpauschbetrag (1.000 €, 2.000 € bei Zusammenveranlagung) gilt je Kalenderjahr über alle Kapitalerträge
- Modell in der App: Steuer bei jeder Zinsgutschrift, Freibetrag wird je Kalenderjahr verbraucht und im Januar zurückgesetzt; Kirchensteuer nur, wenn im Profil gewählt (Review `13` F-7a)
- Der Freibetrag ist **pro Ziel** wählbar (Default 1.000 €) und wird nicht zwischen Zielen und ETF geteilt, weil er oft schon durch andere Anlagen verbraucht ist. UI weist darauf hin
- Werte kommen aus `config/tax-de.json` (`capitalGainsTaxRate`, `taxFreeAllowance`), Status `unverified` (nur Ratgeberquellen)

## 10. Weitere zu klärende Punkte

- Frühstart-Rente: Gesetzgebungsstand unbestätigt (10 €/Monat von Alter 6 bis 18 laut Quellen, Start 2027)
- Jährliche Prüfung aller Werte (Rentenwert, Beitragsbemessungsgrenzen, Sätze)

## 11. Quellen (Recherche 2026-11-09)

- Bundesgesetzblatt 2026 I Nr. 156: https://www.recht.bund.de/bgbl/1/2026/156/regelungstext.pdf?__blob=publicationFile
- BMF FAQ Reform der privaten Altersvorsorge: https://www.bundesfinanzministerium.de/Content/DE/FAQ/reform-der-privaten-altersvorsorge.html
- BMF-Monatsbericht Januar 2026: https://www.bundesfinanzministerium.de/Monatsberichte/Ausgabe/2026/01/Inhalte/Kapitel-2-Analysen/2-2-neustart-fuer-die-private-altersvorsorge.html
- DRV Rentenanpassung 2026: https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2026/260305-rentenanpassung-2026
- DRV Werte der Rentenversicherung: https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Zahlen-und-Fakten/Werte-der-Rentenversicherung/werte-der-rentenversicherung.html
- DRV Rentenabschlag: https://www.deutsche-rentenversicherung.de/SharedDocs/Glossareintraege/DE/R/rentenabschlag.html
- DRV Rheinland Steueranteil Neurentner 2026: https://www.deutsche-rentenversicherung.de/Rheinland/DE/Presse/Pressemitteilungen/2026/26-02-20-steueranteil.html
- § 1a BetrAVG (Entgeltumwandlung, Zuschuss 15 %): https://www.gesetze-im-internet.de/betravg/__1a.html
- BMG Zusatzbeitragssatz 2027 (2,9 %): https://www.bundesgesundheitsministerium.de/presse/pressemitteilungen/zusatzbeitragssatz-gkv-2027-festgelegt
- GKV-Spitzenverband Rechengrößen 2026: https://www.gkv-spitzenverband.de/media/dokumente/presse/zahlen_und_grafiken/20260101_Faktenblatt_Rechengroessen_Beitragsrecht.pdf
- DRV Kranken- und Pflegeversicherung der Rentner: https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/In-der-Rente/Kranken-und-Pflegeversicherung-der-Rentner/kranken-und-pflegeversicherung-der-rentner_node
- Ratgeber (nur Zweitquellen): finanz.de Vorabpauschale, finanzen.net Altersvorsorgedepot, vermoegenszentrum.de, TK Rentner-KV

## 12. Prüfung gegen Primärquellen (2026-11-11)

Der Gesetzestext (BGBl. 2026 I Nr. 156, 24 Seiten) wurde per Textextraktion gelesen; Tabellenlayout und Fußnoten können vom Original abweichen. Keine Rechts- oder Steuerberatung.

**Bestätigt (Gesetzestext):**
- Grundzulage § 84: 50 % bis 360 €, 25 % von 360,01 bis 1.800 €, max. 540 €/Jahr; mittelbar berechtigte Ehegatten max. 175 €
- Zulage unter 25 (§ 84 Satz 2): +200 € "einmalig", wenn die 25. Lebensjahr zu Beginn des Beitragsjahres nicht vollendet ist (max. 740 €)
- Kinderzulage § 85: 100 % der Beiträge bis 1.800 € je Kind, höchstens 300 € je Kind, Voraussetzung Kindergeld
- Mindesteigenbeitrag § 86: 120 €/Jahr ab Beitragsjahr 2027, sonst weder Grund- noch Kinderzulage
- Förderberechtigte § 10a: Pflichtversicherte der Rentenversicherung, Beamte, Selbstständige unter 67 mit Steuererklärung, berufsständisch Versorgte, Ehegatten
- Produkte (AltZertG § 1, § 2a): Altersvorsorgedepot (OGAW bis Risikoklasse 5, keine Mindestleistung in der Ansparphase), Standarddepot (zwei Fonds, Aktienanteil höchstens 50 % fünf Jahre und 30 % zwei Jahre vor Auszahlbeginn, Effektivkosten höchstens 1,0 %), Garantieprodukt 80 % oder 100 %
- Auszahlphase: Beginn 65 bis 70; Auszahlplan mindestens bis 85, Neuberechnung höchstens alle drei Jahre mit mindestens 80 % des Restkapitals; lebenslange Rente 100 % oder 80 % plus 20 % variabel; Einmalauszahlung bis 30 %
- Höchstbeitrag je Vertrag 6.840 €/Jahr; Sonderausgabenabzug bis 1.800 € plus Zulage; höchstens zwei Verträge werden gefördert
- Inkrafttreten: teilweise ab 1.1.2027 (Art. 14 Abs. 2), weitere Teile ab 1.1.2028 (Abs. 3); Riester-Altverträge laufen nach altem Recht, Wechsel per unwiderruflicher Erklärung möglich

**Bestätigt (amtliche oder mehrere Quellen):** Pflege 3,6 %/4,2 % (DRV, BMG); Zusatzbeitrag Ø 2,9 % für 2026 und 2027 (BMG); Pflichtzuschuss 15 % (§ 1a BetrAVG); SV-freie Grenze 338 € und steuerfreie 676 € (BBG 8.450 €)

**Weiter unsicher (in Config `unverified`, UI-Hinweis):**
- Besteuerung der Depot-Leistungen (§ 22 Nr. 5 ab 2027/2028 nicht im Volltext gelesen); Modell: voll steuerpflichtig mit pauschalem Satz
- Altersgrenze der Kinder für die Kinderzulage (Kindergeld, meist bis 18, bei Ausbildung bis 25); Modell: bis 18
- Ob "einmalig" beim Bonus unter 25 im ganzen Leben gilt; Modell: einmalig im ersten Beitragsjahr
- KV/Pflege auf Leistungen aus privaten Altersvorsorgeverträgen (Annahme: bei Pflichtversicherten beitragsfrei) und auf Betriebsrenten (Freibetrag KV, Freigrenze Pflege); Stichtage in § 26a BetrAVG
- Ob der Gesetzgeber die Werte noch ändert: vor Release erneut prüfen

## 12a. Prüfung der elf ungeprüften Werte gegen Primärtexte (AP-23, 2026-11-23)

Gelesen auf `gesetze-im-internet.de` (Seiten ohne Fassungsdatum, "nichtamtliches Inhaltsverzeichnis"), `gesetze-bayern.de`, `landesrecht-bw.de` und im Bundesgesetzblatt (BGBl. 2026 I Nr. 156, PDF von `recht.bund.de`). Ergebnis und Fundstellen je Wert: `docs/legal-values-review.md`. Keine Rechts- oder Steuerberatung.

- **Bestätigt (6):** Jugendbonus-Alter 25 (§ 84 Satz 2 EStG neu, "einmalig" bleibt Auslegung); Sonderausgaben-Pauschbetrag 72 € (§ 10c Satz 1 und 2 EStG, 2 × 36 €); Basisrente wie gesetzliche Rente (§ 22 Nr. 1 Satz 3 a aa); Ertragsanteil für andere Leibrenten (a bb); gemeinsame KV/Pflege-Schwelle (§ 237 Satz 4, § 226 Abs. 2 SGB V, § 57 SGB XI) und Anrechnung auf die Witwenrente (§ 97 SGB VI, § 18a SGB IV), beide mit benannten Abweichungen der App.
- **Bleibt `unverified` (5):** Kirchensteuer 8 % und 9 % (kein Satz im Landesgesetz), Basiszins-Annahme ab 2027 (§ 18 Abs. 4 InvStG: erst im Januar veröffentlicht), Kinderzulage-Alter 18 (§ 85 knüpft an Kindergeld, § 32 Abs. 4 EStG), Riester voll steuerpflichtig (§ 22 Nr. 5 Satz 2 besteuert den ungeförderten Teil anders).
- **`validFrom` 2026-05-29** der Werte in `altersvorsorge-de.json` ist das Verkündungsdatum; die Zulagenregeln gelten ab 2027-01-01 (Art. 14 Abs. 2). Nicht geändert, weil der Code Werte nach `validFrom` wählt (Backlog).
