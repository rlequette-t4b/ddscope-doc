import { test, expect } from '@playwright/test';
import { createNewProject } from '../helpers/new-project.js';

test.describe('DDScope — backdoor node creation', () => {
  test('creates a project, injects a node action, and pauses for inspection', async ({ page }) => {
    const projectName = `Backdoor project ${Date.now()}`;
    const nodeName = `Backdoor node ${Date.now()}`;

    await createNewProject(page, projectName, { testMode: true });

    const result = await page.evaluate((actions) => window.__playwright_run_actions__(actions), [
      {
        type: 'add_node',
        id: 'new_node_1',
        name: nodeName
      }
    ]);

    expect(result.failed).toBeNull();
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]._created_id).toBeDefined();

    await page.getByRole('button', { name: 'Nodes', exact: true }).click();
    await expect(page.getByText(nodeName, { exact: true })).toBeVisible();

    await page.pause();
  });
});
