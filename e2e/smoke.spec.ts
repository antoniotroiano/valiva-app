import { expect, test } from '@playwright/test';
import { openGroup, openRow } from './helpers';

test('input leads to visible result and scenario chart', async ({ page }) => {
  await page.goto('/#etf');
  await page.getByLabel('Monatliche Sparrate').fill('300');
  await expect(page.getByText(/Endwert nach Steuer in \d+ Jahren, neutral/)).toBeVisible();
  await openRow(page, 'Entwicklung des Depotwerts');
  await expect(page.getByRole('img', { name: /Liniendiagramm mit drei Szenarien/ })).toBeVisible();
  await openRow(page, /Jahrestabelle anzeigen/);
  await expect(page.getByRole('table', { name: /Jahrestabelle/ })).toBeVisible();
});

test('invalid input shows a field error instead of results', async ({ page }) => {
  await page.goto('/#etf');
  await page.getByLabel('Laufzeit', { exact: true }).fill('0');
  await expect(page.getByText('Der Wert muss zwischen 1 und 60 liegen.')).toBeVisible();
});

test('assumptions page shows the tax values with status', async ({ page }) => {
  await page.goto('/#assumptions');
  // Collapsed: the unverified count is already visible in the row.
  await expect(page.locator('#legal-tax > summary')).toContainText('3 ungeprüft');
  await page.locator('#legal-tax > summary').click();
  await expect(
    page.locator('#legal-tax li.val', { hasText: 'Abgeltungsteuer inkl. Soli' }),
  ).toContainText('26,375 %');
  await expect(page.getByText('ungeprüft').first()).toBeVisible();
});

test('creating a savings goal shows the date the goal is reached', async ({ page }) => {
  await page.goto('/#goals');
  await page.getByRole('button', { name: 'Ziel hinzufügen' }).click();
  await page.getByLabel('Zielbetrag', { exact: true }).fill('3000');
  await page.getByLabel('Aktueller Stand', { exact: true }).fill('500');
  await page.getByLabel('Monatliche Sparrate', { exact: true }).fill('150');
  await expect(page.locator('.kpi', { hasText: 'Ziel erreicht im' })).toContainText(/\d{2}\/\d{4}/);
  await expect(page.getByRole('img', { name: /Liniendiagramm mit dem Saldo/ })).toBeVisible();
  await expect(page.getByRole('table', { name: /Verlauf je Kalenderjahr/ })).toBeVisible();
});

test('ETF target value shows the required monthly rate per scenario', async ({ page }) => {
  await page.goto('/#etf');
  await openRow(page, 'Zielvermögen');
  const table = page.getByRole('table', { name: /Benötigte monatliche Startrate/ });
  await expect(table).toBeVisible();
  await expect(table.getByRole('row', { name: /Neutral/ })).toContainText('€');
});

test('budget block is a plain heading on desktop and collapsible on narrow screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/#goals');
  await expect(page.getByRole('heading', { name: 'Sparbudget' })).toBeVisible();
  await expect(page.locator('summary', { hasText: 'Sparbudget' })).toHaveCount(0);

  await page.setViewportSize({ width: 375, height: 812 });
  const summary = page.locator('summary', { hasText: 'Sparbudget' });
  await expect(summary).toBeVisible();
  await expect(page.getByLabel('Monatliches Sparbudget')).toBeHidden();
  await summary.click();
  await expect(page.getByLabel('Monatliches Sparbudget')).toBeVisible();
});

