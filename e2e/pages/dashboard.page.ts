import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly healthAssessmentHero: Locator;
  readonly kpiSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.healthAssessmentHero = page.locator('text=Executive Health Assessment');
    this.kpiSection = page.locator('text=Total Tasks');
  }

  async verifyDashboardElements() {
    await this.healthAssessmentHero.waitFor({ state: 'visible', timeout: 10000 });
  }
}
