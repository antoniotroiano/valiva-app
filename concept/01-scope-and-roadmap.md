# 01 – Ziel, Umfang und Roadmap

Name der App: **Valiva** (vorher Arbeitstitel "Pathwise", umbenannt 2026-11-22; siehe `07-decisions-and-open-points.md`).

## 1. Kontext

Das alte MD-File (`docs/archive/ETF_Investment_Tracker_Technische_Architektur_und_Umsetzung.md`) beschreibt nur die Technik für einen ETF-Sparplan-Tracker (React, Spring Boot, PostgreSQL). Die neue App soll mehr leisten:

1. **ETF-Sparplan-Prognose** wie ursprünglich gedacht (Rate, Rendite, Kosten, Dynamik, Szenarien).
2. **Rentenplaner**: alle Vorsorgebausteine erfassen, je Baustein eine eigene Prognose, dazu eine Gesamtsicht (Rente in Kaufkraft von heute, Rentenlücke, Entnahmeplan).
3. **Kurzfristige Sparziele** (Fahrrad, Auto): "Wann erreiche ich das Ziel?" mit Tagesgeld-Zins.

Rahmen:
- Phase A: nur für den Autor. Phase B: andere checken das GitHub-Repo aus und nutzen es lokal. Phase C: Desktop + Browser, Daten überall abrufbar.
- Steuern/Abgaben **vereinfacht**, Ergebnis brutto und netto geschätzt.
- Tech-Stack: **TypeScript** (siehe `02-architecture.md`). Datenhaltung in Phase A/B lokal.

## 2. Funktionsumfang

### 2.1 Bausteine (je mit eigenem Prognose-Rechner)

| Baustein | V1 | Kernparameter (Beispiele) |
|---|---|---|
| ETF-Sparplan | ja | Startkapital, Monatsrate, Dynamik %/Jahr, Rendite (3 Szenarien), TER, Laufzeit, Steuer (Teilfreistellung, Abgeltung, Freibetrag) |
| Gesetzliche Rente | ja | Werte aus Renteninformation (Anspruch heute, Hochrechnung), Eintrittsalter, Rentenanpassung %/Jahr, Abschläge/Zuschläge bei früherem/späterem Rentenbeginn |
| Betriebliche AV | ja | Brutto-Umwandlung, AG-Zuschuss, Garantie/Rendite, Kosten, Auszahlung als Rente oder Kapital, vereinfachte Steuer/KV im Alter |
| Altersvorsorgedepot (ab 2027) | ja | Eigenbeitrag, Zulagen (Grund-/Kinderzulage), Produktvariante (Garantie 80/100 %, ohne Garantie, Standarddepot), Kostenmodell, Auszahlphase, nachgelagerte Besteuerung |
| Sonstige Einkünfte im Alter (generischer Eintragstyp) | Phase 6, geplant | Mehrere Einträge je Person: Betrag, Beginn, Ende, Anpassung, Steuer, Abgaben, Weiterzahlung an den Partner; deckt bestehende Riester-Rente laut Standmitteilung, Basisrente, private Rentenversicherung, Pension und Mieteinnahmen ab (`15-phase-6-generic-block.md`) |
| Riester / Rürup / Lebensversicherung (echtes Modell) | später | Garantiewert + Hochrechnung laut Versicherer, Beitrag, Laufzeit; bis dahin über den generischen Eintragstyp als Betrag |
| Immobilie / mietfreies Wohnen | später | ersparte Miete oder Mieteinnahme, Restschuld, Instandhaltung; Mieteinnahme nach Kosten ohne Restschuld geht über den generischen Eintragstyp |
| Tagesgeld/Festgeld/Gold/Krypto | später | generischer Baustein: Sparrate, freie Rendite |
| Frühstart-Rente / Kinder | später | 10 €/Monat Staat, Alter 6–18, Zusatzzahlungen (Gesetzgebungsstand zuerst prüfen) |

Einfache Erweiterbarkeit ist ein Designziel: ein neuer Baustein = ein neues Modul mit gleichem Schnittstellenvertrag (siehe `02-architecture.md` und `06-data-model.md`).

Nicht in V1: Erwerbsminderungsrente (Hinterbliebenenrente ist seit Review `13` F-5 als Schalter umgesetzt). **Rentner-Modus** (Personen, die ihre Rente schon beziehen, mit Ist-Werten statt Hochrechnung) ist in `16-retired-mode.md` beschrieben und wird in AP-20 gebaut.

### 2.2 Gesamtsicht Rente
- Monatliche Netto-Rente **in Kaufkraft von heute** (Inflation einstellbar, Default z. B. 2 %), gesamt und je Baustein
- **Rentenlücke** zum Wunscheinkommen im Alter
- **Entnahmeplan**: wie lange reicht das Vermögen bei Entnahme X €/Monat (inkl. 4 %-Regel, Lebenserwartung als Eingabe)
- **Szenarien**: pessimistisch / neutral / optimistisch, Diagramme
- Was-wäre-wenn-Regler (Rate +50 €, Rentenbeginn 65 vs. 67, Rendite −1 %)