test('statutory pension: profile and statement lead to a net pension', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel('Gewünschtes Rentenalter', { exact: true }).fill('67');
  await page.goto('/#statutory');
  await expect(page.getByText('Noch keine Renteninformation eingetragen')).toBeVisible();
  await page.getByLabel('Voraussichtliche Monatsrente laut Renteninformation').fill('1800');
  await page.getByLabel('Jahr der Renteninformation').fill(String(new Date().getFullYear()));
  await expect(page.locator('#statutory .result-frame')).toContainText('Netto pro Monat ab');
  await expect(page.locator('#statutory .result-frame .kpi-value')).toContainText('€');
  // The calculation rows are collapsed by default and hold the chart and the tables.
  await expect(page.getByRole('table', { name: /So wird aus der Renteninformation/ })).toBeHidden();
  await openRow(page, 'Verlauf bis Rentenbeginn');
  await expect(
    page.getByRole('img', { name: /Liniendiagramm der Brutto-Monatsrente/ }),
  ).toBeVisible();
  await openRow(page, 'So wird aus der Renteninformation');
  await expect(
    page.getByRole('table', { name: /So wird aus der Renteninformation/ }),
  ).toBeVisible();
  await openRow(page, 'Verlauf als Tabelle');
  await expect(
    page.getByRole('table', { name: /Verlauf bis Rentenbeginn \(Brutto/ }),
  ).toBeVisible();

  await page.getByLabel('Alter bei Rentenbeginn').fill('63');
  await expect(page.getByText(/Abschlag von 14,4 %/)).toBeVisible();
  await page.getByLabel('Alter bei Rentenbeginn').fill('62');
  await expect(page.getByText('Der Wert muss zwischen 63 und 70 liegen.')).toBeVisible();
});

test('retirement depot: contribution leads to allowances and a net pension', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel('Gewünschtes Rentenalter', { exact: true }).fill('67');
  await page.getByLabel(/Geburtsjahre der Kinder/).fill('2015, 2018');
  await page.goto('/#depot');
  await expect(page.getByText('Noch kein Beitrag eingetragen')).toBeVisible();
  await page.getByLabel('Eigenbeitrag pro Monat').fill('150');
  await expect(page.locator('#depot .result-kpis div', { hasText: 'Davon Zulagen' })).toContainText(
    '18.000',
  );
  await expect(page.locator('#depot .result-frame .kpi-value')).toContainText('€');
  // The long yearly table is collapsed by default
  await expect(page.getByRole('table', { name: 'Zulagen je Kalenderjahr' })).toBeHidden();
  await openRow(page, 'Zulagen je Kalenderjahr');
  await expect(page.getByRole('table', { name: 'Zulagen je Kalenderjahr' })).toBeVisible();
  await openRow(page, 'Alle Szenarien im Vergleich');
  await expect(page.getByRole('table', { name: /Szenarien im Vergleich/ })).toBeVisible();
  await openRow(page, 'Kapital bis Auszahlbeginn');
  await expect(page.getByRole('img', { name: /Liniendiagramm: Eigenbeiträge/ })).toBeVisible();

  await page.getByLabel('Eigenbeitrag pro Monat').fill('50');
  await expect(page.getByText(/Du lässt Zulage liegen/)).toBeVisible();
  await page.getByLabel('Eigenbeitrag pro Monat').fill('700');
  await expect(page.getByText(/höchstens 570/).first()).toBeVisible();
});

test('occupational pension: conversion leads to net effort and a net pension', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel('Gewünschtes Rentenalter', { exact: true }).fill('67');
  await page.goto('/#occupational');
  await expect(page.getByText('Noch keine Umwandlung eingetragen')).toBeVisible();
  await page.getByLabel('Entgeltumwandlung pro Monat, brutto').fill('200');
  const kpi = (label: string) => page.locator('#occupational .result-kpis div', { hasText: label });
  await expect(kpi('Netto-Aufwand pro Monat')).toContainText('90');
  await expect(kpi('Einzahlung in den Vertrag')).toContainText('230');
  await expect(page.locator('#occupational .result-frame .kpi-value')).toContainText('€');
  await openRow(page, /Netto-Aufwand: so wird/);
  await expect(page.getByRole('table', { name: /Netto-Aufwand: so wird/ })).toBeVisible();
  await openRow(page, 'Alle Szenarien im Vergleich');
  await expect(page.getByRole('table', { name: /Szenarien im Vergleich/ })).toBeVisible();
  await openRow(page, 'Kapital bis Auszahlbeginn');
  await expect(page.getByRole('img', { name: /Liniendiagramm: Umwandlung/ })).toBeVisible();

  await page.getByLabel('Entgeltumwandlung pro Monat, brutto').fill('800');
  await expect(page.getByText(/höchstens 676/).first()).toBeVisible();
});

