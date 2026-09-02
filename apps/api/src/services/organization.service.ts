import {
  UserRole,
  OrganizationDetails,
  OrganizationMemberItem,
  UpdateOrganizationPayload,
  AddMemberPayload,
} from '@taskflow/shared';
import { organizationRepository } from '../repositories/organization.repository.js';
import { userRepository } from '../repositories/user.repository.js';

export class OrganizationService {
  /**
   * List all organization workspaces for which the authenticated user holds valid membership.
   */
  async getOrganizationsForUser(userId: string): Promise<OrganizationDetails[]> {
    const memberships = await organizationRepository.getUserMemberships(userId);

    const results: OrganizationDetails[] = [];
    for (const m of memberships) {
      const org = await organizationRepository.findById(m.organization.id);
      if (org) {
        results.push({
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl,
          role: m.role as UserRole,
          memberCount: org._count.members,
          projectCount: org._count.projects,
          createdAt: org.createdAt.toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Retrieve workspace details with member/project counts.
   * Enforces that the requesting user is a verified tenant member.
   */
  async getWorkspace(organizationId: string, userId: string): Promise<OrganizationDetails> {
    const member = await organizationRepository.findMember(organizationId, userId);
    if (!member) {
      const err = new Error('You do not belong to this organization workspace');
      (err as unknown as { statusCode: number; code: string }).statusCode = 403;
      (err as unknown as { statusCode: number; code: string }).code = 'FORBIDDEN';
      throw err;
    }

    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      const err = new Error('Organization workspace not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      role: member.role as UserRole,
      memberCount: org._count.members,
      projectCount: org._count.projects,
      createdAt: org.createdAt.toISOString(),
    };
  }

  /**
   * Update workspace metadata (name, logoUrl).
   * Restricted to OWNER and ADMIN roles.
   */
  async updateWorkspace(
    organizationId: string,
    data: UpdateOrganizationPayload
  ): Promise<OrganizationDetails> {
    const updated = await organizationRepository.update(organizationId, {
      name: data.name?.trim(),
      logoUrl: data.logoUrl,
    });

    const full = await organizationRepository.findById(updated.id);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      role: UserRole.OWNER, // Caller has passed role verification middleware
      memberCount: full?._count.members ?? 1,
      projectCount: full?._count.projects ?? 0,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * List all workspace members with user identity and assigned roles.
   * Strictly isolated to organization members.
   */
  async getMembers(organizationId: string): Promise<OrganizationMemberItem[]> {
    const members = await organizationRepository.listMembers(organizationId);

    return members.map(m => ({
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      role: m.role as UserRole,
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
   * Add a registered user to the workspace.
   * Enforces role privilege constraints (ADMIN cannot create an OWNER).
   */
  async addMember(
    organizationId: string,
    actorRole: UserRole,
    data: AddMemberPayload
  ): Promise<OrganizationMemberItem> {
    const targetUser = await userRepository.findByEmail(data.email);
    if (!targetUser) {
      const err = new Error('No user account found matching this email address');
      (err as unknown as { statusCode: number; code: string }).statusCode = 404;
      (err as unknown as { statusCode: number; code: string }).code = 'USER_NOT_FOUND';
      throw err;
    }

    const existingMember = await organizationRepository.findMember(organizationId, targetUser.id);
    if (existingMember) {
      const err = new Error('User is already a member of this workspace');
      (err as unknown as { statusCode: number; code: string }).statusCode = 409;
      (err as unknown as { statusCode: number; code: string }).code = 'ALREADY_MEMBER';
      throw err;
    }

    // Role privilege restriction: Only OWNER can assign OWNER role
    if (data.role === UserRole.OWNER && actorRole !== UserRole.OWNER) {
      const err = new Error('Only an organization OWNER can assign the OWNER role');
      (err as unknown as { statusCode: number; code: string }).statusCode = 403;
      (err as unknown as { statusCode: number; code: string }).code = 'INSUFFICIENT_PERMISSIONS';
      throw err;
    }

    const created = await organizationRepository.addMember(
      organizationId,
      targetUser.id,
      data.role
    );

    return {
      id: created.id,
      organizationId: created.organizationId,
      userId: created.userId,
      role: created.role as UserRole,
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
   * Update an existing member's organization role.
   * Safeguards:
   * - Cannot edit own role (no self-promotion)
   * - ADMIN cannot edit an OWNER
   * - ADMIN cannot promote to OWNER
   * - Cannot demote sole remaining OWNER
   */
  async updateMemberRole(
    organizationId: string,
    actorUserId: string,
    actorRole: UserRole,
    targetUserId: string,
    newRole: UserRole
  ): Promise<OrganizationMemberItem> {
    if (actorUserId === targetUserId && actorRole !== UserRole.OWNER) {
      const err = new Error('Users cannot modify their own organization role');
      (err as unknown as { statusCode: number; code: string }).statusCode = 400;
      (err as unknown as { statusCode: number; code: string }).code = 'CANNOT_MODIFY_OWN_ROLE';
      throw err;
    }

    const targetMember = await organizationRepository.findMember(organizationId, targetUserId);
    if (!targetMember) {
      const err = new Error('Member not found in this organization');
      (err as unknown as { statusCode: number; code: string }).statusCode = 404;
      (err as unknown as { statusCode: number; code: string }).code = 'NOT_FOUND';
      throw err;
    }

    // ADMIN protection checks
    if (actorRole === UserRole.ADMIN) {
      if (targetMember.role === UserRole.OWNER) {
        const err = new Error('Administrators cannot modify an organization OWNER role');
        (err as unknown as { statusCode: number; code: string }).statusCode = 403;
        (err as unknown as { statusCode: number; code: string }).code = 'INSUFFICIENT_PERMISSIONS';
        throw err;
      }

      if (newRole === UserRole.OWNER) {
        const err = new Error('Only an organization OWNER can promote members to OWNER');
        (err as unknown as { statusCode: number; code: string }).statusCode = 403;
        (err as unknown as { statusCode: number; code: string }).code = 'INSUFFICIENT_PERMISSIONS';
        throw err;
      }
    }

    // Ownerless safeguard: prevent demoting sole OWNER
    if (targetMember.role === UserRole.OWNER && newRole !== UserRole.OWNER) {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        const err = new Error('Cannot demote the sole remaining owner of the workspace');
        (err as unknown as { statusCode: number; code: string }).statusCode = 400;
        (err as unknown as { statusCode: number; code: string }).code = 'SOLE_OWNER_PROTECTION';
        throw err;
      }
    }

    const updated = await organizationRepository.updateMemberRole(
      organizationId,
      targetUserId,
      newRole
    );

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      userId: updated.userId,
      role: updated.role as UserRole,
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
   * Remove a member from the workspace.
   * Safeguards:
   * - ADMIN cannot remove an OWNER
   * - Cannot remove the sole remaining OWNER
   */
  async removeMember(
    organizationId: string,
    actorUserId: string,
    actorRole: UserRole,
    targetUserId: string
  ): Promise<void> {
    const targetMember = await organizationRepository.findMember(organizationId, targetUserId);
    if (!targetMember) {
      const err = new Error('Member not found in this organization');
      (err as unknown as { statusCode: number; code: string }).statusCode = 404;
      (err as unknown as { statusCode: number; code: string }).code = 'NOT_FOUND';
      throw err;
    }

    if (actorUserId === targetUserId && targetMember.role === UserRole.OWNER) {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        const err = new Error('Cannot remove the sole remaining owner of the workspace');
        (err as unknown as { statusCode: number; code: string }).statusCode = 400;
        (err as unknown as { statusCode: number; code: string }).code = 'SOLE_OWNER_PROTECTION';
        throw err;
      }
    }

    if (actorRole === UserRole.ADMIN && targetMember.role === UserRole.OWNER) {
      const err = new Error('Administrators cannot remove an organization OWNER');
      (err as unknown as { statusCode: number; code: string }).statusCode = 403;
      (err as unknown as { statusCode: number; code: string }).code = 'INSUFFICIENT_PERMISSIONS';
      throw err;
    }

    if (targetMember.role === UserRole.OWNER) {
      const ownerCount = await organizationRepository.countOwners(organizationId);
      if (ownerCount <= 1) {
        const err = new Error('Cannot remove the sole remaining owner of the workspace');
        (err as unknown as { statusCode: number; code: string }).statusCode = 400;
        (err as unknown as { statusCode: number; code: string }).code = 'SOLE_OWNER_PROTECTION';
        throw err;
      }
    }

    await organizationRepository.removeMember(organizationId, targetUserId);
  }
}

export const organizationService = new OrganizationService();
