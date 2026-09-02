import { OrganizationMember, UserRole } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export class OrganizationRepository extends BaseRepository {
  async findMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    return this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async getUserMemberships(userId: string) {
    return this.db.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async findProjectMember(projectId: string, userId: string) {
    return this.db.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.db.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });
  }

  async update(id: string, data: { name?: string; logoUrl?: string | null }) {
    return this.db.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
      },
    });
  }

  async listMembers(organizationId: string) {
    return this.db.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(organizationId: string, userId: string, role: UserRole) {
    return this.db.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async countOwners(organizationId: string): Promise<number> {
    return this.db.organizationMember.count({
      where: {
        organizationId,
        role: UserRole.OWNER,
      },
    });
  }

  async removeMember(organizationId: string, userId: string) {
    return this.db.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async addMember(organizationId: string, userId: string, role: UserRole) {
    return this.db.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}

export const organizationRepository = new OrganizationRepository();
