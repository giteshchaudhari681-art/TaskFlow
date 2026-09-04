import { Job, JobStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';
import type { JobSummary } from '@taskflow/shared';

export interface EnqueueJobData {
  type: string;
  payload: Prisma.InputJsonValue;
  organizationId?: string | null;
  idempotencyKey?: string | null;
  maxAttempts?: number;
  availableAt?: Date;
}

export class JobRepository extends BaseRepository {
  async enqueue(data: EnqueueJobData, tx?: Prisma.TransactionClient): Promise<Job> {
    const client = tx ?? this.db;

    if (data.idempotencyKey) {
      const existing = await client.job.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    try {
      return await client.job.create({
        data: {
          type: data.type,
          payload: data.payload,
          organizationId: data.organizationId ?? null,
          idempotencyKey: data.idempotencyKey ?? null,
          maxAttempts: data.maxAttempts ?? 3,
          availableAt: data.availableAt ?? new Date(),
          status: JobStatus.PENDING,
        },
      });
    } catch (err: unknown) {
      if (
        data.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await client.job.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async findById(id: string): Promise<Job | null> {
    return this.db.job.findUnique({ where: { id } });
  }

  async claimNextJob(): Promise<Job | null> {
    const result = await this.db.$queryRaw<Job[]>`
      WITH next_job AS (
        SELECT id
        FROM jobs
        WHERE status = 'PENDING'::"JobStatus"
          AND "availableAt" <= (NOW() AT TIME ZONE 'UTC')
        ORDER BY "availableAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE jobs j
      SET status = 'PROCESSING'::"JobStatus",
          "startedAt" = (NOW() AT TIME ZONE 'UTC'),
          "lockedAt" = (NOW() AT TIME ZONE 'UTC'),
          "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      FROM next_job
      WHERE j.id = next_job.id
      RETURNING j.*;
    `;

    return result[0] ?? null;
  }

  async markCompleted(id: string): Promise<Job> {
    return this.db.job.update({
      where: { id },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: new Date(),
        lockedAt: null,
      },
    });
  }

  async scheduleRetry(
    id: string,
    nextAvailableAt: Date,
    attempts: number,
    errorCode?: string | null,
    errorMessage?: string | null
  ): Promise<Job> {
    return this.db.job.update({
      where: { id },
      data: {
        status: JobStatus.PENDING,
        availableAt: nextAvailableAt,
        attempts,
        lockedAt: null,
        lastErrorCode: errorCode ?? null,
        lastErrorMessage: errorMessage ? errorMessage.slice(0, 1000) : null,
      },
    });
  }

  async markFailed(
    id: string,
    attempts: number,
    errorCode?: string | null,
    errorMessage?: string | null
  ): Promise<Job> {
    return this.db.job.update({
      where: { id },
      data: {
        status: JobStatus.FAILED,
        failedAt: new Date(),
        attempts,
        lockedAt: null,
        lastErrorCode: errorCode ?? null,
        lastErrorMessage: errorMessage ? errorMessage.slice(0, 1000) : null,
      },
    });
  }

  async recoverStaleJobs(processingTimeoutMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - processingTimeoutMs);

    // Stale jobs that exceeded max attempts -> mark FAILED
    const failedResult = await this.db.$executeRaw`
      UPDATE jobs
      SET status = 'FAILED'::"JobStatus",
          "failedAt" = (NOW() AT TIME ZONE 'UTC'),
          "lastErrorCode" = 'PROCESSING_TIMEOUT',
          "lastErrorMessage" = 'Job exceeded max processing duration and retry budget',
          "lockedAt" = NULL,
          "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE status = 'PROCESSING'::"JobStatus"
        AND "lockedAt" < ${cutoff}
        AND attempts >= "maxAttempts";
    `;

    // Stale jobs with attempts remaining -> return to PENDING with next retry
    const recoveredResult = await this.db.$executeRaw`
      UPDATE jobs
      SET status = 'PENDING'::"JobStatus",
          attempts = attempts + 1,
          "availableAt" = (NOW() AT TIME ZONE 'UTC'),
          "lastErrorCode" = 'WORKER_TIMEOUT_RECOVERED',
          "lastErrorMessage" = 'Job recovered after worker inactivity or crash',
          "lockedAt" = NULL,
          "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      WHERE status = 'PROCESSING'::"JobStatus"
        AND "lockedAt" < ${cutoff}
        AND attempts < "maxAttempts";
    `;

    return failedResult + recoveredResult;
  }

  async getSummary(organizationId: string): Promise<JobSummary> {
    const where: Prisma.JobWhereInput = { organizationId };

    const [pending, processing, completed, failed, oldestPending, recentFailed] = await Promise.all(
      [
        this.db.job.count({ where: { ...where, status: JobStatus.PENDING } }),
        this.db.job.count({ where: { ...where, status: JobStatus.PROCESSING } }),
        this.db.job.count({ where: { ...where, status: JobStatus.COMPLETED } }),
        this.db.job.count({ where: { ...where, status: JobStatus.FAILED } }),
        this.db.job.findFirst({
          where: { ...where, status: JobStatus.PENDING },
          orderBy: { availableAt: 'asc' },
          select: { availableAt: true },
        }),
        this.db.job.count({
          where: {
            ...where,
            status: JobStatus.FAILED,
            failedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]
    );

    return {
      organizationId,
      counts: {
        pending,
        processing,
        completed,
        failed,
      },
      oldestPendingAt: oldestPending?.availableAt ? oldestPending.availableAt.toISOString() : null,
      recentFailedCount: recentFailed,
    };
  }
}

export const jobRepository = new JobRepository();
