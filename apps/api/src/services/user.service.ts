import { UserProfile, UpdateProfilePayload, ChangePasswordPayload } from '@taskflow/shared';
import { userRepository } from '../repositories/user.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { comparePassword, hashPassword } from '../lib/auth/password.js';
import { signAccessToken } from '../lib/auth/jwt.js';
import { generateRefreshToken, hashRefreshToken } from '../lib/auth/session.js';
import { env } from '../config/env.js';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export class UserService {
  /**
   * Retrieve the current authenticated user profile along with active tenant counts.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const memberships = await organizationRepository.getUserMemberships(userId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      organizationCount: memberships.length,
    };
  }

  /**
   * Update mutable profile fields (name, avatarUrl).
   * Explicitly disallows mutation of id, email, passwordHash, or tenant roles.
   */
  async updateProfile(userId: string, data: UpdateProfilePayload): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const updated = await userRepository.updateProfile(userId, {
      name: data.name?.trim(),
      avatarUrl: data.avatarUrl,
    });

    const memberships = await organizationRepository.getUserMemberships(userId);

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      organizationCount: memberships.length,
    };
  }

  /**
   * Securely change user password.
   * Verifies current password, checks entropy, prevents reuse, updates hash,
   * revokes existing device sessions, and returns a replacement session for the current client.
   */
  async changePassword(userId: string, data: ChangePasswordPayload, meta?: RequestMeta) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    // 1. Verify current password
    const isCurrentValid = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      const err = new Error('Current password does not match');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    // 2. Disallow new password matching current password
    const isSamePassword = await comparePassword(data.newPassword, user.passwordHash);
    if (isSamePassword) {
      const err = new Error('New password cannot be identical to current password');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    // 3. Hash and persist new password
    const newHash = await hashPassword(data.newPassword);
    await userRepository.updatePasswordHash(userId, newHash);

    // 4. Invalidate all existing sessions (remote device revocation)
    await sessionRepository.revokeAllForUser(userId);

    // 5. Issue replacement session for the current client
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    await sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    const memberships = await organizationRepository.getUserMemberships(user.id);
    const primaryMembership = memberships[0];

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      defaultOrgId: primaryMembership?.organization.id,
    });

    return {
      accessToken,
      rawRefreshToken,
    };
  }
}

export const userService = new UserService();
