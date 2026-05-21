import { expect } from '@playwright/test';

/**
 * Creates a new DDScope project from the main page.
 *
 * The function navigates to the app, validates authentication state,
 * retries the first "New" click using Playwright's toPass pattern,
 * waits for the project dialog, fills the name, and submits creation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} projectName
 */
export async function createNewProject(page, projectName) {
  const response = await page.goto('', { waitUntil: 'domcontentloaded' });
  expect(response && response.ok()).toBe(true);

  const loginLink = page.getByRole('link', { name: /log in/i });
  if (await loginLink.isVisible()) {
    throw new Error(
      'CommWise login page detected. The Playwright context is not authenticated. ' +
        'Run "npm run test:ui:setup -- --headed" once, sign in, then resume.'
    );
  }

  const newButton = page.getByRole('button', { name: 'New' });
  const newProjectHeading = page.getByRole('heading', { name: /new project/i });
  const projectNameInput = page.locator('#dds-proj-name');

  await expect(newButton).toBeVisible();
  await expect(newButton).toBeEnabled();

  // Retry action + verification together until the dialog is truly open.
  await expect(async () => {
    await newButton.hover();
    await newButton.click();

    const headingVisible = await newProjectHeading.isVisible();
    const inputVisible = await projectNameInput.isVisible();
    expect(headingVisible || inputVisible).toBe(true);
  }).toPass({
    intervals: [500],
    timeout: 10000
  });

  await projectNameInput.fill(projectName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  // Ensure the app has transitioned to the working project state.
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible({ timeout: 15000 });
}
