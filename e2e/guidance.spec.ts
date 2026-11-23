import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './helpers';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Hauptnavigation' });
/** The status is part of the link name ("Profil , noch leer"); the browser may put a space before the comma. */
const named = (name: string): string | RegExp =>
  name.includes(', ')
    ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(', ', '\\s*,\\s*')}$`)
    : name;
const link = (page: Page, name: string | RegExp, exact = false) =>
  nav(page).getByRole('link', { name: typeof name === 'string' ? named(name) : name, exact });
const card = (page: Page, name: string | RegExp) => page.getByRole('region', { name });
const INPUT_PAGES = [
  'Profil',
  'ETF-Sparplan',
  'Gesetzliche Rente',
  'Altersvorsorgedepot',
  'Betriebliche AV',
];

async function exportBackup(page: Page) {
  await page.goto('/#data');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Daten exportieren' }).click();
  await download;
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
}

test.describe('guided start (AP-13), desktop', () => {
  test('first start: welcome card, no next-step card, every input page is marked empty', async ({
    page,
  }) => {
    await page.goto('/#overview');
    await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'So gehst du vor', includeHidden: true }),
    ).toHaveCount(1);
    await expect(page.getByText('Nächster Schritt')).toHaveCount(0);
    for (const name of INPUT_PAGES) await expect(link(page, `${name}, noch leer`)).toBeVisible();
    // Goals are optional: no mark while there is none.
    await expect(link(page, 'Sparziele', true)).toBeVisible();
  });

  test('first input: the card replaces the welcome card and the sidebar shows the page as filled', async ({
    page,
  }) => {
    await page.goto('/#statutory');
    await page.getByLabel(/Monatsrente laut Renteninformation/).fill('1400');
    await expect(link(page, 'Gesetzliche Rente, ausgefüllt')).toBeVisible();
    await page.goto('/#overview');
    await expect(page.getByRole('heading', { name: 'Willkommen' })).toHaveCount(0);
    await expect(card(page, 'Profil prüfen')).toBeVisible();
    await expect(card(page, 'Profil prüfen')).toContainText('1 von 4 erledigt');
    // Progress is readable without colour: each step carries its state as text.
    await expect(
      card(page, 'Profil prüfen').getByRole('listitem').filter({ hasText: 'Gesetzliche Rente' }),
    ).toContainText('erledigt');
    await expect(page.getByText(/Du hast noch nie exportiert/)).toHaveCount(0);
  });

  test('the card walks through profile, wish and backup and disappears when all steps are done', async ({
    page,
  }) => {
    await page.goto('/#statutory');
    await page.getByLabel(/Monatsrente laut Renteninformation/).fill('1400');
    await expect(link(page, 'Gesetzliche Rente, ausgefüllt')).toBeVisible();
    await page.goto('/#overview');

    await card(page, 'Profil prüfen').getByRole('button', { name: 'Profil öffnen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
    await page
      .getByLabel('Geburtsjahr', { exact: true })
      .fill(String(new Date().getFullYear() - 45));
    await expect(link(page, 'Profil, ausgefüllt')).toBeVisible();

    await page.goto('/#overview');
    await expect(card(page, 'Wunscheinkommen festlegen')).toBeVisible();
    await card(page, 'Wunscheinkommen festlegen')
      .getByRole('button', { name: 'Wunsch eintragen' })
      .click();
    await expect(page.getByLabel(/Gewünschtes Netto-Einkommen/)).toBeFocused();
    await page.keyboard.type('3000');

    // One step left: the card shrinks to a single line.
    await expect(card(page, 'Daten sichern')).toBeVisible();
    await expect(card(page, 'Daten sichern').locator('ol')).toHaveCount(0);
    await card(page, 'Daten sichern')
      .getByRole('button', { name: 'Sicherung exportieren' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daten' })).toBeVisible();
    await exportBackup(page);
    await page.goto('/#overview');
    await expect(page.getByText('Nächster Schritt')).toHaveCount(0);
  });

  test('"Ausblenden" is remembered; the status in the sidebar stays', async ({ page }) => {
    await page.goto('/#overview');
    await page.getByLabel(/Gewünschtes Netto-Einkommen/).fill('3000');
    await card(page, 'Profil prüfen').getByRole('button', { name: 'Ausblenden' }).click();
    await expect(page.getByText('Nächster Schritt')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('valiva.onboarding'))).toBe('hidden');
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Rentenplan' })).toBeVisible();
    await expect(page.getByText('Nächster Schritt')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Willkommen' })).toHaveCount(0);
    await expect(link(page, 'Profil, noch leer')).toBeVisible();
    // With the card gone the plain export reminder applies again.
    await expect(page.getByText(/Du hast noch nie exportiert/)).toBeVisible();
  });

  test('example data: only the backup is left, then the card is gone and every page reads as filled', async ({
    page,
  }) => {
    await loadExample(page, 'Einzelperson');
    await page.goto('/#overview');
    await expect(card(page, 'Daten sichern')).toBeVisible();
    await expect(page.getByText('Nächster Schritt')).toHaveCount(1);
    for (const name of [...INPUT_PAGES, 'Sparziele']) {
      await expect(link(page, `${name}, ausgefüllt`)).toBeVisible();
    }
    await exportBackup(page);
    await page.goto('/#overview');
    await expect(page.getByText('Nächster Schritt')).toHaveCount(0);
    await expect(page.getByText(/Du hast noch nie exportiert/)).toHaveCount(0);
  });

  test('keyboard: the card and its buttons are reachable with Tab and work with Enter', async ({
    page,
  }) => {
    await page.goto('/#statutory');
    await page.getByLabel(/Monatsrente laut Renteninformation/).fill('1400');
    await expect(link(page, 'Gesetzliche Rente, ausgefüllt')).toBeVisible();
    await page.goto('/#overview');
    const open = card(page, 'Profil prüfen').getByRole('button', { name: 'Profil öffnen' });
    await open.focus();
    await page.keyboard.press('Tab');
    await expect(
      card(page, 'Profil prüfen').getByRole('button', { name: 'Ausblenden' }),
    ).toBeFocused();
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  });

  test('two persons: status for the active person, the card follows the view', async ({ page }) => {
    await loadExample(page, 'Paar');
    await page.goto('/#overview');
    await expect(nav(page).getByText('Status für Anna Beispiel')).toBeVisible();
    await expect(card(page, 'Daten sichern')).toContainText('Haushalt');

    // Ben has not entered a pension: the household card names him, his own page is empty.
    await page.getByRole('radio', { name: 'Ben Beispiel' }).click();
    await page.goto('/#statutory');
    await page.getByLabel(/Monatsrente laut Renteninformation/).fill('0');
    await expect(nav(page).getByText('Status für Ben Beispiel')).toBeVisible();
    await expect(link(page, 'Gesetzliche Rente, noch leer')).toBeVisible();

    await page.goto('/#overview');
    await page.getByRole('radio', { name: 'Haushalt' }).click();
    const household = card(page, 'Gesetzliche Rente von Ben Beispiel eintragen');
    await expect(household).toBeVisible();
    await expect(household).toContainText('Anna Beispiel');
    // Person view of Anna: she is done with her own steps, so her card is the backup again.
    await page.getByRole('radio', { name: 'Anna Beispiel' }).click();
    await expect(card(page, 'Daten sichern')).toContainText('Anna Beispiel');
    await expect(link(page, 'Gesetzliche Rente, ausgefüllt')).toBeVisible();

    await page.getByRole('radio', { name: 'Haushalt' }).click();
    await card(page, 'Gesetzliche Rente von Ben Beispiel eintragen')
      .getByRole('button', { name: 'Zur Rente von Ben Beispiel' })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: /^Gesetzliche Rente · Ben Beispiel/ }),
    ).toBeVisible();
  });

  test('empty input page: the button focuses the field, the quiet action leads to the next step', async ({
    page,
  }) => {
    await page.goto('/#depot');
    await expect(
      page.getByRole('heading', { name: 'Noch kein Beitrag eingetragen' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Beitrag eintragen' }).click();
    await expect(page.getByLabel(/Eigenbeitrag pro Monat/)).toBeFocused();
    await page.getByRole('button', { name: 'Weiter: Profil prüfen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  });

  test('the empty Rentenplan offers the pension and the profile', async ({ page }) => {
    await page.goto('/#overview');
    await page
      .locator('details.dt', { hasText: 'Einkommensquellen in der Gesamtsicht' })
      .locator('summary')
      .click();
    await page.getByRole('checkbox', { name: 'ETF-Sparplan' }).click();
    await expect(
      page.getByRole('button', { name: 'Gesetzliche Rente eintragen' }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Profil prüfen' })).toBeVisible();
  });

  test('the sidebar groups follow the phone sheet and the term is "Einkommensquellen"', async ({
    page,
  }) => {
    await page.goto('/#overview');
    await expect(nav(page).getByText('Eingaben', { exact: true })).toBeVisible();
    await expect(nav(page).getByText('Einkommensquellen', { exact: true })).toBeVisible();
    await expect(nav(page).getByText('Sparen', { exact: true })).toBeVisible();
    await expect(nav(page).getByText('Bausteine')).toHaveCount(0);
    // DOM order = visual order = tab order: Rentenplan first, then the inputs.
    const names = await nav(page).getByRole('link').allInnerTexts();
    expect(names[0]).toMatch(/^Rentenplan/);
    expect(names.findIndex((n) => /^Profil/.test(n))).toBeLessThan(
      names.findIndex((n) => /^Gesetzliche Rente/.test(n)),
    );
  });

  for (const scheme of ['light', 'dark'] as const) {
    test.describe(`axe (${scheme})`, () => {
      test.use({ colorScheme: scheme });
      test('first start and the full next-step card have no violations', async ({ page }) => {
        await page.goto('/#overview');
        await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
        await axe(page);
        await page.goto('/#statutory');
        await page.getByLabel(/Monatsrente laut Renteninformation/).fill('1400');
        await expect(link(page, 'Gesetzliche Rente, ausgefüllt')).toBeVisible();
        await page.goto('/#overview');
        await expect(card(page, 'Profil prüfen')).toBeVisible();
        await axe(page);
        await page.goto('/#depot');
        await expect(
          page.getByRole('heading', { name: 'Noch kein Beitrag eingetragen' }),
        ).toBeVisible();
        await axe(page);
      });
    });
  }
});

test.describe('guided start (AP-13), phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('the Inputs sheet shows mark and word per page and reads them to screen readers', async ({
    page,
  }) => {
    await page.goto('/#overview');
    await page.getByRole('button', { name: 'Eingaben', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Eingaben' });
    await expect(sheet.getByText('Einkommensquellen', { exact: true })).toBeVisible();
    const pension = sheet.getByRole('link', { name: /^Gesetzliche Rente/ });
    await expect(pension).toContainText('leer');
    await expect(
      sheet.getByRole('link', { name: named('Gesetzliche Rente, noch leer') }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/#statutory');
    await page.getByLabel(/Monatsrente laut Renteninformation/).fill('1400');
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Eingaben', exact: true }).click();
    await expect(
      sheet.getByRole('link', { name: named('Gesetzliche Rente, ausgefüllt') }),
    ).toContainText('ausgefüllt');
  });

  test('welcome and next-step card fit the screen without sideways scrolling', async ({ page }) => {
    await page.goto('/#overview');
    await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible();
    const over = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await over()).toBeLessThanOrEqual(0);
    await page.goto('/#statutory');
    await page.getByLabel(/Monatsrente laut Renteninformation/).fill('1400');
    await page.waitForTimeout(600);
    await page.goto('/#overview');
    await expect(card(page, 'Profil prüfen')).toBeVisible();
    expect(await over()).toBeLessThanOrEqual(0);
    for (const b of await card(page, 'Profil prüfen').getByRole('button').all()) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('the wish step works from the phone as well', async ({ page }) => {
    await page.goto('/#overview');
    await page.getByLabel(/Gewünschtes Netto-Einkommen/).fill('2000');
    await expect(card(page, 'Profil prüfen')).toBeVisible();
  });
});
