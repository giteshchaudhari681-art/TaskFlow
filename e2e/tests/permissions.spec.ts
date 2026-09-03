import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import {
  provisionTestUser,
  generateUniqueEmail,
  generateUniqueName,
  TEST_PASSWORD,
} from '../fixtures/test-data.fixture';

test.describe('E2E RBAC & Permission Enforcement Workflows', () => {
  test('MEMBER role has restricted administrative actions in UI and API', async ({
    page,
    request,
  }) => {
    // 1. Provision organization OWNER
    const owner = await provisionTestUser(request);

    // 2. Provision a second user and invite them to owner's workspace as MEMBER
    const memberEmail = generateUniqueEmail('member');
    const memberName = generateUniqueName('Member');

    // Register member user
    const memberRegRes = await request.post('/api/v1/auth/register', {
      data: {
        name: memberName,
        email: memberEmail,
        password: TEST_PASSWORD,
      },
    });
    expect(memberRegRes.ok()).toBeTruthy();
    const memberJson = await memberRegRes.json();
    const memberUser = memberJson.data.user;
    const memberToken = memberJson.data.accessToken;

    // Owner invites second user to owner's organization with MEMBER role
    const inviteRes = await request.post(`/api/v1/organizations/${owner.organizationId}/members`, {
      headers: {
        Authorization: `Bearer ${owner.accessToken}`,
      },
      data: {
        email: memberEmail,
        role: 'MEMBER',
      },
    });
    expect(inviteRes.ok()).toBeTruthy();

    // 3. Log in as MEMBER in browser
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(memberEmail, TEST_PASSWORD);

    await expect(page.locator('text=Active Workspace:')).toBeVisible({ timeout: 10000 });

    // Select the shared organization from organization dropdown
    const orgSelect = page.locator('header select').first();
    await orgSelect.selectOption(owner.organizationId);

    // 4. Navigate to Settings & Workspace -> Members
    await page.getByRole('button', { name: 'Settings & Workspace' }).click();
    await page.getByRole('button', { name: 'Workspace Members' }).click();

    // 5. Verify UI-level restriction: "Invite Member" button is NOT rendered for MEMBER
    await expect(page.getByRole('button', { name: 'Invite Member' })).toBeHidden();

    // 6. Verify backend-enforced RBAC: Attempting administrative API action returns HTTP 403
    const unauthorizedInvite = await request.post(
      `/api/v1/organizations/${owner.organizationId}/members`,
      {
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
        data: {
          email: 'unauthorized@example.test',
          role: 'MEMBER',
        },
      }
    );

    expect(unauthorizedInvite.status()).toBe(403);
    const errJson = await unauthorizedInvite.json();
    expect(errJson.success).toBe(false);
    expect(errJson.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });
});
