import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './helpers';

// AP-16: joint assessment (splitting) of a couple: the question, the note in the household view, the effect.

const QUESTION = 'Werdet ihr gemeinsam veranlagt (Ehe oder eingetragene Lebenspartnerschaft)?';

async function addSecondPerson(page: Page) {
  await page.goto('/#household');
  await page.getByRole('button', { name: 'Person hinzufügen' }).click();
}

/** Net monthly pension of the household in the hero figure, as a number. */
async function householdNet(page: Page): Promise<number> {
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  const text = await page.locator('.kpi-hero .kpi-value').first().innerText();
  return Number(/([\d.]+)\s*€/.exec(text)![1]!.replaceAll('.', ''));
}

test('a household of one person sees no question, no note and no step', async ({ page }) => {
  await page.goto('/#household');
  await expect(page.getByRole('heading', { name: 'Gemeinsame Veranlagung' })).toHaveCount(0);
  await expect(page.getByText(QUESTION)).toHaveCount(0);
  await page.goto('/#overview');
  await expect(page.getByText('Frage offen')).toHaveCount(0);
  await expect(page.getByText(/gemeinsam veranlagt/)).toHaveCount(0);
  await expect(page.getByText('Veranlagung', { exact: true })).toHaveCount(0);
});

test('two persons: the question is not preselected and the household view points to it', async ({
  page,
}) => {
  await addSecondPerson(page);
  const card = page.locator('#joint-question');
  await expect(card.getByRole('heading', { name: 'Gemeinsame Veranlagung' })).toBeVisible();
  await expect(card).toContainText('Frage offen');
  await expect(card.getByRole('radio', { name: 'Ja' })).not.toBeChecked();
  await expect(card.getByRole('radio', { name: 'Nein' })).not.toBeChecked();

  // The household view says that the question is open and jumps to it.
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  const note = page.locator('.joint-note');
  await expect(note).toContainText('Frage offen');
  await expect(note).toContainText('einzeln gerechnet');
  await note.getByRole('button', { name: 'Frage beantworten' }).click();
  await expect(page).toHaveURL(/#household$/);
  await expect(card.getByRole('radio', { name: 'Ja' })).toBeFocused();

  await card.getByRole('radio', { name: 'Nein' }).check();
  await expect(card).toContainText('einzeln veranlagt');
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  await expect(page.locator('.joint-note')).toContainText('Einzeln veranlagt');
  await expect(page.getByRole('button', { name: 'Frage beantworten' })).toHaveCount(0);
});

test('the answer is kept after a reload', async ({ page }) => {
  await addSecondPerson(page);
  await page.locator('#joint-question').getByRole('radio', { name: 'Ja' }).check();
  await page.reload();
  await expect(page.locator('#joint-question').getByRole('radio', { name: 'Ja' })).toBeChecked();
});

test('the example couple answers yes: no answer means the same as no, yes lowers the tax', async ({
  page,
}) => {
  await loadExample(page, 'Paar');
  await page.goto('/#household');
  const card = page.locator('#joint-question');
  await expect(card.getByRole('radio', { name: 'Ja' })).toBeChecked();

  const yes = await householdNet(page);
  await expect(page.locator('.joint-note')).toContainText('Gemeinsam veranlagt');
  await expect(page.getByText('Frage offen')).toHaveCount(0);

  await page.goto('/#household');
  await card.getByRole('radio', { name: 'Nein' }).check();
  const no = await householdNet(page);
  await expect(page.locator('.joint-note')).toContainText('Einzeln veranlagt');
  // The couple of the example has different pensions: splitting pays more net.
  expect(yes).toBeGreaterThan(no);
});

test('removing a person resets the answer; the next pair is asked again', async ({ page }) => {
  await loadExample(page, 'Paar');
  await page.goto('/#household');
  await page
    .getByRole('button', { name: /Ben Beispiel entfernen|Entfernen/ })
    .last()
    .click();
  await page
    .getByRole('dialog', { name: 'Person entfernen?' })
    .getByRole('button', { name: 'Entfernen' })
    .click();
  await expect(page.locator('#joint-question')).toHaveCount(0);
  await page.getByRole('button', { name: 'Person hinzufügen' }).click();
  const card = page.locator('#joint-question');
  await expect(card).toContainText('Frage offen');
  await expect(card.getByRole('radio', { name: 'Ja' })).not.toBeChecked();
});

test('the next-step card lists the step for a couple and opens the question', async ({ page }) => {
  await addSecondPerson(page);
  await page.getByLabel('Name von Person 1').fill('Anna');
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1985');
  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  const card = page.locator('.card.next');
  await expect(card.getByRole('list', { name: 'Fortschritt' })).toContainText('Veranlagung');
});

test.describe('accessibility', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`question and note have no axe violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await addSecondPerson(page);
      let result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
      await page.goto('/#overview');
      await page.getByRole('radio', { name: 'Haushalt' }).click();
      await expect(page.locator('.joint-note')).toBeVisible();
      result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
      await page.goto('/#household');
      await page.locator('#joint-question').getByRole('radio', { name: 'Ja' }).check();
      result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
    });
  }
});
