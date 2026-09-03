import { test as base, Page } from '@playwright/test';
import { provisionTestUser, ProvisionedUser } from './test-data.fixture';

export type AuthFixtures = {
  authenticatedUser: ProvisionedUser;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: async ({ request }, use) => {
    const user = await provisionTestUser(request);
    await use(user);
  },

  authenticatedPage: async ({ page, authenticatedUser }, use) => {
    // Navigate to root (login page)
    await page.goto('/');

    // Fill credentials through real login form
    await page.getByPlaceholder('alex.chen@taskflow.dev').fill(authenticatedUser.email);
    await page.getByPlaceholder('••••••••••••').fill(authenticatedUser.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify authenticated state is established
    await page.waitForResponse(
      resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200
    );

    // Wait until authenticated navigation / hero is visible
    await page.locator('text=Active Workspace:').waitFor({ state: 'visible', timeout: 10000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';
