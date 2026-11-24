import { expect, test, type Page } from '@playwright/test';

// The Valiva mark sits next to the app name in the sidebar (desktop) and in the top bar (phone).
// It is decorative (empty alt) and must really load: a wrong path would show a broken image.

async function expectLogoLoaded(page: Page, container: string) {
  const logo = page.locator(`${container} img.logo`);
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('alt', '');
  await expect
    .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await expect(page.locator(`${container} strong`)).toHaveText('Valiva');
}

test('sidebar shows the logo next to the name', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expectLogoLoaded(page, '.sidebar .nav-head');
});

test('phone top bar shows the logo next to the name', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expectLogoLoaded(page, '.mobile-top');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
