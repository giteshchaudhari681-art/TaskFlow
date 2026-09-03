import { ProjectRole, UserRole } from '@prisma/client';
import { organizationRepository } from '../repositories/organization.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { aiContextBuilder } from './aiContext.builder.js';
import { aiClient, type IAIClient } from '../integrations/ai/aiClient.js';
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
   * Authorizes caller, aggregates project context, and dispatches to Python AI service.
   */
  async analyzeProject(
    organizationId: string,
    projectId: string,
    userId: string,
    operation: AIOperation,
    userPrompt?: string,
    requestId?: string
  ): Promise<AIAnalysisResponse> {
    // 1. Authorize tenant, project, and RBAC boundary
    await this.checkProjectAccess(organizationId, projectId, userId);

    // 2. Build sanitized, deterministic AI context from Prisma
    const context = await aiContextBuilder.buildProjectContext(projectId);

    // 3. Delegate to internal Python AI service
    try {
      return await this.client.analyze(
        {
          operation,
          context,
          user_prompt: userPrompt,
        },
        requestId
      );
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
