import { expect, test, type Page } from '@playwright/test';
import { loadExample, openRow } from './helpers';

/**
 * AP-11: Depot, bAV and statutory pension on the building-block template. Each page keeps every input
 * and result of the old layout ("before/after" lists below), stays short, and shows errors in collapsed
 * fields.
 */
type Spec = {
  hash: 'depot' | 'occupational' | 'statutory';
  title: string;
  /** Labels of all inputs that are always present. */
  inputs: string[];
  /** Labels of the key figures in the result frame. */
  kpis: string[];
  /** Titles of the collapsible calculation rows (with a result). */
  rows: (string | RegExp)[];
  emptyText: string;
  firstField: string;
  /** Collapsed input group with a number field that rejects negative values. */
  group: string;
  groupField: string;
};

const SPECS: Spec[] = [
  {
    hash: 'depot',
    title: 'Altersvorsorgedepot',
    inputs: [
      'Eigenbeitrag pro Monat',
      'Jährliche Steigerung des Beitrags',
      'Variante',
      'Kosten pro Jahr',
      'Auszahlbeginn (Alter)',
      'Auszahlplan bis (Alter)',
      'Einmalauszahlung zu Beginn (% des Kapitals)',
    ],
    kpis: [
      'Davon Eigenbeiträge',
      'Davon Zulagen',
      'Brutto pro Monat (nominal)',
      'Brutto pro Monat (Kaufkraft heute)',
      'Steuer pro Monat (heute)',
    ],
    rows: [
      'Alle Szenarien im Vergleich',
      'Kapital bis Auszahlbeginn',
      'Zulagen je Kalenderjahr',
      /So wird aus dem Kapital die Nettorente/,
      'Nicht berechnet',
      'Annahmen aus dem Profil',
    ],
    emptyText: 'Noch kein Beitrag eingetragen',
    firstField: 'Eigenbeitrag pro Monat',
    group: 'Produktvariante und Kosten',
    groupField: 'Kosten pro Jahr',
  },
  {
    hash: 'occupational',
    title: 'Betriebliche Altersvorsorge',
    inputs: [
      'Entgeltumwandlung pro Monat, brutto',
      'Arbeitgeberzuschuss',
      'Zusätzlicher Arbeitgeberbeitrag pro Monat (optional)',
      'Jährliche Steigerung der Umwandlung',
      'Kosten pro Jahr',
      'Garantierte Mindestrendite (optional)',
      'Auszahlbeginn (Alter)',
      'Auszahlplan bis (Alter)',
    ],
    kpis: [
      'Netto-Aufwand pro Monat (heute)',
      'Einzahlung in den Vertrag pro Monat',
      'Davon Umwandlung / Zuschuss',
      'Brutto pro Monat (nominal)',
      'Brutto pro Monat (Kaufkraft heute)',
      'Steuer und Abgaben pro Monat (heute)',
    ],
    rows: [
      /Netto-Aufwand: so wird aus/,
      'Alle Szenarien im Vergleich',
      'Kapital bis Auszahlbeginn',
      /So wird aus dem Kapital die Nettorente/,
      'Nicht berechnet',
      'Annahmen aus dem Profil',
    ],
    emptyText: 'Noch keine Umwandlung eingetragen',
    firstField: 'Entgeltumwandlung pro Monat, brutto',
    group: 'Kosten und Garantie',
    groupField: 'Kosten pro Jahr',
  },
  {
    hash: 'statutory',
    title: 'Gesetzliche Rente',
    inputs: [
      'Voraussichtliche Monatsrente laut Renteninformation',
      'Jahr der Renteninformation',
      'Alter bei Rentenbeginn',
      'Rente für genau diesen Rentenbeginn (optional)',
      'Regelaltersgrenze (Jahre)',
    ],
    kpis: [
      'Rentenbeginn',
      'Brutto pro Monat (nominal)',
      'Brutto pro Monat (Kaufkraft heute)',
      'Steuer und Abgaben pro Monat (heute)',
    ],
    rows: [
      /So wird aus der Renteninformation/,
      'Verlauf bis Rentenbeginn',
      'Verlauf als Tabelle',
      'Annahmen aus dem Profil',
    ],
    emptyText: 'Noch keine Renteninformation eingetragen',
    firstField: 'Voraussichtliche Monatsrente laut Renteninformation',
    // The second group holds the optional amount for the retirement age; its error is shown there.
    group: 'Rentenbeginn',
    groupField: 'Rente für genau diesen Rentenbeginn (optional)',
  },
];

