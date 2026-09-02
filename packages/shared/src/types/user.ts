export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  organizationCount: number;
}

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
