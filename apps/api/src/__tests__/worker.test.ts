import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobStatus } from '@taskflow/shared';
import { JobWorker } from '../services/job.worker.js';
import { jobRepository } from '../repositories/job.repository.js';
import { jobRegistry } from '../jobs/handlers/registry.js';
import { RetryableJobError, NonRetryableJobError } from '../jobs/errors.js';

describe('TaskFlow PR 26: Worker Lifecycle & Resilience Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default or custom configuration options', () => {
    const worker = new JobWorker({
      pollingIntervalMs: 250,
      processingTimeoutMs: 120000,
      shutdownGracePeriodMs: 5000,
      staleRecoveryIntervalMs: 30000,
    });

    expect(worker).toBeDefined();
    expect(worker.isActive()).toBe(false);
    expect(worker.isAcceptingJobs()).toBe(false);
  });

  it('runOnce returns false when no jobs are eligible in the queue', async () => {
    vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(null);

    const worker = new JobWorker({ pollingIntervalMs: 100 });
    const result = await worker.runOnce();

    expect(result).toBe(false);
    expect(jobRepository.claimNextJob).toHaveBeenCalledOnce();
  });

  it('runOnce claims and executes registered handler for available job', async () => {
    const mockJob: any = {
      id: 'job-123',
      type: 'WORKER_TEST_JOB',
      status: JobStatus.PROCESSING,
      organizationId: 'org-123',
      payload: { data: 'test' },
      attempts: 0,
      maxAttempts: 3,
      availableAt: new Date(),
    };

    let handlerCalled = false;
    jobRegistry.register('WORKER_TEST_JOB', async () => {
      handlerCalled = true;
    });

    vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(mockJob);
    vi.spyOn(jobRepository, 'markCompleted').mockResolvedValue({
      ...mockJob,
      status: JobStatus.COMPLETED,
    });

    const worker = new JobWorker({ pollingIntervalMs: 100 });
    const result = await worker.runOnce();

    expect(result).toBe(true);
    expect(handlerCalled).toBe(true);
    expect(jobRepository.markCompleted).toHaveBeenCalledWith('job-123');

    jobRegistry.unregister('WORKER_TEST_JOB');
  });

  it('graceful shutdown stops accepting new jobs and halts the polling loop', async () => {
    vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(null);

    const worker = new JobWorker({ pollingIntervalMs: 50 });
    const startPromise = worker.start();

    expect(worker.isActive()).toBe(true);
    expect(worker.isAcceptingJobs()).toBe(true);

    await worker.stop();

    expect(worker.isActive()).toBe(false);
    expect(worker.isAcceptingJobs()).toBe(false);

    await startPromise;
  });

  it('worker isolates handler errors and continues without crashing loop', async () => {
    const mockJob: any = {
      id: 'job-err',
      type: 'ERR_JOB',
      status: JobStatus.PROCESSING,
      organizationId: 'org-123',
      payload: {},
      attempts: 0,
      maxAttempts: 3,
      availableAt: new Date(),
    };

    jobRegistry.register('ERR_JOB', async () => {
      throw new RetryableJobError('Flaky network timeout', 'NETWORK_TIMEOUT');
    });

    vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(mockJob);
    const retrySpy = vi.spyOn(jobRepository, 'scheduleRetry').mockResolvedValue({
      ...mockJob,
      status: JobStatus.PENDING,
      attempts: 1,
    });

    const worker = new JobWorker({ pollingIntervalMs: 100 });
    const result = await worker.runOnce();

    expect(result).toBe(true);
    expect(retrySpy).toHaveBeenCalledOnce();

    jobRegistry.unregister('ERR_JOB');
  });

  it('worker fails job immediately on NonRetryableJobError', async () => {
    const mockJob: any = {
      id: 'job-bad-payload',
      type: 'BAD_PAYLOAD_JOB',
      status: JobStatus.PROCESSING,
      organizationId: 'org-123',
      payload: {},
      attempts: 0,
      maxAttempts: 3,
      availableAt: new Date(),
    };

    jobRegistry.register('BAD_PAYLOAD_JOB', async () => {
      throw new NonRetryableJobError('Missing required field', 'SCHEMA_VALIDATION_ERROR');
    });

    vi.spyOn(jobRepository, 'claimNextJob').mockResolvedValue(mockJob);
    const failSpy = vi.spyOn(jobRepository, 'markFailed').mockResolvedValue({
      ...mockJob,
      status: JobStatus.FAILED,
      attempts: 1,
    });

    const worker = new JobWorker({ pollingIntervalMs: 100 });
    const result = await worker.runOnce();

    expect(result).toBe(true);
    expect(failSpy).toHaveBeenCalledWith(
      'job-bad-payload',
      1,
      'SCHEMA_VALIDATION_ERROR',
      'Missing required field'
    );

    jobRegistry.unregister('BAD_PAYLOAD_JOB');
  });
});