test('assumptions page lists the pension and social values', async ({ page }) => {
  await page.goto('/#assumptions');
  for (const id of ['pension', 'social', 'depot']) {
    await page.locator(`#legal-${id} > summary`).click();
    await expect(page.locator(`#legal-${id} li.val`).first()).toBeVisible();
  }
  await expect(page.locator('#legal-pension li.val', { hasText: 'Höchstabschlag' })).toContainText(
    '14,4 %',
  );
  await expect(
    page.locator('#legal-depot li.val', { hasText: 'Grundzulage: Satz erste Stufe' }),
  ).toContainText('50 %');
});

test('overview: statutory pension and desired income show a gap', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel('Gewünschtes Rentenalter', { exact: true }).fill('67');
  await page.getByLabel(/Wunscheinkommen im Ruhestand/).fill('3000');
  await page.goto('/#statutory');
  await page
    .getByLabel(/Rente nach Renteninformation|Voraussichtliche/)
    .first()
    .fill('1500');
  await page.goto('/#overview');
  const section = page.locator('main');
  await expect(page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' })).toBeVisible();
  await openRow(page, 'Details und Tabellen');
  await expect(section.getByRole('table').first()).toBeVisible();
  await expect(section.getByRole('row', { name: /^Rentenlücke/ })).toContainText('€');
  await openRow(page, 'Verlauf je Alter');
  await expect(section.getByRole('img', { name: /Flächendiagramm des monatlichen/ })).toBeVisible();
  await expect(section.getByRole('img', { name: /Gestapelter Balken/ })).toBeVisible();
  await expect(section.getByText(/Es fehlen etwa/)).toBeVisible();
  await section.getByLabel('Optimistisch').check();
  await expect(
    section.getByText(/Netto-Rente ab 67, Kaufkraft von heute \(Optimistisch\)/),
  ).toBeVisible();
  await section.getByLabel('Neutral', { exact: true }).check();
  await openRow(page, 'Lücke schließen');
  await expect(section.getByRole('row', { name: /Zusätzlich pro Monat/ })).toContainText('€');
  await openRow(page, 'Bausteine in der Gesamtsicht');
  await section.getByRole('checkbox', { name: 'Gesetzliche Rente' }).uncheck();
  await expect(section.getByText('ausgeschaltet').first()).toBeVisible();
});

test('ETF in retirement: global assumptions switch and net monthly withdrawal', async ({
  page,
}) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel('Gewünschtes Rentenalter', { exact: true }).fill('67');
  await page.goto('/#etf');
  await page.getByLabel('Monatliche Sparrate').fill('300');
  const card = page.locator('#etf-retirement');
  await expect(card.getByText(/Netto pro Monat ab Alter \d+/)).toBeVisible();
  await openRow(page, 'Alle Szenarien im Vergleich');
  await expect(card.getByRole('table', { name: /ETF im Ruhestand je Szenario/ })).toBeVisible();
  await expect(card.getByRole('row', { name: /Entnahme netto/ })).toContainText('€');
  await openGroup(page, 'Rendite und Inflation');
  await expect(page.getByText(/Aus den Annahmen: Rendite/)).toBeVisible();
  await page.getByLabel(/Rendite-Szenarien und Inflation aus den Annahmen/).uncheck();
  await expect(page.getByLabel('Rendite neutral')).toBeVisible();
});

