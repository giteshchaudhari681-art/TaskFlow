import {
  AuthResponseData,
  CurrentUserResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  UserProfile,
  UpdateProfilePayload,
  ChangePasswordPayload,
  OrganizationDetails,
  OrganizationMemberItem,
  UpdateOrganizationPayload,
  AddMemberPayload,
  UpdateMemberRolePayload,
  ProjectDetail,
  ProjectListItem,
  ProjectMemberDetail,
  CreateProjectPayload,
  UpdateProjectPayload,
  AddProjectMemberPayload,
  ProjectRole,
  TaskDetail,
  TaskListItem,
  SubtaskItem,
  CreateTaskPayload,
  UpdateTaskPayload,
  CreateSubtaskPayload,
  UpdateSubtaskPayload,
  TaskFilterParams,
  TaskStatus,
} from '@taskflow/shared';
import { LoginInput, RegisterInput } from '@taskflow/validation';

const API_BASE = '/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/**
 * Single-flight refresh mechanism to prevent duplicate concurrent refresh calls.
 */
const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include HTTP-only cookie
      });

      if (!response.ok) {
        setAccessToken(null);
        return null;
      }

      const resData = (await response.json()) as ApiSuccessResponse<AuthResponseData>;
      if (resData.success && resData.data.accessToken) {
        setAccessToken(resData.data.accessToken);
        return resData.data.accessToken;
      }

      setAccessToken(null);
      return null;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Fetch wrapper that attaches access token in memory and automatically retries once on 401.
 */
export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle access token expiry (401) with automatic single-retry
  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  const payload = await response.json();

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    const err = new Error(errorPayload.error?.message || 'Request failed');
    (err as unknown as { code: string; details?: unknown }).code =
      errorPayload.error?.code || 'API_ERROR';
    (err as unknown as { details?: unknown }).details = errorPayload.error?.details;
    throw err;
  }

  return payload as ApiSuccessResponse<T>;
};

