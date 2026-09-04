import { ProjectRole, UserRole, AuditAction, ActorType, AuditSource } from '@prisma/client';
import { organizationRepository } from '../repositories/organization.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { aiContextBuilder } from './aiContext.builder.js';
import { aiClient, type IAIClient } from '../integrations/ai/aiClient.js';
import { auditService } from './audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AIOperation, AIAnalysisResponse } from '@taskflow/shared';

export class AIService {
  constructor(private readonly client: IAIClient = aiClient) {}

  /**
   * Helper to verify organization membership, tenant isolation, and project RBAC.
   */
  private async checkProjectAccess(
    organizationId: string,
    projectId: string,
    userId: string
  ): Promise<void> {
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

    // Role check: Viewers cannot trigger AI operations
    if (!isOrgAdmin && projectMember?.role === ProjectRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN',
        'Project viewers are not authorized to run AI analysis operations',
        403
      );
    }
  }

  /**
   * Authorizes caller, aggregates project or task context, and dispatches to Python AI service.
   */
  async analyzeProject(
    organizationId: string,
    projectId: string,
    userId: string,
    operation: AIOperation,
    userPrompt?: string,
    requestId?: string,
    taskId?: string
  ): Promise<AIAnalysisResponse> {
    // 1. Authorize tenant, project, and RBAC boundary
    await this.checkProjectAccess(organizationId, projectId, userId);

    // 2. Build sanitized, deterministic AI context from Prisma
    let context;
    if (
      (operation === 'TASK_SUMMARY' ||
        operation === 'TASK_DECOMPOSITION' ||
        operation === 'TASK_ACTIONS') &&
      taskId
    ) {
      const task = await taskRepository.findById(taskId, projectId);
      if (!task) {
        throw new AppError('NOT_FOUND', 'Task not found in this project', 404);
      }
      context = await aiContextBuilder.buildTaskContext(projectId, taskId);
    } else if ((operation === 'TASK_DECOMPOSITION' || operation === 'TASK_ACTIONS') && !taskId) {
      throw new AppError('VALIDATION_ERROR', `taskId is required for ${operation}`, 400);
    } else {
      context = await aiContextBuilder.buildProjectContext(projectId);
    }

    // 3. Delegate to internal Python AI service
    try {
      const response = await this.client.analyze(
        {
          operation,
          context,
          user_prompt: userPrompt,
        },
        requestId
      );

      // 4. Runtime sanitization for TASK_ACTIONS
      if (operation === 'TASK_ACTIONS' && response.actions && response.actions.length > 0) {
        const members = await projectRepository.listMembers(projectId);
        const validMemberIds = new Set((members || []).map(m => m.user.id));

        // Filter out any ASSIGN_TASK actions proposing users not in the project
        response.actions = response.actions.filter(action => {
          if (action.type === 'ASSIGN_TASK') {
            const proposedAssigneeId = action.parameters?.assigneeId as string | undefined;
            if (proposedAssigneeId && !validMemberIds.has(proposedAssigneeId)) {
              return false;
            }
          }
          return true;
        });

        // Audit trail: Record AI_ACTION_PROPOSED (attributed to AI, non-mutating)
        if (response.actions.length > 0) {
          await auditService.record({
            organizationId,
            projectId,
            actorUserId: null,
            actorType: ActorType.AI,
            action: AuditAction.AI_ACTION_PROPOSED,
            resourceType: 'Task',
            resourceId: taskId ?? null,
            requestId: requestId ?? response.request_id ?? null,
            source: AuditSource.AI,
            metadata: {
              operation,
              taskId: taskId ?? null,
              proposedActionTypes: response.actions.map(a => a.type),
              proposalCount: response.actions.length,
            },
          });
        }
      }

      return response;
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }
      if (err && typeof err === 'object' && 'statusCode' in err && 'code' in err) {
        const errorObj = err as { statusCode: number; code: string; message: string };
        throw new AppError(errorObj.code, errorObj.message, errorObj.statusCode);
      }
      throw new AppError('AI_PROCESSING_ERROR', 'Failed to process AI analysis', 500);
    }
  }
}

export const aiService = new AIService();
