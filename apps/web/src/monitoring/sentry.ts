import * as Sentry from '@sentry/react';

export interface FrontendDiagnosticContext {
  userId?: string;
  organizationId?: string;
  route?: string;
  extra?: Record<string, unknown>;
}

let initialized = false;

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
];

/**
 * Scrubs sensitive key-value pairs from diagnostic payloads.
 */
export const redactClientData = (data: unknown, depth = 0): unknown => {
  if (depth > 5 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactClientData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = redactClientData(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * Initializes Sentry for React / browser runtime.
 * Optional and idempotent; does nothing if VITE_SENTRY_DSN is absent.
 */
export const initSentry = (force = false): boolean => {
  if (initialized && !force) {
    return true;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  const environment =
    import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development';

  Sentry.init({
    dsn,
    environment,
    release: 'taskflow-web@0.1.0',
    tracesSampleRate: 0.0,
    beforeSend(event) {
      // Scrub sensitive headers or cookies if captured
      if (event.request?.headers) {
        for (const key of Object.keys(event.request.headers)) {
          if (SENSITIVE_PATTERNS.some(p => p.test(key))) {
            event.request.headers[key] = '[REDACTED]';
          }
        }
      }

      // Ensure service tag
      event.tags = {
        ...event.tags,
        service: 'web',
      };

      return event;
    },
  });

  initialized = true;
  return true;
};

/**
 * Manually captures an exception with frontend diagnostic context.
 */
export const captureException = (
  error: unknown,
  context?: FrontendDiagnosticContext
): string | undefined => {
  if (!initialized && !import.meta.env.VITE_SENTRY_DSN) {
    return undefined;
  }

  return Sentry.withScope(scope => {
    scope.setTag('service', 'web');

    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context?.organizationId) {
      scope.setTag('organization_id', context.organizationId);
    }

    if (context?.route) {
      scope.setTag('route', context.route);
    }

    if (context?.extra) {
      const sanitized = redactClientData(context.extra) as Record<string, unknown>;
      scope.setContext('diagnostic_data', sanitized);
    }

    return Sentry.captureException(error);
  });
};

/**
 * Checks if Sentry is active.
 */
export const isSentryEnabled = (): boolean => initialized;

/**
 * Resets initialization state for testing.
 */
export const resetSentryForTesting = (): void => {
  initialized = false;
};
