import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { TaskPage } from '../pages/task.page';
import { provisionTestProject, provisionTestTask } from '../fixtures/test-data.fixture';

test.describe('E2E Kanban Board Workflows', () => {
  test('Moves task between status columns and verifies persistence', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);
    const taskPage = new TaskPage(page);

    // 1. Provision a test project and an initial task in TODO status
    const project = await provisionTestProject(request, authenticatedUser);
    const taskTitle = `Build auth middleware ${Date.now().toString().slice(-4)}`;
    await provisionTestTask(request, authenticatedUser, project.id, {
      title: taskTitle,
      status: 'TODO',
    });

    // 2. Navigate to project board
    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');

    // 3. Verify task card is in the To Do column
    const todoColumn = page.locator('div:has(h3:has-text("TO DO"))').first();
    await expect(todoColumn.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 10000 });

    // 4. Move task to "In Progress" using the accessible quick-move menu
    await taskPage.moveTaskQuick(taskTitle, 'in progress');

    // 5. Verify task moves to the "In Progress" column
    const inProgressColumn = page.locator('div:has(h3:has-text("IN PROGRESS"))').first();
    await expect(inProgressColumn.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 10000 });

    // 6. Reload browser and verify state persisted to PostgreSQL
    await page.reload();
    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');
    const inProgressColumnAfterReload = page.locator('div:has(h3:has-text("IN PROGRESS"))').first();
    await expect(inProgressColumnAfterReload.locator(`text=${taskTitle}`)).toBeVisible({
      timeout: 10000,
    });
  });
});
