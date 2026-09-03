import { test, expect } from '../fixtures/auth.fixture';
import { provisionTestProject } from '../fixtures/test-data.fixture';

test.describe('E2E Global Search & Command Palette Workflows', () => {
  test('Search locates entity and navigates to target project', async ({
    authenticatedPage,
    authenticatedUser,
    request,
  }) => {
    const page = authenticatedPage;

    // 1. Provision a test project with an unmistakable unique name
    const uniqueSuffix = Date.now().toString().slice(-5);
    const uniqueProjectName = `Starlight Nebula ${uniqueSuffix}`;
    const project = await provisionTestProject(request, authenticatedUser, {
      name: uniqueProjectName,
    });

    // 2. Open Global Search via UI header button
    const searchTrigger = page.locator('header').getByRole('button', { name: /Search/i });
    await searchTrigger.click();

    // 3. Verify modal is visible
    const searchInput = page.getByPlaceholder(
      'Search tasks, projects, milestones, or run commands...'
    );
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // 4. Enter unique search term
    await searchInput.fill(uniqueProjectName);

    // 5. Wait for debounced search results and verify match
    const resultItem = page.locator('div', { hasText: uniqueProjectName }).last();
    await expect(resultItem).toBeVisible({ timeout: 10000 });

    // 6. Click result to navigate
    await resultItem.click();

    // 7. Verify navigation to the project
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${project.key}`).first()).toBeVisible();
  });
});