### 2.3 Kurzfristige Sparziele
- Ziel (Name, Betrag, optionaler Zieltermin), Startbetrag, Monatsrate, Zinssatz Tagesgeld (p. a., monatlich verzinst), optionale Zinsänderung
- Ausgabe: **Zieldatum**, benötigte Rate für Wunschtermin, Zinsanteil
- Mehrere Ziele parallel, Priorisierung ("verfügbare Sparrate auf Ziele verteilen")
- Zinsen vereinfacht versteuert (Sparerpauschbetrag als Option)

### 2.4 Weitere Funktionen
- Profil: Geburtsjahr, gewünschtes Rentenalter, Einkommen, Kinder, Steuerklasse grob
- Inflation und Gehaltsentwicklung als globale Annahmen
- Export/Import (JSON), Backup
- Annahmen-Transparenz: jede Zahl zeigt Formel/Annahme, plus Hinweis "keine Anlageberatung"
- Gesetzliche Parameter (Beitragsbemessungsgrenzen, Zulagen, Steuersätze, Rentenwert) als **versionierte Konfigurationsdatei mit Quelle und Jahr**, nicht im Code
- Spätere Optionen: Ist-Werte statt Prognose (Käufe tracken, XIRR aus dem alten Konzept), Kursdaten-Adapter, Mehrsprachigkeit, Mehrnutzerfähigkeit

## 3. Roadmap

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 | Konzept finalisieren, Fachregeln recherchieren | Konzept in `concept/` |
| 1 | Rechenkern + ETF-Sparplan-Rechner (Szenarien, Diagramme) | ursprüngliche Idee lauffähig |
| 2 | Sparziele (Tagesgeld, Zieldatum), Rückwärtsrechner | kurzfristiger Teil |
| 3 | Gesetzliche Rente, bAV, Altersvorsorgedepot (Teilphasen 3a Profil + gesetzliche Rente, 3b Depot, 3c bAV; siehe `archive/09-phase-3-pension-blocks.md`) | je Baustein Prognose |
| 4 | Gesamtsicht: Netto-Rente real, Lücke, Verlauf je Alter, ETF-Entnahme, Lücke schließen (Teilphasen 4a-1 bis 4a-4; siehe `archive/10-phase-4-overview.md`). Inflationsangepasste Entnahme und 4-%-Regel später | Kernnutzen Rentenplaner |
| 4b | Mehrere Personen / Haushaltsrente (Partner): Teilphasen 4b-1 Kern, 4b-2 Zustände und Personenverwaltung, 4b-3 Haushaltssicht; siehe `archive/11-phase-4b-household.md` | Gesamtrente je Person und Haushalt |
| 5 | Speichern (Profil, Bausteine), Export/Import, README/Lizenz, Git/GitHub | Repo teilbar (Phase B) |
| 6 | Weitere Bausteine. **6b Generischer Baustein "Sonstige Einkünfte im Alter"** (Konzept `15-phase-6-generic-block.md`, AP-14 Konzept und Mockup, AP-15 Kern und Web); danach echte Riester-/Rürup-Modelle, Immobilie, Frühstart-Rente (nur beschrieben, `15` §12). Die frühere Teilphase 6a war die Einkommensteuer im Alter (Review 13) | Erweiterung |
| 6c | **Rentner-Modus** (Konzept `16-retired-mode.md`, AP-19 Konzept und Mockup, AP-20 Kern und Web): Ist-Rente laut Bescheid, bAV und Depot in Auszahlung, ETF-Bestand mit Entnahme, Mischfall Paar mit Übergangsjahren; Workspace-Version 3, App-Version `0.2.0` | Bestandsrentner abbildbar |
| 7 | Desktop-Paket + Server/Sync/Login | Phase C |

Nach jeder Phase ist die App lauffähig. Die Fachwerte für Phase 3 sind am 2026-11-11 gegen Primärquellen geprüft (`03-domain-rules.md` Abschnitt 12); verbleibende unsichere Werte bleiben in der Config als `unverified` markiert.

## 4. Namensvorschläge (vertagt)

1. **Valiva** (gewählt): Weg + klug
2. Nestly: Nest/Vorsorge
3. Runway: wie lange reicht es (häufig vergeben)
4. Horizonly: Blick auf den Zeithorizont
5. Vestly: von "vest/invest"
6. Lumen: Klarheit über die Zukunft (häufig vergeben)

Vor Festlegung prüfen: Verfügbarkeit bei GitHub-Repo, Domain, Marke (nicht geprüft). Name nur an zentraler Stelle (Config/README) führen, damit Umbenennen billig bleibt.

## 5. Risiken

- Gesetzliche Parameter ändern sich (Reform 2027) → versionierte Konfig statt Hardcoding
- Falsche Sicherheit durch Prognosen → Szenarien, Disclaimer, Annahmen sichtbar
- Scope-Creep → klare Phasen, "Später"-Liste
- Datenschutz bei Phase B/C → keine Echtdaten im Repo, Security-Konzept vor Sync
