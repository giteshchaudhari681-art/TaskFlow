import { UserRole, ProjectRole, DependencyType, ActivityActionType } from '@taskflow/shared';
import { DependencyRepository } from '../repositories/dependency.repository.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { ProjectRepository } from '../repositories/project.repository.js';
import { OrganizationRepository } from '../repositories/organization.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { notificationService } from './notification.service.js';
import { AppError } from '../middleware/errorHandler.js';

const dependencyRepository = new DependencyRepository();
const taskRepository = new TaskRepository();
const projectRepository = new ProjectRepository();
const organizationRepository = new OrganizationRepository();

const RANK_VIEWER = 10;
const RANK_MEMBER = 20;
const RANK_ADMIN = 30;
const RANK_LEAD = 40;
const RANK_SUPER = 50;

const ROLE_RANKS: Record<string, number> = {
  [ProjectRole.VIEWER]: RANK_VIEWER,
  [ProjectRole.MEMBER]: RANK_MEMBER,
  [ProjectRole.ADMIN]: RANK_ADMIN,
  [ProjectRole.LEAD]: RANK_LEAD,
};

export class DependencyService {
  /**
   * Verifies that the project exists, belongs to the specified organization,
   * and that the actor has appropriate project-level authorization.
   */
  private async getActorProjectPermissions(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ) {
    const project = await projectRepository.findById(projectId, organizationId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', 'Project not found in this organization', 404);
    }

    // Check organization membership
    const orgMember = await organizationRepository.findMember(organizationId, actorUserId);
    if (!orgMember) {
      throw new AppError(
        'NOT_ORGANIZATION_MEMBER',
        'User is not a member of this organization',
        403
      );
    }

    // Org OWNER / ADMIN enjoy super-admin privileges over all projects
    if (orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN) {
      return {
        project,
        role: 'SUPER_ORG_ADMIN' as const,
        rank: RANK_SUPER,
      };
    }

    // Otherwise, must be an explicit project member
    const projMember = await projectRepository.findMember(projectId, actorUserId);
    if (!projMember) {
      throw new AppError('NOT_PROJECT_MEMBER', 'User is not a member of this project', 403);
    }

    return {
      project,
      role: projMember.role,
      rank: ROLE_RANKS[projMember.role] ?? RANK_VIEWER,
    };
  }

  /**
   * Get all dependencies for a specific task, categorized into blockedBy, blocks, and related.
   */
  async getTaskDependencies(
    actorUserId: string,
    organizationId: string,
    projectId: string,
    taskId: string
  ) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const dependencies = await dependencyRepository.findByTaskId(taskId, projectId);

    const blockedBy = [];
    const blocks = [];
    const related = [];

    for (const dep of dependencies) {
      if (dep.type === DependencyType.BLOCKS) {
        if (dep.successorId === taskId) {
          // This task is blocked by predecessor
          blockedBy.push({
            id: dep.id,
            type: DependencyType.BLOCKED_BY,
            direction: 'INCOMING' as const,
            task: {
              id: dep.predecessor.id,
              taskNumber: dep.predecessor.taskNumber,
              issueKey:
                dep.predecessor.issueKey ??
                `${task.project?.key || 'TASK'}-${dep.predecessor.taskNumber}`,
              title: dep.predecessor.title,
              status: dep.predecessor.status,
              priority: dep.predecessor.priority,
              assignee: dep.predecessor.assignee,
              dueDate: dep.predecessor.dueDate?.toISOString() ?? null,
            },
            createdAt: dep.createdAt.toISOString(),
          });
        } else if (dep.predecessorId === taskId) {
          // This task blocks successor
          blocks.push({
            id: dep.id,
            type: DependencyType.BLOCKS,
            direction: 'OUTGOING' as const,
            task: {
              id: dep.successor.id,
              taskNumber: dep.successor.taskNumber,
              issueKey:
                dep.successor.issueKey ??
                `${task.project?.key || 'TASK'}-${dep.successor.taskNumber}`,
              title: dep.successor.title,
              status: dep.successor.status,
              priority: dep.successor.priority,
              assignee: dep.successor.assignee,
              dueDate: dep.successor.dueDate?.toISOString() ?? null,
            },
            createdAt: dep.createdAt.toISOString(),
          });
        }
      } else if (dep.type === DependencyType.RELATES_TO) {
        const otherTask = dep.predecessorId === taskId ? dep.successor : dep.predecessor;
        related.push({
          id: dep.id,
          type: DependencyType.RELATES_TO,
          direction: 'MUTUAL' as const,
          task: {
            id: otherTask.id,
            taskNumber: otherTask.taskNumber,
            issueKey:
              otherTask.issueKey ?? `${task.project?.key || 'TASK'}-${otherTask.taskNumber}`,
            title: otherTask.title,
            status: otherTask.status,
            priority: otherTask.priority,
            assignee: otherTask.assignee,
            dueDate: otherTask.dueDate?.toISOString() ?? null,
          },
          createdAt: dep.createdAt.toISOString(),
        });
      }
    }

