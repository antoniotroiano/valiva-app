import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './helpers';

// Review 14, AP-21: smoke test for the engines of Safari (WebKit) and Firefox, run with `PW_CROSS=1`
// (docs/testing.md). Background: `light-dark()` needs Safari 17.5, Safari may clear `localStorage` of a site
// that was not visited for a while, and every engine renders the pages a little differently.
// The tests also run in Chrome, so they stay valid there.

const pages = [
  ['overview', 'Rentenplan'],
  ['data', 'Daten'],
  ['assumptions', 'Annahmen'],
] as const;

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

for (const [hash, heading] of pages) {
  test(`${heading} renders without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await loadExample(page, 'Paar');
    await page.goto(`/#${hash}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page).toHaveTitle(`${heading} – Valiva`);
    expect(errors).toEqual([]);
  });

  test(`${heading} has no horizontal overflow at 375 px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loadExample(page, 'Paar');
    await page.goto(`/#${hash}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('light-dark() tokens resolve to different colours per scheme', async ({ browser }) => {
  const read = async (colorScheme: 'light' | 'dark') => {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto('/#overview');
    await expect(page.locator('main h1')).toBeVisible();
    const colours = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
    }));
    await context.close();
    return colours;
  };
  const light = await read('light');
  const dark = await read('dark');
  expect(light.body).not.toBe(dark.body);
  expect(light.text).not.toBe(dark.text);
  // A browser without light-dark() would leave the property unset and show transparent or the default.
  expect(light.body).not.toBe('rgba(0, 0, 0, 0)');
  expect(dark.body).not.toBe('rgba(0, 0, 0, 0)');
});

test('inputs survive a reload (localStorage)', async ({ page }) => {
  await page.goto('/#profile');
  const field = page.getByLabel('Geburtsjahr', { exact: true });
  await field.fill('1985');
  await expect.poll(() => page.evaluate(() => localStorage.length)).toBeGreaterThan(0);
  // The write is debounced; wait until it reached the storage before reloading.
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByLabel('Geburtsjahr', { exact: true })).toHaveValue('1985');
});

test('export downloads the workspace file', async ({ page }) => {
  await loadExample(page, 'Einzelperson');
  await page.goto('/#data');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten exportieren' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^valiva-.*\.workspace\.json$/);
});
