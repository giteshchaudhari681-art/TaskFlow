import { ProjectRole, ProjectStatus } from './domain.js';

export interface ProjectMemberDetail {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface ProjectDetail {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  members?: ProjectMemberDetail[];
  userRole?: ProjectRole;
}

export interface ProjectListItem {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  userRole?: ProjectRole;
}

export interface CreateProjectPayload {
  name: string;
  key: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  color?: string | null;
  icon?: string | null;
}

export interface AddProjectMemberPayload {
  userId: string;
  role?: ProjectRole;
}

export interface UpdateProjectMemberPayload {
  role: ProjectRole;
}