    const hasUnresolvedBlockers = blockedBy.some(
      item => item.task.status !== 'DONE' && item.task.status !== 'CANCELLED'
    );

    return {
      blockedBy,
      blocks,
      related,
      totalCount: blockedBy.length + blocks.length + related.length,
      hasUnresolvedBlockers,
    };
  }

  /**
   * Create a dependency between two tasks in the same project.
   * Performs validation, canonical normalization, and deterministic cycle detection.
   */
  async createDependency(
    actorUserId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    payload: { targetTaskId: string; type: DependencyType }
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    if (rank < RANK_MEMBER) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Project Viewers cannot create task dependencies',
        403
      );
    }

    // Prevent self-dependency
    if (taskId === payload.targetTaskId) {
      throw new AppError('SELF_DEPENDENCY', 'A task cannot depend on itself', 400);
    }

    // Verify source task exists in the project
    const sourceTask = await taskRepository.findById(taskId, projectId);
    if (!sourceTask) {
      throw new AppError('TASK_NOT_FOUND', 'Source task not found in this project', 404);
    }

    // Verify target task exists in the same project
    const targetTask = await taskRepository.findById(payload.targetTaskId, projectId);
    if (!targetTask) {
      throw new AppError('TARGET_TASK_NOT_FOUND', 'Target task not found in this project', 404);
    }

    // Canonical representation normalization:
    // BLOCKS: predecessorId blocks successorId
    // BLOCKED_BY: targetTaskId blocks taskId
    // RELATES_TO: undirected; ordered lexicographically (min, max)
    let predecessorId: string;
    let successorId: string;
    let canonicalType: 'BLOCKS' | 'RELATES_TO';

    if (payload.type === DependencyType.BLOCKS) {
      predecessorId = taskId;
      successorId = payload.targetTaskId;
      canonicalType = 'BLOCKS';
    } else if (payload.type === DependencyType.BLOCKED_BY) {
      predecessorId = payload.targetTaskId;
      successorId = taskId;
      canonicalType = 'BLOCKS';
    } else if (payload.type === DependencyType.RELATES_TO) {
      if (taskId < payload.targetTaskId) {
        predecessorId = taskId;
        successorId = payload.targetTaskId;
      } else {
        predecessorId = payload.targetTaskId;
        successorId = taskId;
      }
      canonicalType = 'RELATES_TO';
    } else {
      throw new AppError('INVALID_DEPENDENCY_TYPE', 'Invalid dependency type provided', 400);
    }

    // Check for duplicate dependency
    const existing = await dependencyRepository.findExisting(predecessorId, successorId);
    if (existing) {
      throw new AppError(
        'DUPLICATE_DEPENDENCY',
        'This dependency relationship already exists between the tasks',
        409
      );
    }

    // If type is BLOCKS: run deterministic BFS cycle detection
    if (canonicalType === 'BLOCKS') {
      // 1. Direct reverse check: Does successor already block predecessor?
      const reverse = await dependencyRepository.findExisting(successorId, predecessorId);
      if (reverse && reverse.type === DependencyType.BLOCKS) {
        throw new AppError(
          'DEPENDENCY_CYCLE_DETECTED',
          'Creating this dependency would create a direct circular dependency loop',
          400
        );
      }

      // 2. Transitive cycle detection: Can successor reach predecessor through BLOCKS edges?
      const allBlockingEdges =
        await dependencyRepository.findBlockingDependenciesInProject(projectId);

      const adj = new Map<string, string[]>();
      for (const edge of allBlockingEdges) {
        const list = adj.get(edge.predecessorId) || [];
        list.push(edge.successorId);
        adj.set(edge.predecessorId, list);
      }

      // BFS from successorId
      const queue = [successorId];
      const visited = new Set<string>([successorId]);
      let cycleDetected = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr === predecessorId) {
          cycleDetected = true;
          break;
        }

        const neighbors = adj.get(curr) || [];
        for (const next of neighbors) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }

      if (cycleDetected) {
        throw new AppError(
          'DEPENDENCY_CYCLE_DETECTED',
          'Creating this dependency would create a circular dependency loop in the project',
          400
        );
      }
    }

    // Persist dependency
    try {
      const created = await dependencyRepository.create({
        projectId,
        predecessorId,
        successorId,
        type: canonicalType === 'BLOCKS' ? DependencyType.BLOCKS : DependencyType.RELATES_TO,
      });

      // Record activity
      await activityRepository.create({
        projectId,
        taskId,
        actorId: actorUserId,
        actionType: ActivityActionType.TASK_DEPENDENCY_ADDED,
        metadata: {
          dependencyId: created.id,
          dependencyType: created.type,
          predecessorId,
          successorId,
          sourceTaskNumber: sourceTask.taskNumber,
          sourceIssueKey: sourceTask.issueKey,
          targetTaskNumber: targetTask.taskNumber,
          targetIssueKey: targetTask.issueKey,
          targetTaskTitle: targetTask.title,
        },
      });

      // Notify assignee of the successor (blocked) task if this is a BLOCKS dependency
      if (created.type === DependencyType.BLOCKS) {
        await notificationService.notifyDependencyAdded({
          projectId,
          predecessorId,
          successorId,
          actorId: actorUserId,
        });
      }

      return {
        id: created.id,
        projectId: created.projectId,
        predecessorId: created.predecessorId,
        successorId: created.successorId,
        type: created.type,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new AppError(
          'DUPLICATE_DEPENDENCY',
          'This dependency relationship already exists between the tasks',
          409
        );
      }
      throw err;
    }
  }

  /**
   * Delete a dependency relationship.
   */
  async deleteDependency(
    actorUserId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    dependencyId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    if (rank < RANK_MEMBER) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Project Viewers cannot delete task dependencies',
        403
      );
    }

    const dependency = await dependencyRepository.findById(dependencyId, projectId);
    if (!dependency) {
      throw new AppError('DEPENDENCY_NOT_FOUND', 'Dependency relationship not found', 404);
    }

    // Verify this dependency belongs to the current task context
    if (dependency.predecessorId !== taskId && dependency.successorId !== taskId) {
      throw new AppError(
        'DEPENDENCY_NOT_FOUND',
        'Dependency does not belong to the specified task',
        404
      );
    }

    await dependencyRepository.delete(dependencyId, projectId);

    // Record activity
    await activityRepository.create({
      projectId,
      taskId,
      actorId: actorUserId,
      actionType: ActivityActionType.TASK_DEPENDENCY_REMOVED,
      metadata: {
        dependencyId,
        dependencyType: dependency.type,
      },
    });

    return { success: true };
  }

  /**
   * Returns the complete dependency graph for a project for visual rendering.
   */
  async getProjectDependencyGraph(actorUserId: string, organizationId: string, projectId: string) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    const tasks = await taskRepository.listByProject(projectId);
    const dependencies = await dependencyRepository.findByProject(projectId);

    // Compute incoming/outgoing counts
    const blockedByCounts = new Map<string, number>();
    const blockingCounts = new Map<string, number>();

    for (const dep of dependencies) {
      if (dep.type === DependencyType.BLOCKS) {
        blockingCounts.set(dep.predecessorId, (blockingCounts.get(dep.predecessorId) || 0) + 1);
        blockedByCounts.set(dep.successorId, (blockedByCounts.get(dep.successorId) || 0) + 1);
      }
    }

    const nodes = tasks.map(t => ({
      id: t.id,
      taskNumber: t.taskNumber,
      issueKey: t.issueKey,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
      blockedByCount: blockedByCounts.get(t.id) || 0,
      blockingCount: blockingCounts.get(t.id) || 0,
    }));

    const edges = dependencies.map(dep => ({
      id: dep.id,
      source: dep.predecessorId,
      target: dep.successorId,
      type: dep.type === DependencyType.BLOCKS ? ('BLOCKS' as const) : ('RELATES_TO' as const),
    }));

    return {
      nodes,
      edges,
    };
  }
}
