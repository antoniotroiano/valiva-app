# ETF Investment Tracker – Technische Architektur und Umsetzung

## 1. Zweck

Dieses Dokument beschreibt die technische Architektur und die geplante technische Umsetzung der Anwendung auf Basis des zuvor erstellten fachlichen Konzepts.

Die Anwendung ist als private Browser-Anwendung geplant.

Die technischen Entscheidungen sollen:
- zur Größe und zum Zweck des Projekts passen,
- einfach lokal betreibbar sein,
- eine saubere Trennung der Verantwortlichkeiten ermöglichen,
- späteres Wachstum ermöglichen,
- unnötige Komplexität vermeiden.

---

# 2. Gesamtarchitektur

Die Anwendung wird als **modularer Monolith** umgesetzt.

Die Anwendung besteht aus:
- einem Web-Frontend,
- einem Backend,
- einer relationalen Datenbank.

Vereinfachte Darstellung:

```text
┌──────────────────────────────────────┐
│               Browser                │
│          React + TypeScript          │
└──────────────────┬───────────────────┘
                   │
               HTTP / JSON
                   │
┌──────────────────▼───────────────────┐
│            Spring Boot               │
│               Backend                │
│                                      │
│  API / Controller                    │
│          ↓                           │
│  Application / Use Cases             │
│          ↓                           │
│  Domain / Fachlogik                  │
│          ↓                           │
│  Persistence                         │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│             PostgreSQL               │
└──────────────────────────────────────┘
```

Die Anwendung ist bewusst kein Microservice-System.

---

# 3. Architekturprinzip

## Modularer Monolith

Die Anwendung wird zunächst als eine zusammenhängende Backend-Anwendung betrieben.

Innerhalb des Monolithen werden die fachlichen Verantwortlichkeiten jedoch klar getrennt.

Beispielhafte fachliche Module:

```text
ETF
Sparplan
Investment / Käufe
Depotbewertung
Rendite
Prognose
Szenarien
Simulation
```

Die Module sollen über klar definierte Verantwortlichkeiten und fachliche Schnittstellen miteinander kommunizieren.

Ziel:

> Einfachheit eines Monolithen mit der inneren Struktur eines modularen Systems.

Eine spätere Aufteilung in mehrere Services wäre dadurch grundsätzlich möglich, wenn die Anwendung irgendwann groß genug wird und eine solche Aufteilung tatsächlich sinnvoll ist.

Eine zukünftige Modularisierung ist jedoch kein Ziel von Version 1.

---

# 4. Frontend

## Technologie

**React + TypeScript**

Das Frontend ist eine klassische Browser-Anwendung.

Es ist verantwortlich für:
- Darstellung
- Benutzerinteraktion
- Eingabeformulare
- Tabellen
- Diagramme
- Anzeige von Ergebnissen
- Aufruf der Backend-Schnittstellen

Das Frontend enthält keine zentrale fachliche Geschäftslogik.

Beispiel:

> Das Frontend darf Eingaben auf Plausibilität prüfen und Fehlermeldungen anzeigen.

Die verbindliche fachliche Regel wird jedoch im Backend eingehalten.

---

# 5. Backend

## Technologie

**Java + Spring Boot**

Das Backend ist für:
- fachliche Geschäftslogik,
- Berechnungen,
- Validierung,
- Persistenzzugriffe,
- Bereitstellung der Schnittstellen

verantwortlich.

Insbesondere gehören folgende Berechnungen ins Backend:
- Kaufanteile
- investiertes Kapital
- vorhandene Anteile
- durchschnittlicher Kaufpreis
- Depotwert
- Gewinn / Verlust
- persönliche Rendite / XIRR
- Zukunftsprognosen
- Szenarien
- Simulationen

Dadurch ist die fachliche Logik unabhängig von der Darstellung im Browser.

---

# 6. Schichtenarchitektur

Für V1 wird eine klassische, klar getrennte Schichtenarchitektur verwendet.

```text
API / Controller
       ↓
Application / Use Cases
       ↓
Domain
       ↓
Persistence
       ↓
PostgreSQL
```

## 6.1 API / Controller

Verantwortlich für:
- Entgegennahme von HTTP-Anfragen
- technische Validierung der Request-Struktur
- Aufruf passender Application-Use-Cases
- Rückgabe von HTTP-Antworten

Der Controller soll keine komplexe Fachlogik enthalten.

---

## 6.2 Application / Use Cases

Verantwortlich für:
- Ausführung konkreter Anwendungsfälle
- Koordination mehrerer fachlicher Aktionen
- Übergabe von Eingaben an die Domain
- Zusammenstellung von Ergebnissen

Beispiele:
- ETF anlegen
- Kauf erfassen
- Kauf löschen
- Rendite berechnen
- Prognose erstellen
- Simulation ausführen

---

## 6.3 Domain

Verantwortlich für:
- fachliche Regeln
- fachliche Objekte
- Berechnungslogik
- konsistente Zustände

Die besonders wichtige Berechnungslogik soll möglichst unabhängig von Spring, HTTP und Datenbank sein.

