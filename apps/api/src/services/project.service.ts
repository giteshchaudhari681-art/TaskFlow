import {
  ProjectRole,
  ProjectStatus,
  UserRole,
  ProjectDetail,
  ProjectListItem,
  ProjectMemberDetail,
  CreateProjectPayload,
  UpdateProjectPayload,
  AddProjectMemberPayload,
} from '@taskflow/shared';
import { projectRepository } from '../repositories/project.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { auditService } from './audit.service.js';
import { AuditAction, ActorType, AuditSource } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

const createError = (message: string, code: string, statusCode: number) => {
  return new AppError(code, message, statusCode);
};

export class ProjectService {
  /**
   * Verify that the actor holds valid membership in the parent organization.
   * Throws 403 FORBIDDEN if not found.
   */
  private async ensureOrgMember(organizationId: string, userId: string) {
    const orgMembership = await organizationRepository.findMember(organizationId, userId);
    if (!orgMembership) {
      throw createError(
        'You do not have access to this workspace organization',
        'CROSS_TENANT_FORBIDDEN',
        403
      );
    }
    return orgMembership;
  }

  /**
   * Verify that the project exists within the specified organization tenant boundary.
   * Throws 404 PROJECT_NOT_FOUND if not found.
   */
  private async ensureProjectInOrg(organizationId: string, projectId: string) {
    const project = await projectRepository.findById(projectId, organizationId);
    if (!project || project.organizationId !== organizationId) {
      throw createError('Project not found in this workspace', 'PROJECT_NOT_FOUND', 404);
    }
    return project;
  }

  /**
   * Helper to check if actor has project management permission.
   * Org OWNER and ADMIN have automatic administrative permissions.
   * Within project: LEAD has full control; ADMIN has operational control.
   */
  private async getActorPermissions(organizationId: string, projectId: string, userId: string) {
    const orgMember = await this.ensureOrgMember(organizationId, userId);
    const isOrgAdmin = orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN;

    const projectMember = await projectRepository.findMember(projectId, userId);
    const projectRole = projectMember ? (projectMember.role as ProjectRole) : null;

    const isLead = isOrgAdmin || projectRole === ProjectRole.LEAD;
    const isProjectAdmin = isLead || projectRole === ProjectRole.ADMIN;

    return {
      orgRole: orgMember.role as UserRole,
      projectRole,
      isOrgAdmin,
      isLead,
      isProjectAdmin,
    };
  }

  /**
   * List all projects in an organization for an authorized organization member.
   */
  async listProjects(
    organizationId: string,
    actorUserId: string,
    filter?: {
      status?: ProjectStatus;
      search?: string;
    }
  ): Promise<ProjectListItem[]> {
    await this.ensureOrgMember(organizationId, actorUserId);

    const projects = await projectRepository.listByOrganization(organizationId, filter);

    return projects.map(p => {
      const actorMembership = p.members.find(m => m.user.id === actorUserId);
      return {
        id: p.id,
        organizationId: p.organizationId,
        name: p.name,
        key: p.key,
        description: p.description,
        status: p.status as ProjectStatus,
        color: p.color,
        icon: p.icon,
        archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        memberCount: p._count.members,
        userRole: actorMembership ? (actorMembership.role as ProjectRole) : undefined,
      };
    });
  }

