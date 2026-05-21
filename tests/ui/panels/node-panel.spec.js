import { test } from '@playwright/test';

test('node panel placeholder', async ({ page }) => {
  await page.goto('/');
  test.fixme(true, 'Implement node panel edit -> canvas update assertion.');
});
