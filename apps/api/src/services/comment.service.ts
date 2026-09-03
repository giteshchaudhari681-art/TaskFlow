import { UserRole, ProjectRole, ActivityActionType } from '@prisma/client';
import { commentRepository } from '../repositories/comment.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import { CommentItem } from '@taskflow/shared';

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

export class CommentService {
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

    if (orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN) {
      return { project, rank: RANK_SUPER, role: 'SUPER_ORG_ADMIN' as const };
    }

    const projMember = await projectRepository.findMember(projectId, actorUserId);
    if (!projMember) {
      throw new AppError('NOT_PROJECT_MEMBER', 'User is not a member of this project', 403);
    }

    return {
      project,
      rank: getRankForRole(projMember.role),
      role: projMember.role,
    };
  }

  private async getTaskOrThrow(taskId: string, projectId: string) {
    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }
    return task;
  }

  private formatComment(c: {
    id: string;
    taskId: string | null;
    authorId: string | null;
    content: string;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    author: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    } | null;
  }): CommentItem {
    const isDeleted = c.deletedAt !== null;
    return {
      id: c.id,
      taskId: c.taskId!,
      authorId: c.authorId,
      content: isDeleted ? 'This comment was deleted.' : c.content,
      isDeleted,
      deletedAt: c.deletedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: c.author,
    };
  }

  async createComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string,
    data: { content: string }
  ): Promise<CommentItem> {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot create comments', 403);
    }

    const task = await this.getTaskOrThrow(taskId, projectId);

    const comment = await commentRepository.create({
      taskId,
      authorId: actorUserId,
      content: data.content,
    });

    // Record activity
    await activityRepository.create({
      projectId,
      taskId,
      actorId: actorUserId,
      actionType: ActivityActionType.COMMENT_CREATED,
      metadata: {
        commentId: comment.id,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        taskTitle: task.title,
      },
    });

    return this.formatComment(comment);
  }

  async listComments(
    organizationId: string,
    projectId: string,
    taskId: string,
    actorUserId: string
  ): Promise<CommentItem[]> {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    await this.getTaskOrThrow(taskId, projectId);

    const comments = await commentRepository.listByTask(taskId);
    return comments.map(c => this.formatComment(c));
  }

  async updateComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    actorUserId: string,
    data: { content: string }
  ): Promise<CommentItem> {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    await this.getTaskOrThrow(taskId, projectId);

    const comment = await commentRepository.findById(commentId, taskId);
    if (!comment) {
      throw new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404);
    }

    if (comment.deletedAt !== null) {
      throw new AppError('COMMENT_DELETED', 'Cannot edit a deleted comment', 400);
    }

    // Only the original author can edit their comment
    if (comment.authorId !== actorUserId) {
      throw new AppError('FORBIDDEN_COMMENT_EDIT', 'You can only edit your own comments', 403);
    }

    if (rank < RANK_MEMBER) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot edit comments', 403);
    }

    const updated = await commentRepository.update(commentId, data.content);
    return this.formatComment(updated);
  }

  async deleteComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    actorUserId: string
  ): Promise<{ success: boolean; commentId: string; isDeleted: boolean }> {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    const task = await this.getTaskOrThrow(taskId, projectId);

    const comment = await commentRepository.findById(commentId, taskId);
    if (!comment) {
      throw new AppError('COMMENT_NOT_FOUND', 'Comment not found', 404);
    }

    // If already deleted, idempotent success
    if (comment.deletedAt !== null) {
      return { success: true, commentId, isDeleted: true };
    }

    // Author can delete, or project Admin/Lead/Org Admin can moderate
    const isAuthor = comment.authorId === actorUserId;
    const canModerate = rank >= RANK_ADMIN;

    if (!isAuthor && !canModerate) {
      throw new AppError('FORBIDDEN_COMMENT_DELETE', 'You can only delete your own comments', 403);
    }

    if (rank < RANK_MEMBER && !canModerate) {
      throw new AppError('INSUFFICIENT_PERMISSIONS', 'Viewers cannot delete comments', 403);
    }

    await commentRepository.softDelete(commentId);

    // Record activity
    await activityRepository.create({
      projectId,
      taskId,
      actorId: actorUserId,
      actionType: ActivityActionType.COMMENT_DELETED,
      metadata: {
        commentId,
        taskNumber: task.taskNumber,
        issueKey: task.issueKey,
        taskTitle: task.title,
      },
    });

    return { success: true, commentId, isDeleted: true };
  }
}

export const commentService = new CommentService();
