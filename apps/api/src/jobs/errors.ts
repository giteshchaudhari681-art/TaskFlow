export class JobError extends Error {
  public readonly isRetryable: boolean;
  public readonly code: string;

  constructor(message: string, code = 'JOB_ERROR', isRetryable = true) {
    super(message);
    this.name = 'JobError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

export class RetryableJobError extends JobError {
  constructor(message: string, code = 'RETRYABLE_JOB_ERROR') {
    super(message, code, true);
    this.name = 'RetryableJobError';
  }
}

export class NonRetryableJobError extends JobError {
  constructor(message: string, code = 'NON_RETRYABLE_JOB_ERROR') {
    super(message, code, false);
    this.name = 'NonRetryableJobError';
  }
}
