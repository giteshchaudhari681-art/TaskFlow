import { MilestoneStatus, UserRole, ProjectRole, ActivityActionType } from '@prisma/client';
import { milestoneRepository } from '../repositories/milestone.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { notificationService } from './notification.service.js';
import { AppError } from '../middleware/errorHandler.js';

const RANK_SUPER = 5;
const RANK_LEAD = 4;
const RANK_ADMIN = 3;
const RANK_MEMBER = 2;
const RANK_VIEWER = 1;

const getRankForRole = (role: ProjectRole | 'SUPER_ORG_ADMIN'): number => {
  if (role === 'SUPER_ORG_ADMIN') return RANK_SUPER;
  if (role === ProjectRole.LEAD) return RANK_LEAD;
  if (role === ProjectRole.ADMIN) return RANK_ADMIN;
  if (role === ProjectRole.MEMBER) return RANK_MEMBER;
  if (role === ProjectRole.VIEWER) return RANK_VIEWER;
  return 0;
};

export class MilestoneService {
  /** Verify project belongs to org, and return actor's permission rank */
  private async getActorProjectPermissions(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ) {
    const project = await projectRepository.findById(projectId, organizationId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', 'Project not found in this organization', 404);
    }

    const orgMember = await organizationRepository.findMember(organizationId, actorUserId);
    if (!orgMember) {
      throw new AppError(
        'NOT_ORGANIZATION_MEMBER',
        'User is not a member of this organization',
        403
      );
    }

    // Org OWNER / ADMIN → super privileges
    if (orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN) {
      return { project, rank: RANK_SUPER, role: 'SUPER_ORG_ADMIN' as const };
    }

    const projectMember = await projectRepository.findMember(projectId, actorUserId);
    if (!projectMember) {
      throw new AppError('NOT_PROJECT_MEMBER', 'User is not a member of this project', 403);
    }

    const rank = getRankForRole(projectMember.role);
    return { project, rank, role: projectMember.role };
  }

  // -------------------------------------------------------
  // Create
  // -------------------------------------------------------

  async createMilestone(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    data: {
      title: string;
      description?: string | null;
      startDate?: string | null;
      dueDate?: string | null;
      status?: MilestoneStatus;
      displayOrder?: number;
    }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot create milestones', 403);
    }

    const milestone = await milestoneRepository.create(projectId, {
      title: data.title,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
      displayOrder: data.displayOrder,
    });

    // Record activity
    await activityRepository.create({
      projectId,
      actorId: actorUserId,
      actionType: ActivityActionType.MILESTONE_CREATED,
      metadata: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
      },
    });

    return milestone;
  }

  // -------------------------------------------------------
  // List
  // -------------------------------------------------------

  async listMilestones(organizationId: string, projectId: string, actorUserId: string) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    return milestoneRepository.findByProject(projectId);
  }

  // -------------------------------------------------------
  // Get one (detail with tasks)
  // -------------------------------------------------------

  async getMilestone(
    organizationId: string,
    projectId: string,
    milestoneId: string,
    actorUserId: string
  ) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    const milestone = await milestoneRepository.findById(milestoneId, projectId);
    if (!milestone) {
      throw new AppError('MILESTONE_NOT_FOUND', 'Milestone not found in this project', 404);
    }

    return milestone;
  }

  // -------------------------------------------------------
  // Update
  // -------------------------------------------------------

  async updateMilestone(
    organizationId: string,
    projectId: string,
    milestoneId: string,
    actorUserId: string,
    data: {
      title?: string;
      description?: string | null;
      startDate?: string | null;
      dueDate?: string | null;
      status?: MilestoneStatus;
      displayOrder?: number;
    }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot update milestones', 403);
    }

    const existing = await milestoneRepository.findById(milestoneId, projectId);
    if (!existing) {
      throw new AppError('MILESTONE_NOT_FOUND', 'Milestone not found in this project', 404);
    }

    // Validate date range with existing values
    const resolvedStart =
      data.startDate !== undefined
        ? data.startDate
          ? new Date(data.startDate)
          : null
        : existing.startDate
          ? new Date(existing.startDate)
          : null;
    const resolvedDue =
      data.dueDate !== undefined
        ? data.dueDate
          ? new Date(data.dueDate)
          : null
        : existing.dueDate
          ? new Date(existing.dueDate)
          : null;

    if (resolvedStart && resolvedDue && resolvedStart > resolvedDue) {
      throw new AppError(
        'INVALID_DATE_RANGE',
        'Milestone startDate must be on or before dueDate',
        400
      );
    }

    const updated = await milestoneRepository.update(milestoneId, projectId, {
      title: data.title,
      description: data.description,
      startDate:
        data.startDate !== undefined
          ? data.startDate
            ? new Date(data.startDate)
            : null
          : undefined,
      dueDate:
        data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      status: data.status,
      displayOrder: data.displayOrder,
    });

    // Record activity
    const actionType =
      data.status === MilestoneStatus.COMPLETED && existing.status !== MilestoneStatus.COMPLETED
        ? ActivityActionType.MILESTONE_COMPLETED
        : ActivityActionType.MILESTONE_UPDATED;

    await activityRepository.create({
      projectId,
      actorId: actorUserId,
      actionType,
      metadata: {
        milestoneId: updated.id,
        milestoneTitle: updated.title,
        fromStatus: existing.status,
        toStatus: updated.status,
      },
    });

    // If completed, notify assignees of tasks in this milestone
    if (
      data.status === MilestoneStatus.COMPLETED &&
      existing.status !== MilestoneStatus.COMPLETED
    ) {
      await notificationService.notifyMilestoneCompleted({
        projectId,
        milestoneId: updated.id,
        milestoneTitle: updated.title,
        actorId: actorUserId,
      });
    }

    return updated;
  }

  // -------------------------------------------------------
  // Delete — tasks are preserved via SetNull FK
  // -------------------------------------------------------

  async deleteMilestone(
    organizationId: string,
    projectId: string,
    milestoneId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot delete milestones', 403);
    }

    const existing = await milestoneRepository.findById(milestoneId, projectId);
    if (!existing) {
      throw new AppError('MILESTONE_NOT_FOUND', 'Milestone not found in this project', 404);
    }

    await milestoneRepository.delete(milestoneId, projectId);
    return { deleted: true, milestoneId };
  }

  // -------------------------------------------------------
  // Timeline data endpoint
  // -------------------------------------------------------

  async getProjectTimeline(organizationId: string, projectId: string, actorUserId: string) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    const milestones = await milestoneRepository.findByProject(projectId);

    // Compute timeline date range from milestone dates
    const dates: Date[] = [];
    for (const m of milestones) {
      if (m.startDate) dates.push(new Date(m.startDate));
      if (m.dueDate) dates.push(new Date(m.dueDate));
    }

    const today = new Date();
    const rangeStart =
      dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : today;
    const rangeEnd = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : today;

    return {
      projectId,
      milestones: milestones.map(m => ({
        id: m.id,
        title: m.title,
        startDate: m.startDate,
        dueDate: m.dueDate,
        status: m.status,
        progress: m.progress,
        health: m.health,
        taskCount: m.taskCount,
        completedTaskCount: m.completedTaskCount,
        displayOrder: m.displayOrder,
      })),
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
    };
  }
}

export const milestoneService = new MilestoneService();
