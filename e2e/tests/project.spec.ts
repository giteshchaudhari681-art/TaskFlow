import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { generateUniqueProjectKey } from '../fixtures/test-data.fixture';

test.describe('E2E Project Management Workflows', () => {
  test('Complete project creation and detail navigation workflow', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);

    // 1. Navigate to Projects view
    await projectsPage.goto();

    const uniqueId = Date.now().toString().slice(-4);
    const projectName = `Flight Control ${uniqueId}`;
    const projectKey = generateUniqueProjectKey();
    const projectDesc = 'Telemetry and mission control system';

    // 2. Open modal and submit project
    await projectsPage.createProject(projectName, projectKey, projectDesc);

    // 3. Verify project appears in the project list or automatically loads
    await expect(page.locator(`text=${projectName}`).first()).toBeVisible({ timeout: 10000 });

    // 4. Click into the project if still in projects list
    if (await page.getByRole('button', { name: 'Overview' }).isHidden()) {
      await projectsPage.openProject(projectName);
    }

    // 5. Verify project detail shell is loaded with tabs
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Board & Tasks' })).toBeVisible();
    await expect(page.locator(`text=${projectKey}`).first()).toBeVisible();
  });
});
