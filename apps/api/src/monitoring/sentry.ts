import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

export interface SentryDiagnosticContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  operation?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  extra?: Record<string, unknown>;
}

let initialized = false;

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-taskflow-service-token',
  'x-api-key',
  'proxy-authorization',
]);

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /credit[_-]?card/i,
];

const STRING_SCRUB_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, replacement: 'Bearer [REDACTED]' },
  { regex: /sk-[A-Za-z0-9_-]{20,}/g, replacement: 'sk-[REDACTED]' },
  {
    regex: /postgres(ql)?:\/\/[^@\s]+@[^\s/]+/gi,
    replacement: 'postgresql://[REDACTED]@[REDACTED]',
  },
  { regex: /refreshToken=[A-Za-z0-9._~+/-]+/gi, replacement: 'refreshToken=[REDACTED]' },
];

/**
 * Scrubs known sensitive string patterns (Bearer tokens, OpenAI keys, DB URLs, refresh cookies).
 */
export const scrubString = (str: string): string => {
  let result = str;
  for (const { regex, replacement } of STRING_SCRUB_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
};

/**
 * Recursively redacts sensitive keys in objects or JSON payloads.
 */
export const redactSensitiveData = (data: unknown, depth = 0): unknown => {
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return scrubString(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      } else if (typeof value === 'string') {
        sanitized[key] = scrubString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * Initializes Sentry for Node.js / Express runtime.
 * Idempotent and optional; does nothing if SENTRY_DSN is absent or in test environment.
 */
export const initSentry = (force = false, dsnOverride?: string): boolean => {
  if (initialized && !force) {
    return true;
  }

  const dsn = dsnOverride || process.env.SENTRY_DSN || env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV || 'development',
    release: 'taskflow-api@0.1.0',
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE || 0,
    beforeSend(event) {
      // Scrub sensitive HTTP request headers
      if (event.request?.headers) {
        for (const headerKey of Object.keys(event.request.headers)) {
          if (SENSITIVE_HEADERS.has(headerKey.toLowerCase())) {
            event.request.headers[headerKey] = '[REDACTED]';
          }
        }
      }

      // Scrub request cookies if present
      if (event.request?.cookies) {
        event.request.cookies = { cookies: '[REDACTED]' };
      }

      // Scrub request body data if present
      if (event.request?.data) {
        event.request.data = redactSensitiveData(event.request.data);
      }

      // Scrub top-level message if present
      if (event.message && typeof event.message === 'string') {
        event.message = scrubString(event.message);
      }

      // Scrub exception values if present
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.value && typeof exc.value === 'string') {
            exc.value = scrubString(exc.value);
          }
        }
      }

      // Ensure service tag is explicitly set
      event.tags = {
        ...event.tags,
        service: 'api',
      };

      return event;
    },
  });

  initialized = true;
  return true;
};

/**
 * Reports unexpected application exceptions to Sentry with sanitized diagnostic context.
 */
export const captureException = (
  error: unknown,
  context?: SentryDiagnosticContext
): string | undefined => {
  if (!initialized && !(process.env.SENTRY_DSN || env.SENTRY_DSN)) {
    return undefined;
  }

  return Sentry.withScope(scope => {
    scope.setTag('service', 'api');

    if (context?.requestId) {
      scope.setTag('request_id', context.requestId);
      scope.setContext('correlation', { request_id: context.requestId });
    }

    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context?.organizationId) {
      scope.setTag('organization_id', context.organizationId);
    }

    if (context?.projectId) {
      scope.setTag('project_id', context.projectId);
    }

    if (context?.operation) {
      scope.setTag('operation', context.operation);
    }

    if (context?.route) {
      scope.setTag('route', context.route);
    }

    if (context?.method) {
      scope.setTag('method', context.method);
    }

    if (context?.statusCode) {
      scope.setTag('status_code', String(context.statusCode));
    }

    if (context?.extra) {
      const sanitizedExtra = redactSensitiveData(context.extra) as Record<string, unknown>;
      scope.setContext('diagnostic_data', sanitizedExtra);
    }

    return Sentry.captureException(error);
  });
};

/**
 * Wraps an asynchronous operation to capture execution timing safely.
 * Adds sanitized performance breadcrumbs without high-cardinality noise or sensitive payloads.
 */
export const measureTiming = async <T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, string | number | boolean>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await operation();
    const durationMs = Date.now() - start;
    if (initialized) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${name} completed in ${durationMs}ms`,
        level: 'info',
        data: {
          durationMs,
          ...metadata,
        },
      });
    }
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    if (initialized) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${name} failed after ${durationMs}ms`,
        level: 'warning',
        data: {
          durationMs,
          ...metadata,
        },
      });
    }
    throw err;
  }
};

/**
 * Returns whether Sentry is currently active and initialized.
 */
export const isSentryEnabled = (): boolean => initialized;

/**
 * Reset initialization state (used strictly for test isolation).
 */
export const resetSentryForTesting = (): void => {
  initialized = false;
};

export const setInitializedForTesting = (val: boolean): void => {
  initialized = val;
};
