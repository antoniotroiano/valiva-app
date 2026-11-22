# 06 – Datenmodell gesamt

## 1. Entscheidungen

| Thema | Entscheidung |
|---|---|
| Annahmen | **Globale Annahmen** (Inflation, Renditeszenarien, Rentenanpassung, Steuerpauschalen) plus **Override pro Baustein**. Leerer Override = globaler Wert |
| Sparziele | Eigene Objekte, getrennt von Vorsorgebausteinen. Pro Person eine **gemeinsame monatliche Sparrate (Budget)**, die auf Vorsorge und Ziele verteilt wird; die App zeigt Summe und Rest |
| Format | JSON mit `schemaVersion` und Migrationsfunktionen; lokale Datei, Export und Import nutzen dasselbe Format |
| IDs | Zufällige UUIDs (stabil, sync-fähig für Phase C) |
| Zeit | Monatsgenau als `YYYY-MM`; Rechenkern arbeitet mit Monatsindex |
| Geld | `number` in Euro (Float), Rundung nur bei Anzeige |
| Sprache | Alle Felder englisch |

## 2. Überblick
```text
Workspace (Datei/Export)
 ├─ schemaVersion, createdAt, updatedAt
 ├─ GlobalAssumptions
 ├─ Household
 │    └─ Person[]
 │         ├─ savingsBudgetMonthly
 │         ├─ Product[]      (discriminated union by `type`)
 │         └─ SavingsGoal[]
 └─ (nicht gespeichert) LegalParameters → /config, versioniert, mit Quelle und Status
```
Gesetzliche Parameter liegen **nicht** in der Nutzerdatei, sondern im Repo unter `config/` (siehe `03-domain-rules.md`). Gesetzesänderungen sind so ein Software-Update, keine Datenmigration.

## 3. Entitäten (TypeScript-Skizze)
```ts
type Workspace = {
  schemaVersion: number;
  createdAt: string;            // ISO date-time
  updatedAt: string;
  assumptions: GlobalAssumptions;
  household: { id: string; name?: string; persons: Person[] };
};

type GlobalAssumptions = {
  inflationPercent: number;                                   // default 2
  returnScenarios: { pessimistic: number; neutral: number; optimistic: number }; // default 3/5/7
  pensionAdjustmentPercent: number;                           // default 2.5
  payoutPhaseReturnPercent: number;                           // Phase 3, default 2
  marginalTaxRateTodayPercent: number;                        // Phase 3, for bAV net cost
  employeeSocialInsuranceRatePercent: number;                 // Phase 3, default 20 (assumption)
  health: {                                                   // Phase 3, replaces the flat contributions rate
    mode: 'statutoryCompulsory' | 'other';
    otherRatePercent?: number;                                // used when mode = 'other'
    additionalRatePercent: number;                            // default from config (2.9)
    childless: boolean;                                       // long-term care 4.2 %
  };
  currency: 'EUR';
};

type Person = {
  id: string;
  name: string;
  birthYear: number;
  targetRetirementAge: number;       // default 67
  desiredMonthlyIncomeToday: number; // in today's purchasing power
  grossAnnualIncome?: number;
  childrenBirthYears: number[];      // for child allowances
  lifeExpectancyAge: number;         // default 90
  savingsBudgetMonthly?: number;
  products: Product[];
  goals: SavingsGoal[];
};

type ProductBase = {
  id: string;
  name: string;
  enabled: boolean;                                  // included in total view
  assumptionOverrides?: Partial<ProductAssumptions>; // empty = use global
  notes?: string;
};
type ProductAssumptions = {
  returnScenarios: { pessimistic: number; neutral: number; optimistic: number };
  inflationPercent: number;
  payoutPhaseReturnPercent: number;
};

type Product =
  | EtfSavingsPlan        // 'etf'              Phase 1
  | StatutoryPension      // 'statutory'        Phase 3
  | OccupationalPension   // 'occupational'     Phase 3
  | RetirementDepot       // 'retirementDepot'  Phase 3
  | LegacyContract        // 'legacy' (Riester/Rürup/insurance) Phase 6
  | RealEstate            // 'realEstate'       Phase 6
  | GenericSavings        // 'generic' (cash/gold/crypto) Phase 6
  | ChildStartPension;    // 'childStart'       Phase 6

type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  targetMonth?: string;            // 'YYYY-MM'
  currentAmount: number;
  monthlyContribution: number;
  accountInterestPercent: number;  // p.a.
  interestChanges?: { fromMonth: string; percent: number }[];
  priority: number;                // sort order (Phase 2: no automatic allocation)
  taxEnabled: boolean;             // default true
  taxFreeAllowancePerYear: number; // legacy per goal; the goals of a person now share GoalsState.taxFreeAllowanceYearly (F-6)
  startMonth: string;
};
```

