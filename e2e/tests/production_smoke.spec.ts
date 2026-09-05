import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { TaskPage } from '../pages/task.page';
import { TEST_PASSWORD } from '../fixtures/test-data.fixture';

test.describe('PR29: Production Smoke & Release Engineering Journey', () => {
  test('0. Core infrastructure health and readiness endpoints report healthy', async ({
    request,
  }) => {
    // 1. Live probe
    const liveRes = await request.get('/health/live');
    expect(liveRes.status()).toBe(200);
    const liveJson = await liveRes.json();
    expect(liveJson.success).toBe(true);
    expect(liveJson.data.status).toBe('live');

    // 2. Ready probe (validates PostgreSQL connectivity)
    const readyRes = await request.get('/health/ready');
    expect(readyRes.status()).toBe(200);
    const readyJson = await readyRes.json();
    expect(readyJson.success).toBe(true);
    expect(readyJson.data.status).toBe('ready');
    expect(readyJson.data.checks.database.status).toBe('up');
  });

  test('Complete End-to-End Production User Journey', async ({ page }) => {
    // Mock upstream AI endpoints so test is 100% deterministic and does not call external OpenAI
    await page.route('**/ai/analyze', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            summary: 'Deterministic automated smoke intelligence summary.',
            key_insights: ['All mission-critical systems operational.'],
            risk_assessment: { level: 'LOW', factors: [] },
            recommendations: [],
          },
        }),
      })
    );

    // 1. Application loads / Frontend availability
    await page.goto('/');
    await expect(page).toHaveTitle(/TaskFlow/i);

    // 2. Registration / Login flow
    const uniqueSuffix = Date.now().toString(36);
    const smokeEmail = `prod.smoke.${uniqueSuffix}@taskflow.dev`;
    const smokeOrgName = `Production Smoke Org ${uniqueSuffix}`;

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.switchToRegister();
    await loginPage.register('Production Smoke Engineer', smokeEmail, TEST_PASSWORD, smokeOrgName);

    // 3. Organization & Workspace Access
    await expect(page.locator('text=Active Workspace:')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span', { hasText: 'Active Workspace:' })).toContainText(
      smokeOrgName
    );

    // 4. Project Creation
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();
    const projectName = `Smoke Release Project ${uniqueSuffix}`;
    const projectKey = `REL${uniqueSuffix.slice(-3).toUpperCase()}`;

    await projectsPage.createProject(
      projectName,
      projectKey,
      'Production smoke test release project'
    );
    await expect(page.locator(`text=${projectName}`).first()).toBeVisible({ timeout: 10000 });

    // 5. Open Project and Create Task
    if (await page.getByRole('button', { name: 'Overview' }).isHidden()) {
      await projectsPage.openProject(projectName);
    }
    const projectPage = new ProjectPage(page);
    await projectPage.selectTab('Board & Tasks');

    const taskPage = new TaskPage(page);
    const taskTitle = 'Production Smoke Verification Task';
    await taskPage.createTask({
      title: taskTitle,
      description: 'Critical verification path task for PR29 release',
      priority: 'HIGH',
      status: 'TODO',
    });
    await expect(page.locator('div.group', { hasText: taskTitle }).first()).toBeVisible({
      timeout: 10000,
    });

    // 6. Operations Dashboard Loads with KPIs
    await projectPage.selectTab('Overview');
    await expect(page.getByText('Total Tasks', { exact: true })).toBeVisible({ timeout: 10000 });

    // 7. Access Audit & Security Log (Authorized Owner)
    await page.getByRole('button', { name: 'Settings & Workspace' }).click();
    await page.getByRole('button', { name: 'Audit & Security Log' }).click();
    await expect(page.getByText('Security & Audit Log')).toBeVisible({ timeout: 10000 });

    // 8. Access Usage & Entitlement Plan (Authorized Owner)
    await page.getByRole('button', { name: 'Usage & Plan' }).click();
    await expect(page.getByTestId('usage-settings-panel')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('current-plan-badge')).toContainText('FREE');
    await expect(page.getByTestId('meter-projects')).toBeVisible();
    await expect(page.getByTestId('meter-tasks')).toBeVisible();

    // 9. AI Degradation Test: Simulate AI service outage without breaking task/project UI
    await page.route('**/ai/analyze', route =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI Service Temporarily Offline',
          },
        }),
      })
    );

    // Return to dashboard and verify UI remains functional
    await page.getByRole('button', { name: 'Back to Operations Dashboard' }).click();
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'View Projects' })).toBeVisible({
      timeout: 10000,
    });

    // 10. Logout and Re-authentication Flow
    await page.locator('button[title="Sign out of current session"]').click();
    await expect(page.locator('h2', { hasText: 'Sign in to TaskFlow' })).toBeVisible({
      timeout: 10000,
    });

    // Re-login with the same account
    await loginPage.login(smokeEmail, TEST_PASSWORD);
    await expect(page.locator('text=Active Workspace:')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span', { hasText: 'Active Workspace:' })).toContainText(
      smokeOrgName
    );

    // 11. Verify Persistent State (Project and Task survive session lifecycle)
    await projectsPage.goto();
    await expect(page.locator(`text=${projectName}`).first()).toBeVisible({ timeout: 10000 });
  });
});
