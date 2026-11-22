import { expect, test } from '@playwright/test';

async function finalAfterTax(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.locator('.kpi', { hasText: 'Endwert nach Steuer (neutral)' }).innerText();
  const match = /([\d.]+)\s*€/.exec(text);
  if (!match) throw new Error(`no amount in "${text}"`);
  return Number(match[1]!.replaceAll('.', ''));
}

test('church tax in the profile lowers the ETF result and is kept after a reload', async ({
  page,
}) => {
  await page.goto('/#etf');
  const without = await finalAfterTax(page);

  await page.goto('/#profile');
  await page.locator('summary', { hasText: 'Kirchensteuer auf Kapitalerträge' }).click();
  await page.getByRole('radio', { name: /Kirchensteuer 9 %/ }).check();
  await expect(page.getByText(/statt 26,375 %/)).toBeVisible();
  await expect(page.getByText('noch nicht gegen eine amtliche Quelle geprüft')).toBeVisible();

  await page.waitForTimeout(600);
  await page.goto('/#etf');
  await page.reload();
  await expect.poll(() => finalAfterTax(page)).toBeLessThan(without);

  await page.goto('/#profile');
  await page.locator('summary', { hasText: 'Kirchensteuer auf Kapitalerträge' }).click();
  await page.getByRole('radio', { name: 'Keine Kirchensteuer' }).check();
  await page.waitForTimeout(600);
  await page.goto('/#etf');
  await page.reload();
  await expect.poll(() => finalAfterTax(page)).toBe(without);
});
