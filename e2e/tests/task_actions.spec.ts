import { test, expect } from '../fixtures/auth.fixture';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectPage } from '../pages/project.page';
import { TaskPage } from '../pages/task.page';
import { provisionTestProject } from '../fixtures/test-data.fixture';

test.describe('E2E Human-Approved AI Task Actions Workflows', () => {
  test('Proposes AI task actions, reviews diff, and applies priority update upon explicit human approval', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);
    const taskPage = new TaskPage(page);

    // 1. Provision test project
    const project = await provisionTestProject(request, authenticatedUser);

    // 2. Mock AI analyze route for TASK_ACTIONS
    await page.route('**/ai/analyze', async route => {
      const requestData = route.request().postDataJSON();
      expect(requestData.operation).toBe('TASK_ACTIONS');
      expect(requestData.taskId).toBeDefined();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            request_id: 'e2e-action-req-001',
            operation: 'TASK_ACTIONS',
            summary:
              'Identified critical path bottlenecks recommending high-confidence priority adjustment.',
            recommendations: [],
            attention_areas: [],
            subtasks: [],
            actions: [
              {
                actionId: 'e2e-act-priority-001',
                type: 'UPDATE_PRIORITY',
                title: 'Increase priority to HIGH',
                reason: 'Task is on critical delivery path and blocks customer milestone.',
                confidence: 'HIGH',
                target: { taskId: requestData.taskId },
                expectedCurrentState: { priority: 'MEDIUM' },
                parameters: { priority: 'HIGH' },
              },
            ],
            notes: ['Review with sprint lead before changing target milestone.'],
            metadata: {
              model: 'gpt-4o-mini',
              provider: 'openai',
              prompt_tokens: 310,
              completion_tokens: 110,
              total_tokens: 420,
            },
          },
        }),
      });
    });

    // 3. Navigate to project board
    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');

    // 4. Create task with MEDIUM priority
    const taskTitle = `Action Task ${Date.now().toString().slice(-4)}`;
    await taskPage.createTask({
      title: taskTitle,
      description: 'Core backend payment processing logic',
      priority: 'MEDIUM',
      status: 'TODO',
    });

    // 5. Open TaskDetailDrawer
    const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await taskCard.click();

    // 6. Verify AITaskIntelligence container is present
    const aiContainer = page.getByTestId('ai-task-intelligence');
    await expect(aiContainer).toBeVisible({ timeout: 5000 });

    // 7. Switch to "Actions" tab
    const actionsTab = page.getByTestId('ai-tab-actions');
    await expect(actionsTab).toBeVisible();
    await actionsTab.click();

    // 8. Verify Actions Idle state
    const suggestBtn = page.getByTestId('ai-task-actions-btn');
    await expect(suggestBtn).toBeVisible();

    // 9. Click "Suggest Actions"
    await suggestBtn.click();

    // 10. Verify Proposals section renders
    await expect(page.getByTestId('ai-task-actions-success')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('ai-actions-summary')).toContainText(
      'Identified critical path bottlenecks'
    );

    // Verify Action proposal card content
    const actionCard = page.getByTestId('ai-action-card-e2e-act-priority-001');
    await expect(actionCard).toBeVisible();
    await expect(actionCard.getByTestId('ai-action-title')).toContainText(
      'Increase priority to HIGH'
    );
    await expect(actionCard.getByTestId('ai-action-confidence')).toContainText('HIGH');
    await expect(actionCard.getByTestId('ai-action-reason')).toContainText(
      'critical delivery path'
    );
    await expect(actionCard.getByTestId('ai-action-diff')).toContainText('HIGH');

    // 11. Crucial verification: Task priority in drawer is STILL MEDIUM prior to explicit Apply
    const prioritySelect = page.getByTestId('task-priority-select');
    await expect(prioritySelect).toHaveValue('MEDIUM');

    // 12. Human Approval: Click Apply
    const applyBtn = actionCard.getByTestId('ai-action-apply-btn');
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).toContainText('Change priority to HIGH');
    await applyBtn.click();

    // 13. Verify Applied success feedback
    await expect(actionCard.getByTestId('ai-action-applied')).toBeVisible({ timeout: 10000 });
    await expect(actionCard.getByTestId('ai-action-applied')).toContainText('applied successfully');

    // 14. Verify task priority updated to HIGH in authoritative state
    await expect(prioritySelect).toHaveValue('HIGH');
  });

  test('Dismissing an action proposal discards it without modifying task state', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);
    const taskPage = new TaskPage(page);

    const project = await provisionTestProject(request, authenticatedUser);

    await page.route('**/ai/analyze', async route => {
      const requestData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            request_id: 'e2e-action-dismiss-001',
            operation: 'TASK_ACTIONS',
            summary: 'Suggest status change to IN_PROGRESS.',
            recommendations: [],
            attention_areas: [],
            subtasks: [],
            actions: [
              {
                actionId: 'e2e-act-status-001',
                type: 'UPDATE_STATUS',
                title: 'Move task to IN_PROGRESS',
                reason: 'Task is assigned and unblocked.',
                confidence: 'MEDIUM',
                target: { taskId: requestData.taskId },
                expectedCurrentState: { status: 'TODO' },
                parameters: { status: 'IN_PROGRESS' },
              },
            ],
            notes: [],
            metadata: {},
          },
        }),
      });
    });

    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');

    const taskTitle = `Dismiss Task ${Date.now().toString().slice(-4)}`;
    await taskPage.createTask({
      title: taskTitle,
      description: 'Task for testing dismissal without execution',
      priority: 'LOW',
      status: 'TODO',
    });

    const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await taskCard.click();

    // Verify AITaskIntelligence container is present
    await expect(page.getByTestId('ai-task-intelligence')).toBeVisible({ timeout: 5000 });

    // Switch to Actions tab
    await page.getByTestId('ai-tab-actions').click();
    await page.getByTestId('ai-task-actions-btn').click();

    const actionCard = page.getByTestId('ai-action-card-e2e-act-status-001');
    await expect(actionCard).toBeVisible({ timeout: 5000 });

    // Dismiss proposal
    await actionCard.getByTestId('ai-action-dismiss-btn').click();

    // Verify card is no longer visible
    await expect(actionCard).not.toBeVisible();

    // Verify task status is still TODO
    const statusSelect = page.getByTestId('task-status-select');
    await expect(statusSelect).toHaveValue('TODO');
  });

  test('Guards against stale action proposals when task state has diverged', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;
    const projectsPage = new ProjectsPage(page);
    const projectPage = new ProjectPage(page);
    const taskPage = new TaskPage(page);

    const project = await provisionTestProject(request, authenticatedUser);

    // Mock an action proposal that was generated against an older state (e.g. expected status: BACKLOG, but current is TODO)
    await page.route('**/ai/analyze', async route => {
      const requestData = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            request_id: 'e2e-action-stale-001',
            operation: 'TASK_ACTIONS',
            summary: 'Stale action recommendation based on outdated task status.',
            recommendations: [],
            attention_areas: [],
            subtasks: [],
            actions: [
              {
                actionId: 'e2e-act-stale-status',
                type: 'UPDATE_STATUS',
                title: 'Move task to IN_PROGRESS',
                reason: 'Generated when task was BACKLOG.',
                confidence: 'HIGH',
                target: { taskId: requestData.taskId },
                expectedCurrentState: { status: 'BACKLOG' }, // Mismatched from current TODO
                parameters: { status: 'IN_PROGRESS' },
              },
            ],
            notes: [],
            metadata: {},
          },
        }),
      });
    });

    await projectsPage.goto();
    await projectsPage.openProject(project.name);
    await projectPage.selectTab('Board & Tasks');

    const taskTitle = `Stale Guard Task ${Date.now().toString().slice(-4)}`;
    await taskPage.createTask({
      title: taskTitle,
      description: 'Task verifying stale safety guard',
      priority: 'MEDIUM',
      status: 'TODO',
    });

    const taskCard = page.locator('div.group', { hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 10000 });
    await taskCard.click();

    // Verify AITaskIntelligence container is present
    await expect(page.getByTestId('ai-task-intelligence')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('ai-tab-actions').click();
    await page.getByTestId('ai-task-actions-btn').click();

    const actionCard = page.getByTestId('ai-action-card-e2e-act-stale-status');
    await expect(actionCard).toBeVisible({ timeout: 5000 });

    // Verify stale warning banner is displayed
    const staleBanner = actionCard.getByTestId('ai-action-stale');
    await expect(staleBanner).toBeVisible();
    await expect(staleBanner).toContainText('older version of the task');

    // Verify Apply button is disabled due to stale state
    const applyBtn = actionCard.getByTestId('ai-action-apply-btn');
    await expect(applyBtn).toBeDisabled();
  });
});
