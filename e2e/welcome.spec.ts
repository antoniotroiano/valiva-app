import { expect, test } from '@playwright/test';

test('first start shows the welcome card; example data load it and the card disappears', async ({
  page,
}) => {
  await page.goto('/#overview');
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
  await expect(page.getByText('Beispielwerte')).toBeVisible();

  await page.getByRole('button', { name: 'Mit Beispieldaten ausprobieren' }).click();
  await page.getByRole('button', { name: 'Beispieldaten laden' }).click();
  await page.waitForLoadState('load');
  await expect(page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toHaveCount(0);
});

test('the welcome card ends with the first edit and the wish can be entered on the start page', async ({
  page,
}) => {
  await page.goto('/#overview');
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
  await page.getByLabel(/Gewünschtes Netto-Einkommen/).fill('3000');
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toHaveCount(0);
  await expect(page.getByText('Rentenlücke').first()).toBeVisible();
  // After the first edit the export reminder (never exported) takes the place of the old one-time hint.
  await expect(page.getByText(/Du hast noch nie exportiert/)).toBeVisible();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByLabel(/Gewünschtes Netto-Einkommen/)).toHaveValue('3.000');
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toHaveCount(0);
});

test('profile keeps the advanced groups collapsed with a summary; terms are explained', async ({
  page,
}) => {
  await page.goto('/#profile');
  const general = page.locator('details.group', { hasText: 'Allgemeine Annahmen' });
  await expect(general).not.toHaveAttribute('open', '');
  await expect(general.locator('summary')).toContainText('Erweitert, Standardwerte gesetzt');
  await general.locator('summary').click();
  await expect(page.getByLabel(/Inflation/).first()).toBeVisible();
  await expect(page.locator('abbr', { hasText: 'KVdR' }).first()).toHaveAttribute(
    'title',
    /Krankenversicherung der Rentner/,
  );
});

test('ETF page has two parts, each with its own result next to the inputs', async ({ page }) => {
  await page.goto('/#etf');
  await expect(page.getByRole('heading', { level: 2, name: 'Sparphase' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: /Ruhestand/ })).toContainText(
    'gilt für den Rentenplan',
  );
  for (const id of ['etf-plan', 'etf-retirement']) {
    const part = page.locator(`#${id}`);
    const inputs = await part.locator('.bp-in').boundingBox();
    const result = await part.locator('.bp-result').boundingBox();
    expect(result!.x).toBeGreaterThan(inputs!.x + inputs!.width - 1);
    // The result is on the first screen next to (not below) the inputs
    expect(Math.abs(result!.y - inputs!.y)).toBeLessThan(2);
  }
});

test('what-if sliders change the net pension without saving', async ({ page }) => {
  await page.goto('/#overview');
  await page.getByText('Was wäre, wenn …').click();
  const table = page.getByRole('table', { name: /Netto pro Monat im Alter/ });
  await expect(table.getByRole('row', { name: /Unterschied/ })).toContainText('0 €');
  await page.getByLabel('Rendite aller Szenarien').fill('-2');
  await expect(table.getByRole('row', { name: /Unterschied/ })).toContainText('−');
  await page.reload();
  await page.getByText('Was wäre, wenn …').click();
  await expect(page.getByLabel('Rendite aller Szenarien')).toHaveValue('0');
});

test('print layout hides the navigation and shows a header with the disclaimer', async ({
  page,
}) => {
  await page.goto('/#overview');
  await expect(page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('navigation')).toBeHidden();
  await expect(page.getByText(/^Valiva – Rentenplan, Stand/)).toBeVisible();
  await expect(page.getByText(/Keine Anlage- oder Steuerberatung/).first()).toBeVisible();
});

test('savings goals share one yearly allowance', async ({ page }) => {
  await page.goto('/#goals');
  await expect(
    page.getByRole('heading', { name: 'Sparerpauschbetrag für alle Ziele' }),
  ).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Ziel hinzufügen' }).click();
    await page.getByLabel('Aktueller Stand', { exact: true }).fill('40000');
    await page.getByLabel('Zielbetrag', { exact: true }).fill('60000');
    await page.getByLabel('Zins pro Jahr', { exact: true }).fill('3');
    await page.getByLabel('Priorität', { exact: true }).fill(String(i + 1));
  }
  await expect(page.getByText(/Freibetrag: .* genutzt/)).toBeVisible();
  await expect(page.getByText(/reicht der Freibetrag für dieses Ziel nicht/)).toBeVisible();
  await page.getByLabel('Sparerpauschbetrag pro Jahr').fill('5000');
  await expect(page.getByText(/reicht der Freibetrag für dieses Ziel nicht/)).toHaveCount(0);
});