Beispielsweise soll die Prognoseberechnung grundsätzlich auch ohne laufenden Webserver fachlich testbar sein.

---

## 6.4 Persistence

Verantwortlich für:
- Speichern von Daten
- Laden von Daten
- Aktualisieren von Daten
- Löschen von Daten
- Abbildung der fachlichen Daten auf die relationale Datenbank

Die Domain soll nicht direkt von SQL oder konkreten Datenbankdetails abhängig sein.

---

# 7. Hexagonal Architecture

Eine vollständige Hexagonal Architecture bzw. Ports-and-Adapters-Architektur wird für V1 nicht als separates Architekturziel verfolgt.

Die Anwendung soll trotzdem sauber kapseln.

Das bedeutet insbesondere:
- fachliche Berechnungen sind nicht an HTTP gebunden,
- fachliche Berechnungen sind nicht an PostgreSQL gebunden,
- externe technische Details werden außerhalb der eigentlichen Fachlogik gehalten.

Sollten später zusätzliche externe Systeme hinzukommen, kann die Struktur bei Bedarf um klar definierte Adapter erweitert werden.

Beispiel für eine spätere externe Kursdatenquelle:

```text
External Market Data
        ↓
     Adapter
        ↓
Application / Domain
```

---

# 8. Datenbank

## Technologie

**PostgreSQL**

Begründung:
- relationale Daten
- klare Beziehungen zwischen ETF, Sparplan und Käufen
- gute Unterstützung von Konsistenzregeln
- geeignet für aggregierte und strukturierte Daten
- bewährte Technologie

Eine NoSQL-Datenbank wie MongoDB wird für V1 nicht benötigt.

---

# 9. Kommunikation

Frontend und Backend kommunizieren über:

**HTTP + REST + JSON**

Beispiele für fachliche Aktionen:

```text
POST   /api/etfs
GET    /api/etfs/{id}

PUT    /api/etfs/{id}/savings-plan

POST   /api/etfs/{id}/purchases
PUT    /api/etfs/{id}/purchases/{purchaseId}
DELETE /api/etfs/{id}/purchases/{purchaseId}

PUT    /api/etfs/{id}/valuation

GET    /api/etfs/{id}/performance

POST   /api/etfs/{id}/forecast
POST   /api/etfs/{id}/simulation
```

Diese Beispiele dienen zunächst nur zur Orientierung.

Die endgültige API-Spezifikation wird während der Umsetzung eines fachlichen Pakets konkretisiert.

---

# 10. E2E- und Akzeptanztests

## E2E-Technologie

**Playwright**

Playwright steuert automatisiert einen echten Browser bzw. eine Browserinstanz.

Damit kann ein kompletter Use Case von außen getestet werden:

```text
Playwright
    ↓
Browser
    ↓
React
    ↓
HTTP / REST
    ↓
Spring Boot
    ↓
PostgreSQL
```

Die E2E-Tests orientieren sich an den zuvor definierten Use Cases.

Beispiel:

> UC-01 – ETF anlegen

Ein E2E-Test kann:
1. Anwendung öffnen
2. ETF-Daten eingeben
3. Speichern
4. prüfen, dass der ETF angezeigt wird

Damit wird ein kompletter Benutzerablauf geprüft.

## Gauge als spätere Option

**Gauge** wird bewusst als mögliche spätere Option vorgemerkt.

Gauge eignet sich besonders, wenn Acceptance Tests stärker als lesbare fachliche Spezifikationen formuliert werden sollen.

Für V1 wird jedoch nicht gleichzeitig Playwright und Gauge eingesetzt.

---

# 11. Teststrategie

Die Anwendung verwendet mehrere Testebenen.

## 11.1 Unit Tests

Unit Tests prüfen einzelne fachliche Bausteine isoliert.

Sie sind besonders wichtig für:
- Kaufanteile
- Depotwert
- Gewinn / Verlust
- durchschnittlichen Kaufpreis
- XIRR
- Prognoseberechnungen
- Szenarien
- Simulationen

Die Berechnungslogik soll umfangreich und deterministisch testbar sein.

---

## 11.2 Integration Tests

Integration Tests prüfen das Zusammenspiel mehrerer Komponenten.

Beispiele:
- Application-Logik mit Persistence
- Backend-Schnittstellen
- Datenbankzugriffe
- Lesen und Speichern von ETF- und Kaufdaten

Die wichtigsten Integrationspfade werden automatisiert getestet.

---

## 11.3 E2E-Tests

E2E-Tests prüfen komplette Benutzerabläufe über den Browser.

Beispiele:
- ETF anlegen
- Sparplan anlegen
- Kauf erfassen
- Depotstand anzeigen
- Zukunftsprognose erstellen

Es sollen nicht alle denkbaren Varianten als E2E-Test abgedeckt werden.

Der Schwerpunkt liegt auf wichtigen vollständigen Use Cases.

---

## 11.4 Blackbox und Whitebox

Blackbox und Whitebox werden als Testperspektiven verstanden und nicht als separate Testarten der Testpyramide.

