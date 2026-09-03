import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { provisionTestProject, provisionTestTask } from '../fixtures/test-data.fixture';

test.describe('E2E Project Dashboard 2.0 Workflows', () => {
  test('Renders deterministic health state, KPIs, delivery risks, and distributions', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);

    // 1. Provision a project with tasks in various states
    const project = await provisionTestProject(request, authenticatedUser);
    await provisionTestTask(request, authenticatedUser, project.id, {
      title: 'Setup Core Database Schema',
      status: 'DONE',
      priority: 'HIGH',
    });
    await provisionTestTask(request, authenticatedUser, project.id, {
      title: 'Fix Authentication Token Leakage',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
    });

    // 2. Navigate to project
    await projectsPage.goto();
    await projectsPage.openProject(project.name);

    // 3. Ensure Overview / Dashboard tab is selected
    await projectPage.selectTab('Overview');

    // 4. Verify Project Header
    await expect(page.locator(`text=${project.key}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${project.name}`).first()).toBeVisible();

    // 5. Verify Executive Health Assessment Section
    await expect(page.locator('text=Executive Health Assessment')).toBeVisible({ timeout: 10000 });

    // 6. Verify KPI Metric Section
    await expect(page.getByText('Total Tasks', { exact: true })).toBeVisible();

    // 7. Verify Task Distribution and Delivery Risk Cards
    await expect(page.locator('text=Task Status Distribution')).toBeVisible();
    await expect(page.locator('text=Delivery Risks & Impediments')).toBeVisible();
  });
});
