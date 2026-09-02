import { User, UserRole } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export interface CreateUserWithOrgParams {
  name: string;
  email: string;
  passwordHash: string;
  orgName: string;
  orgSlug: string;
}

export class UserRepository extends BaseRepository {
  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  /**
   * Transactional user registration with automatic workspace (tenant) provisioning.
   * Atomic: fails completely if any constraint (e.g. duplicate slug or duplicate email) fails.
   */
  async createWithOrganization(params: CreateUserWithOrgParams) {
    return this.db.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          name: params.name,
          email: params.email.toLowerCase(),
          passwordHash: params.passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: params.orgName,
          slug: params.orgSlug,
        },
      });

      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: UserRole.OWNER,
        },
      });

      return { user, organization, membership };
    });
  }
}

export const userRepository = new UserRepository();
