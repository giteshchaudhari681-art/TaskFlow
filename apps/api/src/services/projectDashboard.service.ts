import {
  ProjectDashboardResponse,
  ProjectRiskItem,
  DashboardTaskItem,
  DashboardMilestoneItem,
  DashboardActivityItem,
  TaskDistribution,
  PriorityDistribution,
  ProjectDetail,
  ProjectRole,
  ProjectStatus as SharedProjectStatus,
  TaskStatus as SharedTaskStatus,
  TaskPriority as SharedTaskPriority,
  MilestoneStatus as SharedMilestoneStatus,
  MilestoneHealth,
  RiskSeverity,
} from '@taskflow/shared';
import { TaskStatus, TaskPriority, MilestoneStatus, UserRole } from '@prisma/client';
import { projectDashboardRepository } from '../repositories/projectDashboard.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import { calculateCanonicalCompletion, evaluateProjectHealth } from './projectHealth.rules.js';

export class ProjectDashboardService {
  /**
   * Helper to verify organization membership and resolve permissions.
   */
  private async checkProjectAccess(
    organizationId: string,
    projectId: string,
    userId: string
  ): Promise<{ orgRole: UserRole; projectRole?: ProjectRole }> {
    const orgMember = await organizationRepository.findMember(organizationId, userId);
    if (!orgMember) {
      throw new AppError('FORBIDDEN', 'User does not belong to this organization', 403);
    }

    const project = await projectRepository.findById(projectId);
    if (!project || project.organizationId !== organizationId) {
      throw new AppError('NOT_FOUND', 'Project not found in this organization', 404);
    }

    const isOrgAdmin = orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN;
    const projectMember = await projectRepository.findMember(projectId, userId);

    if (!isOrgAdmin && !projectMember) {
      throw new AppError('FORBIDDEN', 'User is not a member of this project', 403);
    }

    return {
      orgRole: orgMember.role,
      projectRole: projectMember ? (projectMember.role as ProjectRole) : undefined,
    };
  }

