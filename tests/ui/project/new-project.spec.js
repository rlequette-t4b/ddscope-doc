import { test, expect } from '@playwright/test';
import { createNewProject } from '../helpers/new-project.js';

test.describe('DDScope — project creation', () => {
  test('creates a new project and shows its name in the app', async ({ page }) => {
    const projectName = `My first project ${Date.now()}`;

    await createNewProject(page, projectName);

    await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  });
});
