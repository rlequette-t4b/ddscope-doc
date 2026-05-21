import { test, expect } from '@playwright/test';

test.describe('DDScope — project creation', () => {
  test('creates a new project and shows its name in the app', async ({ page }) => {
    const projectName = `My first project ${Date.now()}`;

    const response = await page.goto('');
    expect(response && response.ok()).toBe(true);

    const loginLink = page.getByRole('link', { name: /log in/i });
    if (await loginLink.isVisible()) {
      throw new Error(
        'CommWise login page detected. The Playwright context is not authenticated. ' +
          'Run "npm run test:ui:setup -- --headed" once, sign in, then resume.'
      );
    }

    const newButton = page.locator('#dds-btn-new');
    await expect(newButton).toBeVisible();
    await expect(newButton).toBeEnabled();

    const newProjectHeading = page.getByRole('heading', { name: /new project/i });
    const projectNameInput = page.locator('#dds-proj-name');

    // The first click can occasionally be ignored while the app is still settling.
    // Retry with short waits so the test runs unattended.
    let opened = false;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await newButton.hover();
      await newButton.click();
      await page.waitForTimeout(350);

      const headingVisible = await newProjectHeading.isVisible();
      const inputVisible = await projectNameInput.isVisible();
      if (headingVisible || inputVisible) {
        opened = true;
        break;
      }

      // Alternate click path to mimic a raw user click on the next attempt.
      if (attempt === 3) {
        const box = await newButton.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }

      await page.waitForTimeout(600);
    }

    if (!opened) {
      throw new Error(
        'Could not open the project creation form after multiple clicks on #dds-btn-new. ' +
          'Expected either a visible "New project" heading or a visible #dds-proj-name input.'
      );
    }

    if (await newProjectHeading.isVisible()) {
      await expect(newProjectHeading).toBeVisible();
    }

    await projectNameInput.fill(projectName);

    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  });
});
