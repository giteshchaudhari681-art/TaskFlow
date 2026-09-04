import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import {
  provisionTestUser,
  generateUniqueEmail,
  generateUniqueName,
  TEST_PASSWORD,
} from '../fixtures/test-data.fixture';

test.describe('E2E SaaS Entitlements & Usage Controls Workflows', () => {
  test('Admin views Usage & Plan, sees resource meters, limit reach state, and member is restricted', async ({
    page,
    request,
  }) => {
    // 1. Provision organization OWNER
    const owner = await provisionTestUser(request);

    // 2. Log in as OWNER in browser
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(owner.email, TEST_PASSWORD);

    await expect(page.locator('text=Active Workspace:')).toBeVisible({ timeout: 10000 });

    // 3. Navigate to Settings -> Usage & Plan tab
    await page.getByRole('button', { name: 'Settings & Workspace' }).click();
    await page.getByRole('button', { name: 'Usage & Plan' }).click();

    // 4. Verify Usage & Plan panel is rendered
    await expect(page.getByTestId('usage-settings-panel')).toBeVisible();
    await expect(page.getByTestId('current-plan-badge')).toContainText('FREE');
    await expect(page.getByTestId('meter-members')).toBeVisible();
    await expect(page.getByTestId('meter-projects')).toBeVisible();
    await expect(page.getByTestId('meter-tasks')).toBeVisible();
    await expect(page.getByTestId('meter-ai')).toBeVisible();

    // 5. Reach project limit: create projects until FREE quota (10 projects) is full
    // Already has 1 default project created at signup. Create 9 more.
    for (let i = 2; i <= 10; i++) {
      await request.post(`/api/v1/organizations/${owner.organizationId}/projects`, {
        headers: { Authorization: `Bearer ${owner.accessToken}` },
        data: { name: `Limit Project ${i}`, key: `LIM${i}` },
      });
    }

    // Refresh usage page in browser
    const refreshPromise = page.waitForResponse(
      resp => resp.url().includes('/usage') && resp.status() === 200
    );
    await page.getByTitle('Refresh Usage Metrics').click();
    await refreshPromise;

    // 6. Verify UI displays limit reached state
    await expect(page.getByTestId('limit-reached-banner')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('meter-projects')).toContainText('Limit Reached', {
      timeout: 15000,
    });

    // 7. Verify unauthorized regular MEMBER cannot access usage settings
    const memberEmail = generateUniqueEmail('member');
    const memberName = generateUniqueName('Member');

    const memberRegRes = await request.post('/api/v1/auth/register', {
      data: {
        name: memberName,
        email: memberEmail,
        password: TEST_PASSWORD,
      },
    });
    expect(memberRegRes.ok()).toBeTruthy();

    // Invite member to owner workspace as MEMBER
    await request.post(`/api/v1/organizations/${owner.organizationId}/members`, {
      headers: { Authorization: `Bearer ${owner.accessToken}` },
      data: { email: memberEmail, role: 'MEMBER' },
    });

    // Log out and log in as MEMBER
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await loginPage.login(memberEmail, TEST_PASSWORD);
    await expect(page.locator('text=Active Workspace:')).toBeVisible({ timeout: 10000 });

    // Switch to owner organization
    const orgSelect = page.locator('header select').first();
    await orgSelect.selectOption(owner.organizationId);

    // Open settings and go to Usage & Plan
    await page.getByRole('button', { name: 'Settings & Workspace' }).click();
    await page.getByRole('button', { name: 'Usage & Plan' }).click();

    // Member should see unauthorized restricted access message
    await expect(page.getByTestId('usage-unauthorized')).toBeVisible();
    await expect(page.getByTestId('usage-unauthorized')).toContainText('Restricted Access');
  });
});