  /**
   * Generates full Project Dashboard 2.0 payload.
   */
  async getDashboard(
    organizationId: string,
    projectId: string,
    userId: string
  ): Promise<ProjectDashboardResponse> {
    const { projectRole } = await this.checkProjectAccess(organizationId, projectId, userId);

    const data = await projectDashboardRepository.getProjectDashboardData(projectId);
    if (!data.project) {
      throw new AppError('NOT_FOUND', 'Project not found', 404);
    }

    const rawProject = data.project;
    const rawTasks = data.tasks;
    const rawMilestones = data.milestones;
    const rawActivities = data.activities;

    // Time boundaries for overdue calculation
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Task Distribution Initialization
    const taskDistribution: TaskDistribution = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      BLOCKED: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    // 2. Priority Distribution Initialization
    const priorityDistribution: PriorityDistribution = {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      NONE: 0,
    };

    const overdueTasks: DashboardTaskItem[] = [];
    const blockedTasks: DashboardTaskItem[] = [];
    let urgentOverdueTasksCount = 0;

    // Process tasks
    rawTasks.forEach(task => {
      // Accumulate task status count
      if (task.status in taskDistribution) {
        taskDistribution[task.status as unknown as SharedTaskStatus]++;
      }

      // Accumulate priority count
      if (task.priority in priorityDistribution) {
        priorityDistribution[task.priority as unknown as SharedTaskPriority]++;
      }

      // Evaluate blocker dependencies without mutating task status
      const blockingDeps = (task.dependenciesAsSuccessor || [])
        .filter(dep => {
          const pred = dep.predecessor;
          return pred && pred.status !== TaskStatus.DONE && pred.status !== TaskStatus.CANCELLED;
        })
        .map(dep => ({
          id: dep.predecessor.id,
          issueKey: dep.predecessor.issueKey,
          title: dep.predecessor.title,
          status: dep.predecessor.status as unknown as SharedTaskStatus,
        }));

      const isBlocked = blockingDeps.length > 0;

      // Check if overdue (only for open tasks)
      const isClosed = task.status === TaskStatus.DONE || task.status === TaskStatus.CANCELLED;
      const isOverdue = Boolean(!isClosed && task.dueDate && new Date(task.dueDate) < startOfToday);

      const dashboardItem: DashboardTaskItem = {
        id: task.id,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        title: task.title,
        status: task.status as unknown as SharedTaskStatus,
        priority: task.priority as unknown as SharedTaskPriority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        assignee: task.assignee
          ? {
              id: task.assignee.id,
              name: task.assignee.name,
              email: task.assignee.email,
              avatarUrl: task.assignee.avatarUrl,
            }
          : null,
        isBlocked,
        blockingDependencies: blockingDeps,
      };

      if (isOverdue) {
        overdueTasks.push(dashboardItem);
        if (task.priority === TaskPriority.URGENT || task.priority === TaskPriority.HIGH) {
          urgentOverdueTasksCount++;
        }
      }

      if (isBlocked) {
        blockedTasks.push(dashboardItem);
      }

      return dashboardItem;
    });

    // 3. Compute Metrics
    const totalTasks = rawTasks.length;
    const completedTasks = taskDistribution.DONE;
    const cancelledTasks = taskDistribution.CANCELLED;
    const inProgressTasks = taskDistribution.IN_PROGRESS + taskDistribution.IN_REVIEW;
    const completionPercentage = calculateCanonicalCompletion(
      completedTasks,
      totalTasks,
      cancelledTasks
    );

    // 4. Process Milestones & compute health
    let atRiskMilestonesCount = 0;
    let overdueMilestonesCount = 0;
    let completedMilestonesCount = 0;

    const msInDay = 1000 * 60 * 60 * 24;

    const milestones: DashboardMilestoneItem[] = rawMilestones.map(m => {
      const msTasks = m.tasks || [];
      const msTotal = msTasks.length;
      const msCancelled = msTasks.filter(t => t.status === TaskStatus.CANCELLED).length;
      const msDone = msTasks.filter(t => t.status === TaskStatus.DONE).length;
      const progress = calculateCanonicalCompletion(msDone, msTotal, msCancelled);

      if (m.status === MilestoneStatus.COMPLETED) {
        completedMilestonesCount++;
      }

      // Canonical Milestone Health computation
      let health: MilestoneHealth = MilestoneHealth.ON_TRACK;
      if (m.status === MilestoneStatus.COMPLETED) {
        health = MilestoneHealth.COMPLETED;
      } else if (!m.dueDate) {
        health = MilestoneHealth.NO_DATE;
      } else {
        const dueDate = new Date(m.dueDate);
        if (now > dueDate && m.status !== MilestoneStatus.CLOSED) {
          health = MilestoneHealth.OVERDUE;
          overdueMilestonesCount++;
        } else {
          const daysUntilDue = (dueDate.getTime() - now.getTime()) / msInDay;
          if (daysUntilDue <= 3 && progress < 75) {
            health = MilestoneHealth.AT_RISK;
            atRiskMilestonesCount++;
          }
        }
      }

      return {
        id: m.id,
        title: m.title,
        status: m.status as unknown as SharedMilestoneStatus,
        dueDate: m.dueDate ? m.dueDate.toISOString() : null,
        progress,
        health,
        taskCount: msTotal,
        completedTaskCount: msDone,
      };
    });

    // 5. Evaluate Project Health Signals & Summary
    const signals = {
      overdueTasks: overdueTasks.length,
      urgentOverdueTasks: urgentOverdueTasksCount,
      blockedTasks: blockedTasks.length,
      atRiskMilestones: atRiskMilestonesCount,
      overdueMilestones: overdueMilestonesCount,
      completionPercentage,
    };

    const eligibleTasksCount = totalTasks - cancelledTasks;
    const healthSummary = evaluateProjectHealth(
      signals,
      totalTasks,
      eligibleTasksCount,
      rawMilestones.length
    );

    // 6. Delivery Risk Engine (Deduplication & Deterministic Ordering)
    const risks: ProjectRiskItem[] = [];

    // Risk: Urgent Overdue Tasks
    for (const task of overdueTasks) {
      if (task.priority === 'URGENT' || task.priority === 'HIGH') {
        risks.push({
          id: `risk-task-urgent-overdue-${task.id}`,
          type: 'URGENT_OVERDUE_WORK',
          severity: 'CRITICAL',
          title: `Urgent Work Overdue: ${task.issueKey || task.title}`,
          explanation: `Task "${task.title}" is ${task.priority.toLowerCase()} priority and passed its due date on ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}.`,
          entityType: 'task',
          entityId: task.id,
          entityKey: task.issueKey || undefined,
          actionLabel: 'View Task',
        });
      }
    }

    // Risk: Overdue Milestones
    for (const ms of milestones) {
      if (ms.health === MilestoneHealth.OVERDUE) {
        risks.push({
          id: `risk-milestone-overdue-${ms.id}`,
          type: 'MILESTONE_OVERDUE',
          severity: 'CRITICAL',
          title: `Milestone Overdue: ${ms.title}`,
          explanation: `Milestone missed its deadline on ${ms.dueDate ? new Date(ms.dueDate).toLocaleDateString() : 'N/A'} with only ${ms.progress}% completed (${ms.taskCount - ms.completedTaskCount} tasks remaining).`,
          entityType: 'milestone',
          entityId: ms.id,
          actionLabel: 'View Milestone',
        });
      }
    }

    // Risk: Dependency Blockers
    if (blockedTasks.length >= 3) {
      risks.push({
        id: `risk-blockers-cluster-${projectId}`,
        type: 'CLUSTER_DEPENDENCY_BLOCKERS',
        severity: 'CRITICAL',
        title: `${blockedTasks.length} Unresolved Dependency Blockers`,
        explanation: `Multiple tasks are currently blocked by upstream predecessor dependencies, stalling downstream progress.`,
        entityType: 'dependency',
        actionLabel: 'Inspect Dependencies',
      });
    } else {
      for (const task of blockedTasks) {
        const pred = task.blockingDependencies[0];
        risks.push({
          id: `risk-task-blocked-${task.id}`,
          type: 'UNRESOLVED_BLOCKER',
          severity: 'HIGH',
          title: `Task Blocked: ${task.issueKey || task.title}`,
          explanation: `Task is blocked by predecessor "${pred ? pred.issueKey || pred.title : 'upstream task'}" which is in ${pred?.status || 'open'} status.`,
          entityType: 'task',
          entityId: task.id,
          entityKey: task.issueKey || undefined,
          actionLabel: 'View Task',
        });
      }
    }

    // Risk: Milestones At Risk
    for (const ms of milestones) {
      if (ms.health === MilestoneHealth.AT_RISK) {
        risks.push({
          id: `risk-milestone-at-risk-${ms.id}`,
          type: 'MILESTONE_AT_RISK',
          severity: 'HIGH',
          title: `Milestone at Risk: ${ms.title}`,
          explanation: `Due within 3 days with only ${ms.progress}% completed. High risk of missing delivery milestone.`,
          entityType: 'milestone',
          entityId: ms.id,
          actionLabel: 'View Milestone',
        });
      }
    }

    // Risk: Standard Overdue Tasks (only if not already listed under urgent)
    for (const task of overdueTasks) {
      if (task.priority !== 'URGENT' && task.priority !== 'HIGH') {
        risks.push({
          id: `risk-task-overdue-${task.id}`,
          type: 'OVERDUE_WORK',
          severity: 'MEDIUM',
          title: `Overdue Task: ${task.issueKey || task.title}`,
          explanation: `Task "${task.title}" passed its deadline on ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}.`,
          entityType: 'task',
          entityId: task.id,
          entityKey: task.issueKey || undefined,
          actionLabel: 'View Task',
        });
      }
    }

    // Sort risks deterministically: CRITICAL > HIGH > MEDIUM > LOW, then by title, then by id
    const severityWeight: Record<RiskSeverity, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    risks.sort((a, b) => {
      const diff = severityWeight[b.severity] - severityWeight[a.severity];
      if (diff !== 0) return diff;
      const titleDiff = a.title.localeCompare(b.title);
      if (titleDiff !== 0) return titleDiff;
      return a.id.localeCompare(b.id);
    });

    // 7. Format Recent Activities
    const recentActivity: DashboardActivityItem[] = rawActivities.map(act => ({
      id: act.id,
      actionType: act.actionType,
      createdAt: act.createdAt.toISOString(),
      actor: act.actor
        ? {
            id: act.actor.id,
            name: act.actor.name,
            avatarUrl: act.actor.avatarUrl,
          }
        : null,
      task: act.task
        ? {
            id: act.task.id,
            issueKey: act.task.issueKey,
            title: act.task.title,
          }
        : null,
      fieldChanged: act.fieldChanged,
      oldValue: act.oldValue,
      newValue: act.newValue,
    }));

    // 8. Construct ProjectDetail DTO
    const projectDetail: ProjectDetail = {
      id: rawProject.id,
      organizationId: rawProject.organizationId,
      name: rawProject.name,
      key: rawProject.key,
      description: rawProject.description,
      status: rawProject.status as unknown as SharedProjectStatus,
      color: rawProject.color,
      icon: rawProject.icon,
      archivedAt: rawProject.archivedAt ? rawProject.archivedAt.toISOString() : null,
      createdAt: rawProject.createdAt.toISOString(),
      updatedAt: rawProject.updatedAt.toISOString(),
      memberCount: rawProject._count.members,
      userRole: projectRole,
      members: rawProject.members.map(m => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role as ProjectRole,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
        },
      })),
    };

    return {
      project: projectDetail,
      health: {
        state: healthSummary.state,
        score: healthSummary.score,
        executiveSummary: healthSummary.executiveSummary,
        reasons: healthSummary.reasons,
        signals,
      },
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks: overdueTasks.length,
        blockedTasks: blockedTasks.length,
        completionPercentage,
        totalMilestones: rawMilestones.length,
        completedMilestones: completedMilestonesCount,
      },
      taskDistribution,
      priorityDistribution,
      risks,
      overdueTasks: overdueTasks.slice(0, 10),
      blockedTasks: blockedTasks.slice(0, 10),
      milestones: milestones.slice(0, 8),
      recentActivity,
    };
  }
}

export const projectDashboardService = new ProjectDashboardService();
