import { expect } from '@playwright/test';
import { readFile } from 'fs/promises';

/**
 * Opens an existing DDScope project from a JSON file.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} filePath
 */
export async function openProject(page, filePath) {
  const response = await page.goto('?dds_test=1', { waitUntil: 'domcontentloaded' });
  expect(response && response.ok()).toBe(true);

  const loginLink = page.getByRole('link', { name: /log in/i });
  if (await loginLink.isVisible()) {
    throw new Error(
      'CommWise login page detected. The Playwright context is not authenticated. ' +
        'Run "npm run test:ui:setup -- --headed" once, sign in, then resume.'
    );
  }

  // Test backdoor documented in DDScope_TestEnvironment.md.
  await page.waitForFunction(() => typeof window.__playwright_load_project__ === 'function');

  const json = await readFile(filePath, 'utf-8');
  await page.evaluate((projectJson) => {
    window.__playwright_load_project__(projectJson);
  }, json);

  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible({ timeout: 15000 });
}
