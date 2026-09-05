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
  LabelItem,
  CreateLabelPayload,
  UpdateLabelPayload,
  TaskDependenciesResponse,
  CreateDependencyPayload,
  ProjectDependencyGraph,
  MilestoneListItem,
  MilestoneDetail,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  ProjectTimelineResponse,
  CommentItem,
  CreateCommentPayload,
  UpdateCommentPayload,
  DeleteCommentResponse,
  ActivityItem,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationPreferences,
  UpdateNotificationPreferencesPayload,
  MyWorkResponse,
  MyWorkFilter,
  SearchResponse,
  SearchQueryFilter,
  ProjectDashboardResponse,
  AIAnalysisResponse,
  AIOperation,
  AuditEvent,
  AuditEventsFilter,
  ApiResponseMeta,
  OrganizationUsage,
  Plan,
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

  getDashboard: async (
    organizationId: string,
    projectId: string
  ): Promise<ProjectDashboardResponse> => {
    const res = await apiFetch<ProjectDashboardResponse>(
      `/organizations/${organizationId}/projects/${projectId}/dashboard`
    );
    return res.data;
  },

  analyzeProject: async (
    organizationId: string,
    projectId: string,
    body: { operation: AIOperation; taskId?: string; user_prompt?: string } = {
      operation: 'PROJECT_INSIGHT',
    },
    signal?: AbortSignal
  ): Promise<AIAnalysisResponse> => {
    const res = await apiFetch<AIAnalysisResponse>(
      `/organizations/${organizationId}/projects/${projectId}/ai/analyze`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
      }
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
    if (filters?.labelIds && filters.labelIds.length > 0) {
      params.set('labelIds', filters.labelIds.join(','));
    }
    if (filters?.labelMatch) {
      params.set('labelMatch', filters.labelMatch);
    }

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

  assignLabel: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    labelId: string
  ) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/labels`,
      {
        method: 'POST',
        body: JSON.stringify({ labelId }),
      }
    );
    return res.data;
  },

  removeLabel: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    labelId: string
  ) => {
    const res = await apiFetch<TaskDetail>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },

  analyzeTask: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    options?: { user_prompt?: string; signal?: AbortSignal }
  ): Promise<AIAnalysisResponse> => {
    const res = await apiFetch<AIAnalysisResponse>(
      `/organizations/${organizationId}/projects/${projectId}/ai/analyze`,
      {
        method: 'POST',
        body: JSON.stringify({
          operation: 'TASK_SUMMARY',
          taskId,
          user_prompt: options?.user_prompt,
        }),
        signal: options?.signal,
      }
    );
    return res.data;
  },

  decomposeTask: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    options?: { user_prompt?: string; signal?: AbortSignal }
  ): Promise<AIAnalysisResponse> => {
    const res = await apiFetch<AIAnalysisResponse>(
      `/organizations/${organizationId}/projects/${projectId}/ai/analyze`,
      {
        method: 'POST',
        body: JSON.stringify({
          operation: 'TASK_DECOMPOSITION',
          taskId,
          user_prompt: options?.user_prompt,
        }),
        signal: options?.signal,
      }
    );
    return res.data;
  },

  proposeActions: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    options?: { user_prompt?: string; signal?: AbortSignal }
  ): Promise<AIAnalysisResponse> => {
    const res = await apiFetch<AIAnalysisResponse>(
      `/organizations/${organizationId}/projects/${projectId}/ai/analyze`,
      {
        method: 'POST',
        body: JSON.stringify({
          operation: 'TASK_ACTIONS',
          taskId,
          user_prompt: options?.user_prompt,
        }),
        signal: options?.signal,
      }
    );
    return res.data;
  },
};

export const labelApi = {
  listLabels: async (organizationId: string, projectId: string) => {
    const res = await apiFetch<LabelItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/labels`
    );
    return res.data;
  },

  createLabel: async (organizationId: string, projectId: string, data: CreateLabelPayload) => {
    const res = await apiFetch<LabelItem>(
      `/organizations/${organizationId}/projects/${projectId}/labels`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  updateLabel: async (
    organizationId: string,
    projectId: string,
    labelId: string,
    data: UpdateLabelPayload
  ) => {
    const res = await apiFetch<LabelItem>(
      `/organizations/${organizationId}/projects/${projectId}/labels/${labelId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.data;
  },

  deleteLabel: async (organizationId: string, projectId: string, labelId: string) => {
    const res = await apiFetch<{ success: boolean }>(
      `/organizations/${organizationId}/projects/${projectId}/labels/${labelId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },
};

export const dependencyApi = {
  getTaskDependencies: async (
    organizationId: string,
    projectId: string,
    taskId: string
  ): Promise<TaskDependenciesResponse> => {
    const res = await apiFetch<TaskDependenciesResponse>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/dependencies`
    );
    return res.data;
  },

  createDependency: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    data: CreateDependencyPayload
  ) => {
    const res = await apiFetch<{
      id: string;
      projectId: string;
      predecessorId: string;
      successorId: string;
      type: string;
      createdAt: string;
    }>(`/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  deleteDependency: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    dependencyId: string
  ) => {
    const res = await apiFetch<{ success: boolean }>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/dependencies/${dependencyId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },

  getProjectGraph: async (
    organizationId: string,
    projectId: string
  ): Promise<ProjectDependencyGraph> => {
    const res = await apiFetch<ProjectDependencyGraph>(
      `/organizations/${organizationId}/projects/${projectId}/dependencies/graph`
    );
    return res.data;
  },
};

export const milestoneApi = {
  list: async (organizationId: string, projectId: string): Promise<MilestoneListItem[]> => {
    const res = await apiFetch<MilestoneListItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/milestones`
    );
    return res.data;
  },

  create: async (
    organizationId: string,
    projectId: string,
    data: CreateMilestonePayload
  ): Promise<MilestoneListItem> => {
    const res = await apiFetch<MilestoneListItem>(
      `/organizations/${organizationId}/projects/${projectId}/milestones`,
      { method: 'POST', body: JSON.stringify(data) }
    );
    return res.data;
  },

  get: async (
    organizationId: string,
    projectId: string,
    milestoneId: string
  ): Promise<MilestoneDetail> => {
    const res = await apiFetch<MilestoneDetail>(
      `/organizations/${organizationId}/projects/${projectId}/milestones/${milestoneId}`
    );
    return res.data;
  },

  update: async (
    organizationId: string,
    projectId: string,
    milestoneId: string,
    data: UpdateMilestonePayload
  ): Promise<MilestoneListItem> => {
    const res = await apiFetch<MilestoneListItem>(
      `/organizations/${organizationId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    );
    return res.data;
  },

  delete: async (
    organizationId: string,
    projectId: string,
    milestoneId: string
  ): Promise<{ deleted: boolean; milestoneId: string }> => {
    const res = await apiFetch<{ deleted: boolean; milestoneId: string }>(
      `/organizations/${organizationId}/projects/${projectId}/milestones/${milestoneId}`,
      { method: 'DELETE' }
    );
    return res.data;
  },

  getTimeline: async (
    organizationId: string,
    projectId: string
  ): Promise<ProjectTimelineResponse> => {
    const res = await apiFetch<ProjectTimelineResponse>(
      `/organizations/${organizationId}/projects/${projectId}/timeline`
    );
    return res.data;
  },
};

export const commentApi = {
  listComments: async (
    organizationId: string,
    projectId: string,
    taskId: string
  ): Promise<CommentItem[]> => {
    const res = await apiFetch<CommentItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`
    );
    return res.data;
  },

  createComment: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    payload: CreateCommentPayload
  ): Promise<CommentItem> => {
    const res = await apiFetch<CommentItem>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  updateComment: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    payload: UpdateCommentPayload
  ): Promise<CommentItem> => {
    const res = await apiFetch<CommentItem>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  deleteComment: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string
  ): Promise<DeleteCommentResponse> => {
    const res = await apiFetch<DeleteCommentResponse>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      {
        method: 'DELETE',
      }
    );
    return res.data;
  },
};

export const activityApi = {
  getTaskActivity: async (
    organizationId: string,
    projectId: string,
    taskId: string,
    limit?: number
  ): Promise<ActivityItem[]> => {
    const query = limit ? `?limit=${limit}` : '';
    const res = await apiFetch<ActivityItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/activity${query}`
    );
    return res.data;
  },

  getProjectActivity: async (
    organizationId: string,
    projectId: string,
    options?: { limit?: number; filterType?: string }
  ): Promise<ActivityItem[]> => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.filterType) params.set('filterType', options.filterType);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch<ActivityItem[]>(
      `/organizations/${organizationId}/projects/${projectId}/activity${query}`
    );
    return res.data;
  },
};

export const notificationApi = {
  list: async (options?: {
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.unreadOnly !== undefined) params.set('unreadOnly', String(options.unreadOnly));
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<NotificationListResponse>(`/notifications${query}`);
    return res.data;
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const res = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
    return res.data;
  },

  markRead: async (
    notificationId: string
  ): Promise<{ id: string; isRead: boolean; readAt?: string | null }> => {
    const res = await apiFetch<{ id: string; isRead: boolean; readAt?: string | null }>(
      `/notifications/${notificationId}/read`,
      { method: 'PATCH' }
    );
    return res.data;
  },

  markAllRead: async (): Promise<{ count: number }> => {
    const res = await apiFetch<{ count: number }>('/notifications/read-all', {
      method: 'POST',
    });
    return res.data;
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const res = await apiFetch<NotificationPreferences>('/notifications/preferences');
    return res.data;
  },

  updatePreferences: async (
    data: UpdateNotificationPreferencesPayload
  ): Promise<NotificationPreferences> => {
    const res = await apiFetch<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};

export const workApi = {
  getMyWork: async (options?: {
    filter?: MyWorkFilter;
    projectId?: string;
    search?: string;
  }): Promise<MyWorkResponse> => {
    const params = new URLSearchParams();
    if (options?.filter) params.set('filter', options.filter);
    if (options?.projectId) params.set('projectId', options.projectId);
    if (options?.search) params.set('search', options.search);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch<MyWorkResponse>(`/work/my-work${query}`);
    return res.data;
  },
};

export const searchApi = {
  search: async (
    organizationId: string,
    filter: SearchQueryFilter,
    signal?: AbortSignal
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams();
    params.set('q', filter.q);
    if (filter.type && filter.type !== 'all') params.set('type', filter.type);
    if (filter.projectId) params.set('projectId', filter.projectId);
    if (filter.limit) params.set('limit', String(filter.limit));

    const res = await apiFetch<SearchResponse>(
      `/organizations/${organizationId}/search?${params.toString()}`,
      {
        signal,
        headers: {
          'x-organization-id': organizationId,
        },
      }
    );
    return res.data;
  },
};

export const auditApi = {
  listAuditEvents: async (
    organizationId: string,
    filter?: AuditEventsFilter
  ): Promise<{ items: AuditEvent[]; meta?: ApiResponseMeta }> => {
    const params = new URLSearchParams();
    if (filter?.action) params.set('action', filter.action);
    if (filter?.actorUserId) params.set('actorUserId', filter.actorUserId);
    if (filter?.projectId) params.set('projectId', filter.projectId);
    if (filter?.resourceType) params.set('resourceType', filter.resourceType);
    if (filter?.from) params.set('from', filter.from);
    if (filter?.to) params.set('to', filter.to);
    if (filter?.page) params.set('page', String(filter.page));
    if (filter?.limit) params.set('limit', String(filter.limit));
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch<AuditEvent[]>(
      `/organizations/${organizationId}/audit-events${query}`
    );
    return {
      items: res.data,
      meta: res.meta,
    };
  },
};

export const usageApi = {
  getUsage: async (organizationId: string): Promise<OrganizationUsage> => {
    const res = await apiFetch<OrganizationUsage>(`/organizations/${organizationId}/usage`);
    return res.data;
  },
  updatePlan: async (
    organizationId: string,
    plan: Plan
  ): Promise<{ organizationId: string; plan: Plan; updatedAt: string }> => {
    const res = await apiFetch<{ organizationId: string; plan: Plan; updatedAt: string }>(
      `/organizations/${organizationId}/plan`,
      {
        method: 'PATCH',
        body: JSON.stringify({ plan }),
      }
    );
    return res.data;
  },
};
