import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './helpers';

// AP-20 part B: retiree mode (profile switch, message, the four block pages with actual values, overview "Heute",
// household with a retired person), axe in both colour schemes and the phone layout.

test.use({ viewport: { width: 1280, height: 800 } });

const loadRetired = (page: Page) => loadExample(page, 'Rentnerin');
const loadCouple = (page: Page) => loadExample(page, 'Paar, eine Person in Rente');

test('the profile switch turns the person into a retiree and back, without losing the planned age', async ({
  page,
}) => {
  await loadExample(page, 'Einzelperson');
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1960');
  await expect(page.getByLabel('Gewünschtes Rentenalter')).toBeVisible();
  await page.getByLabel('Ich beziehe bereits Rente').check();
  await expect(page.getByLabel('Rentenbeginn (Jahr laut Rentenbescheid)')).toBeVisible();
  await expect(page.getByLabel('Gewünschtes Rentenalter')).toHaveCount(0);
  // Salary and marginal tax rate are only for the savings phase of the company pension.
  await expect(page.getByLabel('Grenzsteuersatz heute')).toHaveCount(0);
  await expect(page.getByText('Rentenbeginn laut Bescheid (Jahr)')).toBeVisible();
  await page.getByLabel('Ich beziehe bereits Rente').uncheck();
  await expect(page.getByLabel('Gewünschtes Rentenalter')).toHaveValue('67');
});

test('the message for a start in the past offers the mode and the button switches it on', async ({
  page,
}) => {
  await loadExample(page, 'Einzelperson');
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1950');
  await expect(
    page.getByText(/Wenn du schon Rente beziehst, führe die Person als Rentner/).first(),
  ).toBeVisible();
  await page.locator('#as-retired').getByRole('button', { name: 'Als Rentner führen' }).click();
  await expect(page.getByLabel('Ich beziehe bereits Rente')).toBeChecked();
  await expect(page.getByLabel('Rentenbeginn (Jahr laut Rentenbescheid)')).toHaveValue('2017');
  await expect(page.getByText(/liegt in der Vergangenheit/)).toHaveCount(0);
});

test('the overview of a retiree counts from today and has no savings plan to solve for', async ({
  page,
}) => {
  await loadRetired(page);
  await page.goto('/#overview');
  await expect(page.getByText(/Netto-Rente heute, Kaufkraft von heute/)).toBeVisible();
  await expect(page.locator('.hero .kpi-value')).not.toHaveText('0 € pro Monat');
  await page.locator('#close-gap > summary').click();
  await expect(page.locator('#close-gap')).toContainText('keinen ETF-Sparplan');
  // the sliders belong to savings plans
  await expect(page.getByText('Was wäre wenn')).toHaveCount(0);
});

test('the four block pages show actual values only', async ({ page }) => {
  await loadRetired(page);

  await page.goto('/#statutory');
  await expect(page.getByLabel('Bruttorente pro Monat laut Bescheid')).toHaveValue('1.650');
  await expect(page.getByText('Rentenbeginn', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Renteninformation')).toHaveCount(0);
  const hero = page.locator('.result-frame .kpi-value');
  await expect(hero).toHaveText(/1\.[34]\d\d\s€/);

  await page.goto('/#etf');
  await expect(page.getByLabel('Depotwert heute')).toHaveValue('80.000');
  await expect(page.getByLabel('Summe aller Einzahlungen')).toHaveValue('50.000');
  await expect(page.getByLabel('Monatliche Sparrate')).toHaveCount(0);
  await expect(page.locator('.result-frame .kpi-value')).toHaveText(/414\s€/);

  await page.goto('/#depot');
  await expect(page.getByLabel('Restkapital heute')).toHaveValue('30.000');
  await expect(page.getByLabel('Eigenbeitrag')).toHaveCount(0);

  await page.goto('/#occupational');
  await expect(page.getByLabel('Betriebsrente brutto pro Monat')).toHaveValue('250');
  await page.getByLabel('Als Restkapital mit Auszahlplan').check();
  await expect(page.getByLabel('Restkapital heute')).toBeVisible();
});

test('the sum paid in is required: without it the ETF shows the error, not a result', async ({
  page,
}) => {
  await loadRetired(page);
  await page.goto('/#etf');
  await page.getByLabel('Summe aller Einzahlungen').fill('');
  await expect(page.locator('.result-frame')).toHaveCount(0);
  await expect(page.locator('.field .error').first()).toBeVisible();
});

test('a household with one retiree: tile, transition years without a gap and the splitting note', async ({
  page,
}) => {
  await loadCouple(page);
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  const tile = page.getByRole('region', { name: 'Heute schon in Rente' });
  await expect(tile).toContainText('Marta Beispiel');
  await expect(tile).toContainText(/netto pro Monat/);
  await expect(page.getByText(/Übergang bis zum Rentenbeginn von Jonas Beispiel/)).toBeVisible();
  await expect(page.getByText(/wird Marta Beispiel einzeln besteuert/)).toBeVisible();
  await page
    .locator('details.dt', { hasText: 'Verlauf nach Kalenderjahr' })
    .locator('summary')
    .click();
  await expect(page.getByText('Übergang (ohne Lücke)')).toBeVisible();
  await page.locator('details.dt', { hasText: 'Details und Tabellen' }).locator('summary').click();
  await expect(page.getByText('in Rente', { exact: true }).first()).toBeVisible();
});

test('a person who plans to retire within a year is asked whether the pension notice is there', async ({
  page,
}) => {
  await loadExample(page, 'Einzelperson');
  const year = new Date().getFullYear();
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill(String(year - 66));
  await page.goto('/#overview');
  await expect(page.getByText('Liegt dir der Rentenbescheid schon vor?')).toBeVisible();
  await page.getByRole('button', { name: 'Ist-Werte eintragen' }).click();
  await expect(page.getByLabel('Ich beziehe bereits Rente')).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility with a retiree (${colorScheme})`, () => {
    test.use({ colorScheme });
    for (const hash of ['overview', 'profile', 'etf', 'statutory', 'depot', 'occupational']) {
      test(`page ${hash} has no axe violations`, async ({ page }) => {
        await loadRetired(page);
        await page.goto(`/#${hash}`);
        await expect(page.locator('main h1')).toBeVisible();
        await page.evaluate(() =>
          document.querySelectorAll('details').forEach((d) => (d.open = true)),
        );
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
          ),
        ).toEqual([]);
      });
    }
    test('household overview with a retiree has no axe violations', async ({ page }) => {
      await loadCouple(page);
      await page.goto('/#overview');
      await page.getByRole('radio', { name: 'Haushalt' }).click();
      await expect(page.getByRole('region', { name: 'Heute schon in Rente' })).toBeVisible();
      await page.evaluate(() =>
        document.querySelectorAll('details').forEach((d) => (d.open = true)),
      );
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
        ),
      ).toEqual([]);
    });
  });
}

test.describe('phone layout (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const hash of ['overview', 'profile', 'etf', 'statutory', 'depot', 'occupational']) {
    test(`page ${hash} of a retiree fits the screen`, async ({ page }) => {
      await loadRetired(page);
      await page.goto(`/#${hash}`);
      await expect(page.locator('main h1')).toBeVisible();
      await page.evaluate(() =>
        document.querySelectorAll('details').forEach((d) => (d.open = true)),
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        )
        .toBe(true);
    });
  }
});
