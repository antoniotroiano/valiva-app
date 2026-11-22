import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Review 14, AP-03 (B-2): page changes land at the top with the focus on the heading,
// every page has its own title, and on phones a bottom tab bar replaces the sidebar.

async function scrollDown(page: Page) {
  await expect(page.locator('main h1')).toBeVisible(); // pages load lazily
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
}

async function expectTopWithFocusedHeading(page: Page, heading: string) {
  const h1 = page.getByRole('heading', { level: 1, name: heading });
  await expect(h1).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('sidebar link scrolls to the top, focuses the heading and sets the title', async ({
    page,
  }) => {
    await page.goto('/#assumptions');
    await expect(page).toHaveTitle('Annahmen – Valiva');
    await scrollDown(page);
    await page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('link', { name: 'Profil' })
      .click();
    await expectTopWithFocusedHeading(page, 'Profil');
    await expect(page).toHaveTitle('Profil – Valiva');
  });

  test('the bottom bar is not shown', async ({ page }) => {
    await page.goto('/#overview');
    await expect(page.locator('.tabbar')).toBeHidden();
    await expect(page.locator('.mobile-top')).toBeHidden();
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('skip link focuses the content and keeps the page', async ({ page }) => {
    await page.goto('/#profile');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    expect(new URL(page.url()).hash).toBe('#profile');
    await expect(page).toHaveTitle('Profil – Valiva');
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const bar = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });

  test('bar replaces the sidebar and stays reachable on a long page', async ({ page }) => {
    await page.goto('/#assumptions');
    await expect(page.locator('.sidebar')).toBeHidden();
    await expect(bar(page)).toBeVisible();
    await scrollDown(page);
    const box = await bar(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeCloseTo(812, 0);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    // Nothing of the content is hidden below the bar.
    const last = await page
      .locator('main')
      .evaluate((m) => m.lastElementChild!.getBoundingClientRect().bottom);
    expect(last).toBeLessThanOrEqual(box!.y);
    // Slim top bar stays at the top.
    await expect(page.locator('.mobile-top')).toBeInViewport();
  });

  test('direct tabs change the page: top, heading focus, title, aria-current', async ({ page }) => {
    await page.goto('/#assumptions');
    await scrollDown(page);
    await bar(page).getByRole('link', { name: 'Haushalt' }).click();
    await expectTopWithFocusedHeading(page, 'Haushalt');
    await expect(page).toHaveTitle('Haushalt – Valiva');
    await expect(bar(page).getByRole('link', { name: 'Haushalt' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await bar(page).getByRole('link', { name: 'Rentenplan' }).click();
    await expectTopWithFocusedHeading(page, 'Rentenplan');
    await expect(bar(page).getByRole('link', { name: 'Rentenplan' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('inputs sheet: Escape closes it and returns the focus to the tab', async ({ page }) => {
    await page.goto('/#overview');
    const tab = bar(page).getByRole('button', { name: 'Eingaben' });
    await tab.click();
    const sheet = page.getByRole('dialog', { name: 'Eingaben' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Schließen' })).toBeFocused();
    await expect(tab).toHaveAttribute('aria-expanded', 'true');
    for (const name of [
      'Profil',
      'ETF-Sparplan',
      'Gesetzliche Rente',
      'Altersvorsorgedepot',
      'Betriebliche AV',
      'Sparziele',
    ]) {
      await expect(sheet.getByRole('link', { name })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(tab).toBeFocused();
    await expect(tab).toHaveAttribute('aria-expanded', 'false');
  });

  test('inputs sheet: choosing a page closes it and focuses the new heading', async ({ page }) => {
    await page.goto('/#assumptions');
    await scrollDown(page);
    await bar(page).getByRole('button', { name: 'Eingaben' }).click();
    await page
      .getByRole('dialog', { name: 'Eingaben' })
      .getByRole('link', { name: 'ETF-Sparplan' })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expectTopWithFocusedHeading(page, 'ETF-Sparplan');
    await expect(page).toHaveTitle('ETF-Sparplan – Valiva');
    // The tab of the sheet that holds the current page is marked, the other one is not.
    await expect(bar(page).getByRole('button', { name: 'Eingaben' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(bar(page).getByRole('button', { name: 'Mehr' })).not.toHaveAttribute(
      'aria-current',
      'true',
    );
    await bar(page).getByRole('button', { name: 'Eingaben' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Eingaben' }).getByRole('link', { name: 'ETF-Sparplan' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('more sheet: Escape, close button and scrim close it; theme can be switched', async ({
    page,
  }) => {
    await page.goto('/#overview');
    const tab = bar(page).getByRole('button', { name: 'Mehr' });
    await tab.click();
    const sheet = page.getByRole('dialog', { name: 'Mehr' });
    await expect(sheet.getByRole('link', { name: 'Annahmen' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Daten' })).toBeVisible();
    await sheet.getByLabel('Darstellung').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await sheet.getByRole('button', { name: 'Schließen' }).click();
    await expect(sheet).toBeHidden();
    await expect(tab).toBeFocused();
    await tab.click();
    await page.mouse.click(187, 100); // dimmed area above the sheet
    await expect(sheet).toBeHidden();
    await tab.click();
    await sheet.getByRole('link', { name: 'Daten' }).click();
    await expectTopWithFocusedHeading(page, 'Daten');
    await expect(bar(page).getByRole('button', { name: 'Mehr' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('page behind an open sheet is not reachable', async ({ page }) => {
    await page.goto('/#profile');
    await bar(page).getByRole('button', { name: 'Mehr' }).click();
    await expect(page.locator('#main')).toHaveAttribute('inert', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
  });

  test('the person switcher sits in the page head, not in the top bar', async ({ page }) => {
    await page.goto('/#data');
    await page.getByRole('button', { name: 'Paar', exact: true }).click();
    await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
    const backup = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
    await backup;
    await page.waitForLoadState('load');
    await page.goto('/#overview');
    await expect(page.locator('.mobile-top').getByLabel('Aktive Person')).toHaveCount(0);
    const tabs = page.getByRole('radiogroup', { name: 'Ansicht' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('radio', { name: 'Haushalt' })).toBeChecked();
    await tabs.getByRole('radio').nth(1).click();
    await expect(page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' })).toBeVisible();
    // Keyboard focus stays on the switcher after the view changed.
    await expect(
      page.getByRole('radiogroup', { name: 'Ansicht' }).getByRole('radio').nth(1),
    ).toBeFocused();
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`axe (${colorScheme})`, () => {
      test.use({ colorScheme });

      for (const sheet of [null, 'Eingaben', 'Mehr'] as const) {
        test(`bar${sheet ? ` with ${sheet} sheet` : ''} has no axe violations`, async ({
          page,
        }) => {
          await page.goto('/#overview');
          if (sheet) {
            await bar(page).getByRole('button', { name: sheet }).click();
            await expect(page.getByRole('dialog', { name: sheet })).toBeVisible();
          }
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
    });
  }
});
