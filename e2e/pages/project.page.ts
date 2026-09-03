import { Page, Locator } from '@playwright/test';

export class ProjectPage {
  readonly page: Page;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.backButton = page.locator('button:has-text("Projects")').first();
  }

  async selectTab(
    tabName:
      | 'Overview'
      | 'Board & Tasks'
      | 'Labels'
      | 'Dependencies'
      | 'Milestones'
      | 'Activity'
      | 'Members'
      | 'Settings'
  ) {
    const tabButton = this.page.getByRole('button', { name: tabName });
    await tabButton.click();
  }
}
