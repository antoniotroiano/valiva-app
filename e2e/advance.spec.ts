import { expect, test } from '@playwright/test';
import { openGroup, planFinalValue } from './helpers';

test('advance lump sum is off by default, can be switched on, shows its tax and is kept', async ({
  page,
}) => {
  await page.goto('/#etf');
  await openGroup(page, 'Steuer');
  const box = page.getByRole('checkbox', { name: 'Vorabpauschale jedes Jahr berücksichtigen' });
  await expect(box).not.toBeChecked();
  await expect(
    page.locator('#etf-plan .result-kpis div', { hasText: 'Steuer auf Vorabpauschalen' }),
  ).toHaveCount(0);
  const without = await planFinalValue(page);

  await box.check();
  await expect(
    page.locator('#etf-plan .result-kpis div', { hasText: 'Steuer auf Vorabpauschalen' }),
  ).toBeVisible();
  await expect(
    page.locator('#etf-plan .result-kpis div', { hasText: 'Steuer beim Verkauf' }),
  ).toBeVisible();
  await expect.poll(() => planFinalValue(page)).not.toBe(without);
  // The default plan runs into years without a published base interest
  await expect(page.getByText('Für spätere Jahre nimmt die App 3,20 % an')).toBeVisible();

  await page.waitForTimeout(600);
  await page.reload();
  await openGroup(page, 'Steuer');
  await expect(box).toBeChecked();

  await page.getByRole('checkbox', { name: 'Steuer am Ende berücksichtigen' }).uncheck();
  await expect(box).toBeDisabled();
});

test('the Annahmen page lists the base interest with its status', async ({ page }) => {
  await page.goto('/#assumptions');
  const table = page.locator('table', { hasText: 'Basiszins 2026' });
  await expect(table).toContainText('3,2');
  await expect(table.locator('tr', { hasText: 'Basiszins ab 2027' })).toContainText('ungeprüft');
  await expect(table.locator('tr', { hasText: 'Basiszins 2026' })).toContainText('bestätigt');
});
