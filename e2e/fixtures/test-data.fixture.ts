import { APIRequestContext } from '@playwright/test';

/**
 * Deterministic test data generator for TaskFlow E2E tests.
 * Generates unique identities and provisions entities via the real application API.
 */

export const TEST_PASSWORD = 'TaskFlow2026!Test';

export function generateUniqueEmail(prefix = 'e2e'): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${randomStr}@example.test`;
}

export function generateUniqueName(prefix = 'E2E User'): string {
  return `${prefix} ${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function generateUniqueOrg(prefix = 'E2E Workspace'): string {
  return `${prefix} ${Date.now().toString().slice(-4)}`;
}

export function generateUniqueProjectKey(): string {
  // 2 to 6 uppercase alphanumeric chars
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `PRJ${rand}`.slice(0, 6);
}

export interface ProvisionedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  organizationId: string;
  organizationName: string;
  accessToken: string;
}

export interface ProvisionedProject {
  id: string;
  name: string;
  key: string;
  organizationId: string;
}

export interface ProvisionedTask {
  id: string;
  title: string;
  issueKey: string;
  status: string;
  priority: string;
}

/**
 * Registers a user with automatic exponential backoff retry on HTTP 429 (Rate Limit).
 */
export async function registerTestUser(
  request: APIRequestContext,
  data: { name: string; email: string; password?: string; organizationName?: string }
): Promise<any> {
  const maxRetries = 4;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await request.post('/api/v1/auth/register', {
      data: {
        name: data.name,
        email: data.email,
        password: data.password || TEST_PASSWORD,
        ...(data.organizationName ? { organizationName: data.organizationName } : {}),
      },
    });

    if (res.ok()) {
      return res.json();
    }

    const status = res.status();
    if (status === 429) {
      const waitTime = Math.pow(2, attempt) * 1500; // 1.5s, 3s, 6s, 12s
      lastError = new Error(`Rate limited (HTTP 429), retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    const errText = await res.text();
    throw new Error(`Failed to register test user: HTTP ${status} - ${errText}`);
  }

  throw lastError || new Error('Failed to register test user after retries');
}

/**
 * Provisions a fresh, isolated user and organization using the public application API.
 */
export async function provisionTestUser(
  request: APIRequestContext,
  overrides: { name?: string; email?: string; organizationName?: string } = {}
): Promise<ProvisionedUser> {
  const name = overrides.name || generateUniqueName();
  const email = overrides.email || generateUniqueEmail();
  const organizationName = overrides.organizationName || generateUniqueOrg();
  const password = TEST_PASSWORD;

  const json = await registerTestUser(request, {
    name,
    email,
    password,
    organizationName,
  });

  const user = json.data.user;
  const organization = json.data.defaultOrganization || json.data.organization;
  const accessToken = json.data.accessToken;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password,
    organizationId: organization.id,
    organizationName: organization.name,
    accessToken,
  };
}

/**
 * Provisions a project within an existing organization.
 */
export async function provisionTestProject(
  request: APIRequestContext,
  user: ProvisionedUser,
  overrides: { name?: string; key?: string; description?: string } = {}
): Promise<ProvisionedProject> {
  const name = overrides.name || `E2E Project ${Date.now().toString().slice(-4)}`;
  const key = overrides.key || generateUniqueProjectKey();
  const description = overrides.description || 'Automated E2E Test Project';

  const res = await request.post(`/api/v1/organizations/${user.organizationId}/projects`, {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
    },
    data: {
      name,
      key,
      description,
      status: 'ACTIVE',
      color: '#06b6d4',
    },
  });

  if (!res.ok()) {
    const errText = await res.text();
    throw new Error(`Failed to provision project: HTTP ${res.status()} - ${errText}`);
  }

  const json = await res.json();
  const project = json.data;

  return {
    id: project.id,
    name: project.name,
    key: project.key,
    organizationId: user.organizationId,
  };
}

/**
 * Provisions a task within a project.
 */
export async function provisionTestTask(
  request: APIRequestContext,
  user: ProvisionedUser,
  projectId: string,
  overrides: { title?: string; status?: string; priority?: string } = {}
): Promise<ProvisionedTask> {
  const title = overrides.title || `E2E Task ${Date.now().toString().slice(-4)}`;
  const status = overrides.status || 'TODO';
  const priority = overrides.priority || 'MEDIUM';

  const res = await request.post(
    `/api/v1/organizations/${user.organizationId}/projects/${projectId}/tasks`,
    {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
      data: {
        title,
        status,
        priority,
      },
    }
  );

  if (!res.ok()) {
    const errText = await res.text();
    throw new Error(`Failed to provision task: HTTP ${res.status()} - ${errText}`);
  }

  const json = await res.json();
  const task = json.data;

  return {
    id: task.id,
    title: task.title,
    issueKey: task.issueKey,
    status: task.status,
    priority: task.priority,
  };
}