/** Opens every collapsed input group; waits for the (lazily loaded) page first. */
async function openAllGroups(page: Page) {
  await page.locator('details.group').first().waitFor();
  await page.evaluate(() =>
    document
      .querySelectorAll('details.group')
      .forEach((d) => ((d as HTMLDetailsElement).open = true)),
  );
}

/** Words that are visible in `main` (text inside a closed `details` does not count). */
const visibleWords = (page: Page) =>
  page.evaluate(() => {
    const main = document.getElementById('main')!;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let n = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement!;
      let hidden = false;
      for (let a: HTMLElement | null = el; a && a !== main; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.display === 'none' || cs.visibility === 'hidden') hidden = true;
        if (a.tagName === 'DETAILS' && !(a as HTMLDetailsElement).open) {
          const summary = a.querySelector(':scope > summary');
          if (!(summary && summary.contains(el))) hidden = true;
        }
      }
      if (!hidden) n += (node.textContent ?? '').trim().split(/\s+/).filter(Boolean).length;
    }
    return n;
  });

test.describe('Depot, bAV and statutory pension on the block template (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const s of SPECS) {
    test.describe(s.title, () => {
      test('result with example data: hero first, key figures, collapsed calculation rows', async ({
        page,
      }) => {
        await loadExample(page, 'Einzelperson');
        await page.goto(`/#${s.hash}`);
        const frame = page.locator(`#${s.hash} .result-frame`);
        await expect(frame.locator('.kpi-value')).toContainText('€');
        // the hero figure is on the first screen, next to the inputs
        const hero = await frame.locator('.kpi-value').boundingBox();
        expect(hero!.y + hero!.height).toBeLessThan(800);
        for (const label of s.kpis)
          await expect(frame.locator('dt', { hasText: label }).first()).toBeVisible();
        for (const row of s.rows) {
          const summary = page.locator('details.dt > summary', { hasText: row }).first();
          await expect(summary).toBeVisible();
          // collapsed: the body is not visible
          await expect(
            page.locator('details.dt', { has: summary }).first().locator('.dt-body'),
          ).toBeHidden();
        }
      });

      test('at most about 450 visible words in the initial state', async ({ page }) => {
        await loadExample(page, 'Einzelperson');
        await page.goto(`/#${s.hash}`);
        await expect(page.locator(`#${s.hash} .result-frame`)).toBeVisible();
        expect(await visibleWords(page)).toBeLessThanOrEqual(450);
      });

      test('every input is reachable and each help text is one short sentence', async ({
        page,
      }) => {
        await loadExample(page, 'Einzelperson');
        await page.goto(`/#${s.hash}`);
        await openAllGroups(page);
        for (const label of s.inputs)
          await expect(page.getByLabel(label, { exact: true }).first()).toBeVisible();
        const hints = await page.locator(`#${s.hash} .bp-in .field > .hint`).allInnerTexts();
        expect(hints.length).toBeGreaterThan(3);
        for (const h of hints) expect(h.split(/\s+/).length, h).toBeLessThanOrEqual(14);
      });

      test('empty input shows the hint instead of a result', async ({ page }) => {
        await page.goto(`/#${s.hash}`);
        await expect(page.getByText(s.emptyText)).toBeVisible();
        await expect(page.locator(`#${s.hash} .result-frame`)).toHaveCount(0);
        // The rows that do not need a result stay available.
        await expect(
          page.locator('details.dt > summary', { hasText: 'Annahmen aus dem Profil' }),
        ).toBeVisible();
      });

      test('invalid input shows the field error and asks to correct it', async ({ page }) => {
        await loadExample(page, 'Einzelperson');
        await page.goto(`/#${s.hash}`);
        await openAllGroups(page);
        await page.getByLabel(s.firstField, { exact: true }).fill('abc');
        await expect(page.getByText('Bitte die markierten Eingaben korrigieren')).toBeVisible();
        await expect(page.locator(`#${s.hash} .bp-in .error`).first()).toBeVisible();
        await expect(page.locator(`#${s.hash} .result-frame`)).toHaveCount(0);
      });

      test('an error in a collapsed field opens its group and its "Mehr erfahren"', async ({
        page,
      }) => {
        await loadExample(page, 'Einzelperson');
        await page.goto(`/#${s.hash}`);
        await openAllGroups(page);
        await page.getByLabel(s.groupField, { exact: true }).fill('-1');
        await page.waitForTimeout(700);
        // After a reload the group is collapsed again, but the saved invalid value still has an error.
        await page.reload();
        const group = page.locator('details.group', {
          has: page.locator('summary', { hasText: s.group }),
        });
        await expect(group).toHaveJSProperty('open', true);
        const field = group.locator('.field', { hasText: s.groupField }).first();
        await expect(field.locator('.error')).toBeVisible();
        // a field with details behind "Mehr erfahren" shows them too
        const more = field.locator('details.more');
        if ((await more.count()) > 0) await expect(more).toHaveJSProperty('open', true);
      });
    });
  }

  test('a field error opens its own "Mehr erfahren"', async ({ page }) => {
    await loadExample(page, 'Einzelperson');
    await page.goto('/#depot');
    const field = page.locator('#depot .field', { hasText: 'Eigenbeitrag pro Monat' }).first();
    const more = field.locator('details.more');
    await expect(more).toHaveJSProperty('open', false);
    await field.getByLabel('Eigenbeitrag pro Monat').fill('-5');
    await expect(field.locator('.error')).toBeVisible();
    await expect(more).toHaveJSProperty('open', true);
  });

  test('Depot: the percent fields and the guarantee field stay reachable', async ({ page }) => {
    await page.goto('/#depot');
    await openAllGroups(page);
    await expect(page.getByRole('radio')).toHaveCount(2);
    await page.getByLabel('Variante', { exact: true }).selectOption({ index: 1 });
    await expect(page.getByLabel(/Rendite überschreiben/)).toBeVisible();
  });

  test('bAV: the custom subsidy field stays reachable', async ({ page }) => {
    await page.goto('/#occupational');
    await page.getByLabel('Arbeitgeberzuschuss', { exact: true }).selectOption('custom');
    await expect(page.getByLabel('Zuschuss des Arbeitgebers pro Monat')).toBeVisible();
  });

  test('important notes stay visible, info notes sit in a collapsed row', async ({ page }) => {
    await page.goto('/#depot');
    await page.getByLabel('Eigenbeitrag pro Monat').fill('50');
    const depot = page.locator('#depot');
    await expect(depot.getByText(/Du lässt Zulage liegen/)).toBeVisible();
    // AP-21: the two payout assumptions are one note.
    await expect(depot.getByText(/Auszahlungen werden als voll steuerpflichtig/)).toBeVisible();

    await page.goto('/#occupational');
    await page.getByLabel('Entgeltumwandlung pro Monat, brutto').fill('200');
    const hint = page
      .locator('#occupational')
      .getByText(/Freibetrag und Freigrenze der Betriebsrente/);
    await expect(hint).toBeHidden();
    await openRow(page, 'Hinweise zur Rechnung');
    await expect(hint).toBeVisible();
  });
});

