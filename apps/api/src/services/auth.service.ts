import { RegisterInput, LoginInput } from '@taskflow/validation';
import { AuthUser, AuthResponseData, CurrentUserResponse, UserRole } from '@taskflow/shared';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { hashPassword, comparePassword } from '../lib/auth/password.js';
import { signAccessToken } from '../lib/auth/jwt.js';
import { generateRefreshToken, hashRefreshToken } from '../lib/auth/session.js';
import { env } from '../config/env.js';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthServiceResult {
  data: AuthResponseData;
  rawRefreshToken: string;
}

export class AuthService {
  /**
   * Register a new user and provision an initial organization workspace with OWNER role.
   */
  async register(input: RegisterInput, meta?: RequestMeta): Promise<AuthServiceResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      const err = new Error('An account with this email address already exists');
      (err as unknown as { statusCode: number }).statusCode = 409;
      throw err;
    }

    const orgName = input.organizationName?.trim() || `${input.name}'s Workspace`;
    const baseSlug =
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'workspace';
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    const passwordHash = await hashPassword(input.password);

    const { user, organization, membership } = await userRepository.createWithOrganization({
      name: input.name,
      email: input.email,
      passwordHash,
      orgName,
      orgSlug: uniqueSlug,
    });

    // Create session and issue tokens
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

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      defaultOrgId: organization.id,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    return {
      data: {
        user: authUser,
        accessToken,
        defaultOrganization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role: membership.role as UserRole,
        },
      },
      rawRefreshToken,
    };
  }

  /**
   * Authenticate an existing user by email and password.
   */
  async login(input: LoginInput, meta?: RequestMeta): Promise<AuthServiceResult> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      const err = new Error('Invalid email or password');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);
    if (!isValidPassword) {
      const err = new Error('Invalid email or password');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    // Lookup default organization membership
    const memberships = await organizationRepository.getUserMemberships(user.id);
    const primaryMembership = memberships[0];

    // Create session
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

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      defaultOrgId: primaryMembership?.organization.id,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    return {
      data: {
        user: authUser,
        accessToken,
        ...(primaryMembership
          ? {
              defaultOrganization: {
                id: primaryMembership.organization.id,
                name: primaryMembership.organization.name,
                slug: primaryMembership.organization.slug,
                role: primaryMembership.role as UserRole,
              },
            }
          : {}),
      },
      rawRefreshToken,
    };
  }

  /**
   * Rotate a refresh token and issue a fresh access token.
   * Performs reuse detection: if an already-revoked token is presented, all user sessions are revoked.
   */
  async refresh(rawRefreshToken: string, meta?: RequestMeta): Promise<AuthServiceResult> {
    if (!rawRefreshToken) {
      const err = new Error('Refresh token is required');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const session = await sessionRepository.findByHash(tokenHash);

    if (!session) {
      const err = new Error('Invalid or expired refresh session');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    // Reuse detection: token has already been revoked
    if (session.revokedAt) {
      console.warn(
        `🚨 Suspicious refresh token reuse detected for user ${session.userId}. Revoking all sessions.`
      );
      await sessionRepository.revokeAllForUser(session.userId);
      const err = new Error('Suspicious session activity detected. Please log in again.');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    // Expiration check
    if (session.expiresAt.getTime() < Date.now()) {
      await sessionRepository.revoke(session.id);
      const err = new Error('Refresh session has expired. Please log in again.');
      (err as unknown as { statusCode: number }).statusCode = 401;
      throw err;
    }

    // 1. Revoke the old session
    await sessionRepository.revoke(session.id);

    // 2. Generate replacement session
    const newRawRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
    );

    await sessionRepository.create({
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
      rotatedFromSessionId: session.id,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    const memberships = await organizationRepository.getUserMemberships(session.userId);
    const primaryMembership = memberships[0];

    const accessToken = signAccessToken({
      sub: session.user.id,
      email: session.user.email,
      defaultOrgId: primaryMembership?.organization.id,
    });

    const authUser: AuthUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    };

    return {
      data: {
        user: authUser,
        accessToken,
        ...(primaryMembership
          ? {
              defaultOrganization: {
                id: primaryMembership.organization.id,
                name: primaryMembership.organization.name,
                slug: primaryMembership.organization.slug,
                role: primaryMembership.role as UserRole,
              },
            }
          : {}),
      },
      rawRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revoke the session matching the presented refresh token.
   */
  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    try {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      const session = await sessionRepository.findByHash(tokenHash);
      if (session && !session.revokedAt) {
        await sessionRepository.revoke(session.id);
      }
    } catch {
      // Logout is idempotent and safe against invalid inputs
    }
  }

  /**
   * Get current authenticated user details and all organization memberships.
   */
  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const memberships = await organizationRepository.getUserMemberships(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organizations: memberships.map(m => ({
        id: m.id,
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.role as UserRole,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }
}

export const authService = new AuthService();
