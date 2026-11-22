import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PAGES = [
  'overview',
  'household',
  'profile',
  'etf',
  'statutory',
  'depot',
  'occupational',
  'goals',
  'assumptions',
  'data',
];

async function loadCouple(page: Page) {
  await page.goto('/#data');
  await page.getByRole('button', { name: 'Paar', exact: true }).click();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await page.waitForLoadState('load');
}

async function expectNoViolations(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  // Collapsed sections are skipped by axe otherwise (hidden content is not checked).
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true));
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
  expect(summary).toEqual([]);
}

async function choosePercent(page: Page) {
  await page.getByRole('radio', { name: 'Prozent vom Kapital bei Rentenbeginn' }).check();
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    for (const hash of PAGES) {
      test(`page ${hash} has no axe violations`, async ({ page }) => {
        await page.goto(`/#${hash}`);
        await expectNoViolations(page);
      });
    }

    for (const hash of ['etf', 'depot']) {
      test(`page ${hash} with percent withdrawal has no axe violations`, async ({ page }) => {
        await loadCouple(page);
        await page.goto(`/#${hash}`);
        await choosePercent(page);
        await expectNoViolations(page);
      });
    }

    for (const hash of PAGES) {
      test(`page ${hash} with example data has no axe violations`, async ({ page }) => {
        await loadCouple(page);
        await page.goto(`/#${hash}`);
        if (hash === 'overview') await page.getByRole('radio', { name: 'Haushalt' }).check();
        await expectNoViolations(page);
      });
    }
  });
}