E2E-Tests sind überwiegend Blackbox-orientiert.

Unit Tests prüfen dagegen häufig die internen fachlichen Strukturen und sind dadurch eher Whitebox-orientiert.

---

# 12. Docker

## Zweck

Docker wird eingesetzt, um die Entwicklungs- und Laufzeitumgebung reproduzierbar bereitzustellen.

Insbesondere soll PostgreSQL containerisiert betrieben werden.

Für die lokale Entwicklung kann Docker Compose verwendet werden.

Beispiel:

```text
Docker Compose
    │
    └── PostgreSQL
```

Später kann die Umgebung bei Bedarf erweitert werden:

```text
Docker Compose
 ├── PostgreSQL
 ├── Spring Boot
 └── React / Webserver
```

Docker soll nicht zum Selbstzweck eingesetzt werden.

Der Nutzen ist vor allem:
- reproduzierbare Umgebung
- einfache Einrichtung
- keine manuelle lokale PostgreSQL-Installation erforderlich
- einfache Neustarts und Neuaufsetzung

---

# 13. Entwicklungs- und Betriebsmodell

Die Anwendung ist als Browser-Anwendung konzipiert.

Das bedeutet:

```text
Browser
   ↓
Anwendung
   ↓
Datenbank
```

Die Anwendung kann zunächst lokal betrieben werden.

Später kann sie auf einem privaten Server oder einer anderen Umgebung betrieben werden, ohne dass die Browser-Anwendung grundsätzlich geändert werden muss.

---

# 14. Technische Umsetzung in Paketen

Die Implementierung folgt weiterhin den fachlich definierten Paketen.

## Paket 1

ETF und Sparplan

→ erstes lauffähiges Teilstück

## Paket 2

Käufe und aktueller Depotstand

→ tatsächliches ETF-Tracking

## Paket 3

Renditeberechnung

→ persönliche Rendite / XIRR

## Paket 4

Zukunftsprognose

→ Prognose-Engine

## Paket 5

Szenarien und Visualisierung

→ Vergleich und grafische Darstellung

## Paket 6

Was-wäre-wenn-Simulation

→ variable hypothetische Annahmen

Nach jedem Paket soll die Anwendung weiterhin lauffähig sein.

---

# 15. Technische Grundprinzipien

- Ein fachlicher Verantwortungsbereich soll möglichst klar abgegrenzt sein.
- Controller enthalten keine komplexe Fachlogik.
- Fachliche Berechnungen sollen unabhängig von HTTP und Datenbank testbar sein.
- Die Datenbank ist Infrastruktur und nicht der Ort für die zentrale Fachlogik.
- Das Frontend stellt dar und interagiert, entscheidet aber nicht allein über fachliche Regeln.
- Prognosen und Simulationen verändern keine tatsächlichen Investmentdaten.
- Wiederverwendbare Berechnungen sollen nur einmal fachlich definiert sein.
- Die technische Struktur soll nicht komplexer sein als für das Projekt notwendig.
- Neue technische Komponenten werden erst eingeführt, wenn sie einen konkreten Nutzen haben.

---

# 16. Bewusst nicht eingesetzt

Für V1 werden bewusst keine unnötigen Technologien oder Architekturmuster eingeführt.

Insbesondere:
- keine Microservices
- keine MongoDB / NoSQL-Datenbank
- kein GraphQL
- kein gRPC
- keine vollständige Hexagonal-Architecture als Pflichtstruktur
- kein Event-Streaming
- kein Message Broker
- keine komplexe Cloud-Infrastruktur

Diese Technologien können für größere spätere Anforderungen erneut bewertet werden.

---

# 17. Noch offen für die konkrete Umsetzung

Die folgenden Punkte werden erst bei der tatsächlichen Implementierung konkretisiert:

- genaue Projekt- und Paketstruktur
- konkrete Datenbanktabellen und Constraints
- endgültige REST-API
- konkrete Frontend-Struktur
- UI-Komponenten und Navigation
- Berechtigungs-/Authentifizierungskonzept, falls später benötigt
- konkrete Docker-Compose-Konfiguration
- genaue Testdaten und Testumgebungen
- technische Umsetzung der XIRR- und Prognoseberechnung

Diese Punkte sind bewusst noch nicht Bestandteil der fachlichen Planung.

---

# 18. Ergebnis

Die Version-1-Anwendung wird als:

> **privater modularer Monolith mit React/TypeScript-Frontend, Java/Spring-Boot-Backend, PostgreSQL-Datenbank und REST/JSON-Kommunikation**

umgesetzt.

Die interne Architektur basiert auf einer klaren Schichtenstruktur.

Die Berechnungslogik wird möglichst unabhängig von Infrastruktur gehalten und mit Unit Tests abgesichert.

Integration Tests sichern das Zusammenspiel wichtiger Backend-Komponenten.

Playwright prüft ausgewählte vollständige Benutzerabläufe.

Docker bzw. Docker Compose stellt eine reproduzierbare Umgebung bereit.

Damit ist die technische Richtung für Version 1 festgelegt, ohne das Projekt unnötig komplex zu machen.
