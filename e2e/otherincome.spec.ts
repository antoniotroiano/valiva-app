import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadExample, openGroup } from './helpers';

// AP-15: generic block "Sonstige Einkünfte" (entry list, result, Rentenplan, household with continued payment).

async function addEntry(page: Page, kind: string, amount: string) {
  await page.getByLabel('Art des neuen Eintrags').selectOption({ label: kind });
  await page.getByRole('button', { name: 'Eintrag hinzufügen' }).click();
  const field = page.getByLabel('Betrag pro Monat, brutto');
  await field.fill(amount);
}

test('empty state, first entry and its effect in the Rentenplan', async ({ page }) => {
  await page.goto('/#other');
  await expect(page.getByRole('heading', { name: 'Noch keine sonstigen Einkünfte' })).toBeVisible();
  await page.getByRole('button', { name: 'Ersten Eintrag anlegen' }).click();
  await expect(page.getByLabel('Name')).toHaveValue('Riester-Rente');
  await page.getByLabel('Betrag pro Monat, brutto').fill('300');
  await expect(page.locator('.result-frame .kpi-value')).not.toHaveText('0 €');
  await expect(page.getByText('Einträge im Überblick')).toBeVisible();

  await page.goto('/#overview');
  await expect(page.getByText('Sonstige Einkünfte: 1 Eintrag')).toBeVisible();
});

test('several entries, invalid input is marked and removing an entry works', async ({ page }) => {
  await page.goto('/#other');
  await addEntry(page, 'Mieteinnahmen', '500');
  await addEntry(page, 'Pension', '800');
  await expect(page.getByText('2 von 10')).toBeVisible();
  await page.getByLabel('Betrag pro Monat, brutto').fill('-5');
  await expect(page.getByText(/Der Wert muss zwischen 0 und 100\.?000 liegen/)).toBeVisible();
  await page.getByLabel('Betrag pro Monat, brutto').fill('800');
  await expect(page.getByText(/Der Wert muss zwischen 0 und 100\.?000 liegen/)).toHaveCount(0);
  await openGroup(page, 'Beginn und Ende');
  await page.getByLabel('Ende', { exact: true }).selectOption('age');
  await page.getByLabel('Endalter').fill('60');
  await expect(page.getByText(/Das Ende muss nach dem Beginn liegen/)).toBeVisible();

  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Entfernen' }).click();
  await expect(page.getByText('1 von 10')).toBeVisible();
});

test('a couple: entries from the example, continued payment shows in the household view', async ({
  page,
}) => {
  await loadExample(page, 'Paar');
  await page.goto('/#other');
  await expect(page.getByText('2 von 10')).toBeVisible();
  await page.getByRole('button', { name: /Private Rentenversicherung/ }).click();
  await openGroup(page, 'Weitergabe an den Partner');
  await expect(page.getByLabel('Weiterzahlung an den Partner')).toHaveValue('60');

  // Ben dies first (born 1983) and his rent has no continued payment: the household view says so.
  await page.getByRole('radio', { name: 'Ben Beispiel' }).click();
  await expect(page.getByText('1 von 10')).toBeVisible();
  await openGroup(page, 'Weitergabe an den Partner');
  await page.getByLabel('Weiterzahlung an den Partner').fill('50');

  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  await page
    .locator('details.dt', { hasText: 'Verlauf nach Kalenderjahr' })
    .locator('summary')
    .click();
  await expect(
    page.getByText(/Aus den sonstigen Einkünften des Verstorbenen werden ab dem Folgejahr etwa/),
  ).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the entry form and the result have no axe violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await loadExample(page, 'Paar');
    await page.goto('/#other');
    await expect(page.getByText('2 von 10')).toBeVisible();
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
}