## 4. Kernfelder je Bausteintyp

| Typ | Kernfelder |
|---|---|
| `etf` | initialCapital, monthlyContribution, annualContributionIncreasePercent, durationYears (oder endMonth), lumpSums[{month, amount}], ter, entryFeePercent, custodyFeeEurPerYear, custodyFeePercentPerYear, taxEnabled |
| `statutory` | entitlementPointsToday ODER projectedMonthlyPensionFromStatement, statementDate, expectedFutureEarningPoints (pro Jahr), retirementAge (daraus Abschlag/Zuschlag) |
| `occupational` | employeeContributionMonthly (Bruttoumwandlung), employerContributionMonthly, employerSubsidyPercent, contractType (directInsurance/pensionFund/other), guaranteedRatePercent, costsPercent, payoutType (annuity/lump/withdrawal), startMonth |
| `retirementDepot` | ownContributionMonthly, variant (guarantee80/guarantee100/noGuarantee/standard), costPercentPerYear, allowances (berechnet, nicht gespeichert), startMonth, payoutStartAge, payoutType, lumpSumSharePercent |
| `legacy` | contractKind (riester/ruerup/lifeInsurance/other), currentValue, monthlyContribution, guaranteedPensionMonthly, projectedPensionMonthly, endMonth |
| `realEstate` | mode (ownerOccupied/rental), monthlyRentSaved ODER monthlyRentalIncome, remainingDebt, monthlyDebtService, maintenancePercent |
| `generic` | assetKind (cash/gold/crypto/other), initialCapital, monthlyContribution, returnPercent, taxMode |
| `childStart` | childBirthYear, monthlyStateContribution (10), startAge (6), endAge (18), additionalContributionMonthly |

## 5. Ergebnisse (nicht gespeichert, immer berechnet)
```ts
type ProjectionResult = {          // je Baustein und Szenario
  productId: string;
  scenario: 'pessimistic' | 'neutral' | 'optimistic';
  series: { month: number; contributed: number; value: number }[];
  capitalAtRetirement: number;
  monthlyPensionNominal: number;
  monthlyPensionReal: number;      // heutige Kaufkraft
  taxAndContributions: number;
  netMonthlyPensionReal: number;
  warnings: string[];              // z. B. unverified-Rechtswerte verwendet
};
type HouseholdResult = {
  byPerson: { personId: string; netMonthlyPensionReal: number; gapToDesired: number; byProduct: ProjectionResult[] }[];
  totalNetMonthlyPensionReal: number;
};
type GoalResult = { goalId: string; reachedMonth?: string; requiredMonthlyForTarget?: number; interestEarned: number; series: { month: number; value: number }[] };
```
Ergebnisse werden nie gespeichert, damit nach Gesetzes- oder Annahmeänderungen keine veralteten Zahlen stehen. Ein Snapshot-Verlauf ist bewusst nicht in V1.

## 6. Produktvertrag im Rechenkern
```ts
interface ProductProjector<T extends ProductBase> {
  type: T['type'];
  validate(input: T, ctx: Context): ValidationIssue[];   // Fehler als Daten
  project(input: T, ctx: Context, scenario: Scenario): ProjectionResult;
}
type Context = { person: Person; assumptions: ResolvedAssumptions; legal: LegalParameters; today: Month };
```
Neuer Baustein = neuer Projector + Registereintrag + UI-Formular. Die Gesamtsicht summiert nur `ProjectionResult`.

