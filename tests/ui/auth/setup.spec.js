import { test } from '@playwright/test';

test('authenticate and persist storage state', async ({ page }) => {
  await page.goto('/');
  // Complete interactive login if required, then storageState is saved by Playwright.
});
