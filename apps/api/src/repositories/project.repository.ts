import { ProjectStatus, ProjectRole } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export class ProjectRepository extends BaseRepository {
  async create(
    organizationId: string,
    data: {
      name: string;
      key: string;
      description?: string | null;
      status?: ProjectStatus;
      color?: string | null;
      icon?: string | null;
    },
    creatorUserId: string
  ) {
    return this.db.$transaction(async tx => {
      const project = await tx.project.create({
        data: {
          organizationId,
          name: data.name,
          key: data.key,
          description: data.description ?? null,
          status: data.status ?? ProjectStatus.PLANNING,
          color: data.color ?? null,
          icon: data.icon ?? null,
        },
      });

      // Creator automatically becomes the initial project LEAD
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: creatorUserId,
          role: ProjectRole.LEAD,
        },
      });

      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          members: {
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
          },
          _count: {
            select: { members: true },
          },
        },
      });
    });
  }

  async listByOrganization(
    organizationId: string,
    filter?: {
      status?: ProjectStatus;
      search?: string;
    }
  ) {
    const where: any = { organizationId };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.search) {
      const s = filter.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { key: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    return this.db.project.findMany({
      where,
      include: {
        _count: {
          select: { members: true },
        },
        members: {
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
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string, organizationId?: string) {
    const where: any = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.db.project.findFirst({
      where,
      include: {
        _count: {
          select: { members: true },
        },
        members: {
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
        },
      },
    });
  }

  async findByKey(organizationId: string, key: string) {
    return this.db.project.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      status?: ProjectStatus;
      color?: string | null;
      icon?: string | null;
      archivedAt?: Date | null;
    }
  ) {
    return this.db.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.archivedAt !== undefined ? { archivedAt: data.archivedAt } : {}),
      },
      include: {
        _count: {
          select: { members: true },
        },
        members: {
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
        },
      },
    });
  }

  async archive(id: string) {
    return this.db.project.update({
      where: { id },
      data: {
        status: ProjectStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async unarchive(id: string) {
    return this.db.project.update({
      where: { id },
      data: {
        status: ProjectStatus.ACTIVE,
        archivedAt: null,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async listMembers(projectId: string) {
    return this.db.projectMember.findMany({
      where: { projectId },
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

  async findMember(projectId: string, userId: string) {
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

  async addMember(projectId: string, userId: string, role: ProjectRole) {
    return this.db.projectMember.create({
      data: {
        projectId,
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

  async updateMemberRole(projectId: string, userId: string, role: ProjectRole) {
    return this.db.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
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

  async removeMember(projectId: string, userId: string) {
    return this.db.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }

  async countLeads(projectId: string): Promise<number> {
    return this.db.projectMember.count({
      where: {
        projectId,
        role: ProjectRole.LEAD,
      },
    });
  }
}

export const projectRepository = new ProjectRepository();
