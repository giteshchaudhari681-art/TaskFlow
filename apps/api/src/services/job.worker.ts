import { jobRepository } from '../repositories/job.repository.js';
import { jobService } from './job.service.js';
import { env } from '../config/env.js';

export interface JobWorkerOptions {
  pollingIntervalMs?: number;
  processingTimeoutMs?: number;
  shutdownGracePeriodMs?: number;
  staleRecoveryIntervalMs?: number;
}

export class JobWorker {
  private shouldStop = false;
  private isRunning = false;
  private activeJobPromise: Promise<unknown> | null = null;
  private sleepResolve: (() => void) | null = null;
  private lastStaleRecovery = 0;

  private readonly pollingIntervalMs: number;
  private readonly processingTimeoutMs: number;
  private readonly shutdownGracePeriodMs: number;
  private readonly staleRecoveryIntervalMs: number;

  constructor(options?: JobWorkerOptions) {
    this.pollingIntervalMs = options?.pollingIntervalMs ?? env.WORKER_POLLING_INTERVAL_MS;
    this.processingTimeoutMs = options?.processingTimeoutMs ?? env.WORKER_PROCESSING_TIMEOUT_MS;
    this.shutdownGracePeriodMs =
      options?.shutdownGracePeriodMs ?? env.WORKER_SHUTDOWN_GRACE_PERIOD_MS;
    this.staleRecoveryIntervalMs = options?.staleRecoveryIntervalMs ?? 60000;
  }

  /**
   * Starts the polling and execution loop.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.shouldStop = false;

    while (!this.shouldStop) {
      try {
        // 1. Periodically check and recover stale jobs
        const now = Date.now();
        if (now - this.lastStaleRecovery > this.staleRecoveryIntervalMs) {
          this.lastStaleRecovery = now;
          await jobRepository.recoverStaleJobs(this.processingTimeoutMs);
        }

        // 2. Claim next available job using SKIP LOCKED
        const job = await jobRepository.claimNextJob();

        if (job) {
          // Process claimed job
          this.activeJobPromise = jobService.processJob(job);
          await this.activeJobPromise;
          this.activeJobPromise = null;

          // Short yield before claiming next job
          await this.sleep(10);
        } else {
          // No jobs available: sleep for polling interval
          await this.sleep(this.pollingIntervalMs);
        }
      } catch (err: unknown) {
        console.error('Unexpected error in worker loop:', err);
        // Prevent hot spin on unexpected error
        await this.sleep(this.pollingIntervalMs);
      }
    }

    this.isRunning = false;
  }

  /**
   * Gracefully stops the worker. Stops claiming new jobs and waits for any active job.
   */
  async stop(): Promise<void> {
    this.shouldStop = true;

    // Wake up any sleeping loop immediately
    if (this.sleepResolve) {
      this.sleepResolve();
      this.sleepResolve = null;
    }

    // Wait for in-flight job if one is processing
    if (this.activeJobPromise) {
      const gracePeriodTimeout = new Promise(resolve =>
        setTimeout(resolve, this.shutdownGracePeriodMs)
      );
      await Promise.race([this.activeJobPromise, gracePeriodTimeout]);
      this.activeJobPromise = null;
    }

    this.isRunning = false;
  }

  /**
   * Checks if worker is actively running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  isAcceptingJobs(): boolean {
    return this.isRunning && !this.shouldStop;
  }

  /**
   * Single-step execution for testing or manual triggers.
   */
  async runOnce(): Promise<boolean> {
    const job = await jobRepository.claimNextJob();
    if (!job) return false;
    await jobService.processJob(job);
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.sleepResolve = resolve;
      setTimeout(() => {
        this.sleepResolve = null;
        resolve();
      }, ms);
    });
  }
}

export const jobWorker = new JobWorker();
