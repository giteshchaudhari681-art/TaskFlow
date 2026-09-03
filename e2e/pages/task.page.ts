import { Page, Locator } from '@playwright/test';

export class TaskPage {
  readonly page: Page;
  readonly createTaskButton: Locator;

  // Create Task Modal
  readonly modalTitleInput: Locator;
  readonly modalDescriptionInput: Locator;
  readonly modalStatusSelect: Locator;
  readonly modalPrioritySelect: Locator;
  readonly modalSubmitButton: Locator;

  // Drawer
  readonly drawerCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createTaskButton = page.getByRole('button', { name: 'Create Task' });

    this.modalTitleInput = page.getByPlaceholder('e.g. Implement user authentication middleware');
    this.modalDescriptionInput = page.getByPlaceholder(
      'Provide context, acceptance criteria, or implementation details...'
    );
    this.modalStatusSelect = page.locator('select').filter({ hasText: /To Do/ });
    this.modalPrioritySelect = page.locator('select').filter({ hasText: /Medium/ });
    this.modalSubmitButton = page.getByRole('button', { name: 'Create Task' }).last();

    this.drawerCloseButton = page.locator('button:has(svg.lucide-x)').first();
  }

  async openCreateModal() {
    await this.createTaskButton.click();
    await this.modalTitleInput.waitFor({ state: 'visible', timeout: 5000 });
  }

  async createTask(opts: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
  }) {
    await this.openCreateModal();
    await this.modalTitleInput.fill(opts.title);
    if (opts.description) {
      await this.modalDescriptionInput.fill(opts.description);
    }
    if (opts.status) {
      await this.modalStatusSelect.selectOption(opts.status);
    }
    if (opts.priority) {
      await this.modalPrioritySelect.selectOption(opts.priority);
    }
    await this.modalSubmitButton.click();
  }

  async openTaskCard(title: string) {
    const card = this.page.locator(`div:has-text("${title}")`).last();
    await card.click();
  }

  async moveTaskQuick(taskTitle: string, targetStatusLabel: string) {
    // Locate the card containing taskTitle
    const card = this.page.locator('div.group', { hasText: taskTitle }).first();
    // Hover to reveal quick move button
    await card.hover();
    const moveBtn = card.getByRole('button', { name: 'Move task' });
    await moveBtn.click();

    // Click target column in dropdown menu
    const targetOption = this.page.getByRole('button', { name: targetStatusLabel, exact: true });
    await targetOption.click();
  }
}
