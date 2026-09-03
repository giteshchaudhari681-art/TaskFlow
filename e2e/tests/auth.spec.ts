import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import {
  generateUniqueEmail,
  generateUniqueName,
  generateUniqueOrg,
  TEST_PASSWORD,
  provisionTestUser,
} from '../fixtures/test-data.fixture';

test.describe('E2E Authentication Workflows', () => {
  test('TEST 1: Successful user registration establishes authenticated workspace', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Switch to registration form
    await loginPage.switchToRegister();

    const name = generateUniqueName('E2E Engineer');
    const email = generateUniqueEmail('reg');
    const orgName = generateUniqueOrg('Engineering Hub');

    // Register new user and organization
    await loginPage.register(name, email, TEST_PASSWORD, orgName);

    // Expect successful transition to authenticated application
    await expect(page.locator('text=Active Workspace:')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=Welcome back, ${name}`)).toBeVisible();
    await expect(page.locator('text=Active Workspace:').first()).toContainText(orgName);
  });

  test('TEST 2: Invalid registration validation prevents submission and displays error', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.switchToRegister();

    // Fill form with invalid short password (< 8 characters)
    await loginPage.registerNameInput.fill('Invalid Tester');
    await loginPage.registerEmailInput.fill(generateUniqueEmail('invalid'));
    await loginPage.registerPasswordInput.fill('short');

    await loginPage.createWorkspaceButton.click();

    // Expect client-side validation error banner
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();

    // Verify user remains on the unauthenticated register view
    await expect(loginPage.createWorkspaceButton).toBeVisible();
  });

  test('TEST 3: Successful login with valid credentials', async ({ page, request }) => {
    // Provision unique test user through application API
    const user = await provisionTestUser(request);

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit credentials
    await loginPage.login(user.email, user.password);

    // Expect authenticated navigation
    await expect(loginPage.activeWorkspaceIndicator).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=Welcome back, ${user.name}`)).toBeVisible();
  });

  test('TEST 4: Invalid login displays meaningful error message', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Submit non-existent credentials
    await loginPage.login('nonexistent.user@example.test', 'WrongPassword123!');

    // Expect error alert
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
    await expect(loginPage.errorMessage).toContainText('Invalid email or password');

    // Verify user remains unauthenticated
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('TEST 5: Authenticated session persists across browser page reload', async ({
    page,
    request,
  }) => {
    const user = await provisionTestUser(request);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(user.email, user.password);

    await expect(loginPage.activeWorkspaceIndicator).toBeVisible({ timeout: 10000 });

    // Reload the page
    await page.reload();

    // Verify authenticated session remains active without redirecting to login form
    await expect(loginPage.activeWorkspaceIndicator).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=Welcome back, ${user.name}`)).toBeVisible();
  });
});
