import { Session, User } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export interface CreateSessionParams {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  rotatedFromSessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionWithUser extends Session {
  user: User;
}

export class SessionRepository extends BaseRepository {
  async create(params: CreateSessionParams): Promise<Session> {
    return this.db.session.create({
      data: {
        userId: params.userId,
        refreshTokenHash: params.refreshTokenHash,
        expiresAt: params.expiresAt,
        rotatedFromSessionId: params.rotatedFromSessionId,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
      },
    });
  }

  async findByHash(refreshTokenHash: string): Promise<SessionWithUser | null> {
    return this.db.session.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });
  }

  async revoke(id: string): Promise<Session> {
    return this.db.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();