test('migration: old single-person data becomes Person 1 and stays as backup', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem(
      'valiva.profile.v1',
      JSON.stringify({
        schemaVersion: 1,
        profile: {
          birthYear: 1980,
          targetRetirementAge: 65,
          lifeExpectancyAge: 88,
          childrenBirthYears: [],
          desiredMonthlyIncomeToday: 2500,
        },
        assumptions: {
          inflationPercent: 2,
          returnScenarios: { pessimistic: 3, neutral: 5, optimistic: 7 },
          pensionAdjustmentPercent: 2.5,
          retirementTaxRatePercent: 20,
          payoutPhaseReturnPercent: 2,
          marginalTaxRateTodayPercent: 35,
          employeeSocialInsuranceRatePercent: 20,
          health: { mode: 'statutoryCompulsory', additionalRatePercent: 2.9, childless: false },
        },
      }),
    );
    localStorage.setItem('valiva.etfPlan.v1', JSON.stringify({ monthlyContribution: 321 }));
  });
  await page.goto('/#profile');
  await expect(page.getByLabel('Geburtsjahr', { exact: true })).toHaveValue('1980');
  await page.goto('/#etf');
  await expect(page.getByLabel('Monatliche Sparrate')).toHaveValue('321');
  await page.reload();
  await expect(page.getByLabel('Monatliche Sparrate')).toHaveValue('321');
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain('valiva.household.v2');
  expect(keys).toContain('valiva.profile.v1');
  expect(keys).toContain('valiva.p.p1.etfPlan.v1');
});

test('two persons: own data per person, shared wish', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel(/Wunscheinkommen im Ruhestand/).fill('3000');
  await page.goto('/#etf');
  await page.getByLabel('Monatliche Sparrate').fill('222');
  await page.goto('/#household');
  await page.getByRole('button', { name: 'Person hinzufügen' }).click();
  await page.getByLabel('Name von Person 2').fill('Partner');
  await expect(page.getByLabel(/Wunscheinkommen im Ruhestand/)).toHaveValue('3.000');
  await page.goto('/#profile');
  await expect(page.getByLabel(/Wunscheinkommen im Ruhestand/)).toHaveCount(0);
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1988');
  await page.goto('/#etf');
  // The one person switcher sits in the page head; the active person is part of the heading.
  await expect(
    page.getByRole('heading', { level: 1, name: 'ETF-Sparplan · Partner' }),
  ).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Partner' })).toBeChecked();
  await expect(page.getByLabel('Monatliche Sparrate')).not.toHaveValue('222');
  await page.getByRole('radio', { name: 'Person 1' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'ETF-Sparplan · Person 1' }),
  ).toBeVisible();
  await expect(page.getByLabel('Monatliche Sparrate')).toHaveValue('222');
  await page.goto('/#profile');
  await expect(page.getByLabel('Geburtsjahr', { exact: true })).toHaveValue('1985');
});

test('household view: shared gap, closing it with one person', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.goto('/#household');
  await page.getByLabel(/Wunscheinkommen im Ruhestand/).fill('4000');
  await page.getByRole('button', { name: 'Person hinzufügen' }).click();
  await page.getByLabel('Name von Person 2').fill('Partner');
  await page.getByLabel('Name von Person 1').fill('Anna');
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1988');
  await page.goto('/#overview');
  await expect(page.getByRole('region', { name: 'Gesamtsicht Haushalt' })).toBeVisible();
  await expect(page.getByText(/Haushalt im Jahr/)).toBeVisible();
  await openRow(page, 'Lücke schließen');
  await openRow(page, 'Details und Tabellen');
  await expect(page.getByRole('row', { name: /^Anna/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /^Partner/ })).toBeVisible();
  await page.getByLabel('Person für die zusätzliche ETF-Rate').selectOption('p1');
  await page.getByRole('radio', { name: 'Partner' }).click();
  await expect(page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' })).toBeVisible();
});
