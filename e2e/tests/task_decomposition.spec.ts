import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { TaskPage } from '../pages/task.page';
import { provisionTestProject } from '../fixtures/test-data.fixture';

test.describe('E2E AI-Assisted Task Decomposition Workflows', () => {
  test('Decomposes task with AI, reviews proposed items, and explicitly creates selected subtasks', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);
    const taskPage = new TaskPage(page);

    // 1. Provision project
    const project = await provisionTestProject(request, authenticatedUser);

    // 2. Mock AI decomposition response
    await page.route('**/ai/analyze', async route => {
      const requestData = route.request().postDataJSON();
      expect(requestData.operation).toBe('TASK_DECOMPOSITION');
      expect(requestData.taskId).toBeDefined();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            request_id: 'e2e-decomp-req-001',
            operation: 'TASK_DECOMPOSITION',
            summary: 'Decomposed OAuth implementation into 3 concrete, actionable subtasks.',
            subtasks: [
              {
                title: 'Configure OAuth developer credentials',
                description: 'Set client IDs and callback URLs in dashboard',
                priority: 'HIGH',
                order: 1,
              },
              {
                title: 'Implement OAuth callback route handler',
                description: 'Exchange authorization code for user access token',
                priority: 'HIGH',
                order: 2,
              },
              {
                title: 'Add social login buttons to UI',
                description: 'Render Google and GitHub buttons on LoginPage',
                priority: 'MEDIUM',
                order: 3,
              },
            ],
            notes: ['Test callback routes against localhost before staging deploy.'],
            recommendations: [],
            attention_areas: [],
            metadata: {
              model: 'gpt-4o-mini',
              provider: 'openai',
              prompt_tokens: 280,
              completion_tokens: 95,
              total_tokens: 375,
            },
          },
        }),
      });
    });

    // 3. Navigate to project board
    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');

    // 4. Create task
    const taskTitle = `OAuth Feature ${Date.now().toString().slice(-4)}`;
    await taskPage.createTask({
      title: taskTitle,
      description: 'Implement GitHub and Google OAuth authentication flows',
      priority: 'HIGH',
      status: 'TODO',
    });

    // 5. Open TaskDetailDrawer
    const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await taskCard.click();

    // 6. Verify AITaskIntelligence container is present
    const aiContainer = page.getByTestId('ai-task-intelligence');
    await expect(aiContainer).toBeVisible({ timeout: 5000 });

    // 7. Switch to "Breakdown" tab
    const decompTab = page.getByTestId('ai-tab-decomposition');
    await expect(decompTab).toBeVisible();
    await decompTab.click();

    // 8. Verify Decomposition Idle state
    const decomposeBtn = page.getByTestId('ai-task-decompose-btn');
    await expect(decomposeBtn).toBeVisible();

    // 9. Click "Suggest Breakdown"
    await decomposeBtn.click();

    // 10. Verify Review UI renders structured proposals
    await expect(page.getByTestId('ai-task-decomposition-review')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('ai-decomposition-summary')).toContainText(
      'Decomposed OAuth implementation into 3 concrete, actionable subtasks.'
    );

    // Verify proposed items are displayed with checkboxes
    await expect(page.getByTestId('proposed-subtask-0')).toBeVisible();
    await expect(page.getByTestId('subtask-title-input-0')).toHaveValue(
      'Configure OAuth developer credentials'
    );
    await expect(page.getByTestId('subtask-title-input-1')).toHaveValue(
      'Implement OAuth callback route handler'
    );

    // 11. Verify Human-in-the-Loop Safety: click Create Selected Subtasks
    const createSubtasksBtn = page.getByTestId('ai-create-subtasks-btn');
    await expect(createSubtasksBtn).toBeVisible();
    await createSubtasksBtn.click();

    // 12. Verify Success result notification appears
    await expect(page.getByTestId('ai-decomposition-result')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('ai-decomposition-result')).toContainText('created successfully');
  });
});
