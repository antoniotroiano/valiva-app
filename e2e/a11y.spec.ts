import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './helpers';

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

const loadCouple = (page: Page) => loadExample(page, 'Paar');

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
  // The withdrawal fields sit in a collapsed input group on the Depot page (loaded lazily).
  await page.locator('details.group').first().waitFor();
  await page.evaluate(() => {
    document
      .querySelectorAll('details.group')
      .forEach((d) => ((d as HTMLDetailsElement).open = true));
  });
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

// Phone navigation (bottom tab bar and its sheets) in both colour schemes.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, phone navigation (${colorScheme})`, () => {
    test.use({ colorScheme, viewport: { width: 375, height: 812 } });

    test('tab bar and the Inputs and More sheets have no axe violations', async ({ page }) => {
      await loadCouple(page);
      await page.goto('/#overview');
      await page.getByRole('radio', { name: 'Haushalt' }).check();
      await expectNoViolations(page);
      for (const name of ['Eingaben', 'Mehr']) {
        await page.getByRole('button', { name, exact: true }).click();
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(results.violations.map((v) => v.id)).toEqual([]);
        await page.keyboard.press('Escape');
      }
    });
  });
}
