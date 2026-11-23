import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './helpers';

// AP-12: the Annahmen page starts with the own assumptions, lists legal values by area (collapsed), keeps
// unverified values visible and shows no developer path.

const AREAS = [
  'tax',
  'pension',
  'social',
  'depot',
  'incomeTax',
  'otherIncome',
  'jointAssessment',
] as const;

const bodyWords = (page: Page) =>
  page.evaluate(
    () => document.querySelector('main')!.innerText.split(/\s+/).filter(Boolean).length,
  );

test('the page starts with the own assumptions, then legal values, rules and terms', async ({
  page,
}) => {
  await page.goto('/#assumptions');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('#calc-rules')).toBeVisible();
  const headings = await page.locator('main h2').allInnerTexts();
  expect(headings).toEqual(['Deine Annahmen', 'Gesetzliche Werte', 'Rechenregeln', 'Begriffe']);
  const yours = page.locator('section[aria-labelledby="your-assumptions"]');
  await expect(yours).toContainText('Inflation p. a.');
  await expect(yours).toContainText('Rentenanpassung p. a.');
  await expect(yours).toContainText('Rendite in der Rentenphase p. a.');
  await expect(yours).toContainText('3 / 5 / 7 %');
  await expect(yours.locator('input, select, textarea')).toHaveCount(0);
});

test('"Im Profil ändern" leads to the profile', async ({ page }) => {
  await page.goto('/#assumptions');
  await page.getByRole('button', { name: 'Im Profil ändern' }).click();
  await expect(page).toHaveURL(/#profile$/);
  await expect(page.locator('main h1')).toHaveText(/Profil/);
});

test('the shown own assumptions follow the profile', async ({ page }) => {
  await page.goto('/#profile');
  await page
    .locator('details.group', { hasText: 'Allgemeine Annahmen' })
    .locator('summary')
    .click();
  await page.getByLabel('Inflation p. a.').fill('3,5');
  await page.goto('/#assumptions');
  await expect(page.locator('section[aria-labelledby="your-assumptions"]')).toContainText('3,5 %');
});

test('unverified values stay visible while every area is collapsed', async ({ page }) => {
  await page.goto('/#assumptions');
  const rows = page.locator('#legal-values ~ .dts > details.dt');
  await expect(rows).toHaveCount(7);
  for (const id of AREAS) {
    await expect(page.locator(`#legal-${id}`)).not.toHaveAttribute('open', /.*/);
  }
  await expect(page.locator('#legal-tax > summary')).toContainText('3 ungeprüft');
  await expect(page.locator('#legal-depot > summary')).toContainText('2 ungeprüft');
  for (const id of ['pension', 'social', 'incomeTax']) {
    await expect(page.locator(`#legal-${id} > summary`)).toContainText('alle bestätigt');
    await expect(page.locator(`#legal-${id} > summary`)).not.toContainText('ungeprüft');
  }
  // Overall line above the list; the summary row is visible without opening anything.
  await expect(page.locator('#legal-otherIncome > summary')).toContainText('5 ungeprüft');
  await expect(page.locator('#legal-jointAssessment > summary')).toContainText('1 ungeprüft');
  await expect(page.locator('.legal-summary')).toContainText('11 ungeprüft');
  await expect(page.locator('#legal-tax > summary .chip.warn')).toBeVisible();
});

test('an unverified value is marked at the value itself', async ({ page }) => {
  await page.goto('/#assumptions');
  await page.locator('#legal-tax > summary').click();
  const unverified = page.locator('#legal-tax li.val.unv');
  await expect(unverified).toHaveCount(3);
  for (const row of await unverified.all())
    await expect(row.locator('.chip.warn')).toContainText('ungeprüft');
  await page.locator('#legal-depot > summary').click();
  await expect(page.locator('#legal-depot li.val.unv')).toHaveCount(2);
  await expect(page.locator('#legal-pension li.val.unv')).toHaveCount(0);
});

test('every value stays reachable with its validity and its source', async ({ page }) => {
  await page.goto('/#assumptions');
  const expected = {
    tax: 18,
    pension: 20,
    social: 11,
    depot: 20,
    incomeTax: 15,
    otherIncome: 5,
    jointAssessment: 2,
  };
  for (const id of AREAS) {
    await page.locator(`#legal-${id} > summary`).click();
    const rows = page.locator(`#legal-${id} li.val`);
    await expect(rows).toHaveCount(expected[id]);
    await expect(page.locator(`#legal-${id} .val-since`)).toHaveCount(expected[id]);
    await expect(page.locator(`#legal-${id} details.src`)).toHaveCount(expected[id]);
  }
  // A source is collapsed until asked for, then shows the legal reference and the date as small text.
  const row = page.locator('#legal-tax li.val', { hasText: 'Teilfreistellung Aktienfonds' });
  await expect(row.locator('details.src p')).toBeHidden();
  await row.locator('details.src summary').click();
  await expect(row.locator('details.src p')).toContainText('§20 Abs. 1 InvStG');
  await expect(row.locator('.src-date')).toHaveText('· geprüft 19.11.2026');
  await expect(row).toContainText('gültig ab 01.01.2018');
});

test('the unverified source of a church tax value is shown in full', async ({ page }) => {
  await page.goto('/#assumptions');
  await page.locator('#legal-tax > summary').click();
  const row = page.locator('#legal-tax li.val', { hasText: 'Kirchensteuer Baden-Württemberg' });
  await row.locator('details.src summary').click();
  await expect(row.locator('details.src p')).toContainText(
    'noch nicht gegen eine amtliche Quelle geprüft',
  );
  await expect(row).toContainText('8 %');
});

test('no config path and no review log in the interface', async ({ page }) => {
  await page.goto('/#assumptions');
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  const text = await page.locator('main').innerText();
  expect(text).not.toMatch(/config\//);
  expect(text).not.toMatch(/\.json/);
  expect(text).not.toContain('geprüft am');
  expect(text).not.toContain('gesetze-im-internet');
});

test('calculation rules sit in one collapsed row per building block', async ({ page }) => {
  await page.goto('/#assumptions');
  const rows = page.locator('#calc-rules ~ .dts > details.dt');
  await expect(rows).toHaveCount(8);
  await expect(page.locator('#rules-depot')).not.toHaveAttribute('open', /.*/);
  await page.locator('#rules-depot > summary').click();
  await expect(page.locator('#rules-depot')).toContainText('Zulagen je Kalenderjahr');
  await expect(page.locator('#rules-depot li')).toHaveCount(8);
  await page.locator('#glossary-terms > summary').click();
  await expect(page.locator('#glossary-terms')).toContainText('Glide Path');
});

for (const [label, width, height, maxHeight, maxWords] of [
  ['desktop', 1280, 900, 2500, 450],
  ['375 px', 375, 812, 2500, 450],
] as const) {
  test(`collapsed page stays short (${label})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await loadExample(page, 'Einzelperson');
    await page.goto('/#assumptions');
    await expect(page.locator('main h1')).toBeVisible();
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(h).toBeLessThan(maxHeight);
    expect(await bodyWords(page)).toBeLessThan(maxWords);
  });
}
