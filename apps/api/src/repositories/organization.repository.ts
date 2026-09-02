import { OrganizationMember } from '@prisma/client';
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
}

export const organizationRepository = new OrganizationRepository();
