import type { Page } from '@playwright/test';

/** Opens a collapsed detail row ("Mehr dazu" list) by its title, unless it is already open. */
export async function openRow(page: Page, title: string | RegExp) {
  const row = page.locator('details.dt', { has: page.locator('summary', { hasText: title }) });
  const isOpen = await row.evaluate((e) => (e as HTMLDetailsElement).open);
  if (!isOpen) await row.locator('summary').first().click();
}
