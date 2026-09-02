import { ProjectRole, UserRole } from '@prisma/client';
import { CreateLabelInput, UpdateLabelInput } from '@taskflow/validation';
import { labelRepository } from '../repositories/label.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import { AppError } from '../middleware/errorHandler.js';

const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  [ProjectRole.LEAD]: 4,
  [ProjectRole.ADMIN]: 3,
  [ProjectRole.MEMBER]: 2,
  [ProjectRole.VIEWER]: 1,
};

const RANK_SUPER = 99;

export class LabelService {
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
      rank: PROJECT_ROLE_RANK[projMember.role],
    };
  }

  private normalizeName(name: string): { displayName: string; normalizedName: string } {
    const displayName = name.trim().replace(/\s+/g, ' ');
    const normalizedName = displayName.toLowerCase();
    return { displayName, normalizedName };
  }

  async listLabels(organizationId: string, projectId: string, actorUserId: string) {
    await this.getActorProjectPermissions(organizationId, projectId, actorUserId);
    return labelRepository.listByProject(projectId);
  }

  async createLabel(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    input: CreateLabelInput
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    // Only Admin, Lead, or Super Org Admin can create labels
    if (rank < PROJECT_ROLE_RANK[ProjectRole.ADMIN]) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Only project Admins, Leads, or Organization Admins can create labels',
        403
      );
    }

    const { displayName, normalizedName } = this.normalizeName(input.name);

    // Check uniqueness within project
    const existing = await labelRepository.findByNormalizedName(projectId, normalizedName);
    if (existing) {
      throw new AppError(
        'LABEL_ALREADY_EXISTS',
        `A label named "${displayName}" already exists in this project`,
        409
      );
    }

    return labelRepository.create(projectId, {
      name: displayName,
      normalizedName,
      color: input.color,
      description: input.description,
    });
  }

  async updateLabel(
    organizationId: string,
    projectId: string,
    labelId: string,
    actorUserId: string,
    input: UpdateLabelInput
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < PROJECT_ROLE_RANK[ProjectRole.ADMIN]) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Only project Admins, Leads, or Organization Admins can update labels',
        403
      );
    }

    const existingLabel = await labelRepository.findById(labelId, projectId);
    if (!existingLabel) {
      throw new AppError('LABEL_NOT_FOUND', 'Label not found in this project', 404);
    }

    let displayName = existingLabel.name;
    let normalizedName = existingLabel.normalizedName;

    if (input.name !== undefined) {
      const normalized = this.normalizeName(input.name);
      displayName = normalized.displayName;
      normalizedName = normalized.normalizedName;

      if (normalizedName !== existingLabel.normalizedName) {
        const conflict = await labelRepository.findByNormalizedName(projectId, normalizedName);
        if (conflict && conflict.id !== labelId) {
          throw new AppError(
            'LABEL_ALREADY_EXISTS',
            `A label named "${displayName}" already exists in this project`,
            409
          );
        }
      }
    }

    return labelRepository.update(labelId, projectId, {
      name: displayName,
      normalizedName,
      color: input.color,
      description: input.description,
    });
  }

  async deleteLabel(
    organizationId: string,
    projectId: string,
    labelId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < PROJECT_ROLE_RANK[ProjectRole.ADMIN]) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Only project Admins, Leads, or Organization Admins can delete labels',
        403
      );
    }

    const existingLabel = await labelRepository.findById(labelId, projectId);
    if (!existingLabel) {
      throw new AppError('LABEL_NOT_FOUND', 'Label not found in this project', 404);
    }

    await labelRepository.delete(labelId, projectId);
    return { success: true };
  }

  async assignTaskLabel(
    organizationId: string,
    projectId: string,
    taskId: string,
    labelId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    // Members, Admins, Leads can assign labels. Viewers cannot.
    if (rank < PROJECT_ROLE_RANK[ProjectRole.MEMBER]) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Project Viewers cannot assign labels to tasks',
        403
      );
    }

    // Verify task exists in project
    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    // Verify label exists in the SAME project (strict project scoping)
    const label = await labelRepository.findById(labelId, projectId);
    if (!label) {
      throw new AppError('LABEL_NOT_FOUND', 'Label not found in this project', 404);
    }

    await taskRepository.assignLabel(taskId, labelId);
    return taskRepository.findById(taskId, projectId);
  }

  async removeTaskLabel(
    organizationId: string,
    projectId: string,
    taskId: string,
    labelId: string,
    actorUserId: string
  ) {
    const { rank } = await this.getActorProjectPermissions(organizationId, projectId, actorUserId);

    if (rank < PROJECT_ROLE_RANK[ProjectRole.MEMBER]) {
      throw new AppError(
        'INSUFFICIENT_PERMISSIONS',
        'Project Viewers cannot remove labels from tasks',
        403
      );
    }

    const task = await taskRepository.findById(taskId, projectId);
    if (!task) {
      throw new AppError('TASK_NOT_FOUND', 'Task not found in this project', 404);
    }

    const label = await labelRepository.findById(labelId, projectId);
    if (!label) {
      throw new AppError('LABEL_NOT_FOUND', 'Label not found in this project', 404);
    }

    await taskRepository.removeLabel(taskId, labelId);
    return taskRepository.findById(taskId, projectId);
  }
}

export const labelService = new LabelService();
