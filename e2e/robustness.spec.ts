import { expect, test, type Page } from '@playwright/test';

// Review 14, AP-04: an invalid person never yields a valid-looking household result (B-3), failed saves are
// visible (B-4), a change in another tab is announced (B-5), edits survive a hidden tab (B-6), and the export
// reminder shows up (B-10).

async function loadCouple(page: Page) {
  await page.goto('/#data');
  await page.getByRole('button', { name: 'Paar', exact: true }).click();
  await page.getByRole('button', { name: 'Daten ersetzen …' }).click();
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung laden und ersetzen' }).click();
  await backup;
  await page.waitForLoadState('load');
}

test.use({ viewport: { width: 1280, height: 800 } });

test('a person who retires in the past gets an error, not a household gap (B-3)', async ({
  page,
}) => {
  await loadCouple(page);
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1950');
  const message = page.getByText(/Der Rentenbeginn liegt in der Vergangenheit\./);
  await expect(message).toBeVisible();
  await expect(message).toContainText('Der Modus für Personen, die schon in Rente sind, folgt.');

  await page.goto('/#overview');
  await page.getByRole('radio', { name: 'Haushalt' }).click();
  // The message is an alert above the page head, not buried in the page.
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Die Angaben einer Person sind unvollständig' });
  await expect(alert).toContainText('Der Rentenbeginn liegt in der Vergangenheit.');
  const aboveHead = await alert.evaluate(
    (a) =>
      !!(
        a.compareDocumentPosition(document.querySelector('main h1')!) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ),
  );
  expect(aboveHead).toBe(true);
  await expect(page.getByText(/Gedeckt sind/)).toHaveCount(0);
  await expect(page.locator('.kpi')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Gesamtsicht Haushalt' })).toHaveCount(0);

  await alert.getByRole('button', { name: /^Profil von .* öffnen$/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  await expect(page.getByLabel('Geburtsjahr', { exact: true })).toHaveValue('1950');
});

test('the single-person view shows the error instead of a result (B-3)', async ({ page }) => {
  await page.goto('/#profile');
  await page.getByLabel('Geburtsjahr', { exact: true }).fill('1950');
  await page.goto('/#overview');
  await expect(page.getByRole('alert').filter({ hasText: 'in der Vergangenheit' })).toBeVisible();
  await expect(page.getByText(/Gedeckt sind/)).toHaveCount(0);
});

test('a failing write shows a persistent notice (B-4)', async ({ page }) => {
  await page.goto('/#etf');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/Speichern im Browser ist nicht möglich/)).toHaveCount(0);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
  });
  await page.getByLabel('Monatliche Sparrate').fill('321');
  const notice = page
    .getByRole('alert')
    .filter({ hasText: 'Speichern im Browser ist nicht möglich' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Zu den Daten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Daten' })).toBeVisible();
  // The notice stays on every page.
  await expect(notice).toBeVisible();
});

test('a change in another tab is announced instead of silently overwritten (B-5)', async ({
  page,
  context,
}) => {
  await page.goto('/#etf');
  await expect(page.getByLabel('Monatliche Sparrate')).toBeVisible();
  await expect(page.getByText(/In einem anderen Fenster/)).toHaveCount(0);

  const other = await context.newPage();
  await other.goto('/#etf');
  await other.getByLabel('Monatliche Sparrate').fill('555');
  const notice = page.getByRole('alert').filter({ hasText: 'In einem anderen Fenster' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Ignorieren' }).click();
  await expect(notice).toHaveCount(0);
});

test('an edit made just before the tab is hidden is saved (B-6)', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#etf');
  await expect(page.getByLabel('Monatliche Sparrate')).toBeVisible();
  // Freeze the debounce timers: the edit stays unsaved unless the hide handler flushes it.
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  await page.getByLabel('Monatliche Sparrate').fill('777');
  const before = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.includes('.etfPlan.'))
      .map((k) => localStorage.getItem(k) ?? ''),
  );
  expect(before.join()).not.toContain('"monthlyContribution":777');
  const after = await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return Object.keys(localStorage)
      .filter((k) => k.includes('.etfPlan.'))
      .map((k) => localStorage.getItem(k) ?? '');
  });
  expect(after.join()).toContain('"monthlyContribution":777');
});

test.describe('export reminder (B-10)', () => {
  test('appears once data exists, can be snoozed and ends with an export', async ({ page }) => {
    await loadCouple(page);
    await page.goto('/#overview');
    const reminder = page.getByRole('note').filter({ hasText: 'Du hast noch nie exportiert' });
    await expect(reminder).toBeVisible();
    await expect(reminder).toContainText('Safari kann lokale Daten löschen');

    await reminder.getByRole('button', { name: 'Später' }).click();
    await expect(reminder).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(reminder).toHaveCount(0);
  });

  test('shows the age of an old export and is silent after a fresh export', async ({ page }) => {
    await loadCouple(page);
    const old = new Date(Date.now() - 100 * 86_400_000).toISOString();
    await page.evaluate((iso) => localStorage.setItem('valiva.lastExport', iso), old);
    await page.goto('/#overview');
    await page.reload();
    const reminder = page
      .getByRole('note')
      .filter({ hasText: 'Dein letzter Export ist 100 Tage alt' });
    await expect(reminder).toBeVisible();

    await reminder.getByRole('button', { name: 'Jetzt exportieren' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Daten' })).toBeVisible();
    await expect(page.getByText(/Dein letzter Export ist/)).toHaveCount(0);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Daten exportieren' }).click();
    await download;
    await page.goto('/#overview');
    await expect(page.getByText(/Dein letzter Export ist/)).toHaveCount(0);
    await expect(page.getByText(/Du hast noch nie exportiert/)).toHaveCount(0);
  });

  test('does not appear on the first start', async ({ page }) => {
    await page.goto('/#overview');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Du hast noch nie exportiert/)).toHaveCount(0);
  });
});

test('data stored under the old pathwise.* prefix is moved to valiva.* on start (rename)', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('pathwise.theme', 'dark');
    localStorage.setItem('pathwise.lastExport', '2026-11-01T10:00:00.000Z');
  });
  await page.reload();
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(keys.filter((k) => k.startsWith('pathwise.'))).toEqual([]);
  expect(keys).toContain('valiva.theme');
  expect(keys).toContain('valiva.lastExport');
  expect(await page.evaluate(() => localStorage.getItem('valiva.theme'))).toBe('dark');
});