export const api = {
  // Authentication
  login: async (credentials: LoginInput) => {
    const res = await apiFetch<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  register: async (data: RegisterInput) => {
    const res = await apiFetch<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  refresh: async () => {
    const token = await refreshAccessToken();
    return token;
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async () => {
    const res = await apiFetch<CurrentUserResponse>('/auth/me');
    return res.data;
  },

  // User Profile & Security
  getProfile: async () => {
    const res = await apiFetch<UserProfile>('/users/me');
    return res.data;
  },

  updateProfile: async (data: UpdateProfilePayload) => {
    const res = await apiFetch<UserProfile>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  changePassword: async (data: ChangePasswordPayload) => {
    const res = await apiFetch<{ accessToken: string; message: string }>('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return res.data;
  },

  // Organization & Workspace Management
  getOrganizations: async () => {
    const res = await apiFetch<OrganizationDetails[]>('/organizations');
    return res.data;
  },

  getWorkspace: async (organizationId: string) => {
    const res = await apiFetch<OrganizationDetails>(`/organizations/${organizationId}`);
    return res.data;
  },

  updateWorkspace: async (organizationId: string, data: UpdateOrganizationPayload) => {
    const res = await apiFetch<OrganizationDetails>(`/organizations/${organizationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  getMembers: async (organizationId: string) => {
    const res = await apiFetch<OrganizationMemberItem[]>(
      `/organizations/${organizationId}/members`
    );
    return res.data;
  },

  addMember: async (organizationId: string, data: AddMemberPayload) => {
    const res = await apiFetch<OrganizationMemberItem>(`/organizations/${organizationId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  updateMemberRole: async (
    organizationId: string,
    userId: string,
    data: UpdateMemberRolePayload
  ) => {
    const res = await apiFetch<OrganizationMemberItem>(
      `/organizations/${organizationId}/members/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  removeMember: async (organizationId: string, userId: string) => {
    const res = await apiFetch<{ message: string }>(
      `/organizations/${organizationId}/members/${userId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },
};

export const orgApi = api;

export const projectApi = {
  listProjects: async (organizationId: string, filter?: { status?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter?.search) params.append('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<ProjectListItem[]>(`/organizations/${organizationId}/projects${qs}`);
    return res.data;
  },

  createProject: async (organizationId: string, data: CreateProjectPayload) => {
    const res = await apiFetch<ProjectDetail>(`/organizations/${organizationId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  getProject: async (organizationId: string, projectId: string) => {
    const res = await apiFetch<ProjectDetail>(
      `/organizations/${organizationId}/projects/${projectId}`
    );
    return res.data;
  },

  updateProject: async (organizationId: string, projectId: string, data: UpdateProjectPayload) => {
    const res = await apiFetch<ProjectDetail>(
      `/organizations/${organizationId}/projects/${projectId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  archiveProject: async (organizationId: string, projectId: string) => {
    const res = await apiFetch<ProjectDetail>(
      `/organizations/${organizationId}/projects/${projectId}/archive`,
      {
        method: 'POST',
      }
    );
    return res.data;
  },

  unarchiveProject: async (organizationId: string, projectId: string) => {
    const res = await apiFetch<ProjectDetail>(
      `/organizations/${organizationId}/projects/${projectId}/unarchive`,
      {
        method: 'POST',
      }
    );
    return res.data;
  },

  getMembers: async (organizationId: string, projectId: string) => {
    const res = await apiFetch<ProjectMemberDetail[]>(
      `/organizations/${organizationId}/projects/${projectId}/members`
    );
    return res.data;
  },

  addMember: async (organizationId: string, projectId: string, data: AddProjectMemberPayload) => {
    const res = await apiFetch<ProjectMemberDetail>(
      `/organizations/${organizationId}/projects/${projectId}/members`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  updateMemberRole: async (
    organizationId: string,
    projectId: string,
    userId: string,
    role: ProjectRole
  ) => {
    const res = await apiFetch<ProjectMemberDetail>(
      `/organizations/${organizationId}/projects/${projectId}/members/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }
    );
    return res.data;
  },

  removeMember: async (organizationId: string, projectId: string, userId: string) => {
    const res = await apiFetch<{ removed: boolean; userId: string; projectId: string }>(
      `/organizations/${organizationId}/projects/${projectId}/members/${userId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },
};

export const taskApi = {
  listTasks: async (organizationId: string, projectId: string, filters?: TaskFilterParams) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.archived !== undefined) params.set('archived', String(filters.archived));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<TaskListItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/tasks${queryString}`
    );
    return res.data;
  },

  createTask: async (organizationId: string, projectId: string, data: CreateTaskPayload) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  getTask: async (organizationId: string, projectId: string, taskId: string) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`
    );
    return res.data;
  },

  updateTask: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    data: UpdateTaskPayload
  ) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  updateTaskStatus: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    status: TaskStatus
  ) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return res.data;
  },

  archiveTask: async (organizationId: string, projectId: string, taskId: string) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/archive`,
      {
        method: 'POST',
      }
    );
    return res.data;
  },

  unarchiveTask: async (organizationId: string, projectId: string, taskId: string) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/unarchive`,
      {
        method: 'POST',
      }
    );
    return res.data;
  },

  deleteTask: async (organizationId: string, projectId: string, taskId: string) => {
    const res = await apiFetch<{ success: boolean; message: string }>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },

  // Subtasks
  listSubtasks: async (organizationId: string, projectId: string, taskId: string) => {
    const res = await apiFetch<SubtaskItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks`
    );
    return res.data;
  },

  createSubtask: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    data: CreateSubtaskPayload
  ) => {
    const res = await apiFetch<SubtaskItem>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  updateSubtask: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string,
    data: UpdateSubtaskPayload
  ) => {
    const res = await apiFetch<SubtaskItem>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  deleteSubtask: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    subtaskId: string
  ) => {
    const res = await apiFetch<{ success: boolean; message: string }>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },
};
