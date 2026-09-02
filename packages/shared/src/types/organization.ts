import { UserRole } from './domain.js';

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: UserRole;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface OrganizationMemberItem {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface UpdateOrganizationPayload {
  name?: string;
  logoUrl?: string | null;
}

export interface AddMemberPayload {
  email: string;
  role: UserRole;
}

export interface UpdateMemberRolePayload {
  role: UserRole;
}