test.describe('Depot allowances on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('cards replace the seven-column table and "show all" reveals every year', async ({
    page,
  }) => {
    await loadExample(page, 'Einzelperson');
    await page.goto('/#depot');
    await openRow(page, 'Zulagen je Kalenderjahr');
    await expect(page.getByRole('table', { name: 'Zulagen je Kalenderjahr' })).toBeHidden();
    const cards = page.getByRole('list', { name: 'Zulagen je Kalenderjahr als Liste' });
    await expect(cards).toBeVisible();
    // sum card + first five years
    await expect(cards.getByRole('listitem')).toHaveCount(6);
    await expect(cards.getByRole('listitem').first()).toContainText('Summe');
    const all = page.getByRole('button', { name: /Alle \d+ Jahre anzeigen/ });
    const years = Number(/Alle (\d+)/.exec((await all.textContent()) ?? '')?.[1] ?? 0);
    expect(years).toBeGreaterThan(5);
    await all.click();
    await expect(cards.getByRole('listitem')).toHaveCount(1 + years);
    await expect(page.getByRole('button', { name: /Nur die ersten 5 Jahre/ })).toBeVisible();
    // each card carries the figures of the former columns
    for (const label of ['Eigenbeitrag', 'Grundzulage', 'Kinderzulage', 'Bonus unter 25'])
      await expect(cards.getByRole('listitem').nth(1)).toContainText(label);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
