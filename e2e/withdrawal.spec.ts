import { expect, test } from '@playwright/test';
import { openRow } from './helpers';

test('ETF: percent withdrawal shows the first-year rows, warns when the capital runs out and is kept', async ({
  page,
}) => {
  await page.goto('/#etf');
  const annuity = page.getByRole('radio', { name: /Gleichbleibend bis zum Endalter/ });
  const percent = page.getByRole('radio', { name: 'Prozent vom Kapital bei Rentenbeginn' });
  await expect(annuity).toBeChecked();
  await expect(page.getByText('Kapital reicht bis Alter')).toHaveCount(0);

  await percent.check();
  const card = page.locator('#etf-retirement');
  await expect(card.locator('dt', { hasText: 'Entnahme im ersten Jahr, brutto' })).toBeVisible();
  await expect(card.locator('dt', { hasText: 'Restkapital im Endalter (nominal)' })).toBeVisible();
  await expect(card.getByText(/\(Ende\)/).first()).toBeVisible();
  await openRow(page, 'Restkapital im Ruhestand');
  await expect(page.getByRole('img', { name: /Restkapitals je Alter/ })).toBeVisible();
  await expect(page.getByText('Tabelle zum Diagramm')).toBeVisible();

  await page.getByLabel('Entnahme pro Jahr (nur bei „Prozent“)').fill('8');
  await expect(card.getByText(/mit \d+ Jahre.* aufgebraucht/)).toBeVisible();

  await page.getByLabel('Entnahme pro Jahr (nur bei „Prozent“)').fill('0');
  await expect(page.getByText(/Der Wert muss größer als 0 sein/).first()).toBeVisible();

  await page.getByLabel('Entnahme pro Jahr (nur bei „Prozent“)').fill('5');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(percent).toBeChecked();
  await expect(page.getByLabel('Entnahme pro Jahr (nur bei „Prozent“)')).toHaveValue('5');

  await annuity.check();
  await expect(card.getByText('Kapital reicht bis Alter')).toHaveCount(0);
});

test('Depot: percent withdrawal shows when the capital lasts', async ({ page }) => {
  await page.goto('/#depot');
  await page
    .getByLabel(/Eigenbeitrag/)
    .first()
    .fill('150');
  await page.getByRole('radio', { name: 'Prozent vom Kapital bei Rentenbeginn' }).check();
  await expect(page.getByText('Kapital reicht bis Alter')).toBeVisible();
  await expect(page.getByText('Restkapital im Endalter (nominal)')).toBeVisible();
});
