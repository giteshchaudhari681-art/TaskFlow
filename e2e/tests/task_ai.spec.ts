import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { TaskPage } from '../pages/task.page';
import { provisionTestProject } from '../fixtures/test-data.fixture';

test.describe('E2E AI-Powered Task Intelligence Workflows', () => {
  test('Inspects task with AI intelligence, verifying summary, dependency impact, and action recommendations', async ({
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

    // 2. Mock AI analysis response
    await page.route('**/ai/analyze', async route => {
      const requestData = route.request().postDataJSON();
      expect(requestData.operation).toBe('TASK_SUMMARY');
      expect(requestData.taskId).toBeDefined();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            request_id: 'e2e-task-intel-req-001',
            operation: 'TASK_SUMMARY',
            summary: 'Task is on track with 1 resolved blocker dependency.',
            recommendations: [
              {
                title: 'Proceed with integration tests',
                description: 'Predecessor schema update is finished.',
                priority: 'HIGH',
                category: 'EXECUTION',
              },
            ],
            attention_areas: [
              {
                title: 'Review deployment checklists',
                description: 'Ensure secrets are populated in target environment.',
                severity: 'MEDIUM',
              },
            ],
            dependency_impact: {
              has_blocking_dependencies: false,
              description: 'All blocking dependencies have completed.',
            },
            metadata: {
              model: 'gpt-4o-mini',
              provider: 'openai',
              prompt_tokens: 220,
              completion_tokens: 75,
              total_tokens: 295,
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
    const taskTitle = `Auth Integration ${Date.now().toString().slice(-4)}`;
    await taskPage.createTask({
      title: taskTitle,
      description: 'Implement JWT session handling',
      priority: 'HIGH',
      status: 'TODO',
    });

    // 5. Open TaskDetailDrawer
    const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await taskCard.click();

    // 6. Verify AITaskIntelligence container is present in idle state
    const aiContainer = page.getByTestId('ai-task-intelligence');
    await expect(aiContainer).toBeVisible({ timeout: 5000 });

    const analyzeBtn = page.getByTestId('ai-task-analyze-btn');
    await expect(analyzeBtn).toBeVisible();

    // 7. Click Analyze Task with AI
    await analyzeBtn.click();

    // 8. Verify Success state rendering
    await expect(page.getByTestId('ai-task-success')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('ai-task-summary')).toContainText(
      'Task is on track with 1 resolved blocker dependency.'
    );
    await expect(page.getByTestId('ai-task-dependency-impact')).toContainText('NO BLOCKERS');
    await expect(page.getByTestId('ai-task-recommendations')).toContainText(
      'Proceed with integration tests'
    );
    await expect(page.getByTestId('ai-task-refresh-btn')).toBeVisible();
  });
});