  /**
   * Create a new project inside the workspace.
   * The creator automatically becomes the initial project LEAD.
   */
  async createProject(
    organizationId: string,
    actorUserId: string,
    payload: CreateProjectPayload
  ): Promise<ProjectDetail> {
    const orgMember = await this.ensureOrgMember(organizationId, actorUserId);

    // GUEST accounts cannot create projects
    if (orgMember.role === UserRole.GUEST) {
      throw createError(
        'Guests are not permitted to create projects',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    const normalizedKey = payload.key.trim().toUpperCase();

    // Verify key uniqueness within organization
    const existing = await projectRepository.findByKey(organizationId, normalizedKey);
    if (existing) {
      throw createError(
        `Project key "${normalizedKey}" is already in use in this workspace`,
        'PROJECT_KEY_EXISTS',
        409
      );
    }

    const project = await projectRepository.create(
      organizationId,
      {
        name: payload.name.trim(),
        key: normalizedKey,
        description: payload.description ? payload.description.trim() : null,
        status: payload.status ?? ProjectStatus.PLANNING,
        color: payload.color ?? null,
        icon: payload.icon ?? null,
      },
      actorUserId
    );

    await auditService.record({
      organizationId,
      projectId: project.id,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.PROJECT_CREATED,
      resourceType: 'Project',
      resourceId: project.id,
      source: AuditSource.USER,
      metadata: {
        projectId: project.id,
        name: project.name,
        key: project.key,
      },
    });

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      key: project.key,
      description: project.description,
      status: project.status as ProjectStatus,
      color: project.color,
      icon: project.icon,
      archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      memberCount: project._count.members,
      userRole: ProjectRole.LEAD,
      members: project.members.map(m => ({
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
  }

  /**
   * Retrieve project details with full member directory and permissions.
   */
  async getProject(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ): Promise<ProjectDetail> {
    await this.ensureOrgMember(organizationId, actorUserId);
    const project = await this.ensureProjectInOrg(organizationId, projectId);

    const projectMember = await projectRepository.findMember(projectId, actorUserId);

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      key: project.key,
      description: project.description,
      status: project.status as ProjectStatus,
      color: project.color,
      icon: project.icon,
      archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      memberCount: project._count.members,
      userRole: projectMember ? (projectMember.role as ProjectRole) : undefined,
      members: project.members.map(m => ({
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
  }

  /**
   * Update project details (name, description, status, visual identity).
   * Key is immutable.
   * Allowed for Org OWNER/ADMIN, or Project LEAD/ADMIN.
   */
  async updateProject(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    payload: UpdateProjectPayload
  ): Promise<ProjectDetail> {
    await this.ensureProjectInOrg(organizationId, projectId);
    const perms = await this.getActorPermissions(organizationId, projectId, actorUserId);

    if (!perms.isProjectAdmin) {
      throw createError(
        'You do not have permission to modify project settings',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    const updated = await projectRepository.update(projectId, {
      ...(payload.name ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.color !== undefined ? { color: payload.color } : {}),
      ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
    });

    await auditService.record({
      organizationId,
      projectId: updated.id,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.PROJECT_UPDATED,
      resourceType: 'Project',
      resourceId: updated.id,
      source: AuditSource.USER,
      metadata: {
        projectId: updated.id,
        changes: {
          ...(payload.name ? { name: { to: payload.name.trim() } } : {}),
          ...(payload.status ? { status: { to: payload.status } } : {}),
        },
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      key: updated.key,
      description: updated.description,
      status: updated.status as ProjectStatus,
      color: updated.color,
      icon: updated.icon,
      archivedAt: updated.archivedAt ? updated.archivedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      memberCount: updated._count.members,
      userRole: perms.projectRole ?? undefined,
    };
  }

  /**
   * Archive a project.
   * Permitted for Org OWNER/ADMIN or Project LEAD.
   */
  async archiveProject(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ): Promise<ProjectDetail> {
    await this.ensureProjectInOrg(organizationId, projectId);
    const perms = await this.getActorPermissions(organizationId, projectId, actorUserId);

    if (!perms.isLead) {
      throw createError(
        'Only project leads or organization administrators can archive a project',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    const archived = await projectRepository.archive(projectId);
    const project = await projectRepository.findById(projectId);

    await auditService.record({
      organizationId,
      projectId,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.PROJECT_ARCHIVED,
      resourceType: 'Project',
      resourceId: projectId,
      source: AuditSource.USER,
      metadata: {
        projectId,
      },
    });

    return {
      id: archived.id,
      organizationId: archived.organizationId,
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? null,
      status: ProjectStatus.ARCHIVED,
      color: project?.color ?? null,
      icon: project?.icon ?? null,
      archivedAt: project?.archivedAt ? project.archivedAt.toISOString() : new Date().toISOString(),
      createdAt: project?.createdAt.toISOString() ?? new Date().toISOString(),
      updatedAt: project?.updatedAt.toISOString() ?? new Date().toISOString(),
      memberCount: archived._count.members,
      userRole: perms.projectRole ?? undefined,
    };
  }

  /**
   * Unarchive an archived project.
   * Permitted for Org OWNER/ADMIN or Project LEAD.
   */
  async unarchiveProject(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ): Promise<ProjectDetail> {
    await this.ensureProjectInOrg(organizationId, projectId);
    const perms = await this.getActorPermissions(organizationId, projectId, actorUserId);

    if (!perms.isLead) {
      throw createError(
        'Only project leads or organization administrators can unarchive a project',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    const unarchived = await projectRepository.unarchive(projectId);
    const project = await projectRepository.findById(projectId);

    return {
      id: unarchived.id,
      organizationId: unarchived.organizationId,
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? null,
      status: ProjectStatus.ACTIVE,
      color: project?.color ?? null,
      icon: project?.icon ?? null,
      archivedAt: null,
      createdAt: project?.createdAt.toISOString() ?? new Date().toISOString(),
      updatedAt: project?.updatedAt.toISOString() ?? new Date().toISOString(),
      memberCount: unarchived._count.members,
      userRole: perms.projectRole ?? undefined,
    };
  }

  /**
   * List all members of a project.
   */
  async listMembers(
    organizationId: string,
    projectId: string,
    actorUserId: string
  ): Promise<ProjectMemberDetail[]> {
    await this.ensureOrgMember(organizationId, actorUserId);
    await this.ensureProjectInOrg(organizationId, projectId);

    const members = await projectRepository.listMembers(projectId);

    return members.map(m => ({
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
    }));
  }

  /**
   * Add a member to the project.
   * The user MUST already be a member of the parent organization.
   * Permitted for Org OWNER/ADMIN or Project LEAD/ADMIN.
   */
  async addMember(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    payload: AddProjectMemberPayload
  ): Promise<ProjectMemberDetail> {
    await this.ensureProjectInOrg(organizationId, projectId);
    const perms = await this.getActorPermissions(organizationId, projectId, actorUserId);

    if (!perms.isProjectAdmin) {
      throw createError(
        'You do not have permission to add members to this project',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Role Escalation Check: Only LEAD can add another LEAD
    const roleToAdd = payload.role ?? ProjectRole.MEMBER;
    if (roleToAdd === ProjectRole.LEAD && !perms.isLead) {
      throw createError(
        'Only project leads or workspace owners can assign the LEAD role',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // CRITICAL: Verify target user belongs to the PARENT ORGANIZATION
    const targetOrgMembership = await organizationRepository.findMember(
      organizationId,
      payload.userId
    );
    if (!targetOrgMembership) {
      throw createError(
        'User must be a member of the organization workspace before joining the project',
        'USER_NOT_IN_ORGANIZATION',
        400
      );
    }

    // Check if user is already a project member
    const existing = await projectRepository.findMember(projectId, payload.userId);
    if (existing) {
      throw createError('User is already a member of this project', 'MEMBER_ALREADY_EXISTS', 409);
    }

    const created = await projectRepository.addMember(projectId, payload.userId, roleToAdd);

    await auditService.record({
      organizationId,
      projectId,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.PROJECT_MEMBER_ADDED,
      resourceType: 'ProjectMember',
      resourceId: created.id,
      source: AuditSource.USER,
      metadata: {
        userId: created.userId,
        role: created.role,
      },
    });

    return {
      id: created.id,
      projectId: created.projectId,
      userId: created.userId,
      role: created.role as ProjectRole,
      joinedAt: created.joinedAt.toISOString(),
      user: {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
        avatarUrl: created.user.avatarUrl,
      },
    };
  }

  /**
   * Update a project member's role.
   * Includes Self-Elevation Prevention and Sole-Lead Protection.
   */
  async updateMemberRole(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    targetUserId: string,
    newRole: ProjectRole
  ): Promise<ProjectMemberDetail> {
    await this.ensureProjectInOrg(organizationId, projectId);
    const perms = await this.getActorPermissions(organizationId, projectId, actorUserId);

    if (!perms.isProjectAdmin) {
      throw createError(
        'You do not have permission to manage project member roles',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Self-elevation prevention: Users cannot modify their own role
    if (actorUserId === targetUserId && !perms.isOrgAdmin) {
      throw createError('You cannot modify your own project role', 'CANNOT_MODIFY_OWN_ROLE', 403);
    }

    const targetMember = await projectRepository.findMember(projectId, targetUserId);
    if (!targetMember) {
      throw createError('Member not found in this project', 'MEMBER_NOT_FOUND', 404);
    }

    // Only LEAD (or Org OWNER) can promote to LEAD or demote a LEAD
    if ((targetMember.role === ProjectRole.LEAD || newRole === ProjectRole.LEAD) && !perms.isLead) {
      throw createError(
        'Only project leads or workspace owners can assign or alter the LEAD role',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // SOLE-LEAD PROTECTION: Cannot demote the sole project lead
    if (targetMember.role === ProjectRole.LEAD && newRole !== ProjectRole.LEAD) {
      const leadCount = await projectRepository.countLeads(projectId);
      if (leadCount <= 1) {
        throw createError(
          'Cannot demote the sole project lead. Assign another lead before changing this role.',
          'SOLE_LEAD_PROTECTION',
          400
        );
      }
    }

    const updated = await projectRepository.updateMemberRole(projectId, targetUserId, newRole);

    await auditService.record({
      organizationId,
      projectId,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.PROJECT_MEMBER_ROLE_CHANGED,
      resourceType: 'ProjectMember',
      resourceId: updated.id,
      source: AuditSource.USER,
      metadata: {
        userId: targetUserId,
        previousRole: targetMember.role,
        newRole,
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      userId: updated.userId,
      role: updated.role as ProjectRole,
      joinedAt: updated.joinedAt.toISOString(),
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        avatarUrl: updated.user.avatarUrl,
      },
    };
  }

  /**
   * Remove a member from the project.
   * Includes Sole-Lead Protection and permission enforcement.
   */
  async removeMember(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    targetUserId: string
  ): Promise<void> {
    await this.ensureProjectInOrg(organizationId, projectId);
    const perms = await this.getActorPermissions(organizationId, projectId, actorUserId);

    const isSelfRemoval = actorUserId === targetUserId;

    if (!isSelfRemoval && !perms.isProjectAdmin) {
      throw createError(
        'You do not have permission to remove members from this project',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    const targetMember = await projectRepository.findMember(projectId, targetUserId);
    if (!targetMember) {
      throw createError('Member not found in this project', 'MEMBER_NOT_FOUND', 404);
    }

    // Non-leads cannot remove a LEAD
    if (targetMember.role === ProjectRole.LEAD && !perms.isLead && !isSelfRemoval) {
      throw createError(
        'Only project leads or workspace owners can remove a project lead',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // SOLE-LEAD PROTECTION: Cannot remove the sole project lead
    if (targetMember.role === ProjectRole.LEAD) {
      const leadCount = await projectRepository.countLeads(projectId);
      if (leadCount <= 1) {
        throw createError(
          'Cannot remove the sole project lead. Assign another lead first or archive the project.',
          'SOLE_LEAD_PROTECTION',
          400
        );
      }
    }

    await projectRepository.removeMember(projectId, targetUserId);

    await auditService.record({
      organizationId,
      projectId,
      actorUserId,
      actorType: ActorType.USER,
      action: AuditAction.PROJECT_MEMBER_REMOVED,
      resourceType: 'ProjectMember',
      resourceId: targetMember.id,
      source: AuditSource.USER,
      metadata: {
        userId: targetUserId,
        role: targetMember.role,
      },
    });
  }
}

export const projectService = new ProjectService();
