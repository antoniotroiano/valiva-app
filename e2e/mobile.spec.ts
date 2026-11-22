import { expect, test, type Page } from '@playwright/test';

// Regression guard for the phone layout (review 14, B-1): no page may be wider
// than the screen, and scrollable table regions must be keyboard-reachable.

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

async function expectNoOverflow(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await expect(page.locator('main h1')).toBeVisible();
  // Collapsed sections hide wide content; open them so they are measured too.
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true));
  });
  const m = await page.evaluate(() => {
    const el = document.documentElement;
    const scrollRegions = [...document.querySelectorAll<HTMLElement>('main *')].filter(
      (e) =>
        e.scrollWidth > e.clientWidth &&
        ['auto', 'scroll'].includes(getComputedStyle(e).overflowX) &&
        !e.hasAttribute('tabindex'),
    );
    const smallFields = [...document.querySelectorAll<HTMLElement>('main input, main select')]
      .filter((e) => (e as HTMLInputElement).type !== 'checkbox')
      .filter((e) => (e as HTMLInputElement).type !== 'radio')
      .filter((e) => (e as HTMLInputElement).type !== 'range')
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16);
    const smallTargets = [
      ...document.querySelectorAll<HTMLElement>(
        'summary, button:not(.link), select, .seg label, input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file])',
      ),
    ].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height < 43.5;
    });
    const summariesWithoutMarker = [...document.querySelectorAll('summary')].filter(
      (e) => getComputedStyle(e).display !== 'list-item',
    );
    return {
      smallTargets: smallTargets.map((e) => `${e.tagName}.${e.className}`),
      summariesWithoutMarker: summariesWithoutMarker.length,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      unfocusableScrollRegions: scrollRegions.map((e) => e.className || e.tagName),
      smallFields: smallFields.length,
    };
  });
  expect(m.scrollWidth, `${hash}: page wider than the screen`).toBeLessThanOrEqual(m.clientWidth);
  expect(m.unfocusableScrollRegions, `${hash}: scrollable area without tabindex`).toEqual([]);
  expect(m.smallTargets, `${hash}: touch target below 44px`).toEqual([]);
  expect(m.summariesWithoutMarker, `${hash}: summary lost its disclosure marker`).toBe(0);
  expect(m.smallFields, `${hash}: input font below 16px`).toBe(0);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`phone layout 375 px (${colorScheme})`, () => {
    test.use({ viewport: { width: 375, height: 812 }, colorScheme });

    for (const hash of PAGES) {
      test(`page ${hash} does not overflow sideways`, async ({ page }) => {
        await loadCouple(page);
        await expectNoOverflow(page, hash);
      });
    }
  });
}

test.describe('phone layout 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const hash of ['overview', 'depot']) {
    test(`page ${hash} does not overflow sideways`, async ({ page }) => {
      await loadCouple(page);
      await expectNoOverflow(page, hash);
    });
  }
});
