import { expect, test, type Page } from '@playwright/test';
import { openRow } from './helpers';

// Review 14, AP-09: the Rentenplan shows the result first (hero, wish next to it), details are collapsed,
// important notes stand above the page head, there is one person switcher, and the page stays short.

async function loadExample(page: Page, example: 'Paar' | 'Einzelperson') {
  await page.goto('/#data');
  await page.getByRole('button', { name: example, exact: true }).click();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  // The import reloads the page: a marker on `window` disappears with the old document.
  await page.evaluate(() => ((window as unknown as { __old: boolean }).__old = true));
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await page.waitForFunction(() => !(window as unknown as { __old?: boolean }).__old);
  await page.waitForLoadState('load');
}

const height = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight);

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('result first: hero with the wish field next to it, then scenarios, composition and details', async ({
    page,
  }) => {
    await loadExample(page, 'Einzelperson');
    await page.goto('/#overview');
    const hero = page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' });
    await expect(hero.getByText(/pro Monat/).first()).toBeVisible();
    await expect(hero.getByLabel(/Gewünschtes Netto-Einkommen/)).toBeVisible();
    await expect(hero.getByText(/Gedeckt sind \d+ %/)).toBeVisible();
    // Order in the page: hero, scenario switch, composition, "Mehr dazu".
    const tops = await page.evaluate(() => {
      const y = (e: Element | null) => e!.getBoundingClientRect().top;
      const q = (s: string) => document.querySelector(s);
      return [
        y(q('.hero-grid')),
        y(q('[aria-label="Szenario"]')),
        y(
          [...document.querySelectorAll('main h2')].find((h) =>
            h.textContent?.startsWith('Zusammensetzung'),
          ) ?? null,
        ),
        y(q('.dts')),
      ];
    });
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    // The detail rows are collapsed by default.
    for (const title of ['Verlauf je Alter', 'Lücke schließen', 'Details und Tabellen']) {
      await expect(
        page.locator('details.dt', { has: page.locator('summary', { hasText: title }) }),
      ).not.toHaveAttribute('open', '');
    }
  });

  test('the old ETF end value is gone, savings goals are only a link, and the page has one person switcher', async ({
    page,
  }) => {
    await loadExample(page, 'Paar');
    await page.goto('/#overview');
    await page.getByRole('radio', { name: 'Anna Beispiel' }).click();
    await expect(page.getByText(/Endwert nach Steuer/)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Sparziele' })).toHaveCount(0);
    await expect(page.getByLabel('Aktive Person')).toHaveCount(0); // no select in the sidebar
    await expect(page.getByRole('radiogroup')).toHaveCount(2); // person tabs and scenario switch
    await page
      .getByRole('link', { name: /Sparziele/ })
      .last()
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: /^Sparziele · Anna Beispiel/ }),
    ).toBeVisible();
  });

  test('household page stays under 1.600 px with the details collapsed', async ({ page }) => {
    await loadExample(page, 'Paar');
    await page.goto('/#overview');
    await page.getByRole('radio', { name: 'Haushalt' }).click();
    await expect(page.getByRole('region', { name: 'Gesamtsicht Haushalt' })).toBeVisible();
    expect(await height(page)).toBeLessThan(1600);
  });

  test('important notes stand above the page head, the other notes are collapsed with their count', async ({
    page,
  }) => {
    await loadExample(page, 'Paar');
    await page.goto('/#overview');
    await page.getByRole('radio', { name: 'Anna Beispiel' }).click();
    const important = page.locator('.notice.warn', { hasText: 'wichtig' });
    await expect(important).toContainText(/\d+ wichtige Hinweise/);
    const above = await important.evaluate(
      (n) =>
        !!(
          n.compareDocumentPosition(document.querySelector('main h1')!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
    );
    expect(above).toBe(true);
    const notes = page.locator('details.dt', {
      has: page.locator('summary', { hasText: /^Hinweise \(\d+\)/ }),
    });
    await expect(notes).not.toHaveAttribute('open', '');
    await openRow(page, 'Hinweise');
    await expect(notes.getByRole('listitem').first()).toBeVisible();
    // Important notes are not repeated in the collapsed list.
    await expect(notes).not.toContainText('Ungeprüfter Rechtswert');
  });

  test('a person without any block gets the empty state with the next step', async ({ page }) => {
    await page.goto('/#overview');
    await openRow(page, 'Bausteine in der Gesamtsicht');
    // The page re-renders into the empty state, so click instead of waiting for the old checkbox.
    await page.getByRole('checkbox', { name: 'ETF-Sparplan' }).click();
    await expect(
      page.getByRole('heading', { name: 'Nächster Schritt: gesetzliche Rente eintragen' }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Gesamtsicht im Ruhestand' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Gesetzliche Rente eintragen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: /Gesetzliche Rente/ })).toBeVisible();
  });

  test('the person is part of the heading on block pages, only with more than one person', async ({
    page,
  }) => {
    await loadExample(page, 'Einzelperson');
    await page.goto('/#depot');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Altersvorsorgedepot', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Aktive Person' })).toHaveCount(0);

    await loadExample(page, 'Paar');
    await page.goto('/#depot');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Altersvorsorgedepot · Anna Beispiel' }),
    ).toBeVisible();
    const tabs = page.getByRole('radiogroup', { name: 'Aktive Person' });
    await expect(tabs.getByRole('radio')).toHaveCount(2);
    await tabs.getByRole('radio', { name: 'Ben Beispiel' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Altersvorsorgedepot · Ben Beispiel' }),
    ).toBeVisible();
    await expect(tabs.getByRole('radio', { name: 'Ben Beispiel' })).toBeFocused();
  });

  test('with more than three persons the switcher becomes a select', async ({ page }) => {
    await loadExample(page, 'Paar');
    await page.goto('/#household');
    await page.getByRole('button', { name: 'Person hinzufügen' }).click();
    await expect(page.getByLabel('Name von Person 3')).toBeVisible();
    await page.getByRole('button', { name: 'Person hinzufügen' }).click();
    await expect(page.getByLabel('Name von Person 4')).toBeVisible();
    await page.goto('/#depot');
    const select = page.getByRole('combobox', { name: 'Aktive Person' });
    await expect(select).toBeVisible();
    expect(await select.locator('option').count()).toBe(4);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('household page stays under 2.400 px with the details collapsed', async ({ page }) => {
    await loadExample(page, 'Paar');
    await page.goto('/#overview');
    await page.getByRole('radio', { name: 'Haushalt' }).click();
    await expect(page.getByRole('region', { name: 'Gesamtsicht Haushalt' })).toBeVisible();
    expect(await height(page)).toBeLessThan(2400);
  });
});
