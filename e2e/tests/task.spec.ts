import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { TaskPage } from '../pages/task.page';
import { provisionTestProject } from '../fixtures/test-data.fixture';

test.describe('E2E Task Management Workflows', () => {
  test('Complete task creation, detail inspection, and persistence workflow', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);
    const taskPage = new TaskPage(page);

    // 1. Provision project via API for rapid deterministic test setup
    const project = await provisionTestProject(request, authenticatedUser);

    // 2. Navigate to Projects and open the project
    await projectsPage.goto();
    await projectsPage.openProject(project.name);

    // 3. Switch to 'Board & Tasks' tab
    await projectPage.selectTab('Board & Tasks');

    // 4. Create a new task
    const taskTitle = `Optimize query planner ${Date.now().toString().slice(-4)}`;
    const taskDesc = 'Improve PostgreSQL execution indexes for large joins';
    await taskPage.createTask({
      title: taskTitle,
      description: taskDesc,
      priority: 'HIGH',
      status: 'TODO',
    });

    // 5. Verify task card appears on the board
    const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });

    // 6. Click task card to open TaskDetailDrawer
    await taskCard.click();

    // 7. Verify TaskDetailDrawer opened with correct content
    await expect(page.getByRole('button', { name: 'Details' })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`input[value="${taskTitle}"]`)).toBeVisible();

    // 8. Close drawer
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();

    // 9. Reload page and navigate back to project board to verify persistence
    await page.reload();
    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');
    await expect(page.locator('div.group', { hasText: taskTitle }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
