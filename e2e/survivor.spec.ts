import { expect, test } from '@playwright/test';
import { openRow } from './helpers';

async function loadCouple(page: import('@playwright/test').Page) {
  await page.goto('/#data');
  await page.getByRole('button', { name: 'Paar', exact: true }).click();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await page.waitForLoadState('load');
}

test('survivor pension shows in the household view and can be switched off', async ({ page }) => {
  await loadCouple(page);
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  await openRow(page, 'Verlauf nach Kalenderjahr');
  await expect(page.getByRole('heading', { name: 'Hinterbliebenenrente' })).toBeVisible();
  await expect(page.getByText(/erhält .* eine Witwenrente von etwa/)).toBeVisible();
  await openRow(page, 'Hinweise');
  await expect(page.getByText(/Die Hinterbliebenenrente ist vereinfacht/)).toBeVisible();

  await page.goto('/#household');
  await page.getByLabel(/Hinterbliebenenrente der gesetzlichen Rente berücksichtigen/).uncheck();
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  await openRow(page, 'Verlauf nach Kalenderjahr');
  await expect(page.getByRole('heading', { name: 'Hinterbliebenenrente' })).toHaveCount(0);
  await openRow(page, 'Hinweise');
  await expect(page.getByText(/Es gibt keine Hinterbliebenenrente/)).toBeVisible();
});

test('the settings are locked for a household with one person and validated', async ({ page }) => {
  await page.goto('/#household');
  await expect(page.getByText('Gilt nur für Haushalte mit genau zwei Personen.')).toBeVisible();
  await expect(
    page.getByLabel(/Hinterbliebenenrente der gesetzlichen Rente berücksichtigen/),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Person hinzufügen' }).click();
  const wish = page.getByLabel('Wunscheinkommen nach dem ersten Todesfall');
  await wish.fill('5');
  await expect(page.getByText('Der Wert muss zwischen 10 und 100 liegen.')).toBeVisible();
  await wish.fill('70');
  await expect(page.getByText('Der Wert muss zwischen 10 und 100 liegen.')).toHaveCount(0);
});
