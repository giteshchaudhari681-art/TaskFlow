import { BaseRepository } from './base.repository.js';

export class SearchRepository extends BaseRepository {
  /**
   * Search projects within organization that the user is permitted to see.
   */
  async searchProjects(
    organizationId: string,
    accessibleProjectIds: string[] | 'ALL',
    query: string,
    limit: number
  ) {
    const where: any = {
      organizationId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { key: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (accessibleProjectIds !== 'ALL') {
      where.id = { in: accessibleProjectIds };
    }

    return this.db.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        status: true,
        color: true,
        icon: true,
        updatedAt: true,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Search tasks across accessible projects.
   */
  async searchTasks(accessibleProjectIds: string[], query: string, limit: number) {
    if (accessibleProjectIds.length === 0) return [];

    return this.db.task.findMany({
      where: {
        projectId: { in: accessibleProjectIds },
        archivedAt: null,
        OR: [
          { issueKey: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        taskNumber: true,
        issueKey: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Search milestones across accessible projects.
   */
  async searchMilestones(accessibleProjectIds: string[], query: string, limit: number) {
    if (accessibleProjectIds.length === 0) return [];

    return this.db.milestone.findMany({
      where: {
        projectId: { in: accessibleProjectIds },
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Search organization members.
   */
  async searchUsers(organizationId: string, query: string, limit: number) {
    return this.db.organizationMember.findMany({
      where: {
        organizationId,
        user: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      take: limit,
    });
  }

  /**
   * Search labels across accessible projects.
   */
  async searchLabels(accessibleProjectIds: string[], query: string, limit: number) {
    if (accessibleProjectIds.length === 0) return [];

    return this.db.label.findMany({
      where: {
        projectId: { in: accessibleProjectIds },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        color: true,
        description: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Count projects in organization accessible to user.
   */
  async countProjects(organizationId: string, accessibleProjectIds: string[] | 'ALL') {
    const where: any = { organizationId };
    if (accessibleProjectIds !== 'ALL') {
      where.id = { in: accessibleProjectIds };
    }
    return this.db.project.count({ where });
  }

  /**
   * Find project memberships for a specific user in an organization.
   */
  async findUserProjectMemberships(organizationId: string, userId: string) {
    return this.db.projectMember.findMany({
      where: {
        userId,
        project: {
          organizationId,
        },
      },
      select: {
        projectId: true,
      },
    });
  }

  /**
   * Find all project IDs belonging to an organization.
   */
  async findAllOrgProjectIds(organizationId: string): Promise<string[]> {
    const projects = await this.db.project.findMany({
      where: { organizationId },
      select: { id: true },
    });
    return projects.map(p => p.id);
  }
}

export const searchRepository = new SearchRepository();
