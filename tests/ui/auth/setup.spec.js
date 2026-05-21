import { test } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join('tests/ui/auth/.auth/user.json');

test('authenticate and persist storage state', async ({ page }) => {
  await page.goto('');

  // Log in manually in the opened browser window, then click the
  // "Resume" button in the Playwright Inspector to continue.
  await page.pause();

  // Persist session cookies and local storage for all subsequent tests.
  await page.context().storageState({ path: AUTH_FILE });
});
