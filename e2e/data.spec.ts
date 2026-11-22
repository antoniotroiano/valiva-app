import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, test } from '@playwright/test';

test('export, reset and import restore the household with the same gap', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.getByLabel(/Wunscheinkommen im Ruhestand/).fill('4000');
  await page.goto('/#household');
  await page.getByRole('button', { name: 'Person hinzufügen' }).click();
  await page.getByLabel('Name von Person 2').fill('Partner');
  await page.goto('/#etf');
  await page.getByLabel('Monatliche Sparrate').fill('333');
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).check();
  await expect(page.getByRole('heading', { name: 'Gesamtsicht Haushalt' })).toBeVisible();
  const gapBefore = await page.locator('.kpi').first().textContent();

  await page.goto('/#data');
  await expect(page.getByText(/Noch nie exportiert/)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten exportieren' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^valiva-\d{4}-\d{2}-\d{2}\.workspace\.json$/);
  const file = join(tmpdir(), download.suggestedFilename());
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, 'utf8'));
  expect(exported.household.persons).toHaveLength(2);
  await expect(page.getByText(/Zuletzt exportiert/)).toBeVisible();

  await page.getByRole('button', { name: 'Alle Daten löschen …' }).click();
  await page.getByRole('button', { name: 'Alles löschen' }).click();
  await page.waitForLoadState('load');
  await page.goto('/#household');
  await expect(page.getByLabel('Name von Person 1')).toHaveValue('Person 1');
  await expect(page.getByLabel('Name von Person 2')).toHaveCount(0);

  await page.goto('/#data');
  await page.getByLabel(/Datei wählen/).setInputFiles(file);
  await expect(
    page.getByText('2: Person 1, Partner').or(page.getByText(/2: .*Partner/)),
  ).toBeVisible();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  expect((await backup).suggestedFilename()).toMatch(/backup/);
  await page.waitForLoadState('load');
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).check();
  await expect(page.locator('.kpi').first()).toHaveText(gapBefore ?? '');
});

test('an invalid file shows a clear message and changes nothing', async ({ page }) => {
  await page.goto('/#etf');
  await page.getByLabel('Monatliche Sparrate').fill('271');
  await page.goto('/#data');
  const bad = join(tmpdir(), 'broken.workspace.json');
  writeFileSync(bad, '{"format": "other"}');
  await page.getByLabel(/Datei wählen/).setInputFiles(bad);
  await expect(page.getByRole('status')).toContainText('Das ist keine Datei dieser App');
  await expect(page.getByRole('button', { name: 'Daten ersetzen …' })).toHaveCount(0);
  await page.goto('/#etf');
  await expect(page.getByLabel('Monatliche Sparrate')).toHaveValue('271');
});

test('an example workspace can be loaded', async ({ page }) => {
  await page.goto('/#data');
  await page.getByRole('button', { name: 'Paar', exact: true }).click();
  await expect(page.getByText('Erfundene Beispieldaten')).toBeVisible();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await page.waitForLoadState('load');
  await page.goto('/#household');
  await expect(page.getByLabel('Name von Person 2')).toHaveValue('Ben Beispiel');
});
