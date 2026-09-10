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
    // Navigate to root (login page) and wait for it to fully render
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // If the landing page is shown, click "Sign in" to reach the login form.
    // Use a long timeout to wait out the initial App.tsx loading spinner.
    const signInNavButton = page.getByRole('button', { name: /^sign in$/i }).first();
    try {
      await signInNavButton.waitFor({ state: 'visible', timeout: 20000 });
      await signInNavButton.click();
    } catch (e) {
      // Ignore if not visible; we might already be on the login page or it timed out.
    }

    // Wait for login form elements to be visible before interacting
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('input[type="password"]').waitFor({ state: 'visible', timeout: 15000 });

    // Fill credentials through real login form
    await page.locator('input[type="email"]').fill(authenticatedUser.email);
    await page.locator('input[type="password"]').fill(authenticatedUser.password);
    await page.getByRole('button', { name: /sign in to workspace/i }).click();

    // Verify authenticated state is established
    await page.waitForResponse(
      resp => resp.url().includes('/api/v1/auth/login') && resp.status() === 200,
      { timeout: 15000 }
    );

    // Wait until authenticated navigation / hero is visible
    await page.getByRole('button', { name: 'Home' }).waitFor({ state: 'visible', timeout: 15000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';
