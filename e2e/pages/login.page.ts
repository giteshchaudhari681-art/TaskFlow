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

    // Login form locators
    this.emailInput = page.getByPlaceholder('alex.chen@taskflow.dev');
    this.passwordInput = page.getByPlaceholder('••••••••••••');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.locator('div.border-rose-800\\/60');
    this.switchToRegisterButton = page.getByRole('button', { name: 'Create Workspace' });

    // Register form locators
    this.registerNameInput = page.getByPlaceholder('Elena Rostova');
    this.registerEmailInput = page.getByPlaceholder('elena@acme-engineering.com');
    this.registerOrgInput = page.getByPlaceholder('Acme Systems');
    this.registerPasswordInput = page.getByPlaceholder('••••••••••••');
    this.createWorkspaceButton = page.getByRole('button', { name: /Create Workspace/ });
    this.switchToLoginButton = page.getByRole('button', { name: 'Sign in' });

    // Authenticated state
    this.activeWorkspaceIndicator = page.locator('text=Active Workspace:');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async switchToRegister() {
    await this.switchToRegisterButton.click();
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
