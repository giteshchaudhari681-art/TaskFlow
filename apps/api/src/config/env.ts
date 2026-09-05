import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DEV_JWT_SECRET = 'development-jwt-secret-min-32-chars-for-taskflow-api';
const DEFAULT_DEV_COOKIE_SECRET = 'development-cookie-secret-min-32-chars-taskflow';
const DEFAULT_DEV_AI_TOKEN = 'taskflow-internal-dev-token';
const DEFAULT_DEV_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/taskflow_dev?schema=public';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(5000),
    API_PREFIX: z.string().default('/api/v1'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().default(500),
    JWT_SECRET: z.string().min(16).default(DEFAULT_DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),
    COOKIE_SECRET: z.string().min(16).default(DEFAULT_DEV_COOKIE_SECRET),
    DATABASE_URL: z
      .string()
      .min(1, { message: 'DATABASE_URL is required' })
      .default(DEFAULT_DEV_DB_URL),
    AI_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000'),
    AI_SERVICE_TOKEN: z.string().default(DEFAULT_DEV_AI_TOKEN),
    AI_SERVICE_TIMEOUT_MS: z.coerce.number().default(30000),
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
    WORKER_POLLING_INTERVAL_MS: z.coerce.number().min(50).default(1000),
    WORKER_MAX_ATTEMPTS: z.coerce.number().min(1).default(3),
    WORKER_RETRY_BASE_DELAY_MS: z.coerce.number().min(100).default(1000),
    WORKER_RETRY_MAX_DELAY_MS: z.coerce.number().min(1000).default(60000),
    WORKER_PROCESSING_TIMEOUT_MS: z.coerce.number().min(1000).default(30000),
    WORKER_SHUTDOWN_GRACE_PERIOD_MS: z.coerce.number().min(1000).default(10000),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      // 1. JWT_SECRET production requirement (min 32 characters, no dev default)
      if (data.JWT_SECRET === DEFAULT_DEV_JWT_SECRET || data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message:
            'Production JWT_SECRET must be explicitly set and be at least 32 characters long.',
        });
      }

      // 2. COOKIE_SECRET production requirement (min 32 characters, no dev default)
      if (data.COOKIE_SECRET === DEFAULT_DEV_COOKIE_SECRET || data.COOKIE_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECRET'],
          message:
            'Production COOKIE_SECRET must be explicitly set and be at least 32 characters long.',
        });
      }

      // 3. AI_SERVICE_TOKEN production requirement
      if (data.AI_SERVICE_TOKEN === DEFAULT_DEV_AI_TOKEN || data.AI_SERVICE_TOKEN.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AI_SERVICE_TOKEN'],
          message:
            'Production AI_SERVICE_TOKEN must be explicitly set and be at least 16 characters long.',
        });
      }

      // 4. CORS_ORIGIN production requirement: cannot be wildcard '*'
      if (data.CORS_ORIGIN.trim() === '*' || data.CORS_ORIGIN.includes('*')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGIN'],
          message: 'Wildcard CORS_ORIGIN is strictly forbidden in production.',
        });
      }

      // 5. DATABASE_URL production requirement
      if (data.DATABASE_URL === DEFAULT_DEV_DB_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'Production DATABASE_URL must not use default local development credentials.',
        });
      }
    }
  });

export const validateEnv = (rawEnv: Record<string, unknown>) => {
  return envSchema.safeParse(rawEnv);
};

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:');
    for (const issue of result.error.issues) {
      console.error(` - [${issue.path.join('.')}]: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