## 7. Speicherformat, Versionierung, Migration
- Eine Datei (Name folgt dem späteren Projektnamen); lokale Datei und Export sind identisch
- `schemaVersion` startet bei 1; Migrationen als Funktionskette (`migrate_1_to_2` …), jede mit Test auf Beispieldateien älterer Versionen
- Laden: Version prüfen → migrieren → validieren (Schema, z. B. mit Zod) → erst dann verwenden; Fehler mit verständlicher Meldung, Datei wird nie ohne Backup (`.bak`) überschrieben
- Importierte Dateien sind **nicht vertrauenswürdig**: strikte Validierung, Größenlimit, keine Code-Ausführung
- Phase 5: Schnittstelle `WorkspaceStore { load(); save(workspace) }` mit Implementierungen für Datei/Browser
- Beispieldateien im Repo (`examples/*.json`, komplett erfunden); echte Nutzerdaten per `.gitignore` ausgeschlossen

## 8. Validierungsregeln (Auswahl)
- `birthYear` plausibel (1900 bis aktuelles Jahr), `targetRetirementAge` 55–75, `lifeExpectancyAge` > `targetRetirementAge`
- Prozentwerte −50 bis 100, Beträge ≥ 0, endliche Laufzeit, gültige Monate (`YYYY-MM`)
- Summe der Sparraten aller Bausteine und Ziele je Person ≤ Budget, sonst Warnung (kein Fehler)
- IDs eindeutig, Namen dürfen doppelt sein
- Fehlende optionale Felder fallen auf globale Annahmen zurück

## 9. Zuordnung zu Phasen

| Phase | Neue Entitäten/Felder |
|---|---|
| 1 | Workspace-Hülle (noch ohne Speichern), GlobalAssumptions (Teil), Person (minimal), Product `etf`, ProjectionResult (Teil) |
| 2 | SavingsGoal, GoalResult, `GoalsState` (lokal, `valiva.goals.v1`, später in den Workspace migriert), Budget-Feld (siehe `08-phase-2-savings-goals.md`) |
| 3 | `statutory`, `occupational`, `retirementDepot`, Profil (Person) und vollständige Assumptions mit `health`; `ProjectionResult` und `ProductProjector` erstmals gebaut; lokale Zustände `valiva.profile.v1`, `valiva.statutory.v1`, `valiva.depot.v1`, `valiva.occupational.v1` (Details `09-phase-3-pension-blocks.md`) |
| 4 | `OverviewResult` (Snapshot, Verlauf, Issues je Baustein), `Profile.desiredMonthlyIncomeToday`, ETF als `ProductProjector` mit Entnahmefeldern, `GapSolveResult`, Zustand `valiva.overview.v1` (Details `10-phase-4-overview.md`; `lifeExpectancyAge` existiert seit 3a) |
| 4b | `Household` mit `persons[]`, `Person` (vereint Phase-1-`Person` und `Profile`), haushaltsweite und persönliche Annahmen, `HouseholdResult`, Zustand `valiva.household.v2` mit Migration der Alt-Schlüssel (Details `11-phase-4b-household.md`) |
| 5 | Persistenz, Migrationen, Export/Import, Beispieldateien |
| 6 | `legacy`, `realEstate`, `generic`, `childStart` |
| 7 | Server-Persistenz, Nutzerkonto, Sync (UUIDs, `updatedAt` je Entität) |

## 10. Offen
- Phase C: Konfliktlösung beim Sync (letzte Änderung vs. Merge pro Entität)
- Verschlüsselung der Datei (Entscheidung Phase 5 oder 7)
- Gesetzliche Rente: Phase 3 nutzt die Hochrechnung der Renteninformation (entschieden 2026-11-11); ein Entgeltpunkte-Modell wäre eine spätere Option
