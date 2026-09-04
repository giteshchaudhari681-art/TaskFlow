import { Job } from '@prisma/client';

export type JobHandler<T = any> = (job: Job, payload: T) => Promise<void>;

class JobRegistry {
  private handlers = new Map<string, JobHandler>();

  register<T = any>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler);
  }

  get(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  unregister(type: string): void {
    this.handlers.delete(type);
  }

  clearForTesting(): void {
    this.handlers.clear();
  }
}

export { JobRegistry };
export const jobRegistry = new JobRegistry();
