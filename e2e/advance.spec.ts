import { expect, test } from '@playwright/test';

async function finalAfterTax(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.locator('.kpi', { hasText: 'Endwert nach Steuer (neutral)' }).innerText();
  const match = /([\d.]+)\s*€/.exec(text);
  if (!match) throw new Error(`no amount in "${text}"`);
  return Number(match[1]!.replaceAll('.', ''));
}

test('advance lump sum is off by default, can be switched on, shows its tax and is kept', async ({
  page,
}) => {
  await page.goto('/#etf');
  const box = page.getByRole('checkbox', { name: 'Vorabpauschale jedes Jahr berücksichtigen' });
  await expect(box).not.toBeChecked();
  await expect(page.locator('.kpi', { hasText: 'Steuer auf Vorabpauschalen' })).toHaveCount(0);
  const without = await finalAfterTax(page);

  await box.check();
  await expect(page.locator('.kpi', { hasText: 'Steuer auf Vorabpauschalen' })).toBeVisible();
  await expect(page.locator('.kpi', { hasText: 'Steuer beim Verkauf' })).toBeVisible();
  await expect.poll(() => finalAfterTax(page)).not.toBe(without);
  // The default plan runs into years without a published base interest
  await expect(page.getByText('Für spätere Jahre nimmt die App 3,20 % an')).toBeVisible();

  await page.waitForTimeout(600);
  await page.reload();
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
