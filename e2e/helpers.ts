import type { Page } from '@playwright/test';

/** Opens a collapsed detail row ("Mehr dazu" list) by its title, unless it is already open. */
export async function openRow(page: Page, title: string | RegExp) {
  const row = page.locator('details.dt', { has: page.locator('summary', { hasText: title }) });
  const isOpen = await row.evaluate((e) => (e as HTMLDetailsElement).open);
  if (!isOpen) await row.locator('summary').first().click();
}

/** Opens a collapsed input group (`details.group`, e.g. "Steuer" on the ETF page) by its title. */
export async function openGroup(page: Page, title: string | RegExp) {
  const group = page.locator('details.group', { has: page.locator('summary', { hasText: title }) });
  const isOpen = await group.evaluate((e) => (e as HTMLDetailsElement).open);
  if (!isOpen) await group.locator('summary').first().click();
}

/** Final value after tax of the saving phase (neutral) as shown in the hero figure of the ETF page. */
export async function planFinalValue(page: Page): Promise<number> {
  const text = await page.locator('#etf-plan .result-frame').innerText();
  const match = /([\d.]+)\s*€/.exec(text);
  if (!match) throw new Error(`no amount in "${text}"`);
  return Number(match[1]!.replaceAll('.', ''));
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
export async function loadExample(
  page: Page,
  example: 'Paar' | 'Einzelperson' | 'Rentnerin' | 'Paar, eine Person in Rente' = 'Paar',
) {
  await page.goto('/#data');
  await page.getByRole('button', { name: example, exact: true }).click();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  await markDocument(page);
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await waitForReload(page);
}
