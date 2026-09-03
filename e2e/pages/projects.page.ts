import { Page, Locator } from '@playwright/test';

export class ProjectsPage {
  readonly page: Page;
  readonly projectsNavButton: Locator;
  readonly newProjectButton: Locator;
  readonly searchInput: Locator;

  // Create Project Modal
  readonly modalNameInput: Locator;
  readonly modalKeyInput: Locator;
  readonly modalDescriptionInput: Locator;
  readonly modalSubmitButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalErrorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.projectsNavButton = page.locator('header nav').getByRole('button', { name: 'Projects' });
    this.newProjectButton = page.getByRole('button', { name: 'New Project' });
    this.searchInput = page.getByPlaceholder('Search projects by name or key...');

    this.modalNameInput = page.getByPlaceholder('e.g. Core Engine Platform');
    this.modalKeyInput = page.getByPlaceholder('CORE', { exact: true });
    this.modalDescriptionInput = page.getByPlaceholder(
      'Brief summary of project objectives, scope, and target outcomes...'
    );
    this.modalSubmitButton = page.getByRole('button', { name: 'Create Project' });
    this.modalCancelButton = page.getByRole('button', { name: 'Cancel' });
    this.modalErrorMessage = page.locator('div.border-rose-500\\/30');
  }

  async goto() {
    await this.projectsNavButton.click();
    await this.newProjectButton.waitFor({ state: 'visible', timeout: 10000 });
  }

  async openCreateModal() {
    await this.newProjectButton.click();
    await this.modalNameInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async createProject(name: string, key: string, description?: string) {
    await this.openCreateModal();
    await this.modalNameInput.fill(name);
    // Key will be auto-suggested or we explicitly fill it:
    await this.modalKeyInput.fill(key);
    if (description) {
      await this.modalDescriptionInput.fill(description);
    }
    await this.modalSubmitButton.click();
  }

  async openProject(projectKeyOrName: string) {
    const card = this.page.locator('h3', { hasText: projectKeyOrName }).first();
    await card.click();
  }
}
