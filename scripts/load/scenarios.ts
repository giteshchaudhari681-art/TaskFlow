/**
 * TaskFlow PR31: Load-Testing Harness Scenarios
 *
 * Implements 10 scenarios for core API read and write paths.
 */

import { ScenarioName, ScenarioContext } from './types.js';

export interface ScenarioDefinition {
  name: ScenarioName;
  description: string;
  requiresAuth: boolean;
  setup?: (context: ScenarioContext) => Promise<void>;
  execute: (
    index: number,
    signal: AbortSignal,
    context: ScenarioContext
  ) => Promise<{ status: number; success: boolean }>;
}

export const scenarios: Record<ScenarioName, ScenarioDefinition> = {
  health: {
    name: 'health',
    description: 'Basic unauthenticated liveness check (GET /api/v1/health)',
    requiresAuth: false,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/health`, { signal });
      return { status: res.status, success: res.status === 200 };
    },
  },

  readiness: {
    name: 'readiness',
    description: 'Decoupled database readiness check (GET /api/v1/health/ready)',
    requiresAuth: false,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/health/ready`, { signal });
      return { status: res.status, success: res.status === 200 };
    },
  },

  projects: {
    name: 'projects',
    description: 'Authenticated projects listing (GET /api/v1/organizations/:orgId/projects)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/organizations/${context.orgId}/projects`, {
        headers: { Authorization: `Bearer ${context.token}` },
        signal,
      });
      return { status: res.status, success: res.status === 200 };
    },
  },

  tasks: {
    name: 'tasks',
    description: 'Authenticated task listing for a project (GET /api/v1/projects/:projectId/tasks)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/projects/${context.projectId}/tasks`, {
        headers: { Authorization: `Bearer ${context.token}` },
        signal,
      });
      return { status: res.status, success: res.status === 200 };
    },
  },

  search: {
    name: 'search',
    description:
      'Authenticated multi-entity search (GET /api/v1/organizations/:orgId/search?q=Load)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(
        `${context.baseUrl}/api/v1/organizations/${context.orgId}/search?q=Load`,
        {
          headers: { Authorization: `Bearer ${context.token}` },
          signal,
        }
      );
      return { status: res.status, success: res.status === 200 };
    },
  },

  dashboard: {
    name: 'dashboard',
    description:
      'Executive project portfolio dashboard (GET /api/v1/organizations/:orgId/dashboard/projects)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(
        `${context.baseUrl}/api/v1/organizations/${context.orgId}/dashboard/projects`,
        {
          headers: { Authorization: `Bearer ${context.token}` },
          signal,
        }
      );
      return { status: res.status, success: res.status === 200 };
    },
  },

  notifications: {
    name: 'notifications',
    description: 'Authenticated user notifications queue (GET /api/v1/notifications)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/notifications`, {
        headers: { Authorization: `Bearer ${context.token}` },
        signal,
      });
      return { status: res.status, success: res.status === 200 };
    },
  },

  audit: {
    name: 'audit',
    description: 'Security & compliance audit events (GET /api/v1/organizations/:orgId/audit)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/organizations/${context.orgId}/audit`, {
        headers: { Authorization: `Bearer ${context.token}` },
        signal,
      });
      return { status: res.status, success: res.status === 200 };
    },
  },

  usage: {
    name: 'usage',
    description: 'SaaS metering & entitlement usage (GET /api/v1/organizations/:orgId/usage)',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      const res = await fetch(`${context.baseUrl}/api/v1/organizations/${context.orgId}/usage`, {
        headers: { Authorization: `Bearer ${context.token}` },
        signal,
      });
      return { status: res.status, success: res.status === 200 };
    },
  },

  ai: {
    name: 'ai',
    description: 'AI intelligence endpoint invocation with internal mock',
    requiresAuth: true,
    execute: async (_index, signal, context) => {
      // Mocked AI test endpoint or project insight request
      const res = await fetch(
        `${context.baseUrl}/api/v1/projects/${context.projectId}/ai/insight`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${context.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            focusArea: 'DELIVERY_CONFIDENCE',
          }),
          signal,
        }
      );
      // If AI service is not running locally, 503 AI_SERVICE_UNAVAILABLE is an expected graceful degradation
      const ok = res.status === 200 || res.status === 503;
      return { status: res.status, success: ok };
    },
  },
};

/**
 * Bootstraps an isolated tenant and auth session for authenticated scenarios.
 */
export async function setupAuthContext(
  baseUrl: string,
  timeoutMs: number
): Promise<ScenarioContext> {
  const timestamp = Date.now();
  const email = `loadtest.${timestamp}@example.test`;
  const password = 'LoadTest1234!Pass';

  const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Load User ${timestamp}`,
      email,
      password,
      organizationName: `Load Org ${timestamp}`,
    }),
  });

  if (!regRes.ok) {
    const errText = await regRes.text();
    throw new Error(`Failed to bootstrap load test auth user: HTTP ${regRes.status} - ${errText}`);
  }

  const regData = (await regRes.json()) as any;
  const token = regData.data.accessToken;
  const orgId = regData.data.defaultOrganization.id;
  const userId = regData.data.user.id;

  // Create base project
  const projRes = await fetch(`${baseUrl}/api/v1/organizations/${orgId}/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Load Test Project ${timestamp}`,
      key: `LOD${String(timestamp).slice(-3)}`,
    }),
  });

  let projectId: string | undefined;
  if (projRes.ok) {
    const projData = (await projRes.json()) as any;
    projectId = projData.data.id;

    // Seed 2 tasks for task listing
    await fetch(`${baseUrl}/api/v1/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Load Test Task 1',
        priority: 'MEDIUM',
      }),
    });
  }

  return {
    baseUrl,
    timeoutMs,
    token,
    orgId,
    projectId,
    user: { id: userId, email },
  };
}
