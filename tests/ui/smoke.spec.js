import { test, expect } from '@playwright/test';

test.describe('DDScope — main page', () => {
  test('loads the page and shows the application shell', async ({ page }) => {
    const response = await page.goto('');
    expect(response && response.ok()).toBe(true);

    const loginLink = page.getByRole('link', { name: /log in/i });
    if (await loginLink.isVisible()) {
      throw new Error(
        'CommWise login page detected. The Playwright context is not authenticated. ' +
        'Run "npm run test:ui:setup -- --headed" once, sign in, then resume.'
      );
    }

    // Assert the DDScope shell using stable, user-visible controls.
    await expect(page.getByRole('heading', { name: 'DDScope' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  });
});
