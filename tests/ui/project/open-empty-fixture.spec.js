import path from 'path';
import { test, expect } from '@playwright/test';
import { openProject } from '../helpers/open-project.js';

test.describe('DDScope — open fixture', () => {
  test('opens project-empty fixture and shows project tabs', async ({ page }) => {
    const fixturePath = path.resolve('fixtures/project-empty.json');

    await openProject(page, fixturePath);

    await expect(page.getByText('Empty project', { exact: true })).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nodes', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Flows', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'BOMs', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Demand', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();

    await expect(page.getByText(/Map\s*1/, { exact: false })).toBeVisible();
  });
});
