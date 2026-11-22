import type { Page } from '@playwright/test';

/** Opens a collapsed detail row ("Mehr dazu" list) by its title, unless it is already open. */
export async function openRow(page: Page, title: string | RegExp) {
  const row = page.locator('details.dt', { has: page.locator('summary', { hasText: title }) });
  const isOpen = await row.evaluate((e) => (e as HTMLDetailsElement).open);
  if (!isOpen) await row.locator('summary').first().click();
}

/** Marks the current document; the marker disappears with it when the page reloads. */
export const markDocument = (page: Page) =>
  page.evaluate(() => ((window as unknown as { __old: boolean }).__old = true));

/**
 * Waits for the reload after an import or reset (the data page reloads a moment later). Without the marker the
 * wait would be satisfied by the old document and the reload could hit a later step.
 */
export async function waitForReload(page: Page) {
  await page.waitForFunction(() => !(window as unknown as { __old?: boolean }).__old);
  await page.waitForLoadState('load');
}

/** Replaces the workspace with an example on the data page and waits until the page has reloaded. */
export async function loadExample(page: Page, example: 'Paar' | 'Einzelperson' = 'Paar') {
  await page.goto('/#data');
  await page.getByRole('button', { name: example, exact: true }).click();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  await markDocument(page);
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await waitForReload(page);
}
