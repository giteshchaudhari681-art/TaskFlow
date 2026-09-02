import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseHealthResult {
  isHealthy: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Probes the database connection using a minimal low-overhead query.
 * Guarantees zero credential exposure and catches timeout / offline states gracefully.
 */
export const checkDatabaseHealth = async (
  timeoutMs: number = 3000
): Promise<DatabaseHealthResult> => {
  const start = Date.now();
  try {
    const probePromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database probe timed out')), timeoutMs)
    );

    await Promise.race([probePromise, timeoutPromise]);
    const latencyMs = Date.now() - start;

    return {
      isHealthy: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database connection error';
    return {
      isHealthy: false,
      error: env.NODE_ENV === 'production' ? 'Database unavailable' : message,
    };
  }
};
