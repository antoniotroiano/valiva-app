import { expect, test } from '@playwright/test';
import { loadExample } from './helpers';

test.describe('building-block page template (ETF page, desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the result of the saving phase is on the first screen, next to the inputs', async ({
    page,
  }) => {
    await page.goto('/#etf');
    const hero = page.locator('#etf-plan .result-frame');
    await expect(hero).toBeVisible();
    const box = await hero.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(800);
  });

  test('the result column runs along while the inputs scroll', async ({ page }) => {
    await page.goto('/#etf');
    await page.locator('#etf-plan .bp-in').getByLabel('Laufzeit').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 300));
    const top = await page
      .locator('#etf-plan .bp-res')
      .evaluate((e) => e.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(40);
  });

  test('every former input and result of the ETF page is still reachable', async ({ page }) => {
    await page.goto('/#etf');
    const plan = page.locator('#etf-plan');
    for (const label of ['Startkapital', 'Monatliche Sparrate', 'Jährliche Steigerung der Rate'])
      await expect(plan.getByLabel(label, { exact: true })).toBeVisible();
    // collapsed groups: one click each
    for (const group of ['Einmalzahlungen', 'Kosten', 'Steuer', 'Rendite und Inflation'])
      await expect(plan.locator('details.group > summary', { hasText: group })).toBeVisible();
    for (const row of ['Entwicklung des Depotwerts', 'Jahrestabelle', 'Zielvermögen'])
      await expect(plan.locator('details.dt > summary', { hasText: row })).toBeVisible();
    const retirement = page.locator('#etf-retirement');
    await expect(retirement.getByLabel('Beginn der Entnahme (Alter)')).toBeVisible();
    await expect(retirement.getByLabel('Ende der Entnahme (Alter)')).toBeVisible();
    await expect(retirement.getByRole('radio')).toHaveCount(2);
    await expect(
      retirement.locator('details.dt > summary', { hasText: 'Alle Szenarien im Vergleich' }),
    ).toBeVisible();
  });

  test('help text per field is one short sentence, details are behind "Mehr erfahren"', async ({
    page,
  }) => {
    await page.goto('/#etf');
    const hintLocator = page.locator('#etf-plan .bp-in .field > .hint');
    await expect(hintLocator.first()).toBeVisible();
    const hints = await hintLocator.allInnerTexts();
    expect(hints.length).toBeGreaterThan(3);
    for (const h of hints) expect(h.split(/\s+/).length).toBeLessThanOrEqual(12);
    await page
      .locator('#etf-plan .field', { hasText: 'Laufzeit' })
      .locator('summary', { hasText: 'Mehr erfahren' })
      .click();
    await expect(page.getByText(/ignorieren dieses Feld/)).toBeVisible();
  });

  test('the ETF page stays under 350 visible words in its initial state', async ({ page }) => {
    await page.goto('/#etf');
    await expect(page.locator('#etf-plan .result-frame')).toBeVisible();
    const words = await page.locator('main').evaluate((m) => {
      const clone = m as HTMLElement;
      return clone.innerText.split(/\s+/).filter(Boolean).length;
    });
    expect(words).toBeLessThan(350);
  });
});

test.describe('building-block page template (ETF page, phone)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the result strip sticks under the top bar and jumps to the parts', async ({ page }) => {
    await page.goto('/#etf');
    const strip = page.getByRole('group', { name: 'Ergebnisse im Überblick' });
    await expect(strip).toBeVisible();
    await page.evaluate(() => window.scrollBy(0, 900));
    const box = await strip.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(50);
    expect(box!.y).toBeLessThan(70);
    await strip.getByRole('button', { name: /Ruhestand/ }).click();
    await expect
      .poll(() => page.locator('#etf-retirement').evaluate((e) => e.getBoundingClientRect().top))
      .toBeLessThan(200);
  });

  test('on a phone the order is result, inputs, calculation', async ({ page }) => {
    await page.goto('/#etf');
    const y = (sel: string) =>
      page.locator(`#etf-plan ${sel}`).evaluate((e) => e.getBoundingClientRect().top + scrollY);
    expect(await y('.bp-result')).toBeLessThan(await y('.bp-in'));
    expect(await y('.bp-in')).toBeLessThan(await y('.bp-calc'));
  });
});

test('the note on shared values stands under the heading (Profile and Annahmen)', async ({
  page,
}) => {
  await loadExample(page, 'Paar');
  for (const hash of ['profile', 'assumptions']) {
    await page.goto(`/#${hash}`);
    const note = page.locator('.page-head .hint');
    await expect(note).toBeVisible();
    const h1 = await page.locator('main h1').boundingBox();
    const n = await note.boundingBox();
    expect(n!.y).toBeGreaterThan(h1!.y + h1!.height - 1);
  }
  await page.goto('/#etf');
  await expect(page.locator('.page-head .hint')).toHaveCount(0);
});
