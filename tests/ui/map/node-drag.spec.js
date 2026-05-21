import { test } from '@playwright/test';

test('node drag placeholder', async ({ page }) => {
  await page.goto('/');
  test.fixme(true, 'Implement node drag and position persistence assertion.');
});
