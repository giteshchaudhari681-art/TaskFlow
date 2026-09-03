import { BaseRepository } from './base.repository.js';

export class ProjectDashboardRepository extends BaseRepository {
  /**
   * Fetches all core project data required for the Dashboard 2.0 in a single batched operation.
   */
  async getProjectDashboardData(projectId: string) {
    const [project, tasks, milestones, activities] = await Promise.all([
      // 1. Project details & members
      this.db.project.findUnique({
        where: { id: projectId },
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
            select: {
              members: true,
              tasks: true,
            },
          },
        },
      }),

      // 2. All active tasks with blocker dependencies
      this.db.task.findMany({
        where: {
          projectId,
          archivedAt: null,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          dependenciesAsSuccessor: {
            where: {
              type: 'BLOCKS',
            },
            include: {
              predecessor: {
                select: {
                  id: true,
                  taskNumber: true,
                  issueKey: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      }),

      // 3. Milestones with aggregated task counts
      this.db.milestone.findMany({
        where: { projectId },
        include: {
          tasks: {
            where: { archivedAt: null },
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { dueDate: 'asc' }],
      }),

      // 4. Recent Project Activity Feed (last 10 items)
      this.db.activity.findMany({
        where: { projectId },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              taskNumber: true,
              issueKey: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      project,
      tasks,
      milestones,
      activities,
    };
  }
}

export const projectDashboardRepository = new ProjectDashboardRepository();
