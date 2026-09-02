import { UserRole, ProjectRole } from '@taskflow/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
      orgMember?: {
        id: string;
        organizationId: string;
        userId: string;
        role: UserRole;
      };
      projectMember?: {
        id: string;
        projectId: string;
        userId: string;
        role: ProjectRole;
      };
    }
  }
}

export {};
