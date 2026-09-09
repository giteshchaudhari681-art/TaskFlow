import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly switchToRegisterButton: Locator;

  // Register form fields
  readonly registerNameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerOrgInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly createWorkspaceButton: Locator;
  readonly switchToLoginButton: Locator;

  // Authenticated state indicator
  readonly activeWorkspaceIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login form locators — use type-based selectors, not placeholder text
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    // The actual sign-in button text is "Sign in to workspace"
    this.signInButton = page.getByRole('button', { name: /sign in to workspace/i });
    this.errorMessage = page.locator('div.text-\\[\\#e07a7a\\]');
    // The "switch to register" link text is "Create workspace"
    this.switchToRegisterButton = page.getByRole('button', { name: /create workspace/i });

    // Register form locators
    this.registerNameInput = page.locator('input[type="text"]').first();
    this.registerEmailInput = page.locator('input[type="email"]');
    this.registerOrgInput = page.getByPlaceholder('Acme Systems (Optional)');
    this.registerPasswordInput = page.locator('input[type="password"]');
    // The actual submit button text is "Create Workspace (Owner)"
    this.createWorkspaceButton = page.getByRole('button', { name: /Create Workspace \(Owner\)/i });
    // The "switch to login" link text is "Sign in to existing account"
    this.switchToLoginButton = page.getByRole('button', { name: /sign in to existing account/i });

    // Authenticated state
    this.activeWorkspaceIndicator = page.getByRole('button', { name: 'Home' });
  }

  /**
   * Navigate to root, pass through the landing page by clicking "Sign in",
   * and wait for the login form to be visible before returning.
   */
  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // If the landing page is shown, click "Sign in" to reach the login form.
    // Use a long timeout to wait out the initial App.tsx loading spinner.
    const signInNavButton = this.page.getByRole('button', { name: /^sign in$/i }).first();
    try {
      await signInNavButton.waitFor({ state: 'visible', timeout: 20000 });
      await signInNavButton.click();
    } catch (e) {
      // Ignore if not visible; we might already be on the login page or it timed out.
    }

    // Wait for login form
    await this.emailInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async switchToRegister() {
    await this.switchToRegisterButton.click();
  }

  async switchToLogin() {
    if (await this.switchToLoginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.switchToLoginButton.click();
    }
  }

  async register(name: string, email: string, password: string, organizationName?: string) {
    await this.registerNameInput.fill(name);
    await this.registerEmailInput.fill(email);
    if (organizationName) {
      await this.registerOrgInput.fill(organizationName);
    }
    await this.registerPasswordInput.fill(password);
    await this.createWorkspaceButton.click();
  }
}
