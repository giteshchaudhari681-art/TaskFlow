import { UserRole } from './domain.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface UserOrgMembership {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: UserRole;
  joinedAt: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
  defaultOrganization?: {
    id: string;
    name: string;
    slug: string;
    role: UserRole;
  };
}

export interface CurrentUserResponse {
  user: AuthUser;
  organizations: UserOrgMembership[];
}

export interface JwtUserClaims {
  sub: string;
  email: string;
  defaultOrgId?: string;
  iat?: number;
  exp?: number;
}
