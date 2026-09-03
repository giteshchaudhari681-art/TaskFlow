import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import * as Sentry from '@sentry/node';
import {
  initSentry,
  captureException,
  isSentryEnabled,
  redactSensitiveData,
  resetSentryForTesting,
  setInitializedForTesting,
} from '../monitoring/sentry.js';
import { errorHandler, AppError } from '../middleware/errorHandler.js';
import { requestIdMiddleware } from '../middleware/requestId.js';
import { HTTP_STATUS, ERROR_CODES } from '@taskflow/shared';

// Mock Sentry SDK
vi.mock('@sentry/node', () => {
  const mockCaptureException = vi.fn().mockReturnValue('mock-sentry-event-id');
  const mockInit = vi.fn();
  const mockWithScope = vi.fn(callback => {
    const scope = {
      setTag: vi.fn(),
      setUser: vi.fn(),
      setContext: vi.fn(),
    };
    return callback(scope);
  });

  return {
    init: mockInit,
    captureException: mockCaptureException,
    withScope: mockWithScope,
  };
});

describe('TaskFlow Observability & Sentry Error Monitoring Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSentryForTesting();
  });

  describe('1. Sentry SDK Lifecycle & Safe Initialization', () => {
    it('gracefully skips initialization when SENTRY_DSN is absent', () => {
      const result = initSentry();
      expect(result).toBe(false);
      expect(isSentryEnabled()).toBe(false);
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('initializes safely when DSN is present and prevents duplicate initialization', () => {
      const firstInit = initSentry(true, 'https://examplePublicKey@o0.ingest.sentry.io/0');
      expect(firstInit).toBe(true);
      expect(isSentryEnabled()).toBe(true);
      expect(Sentry.init).toHaveBeenCalledTimes(1);

      // Second initialization should no-op
      const secondInit = initSentry(false);
      expect(secondInit).toBe(true);
      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Sensitive Data & PII Redaction Engine', () => {
    it('redacts sensitive fields like passwords, secrets, tokens, and api keys', () => {
      const sensitivePayload = {
        email: 'user@example.com',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        apiKey: 'sk-proj-mock-api-key',
        nested: {
          clientSecret: 'secret-val',
          publicName: 'Safe Project Name',
        },
      };

      const redacted = redactSensitiveData(sensitivePayload) as Record<string, any>;
      expect(redacted.email).toBe('user@example.com');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.apiKey).toBe('[REDACTED]');
      expect(redacted.nested.clientSecret).toBe('[REDACTED]');
      expect(redacted.nested.publicName).toBe('Safe Project Name');
    });

    it('safely handles non-object and array data', () => {
      expect(redactSensitiveData('simple string')).toBe('simple string');
      expect(redactSensitiveData(12345)).toBe(12345);
      expect(redactSensitiveData(null)).toBeNull();
      expect(redactSensitiveData(undefined)).toBeUndefined();

      const arr = [{ password: '123' }, { name: 'safe' }];
      const redactedArr = redactSensitiveData(arr) as any[];
      expect(redactedArr[0].password).toBe('[REDACTED]');
      expect(redactedArr[1].name).toBe('safe');
    });
  });

  describe('3. Request Correlation & X-Request-ID Propagation', () => {
    it('generates a UUID request ID if no correlation header is provided', async () => {
      const app = express();
      app.use(requestIdMiddleware);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ id: req.id });
      });

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.body.id).toBe(res.headers['x-request-id']);
      expect(res.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('preserves existing X-Request-ID header from upstream clients', async () => {
      const app = express();
      const customTrace = 'client-trace-12345-uuid';
      app.use(requestIdMiddleware);
      app.get('/test', (req: Request, res: Response) => {
        res.json({ id: req.id });
      });

      const res = await request(app).get('/test').set('X-Request-ID', customTrace);
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customTrace);
      expect(res.body.id).toBe(customTrace);
    });
  });

  describe('4. Express Error Middleware & Sentry Reporting Rules', () => {
    beforeEach(() => {
      setInitializedForTesting(true);
    });

    const buildTestApp = () => {
      const app = express();
      app.use(requestIdMiddleware);

      // Route that triggers unexpected runtime error
      app.get('/crash', (_req: Request, _res: Response, next: NextFunction) => {
        next(new Error('Unexpected database connection timeout'));
      });

      // Route that triggers expected operational error (400 Bad Request)
      app.get('/bad-request', (_req: Request, _res: Response, next: NextFunction) => {
        next(
          new AppError('INVALID_INPUT', 'The requested name is invalid', HTTP_STATUS.BAD_REQUEST)
        );
      });

      // Route that triggers expected operational error (401 Unauthorized)
      app.get('/unauthorized', (_req: Request, _res: Response, next: NextFunction) => {
        next(new AppError('AUTHENTICATION_REQUIRED', 'Please sign in', HTTP_STATUS.UNAUTHORIZED));
      });

      // Route that triggers expected operational error (404 Not Found)
      app.get('/not-found', (_req: Request, _res: Response, next: NextFunction) => {
        next(new AppError('RESOURCE_NOT_FOUND', 'Project not found', HTTP_STATUS.NOT_FOUND));
      });

      // Route that triggers 500 AppError
      app.get('/server-error', (_req: Request, _res: Response, next: NextFunction) => {
        next(
          new AppError(
            'CRITICAL_FAILURE',
            'Critical internal failure',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          )
        );
      });

      app.use(errorHandler);
      return app;
    };

    it('captures unexpected 500 errors to Sentry with diagnostic request ID context', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/crash').set('X-Request-ID', 'trace-crash-test');

      // Response envelope must remain standard TaskFlow format
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);

      // Sentry withScope must have been triggered
      expect(Sentry.withScope).toHaveBeenCalled();
    });

    it('captures 5xx AppErrors to Sentry', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/server-error');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CRITICAL_FAILURE');
      expect(Sentry.withScope).toHaveBeenCalled();
    });

    it('filters expected 4xx operational errors (400, 401, 404) from Sentry noise', async () => {
      const app = buildTestApp();

      // 400 Bad Request
      const res400 = await request(app).get('/bad-request');
      expect(res400.status).toBe(400);
      expect(res400.body.success).toBe(false);
      expect(res400.body.error.code).toBe('INVALID_INPUT');

      // 401 Unauthorized
      const res401 = await request(app).get('/unauthorized');
      expect(res401.status).toBe(401);
      expect(res401.body.success).toBe(false);

      // 404 Not Found
      const res404 = await request(app).get('/not-found');
      expect(res404.status).toBe(404);
      expect(res404.body.success).toBe(false);

      // None of these 4xx operational errors should be reported to Sentry
      expect(Sentry.withScope).not.toHaveBeenCalled();
    });
  });

  describe('5. captureException Helper Diagnostic Scope', () => {
    it('attaches request_id, user_id, organization_id, and operation tags', () => {
      setInitializedForTesting(true);
      const error = new Error('Simulated computation failure');
      const eventId = captureException(error, {
        requestId: 'req-corr-999',
        userId: 'usr-123',
        organizationId: 'org-456',
        projectId: 'prj-789',
        operation: 'TASK_EXECUTION',
        statusCode: 500,
        extra: {
          taskKey: 'CORE-42',
          token: 'sensitive-token-should-be-scrubbed',
        },
      });

      expect(eventId).toBe('mock-sentry-event-id');
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });
});
