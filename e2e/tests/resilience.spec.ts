import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { provisionTestProject, provisionTestTask } from '../fixtures/test-data.fixture';

test.describe('E2E Production Hardening & System Resilience Workflows', () => {
  test('Dashboard loads successfully with full KPI and telemetry metrics', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);

    const project = await provisionTestProject(request, authenticatedUser);
    await provisionTestTask(request, authenticatedUser, project.id, {
      title: 'Resilience Test Task 1',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });

    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Overview');

    await expect(page.locator(`text=${project.name}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Executive Health Assessment')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Tasks', { exact: true })).toBeVisible();
  });

  test('AI failure does not break task or project pages', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);

    const project = await provisionTestProject(request, authenticatedUser);
    await provisionTestTask(request, authenticatedUser, project.id, {
      title: 'Task Surviving AI Downtime',
      status: 'TODO',
      priority: 'MEDIUM',
    });

    // Intercept AI endpoints and simulate upstream 503 service unavailable
    await page.route('**/ai/analyze', route =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI Service Temporarily Unavailable',
          },
        }),
      })
    );

    await projectsPage.goto();
    await projectsPage.openProject(project.name);

    // Verify task page / overview remains fully functional despite AI failure
    await projectPage.selectTab('Tasks');
    await expect(page.locator('text=Task Surviving AI Downtime')).toBeVisible({ timeout: 10000 });
  });

  test('Unauthenticated user receives login view and cannot access protected workspace', async ({
    page,
  }) => {
    // Access application without session token
    await page.goto('/');

    // Renders login screen
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('text=Active Workspace:')).not.toBeVisible();
  });
});
