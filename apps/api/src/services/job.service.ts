import { Job, Prisma } from '@prisma/client';
import { jobRepository } from '../repositories/job.repository.js';
import { jobRegistry } from '../jobs/handlers/registry.js';
import { JobError, NonRetryableJobError, RetryableJobError } from '../jobs/errors.js';
import { env } from '../config/env.js';
import { captureException } from '../monitoring/sentry.js';
import type { JobSummary } from '@taskflow/shared';

// Import handlers so they self-register in registry
import '../jobs/handlers/notificationDelivery.handler.js';

export interface EnqueueOptions {
  type: string;
  payload: Record<string, unknown>;
  organizationId?: string | null;
  idempotencyKey?: string | null;
  maxAttempts?: number;
  availableAt?: Date;
}

export class JobService {
  private validatePayloadSafety(payload: Record<string, unknown>): void {
    const forbiddenPatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /api[-_]?key/i,
      /authorization/i,
      /cookie/i,
    ];

    const checkObject = (obj: Record<string, unknown>) => {
      for (const [key, val] of Object.entries(obj)) {
        if (forbiddenPatterns.some(pattern => pattern.test(key))) {
          throw new Error(`Job payload contains prohibited sensitive field: "${key}"`);
        }
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          checkObject(val as Record<string, unknown>);
        }
      }
    };

    checkObject(payload);
  }

  /**
   * Enqueues a job into the PostgreSQL queue.
   * Supports transactional enqueue when tx is supplied.
   */
  async enqueue(options: EnqueueOptions, tx?: Prisma.TransactionClient): Promise<Job> {
    if (options.payload) {
      this.validatePayloadSafety(options.payload);
    }
    const maxAttempts = options.maxAttempts ?? env.WORKER_MAX_ATTEMPTS;

    return jobRepository.enqueue(
      {
        type: options.type,
        payload: options.payload as Prisma.InputJsonValue,
        organizationId: options.organizationId ?? null,
        idempotencyKey: options.idempotencyKey ?? null,
        maxAttempts,
        availableAt: options.availableAt ?? new Date(),
      },
      tx
    );
  }

  /**
   * Calculates exponential backoff delay with jitter.
   * formula: min(baseDelay * 2^(attempts - 1), maxDelay) + jitter
   */
  calculateBackoff(
    attempts: number,
    baseDelayMs = env.WORKER_RETRY_BASE_DELAY_MS,
    maxDelayMs = env.WORKER_RETRY_MAX_DELAY_MS
  ): number {
    const exponential = baseDelayMs * Math.pow(2, Math.max(0, attempts - 1));
    const capped = Math.min(exponential, maxDelayMs);
    // Add 10% random jitter to avoid thundering herd on recovery
    const jitter = Math.floor(Math.random() * (capped * 0.1));
    return capped + jitter;
  }

  calculateBackoffDelay(
    attempts: number,
    baseDelayMs = env.WORKER_RETRY_BASE_DELAY_MS,
    maxDelayMs = env.WORKER_RETRY_MAX_DELAY_MS
  ): number {
    return this.calculateBackoff(attempts, baseDelayMs, maxDelayMs);
  }

  /**
   * Processes a single claimed job through its registered handler.
   * Handles success, failure classification, exponential retry, or permanent failure.
   */
  async processJob(job: Job): Promise<{ success: boolean; status: string }> {
    const handler = jobRegistry.get(job.type);

    if (!handler) {
      const errorMsg = `No registered handler found for job type: ${job.type}`;
      const attempts = job.attempts + 1;
      await jobRepository.markFailed(job.id, attempts, 'UNKNOWN_JOB_TYPE', errorMsg);

      captureException(new NonRetryableJobError(errorMsg, 'UNKNOWN_JOB_TYPE'), {
        operation: 'job_processing',
        organizationId: job.organizationId ?? undefined,
        extra: {
          jobId: job.id,
          jobType: job.type,
          attempts,
          isRetryable: false,
        },
      });

      return { success: false, status: 'FAILED' };
    }

    try {
      await handler(job, job.payload);
      await jobRepository.markCompleted(job.id);
      return { success: true, status: 'COMPLETED' };
    } catch (err: unknown) {
      const attempts = job.attempts + 1;
      const isRetryable =
        err instanceof RetryableJobError ||
        (!(err instanceof NonRetryableJobError) && !(err instanceof JobError && !err.isRetryable));

      const errorCode = err instanceof JobError ? err.code : 'HANDLER_ERROR';
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (isRetryable && attempts < job.maxAttempts) {
        const delayMs = this.calculateBackoff(attempts);
        const nextAvailableAt = new Date(Date.now() + delayMs);

        await jobRepository.scheduleRetry(
          job.id,
          nextAvailableAt,
          attempts,
          errorCode,
          errorMessage
        );

        captureException(err, {
          operation: 'job_retry',
          organizationId: job.organizationId ?? undefined,
          extra: {
            jobId: job.id,
            jobType: job.type,
            attempts,
            maxAttempts: job.maxAttempts,
            isRetryable: true,
            nextAvailableAt: nextAvailableAt.toISOString(),
          },
        });

        return { success: false, status: 'PENDING' };
      } else {
        await jobRepository.markFailed(job.id, attempts, errorCode, errorMessage);

        captureException(err, {
          operation: 'job_failed',
          organizationId: job.organizationId ?? undefined,
          extra: {
            jobId: job.id,
            jobType: job.type,
            attempts,
            maxAttempts: job.maxAttempts,
            isRetryable: false,
          },
        });

        return { success: false, status: 'FAILED' };
      }
    }
  }

  /**
   * Retrieves operational job health summary for an organization.
   */
  async getSummary(organizationId: string): Promise<JobSummary> {
    return jobRepository.getSummary(organizationId);
  }
}

export const jobService = new JobService();
