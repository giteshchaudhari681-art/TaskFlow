import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(500),
  JWT_SECRET: z.string().min(16).default('development-jwt-secret-min-32-chars-for-taskflow-api'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().default(7),
  COOKIE_SECRET: z.string().min(16).default('development-cookie-secret-min-32-chars-taskflow'),
  DATABASE_URL: z
    .string()
    .min(1, { message: 'DATABASE_URL is required' })
    .default('postgresql://postgres:postgres@localhost:5432/taskflow_dev?schema=public'),
  AI_SERVICE_URL: z.string().url().default('http://127.0.0.1:8000'),
  AI_SERVICE_TOKEN: z.string().default('taskflow-internal-dev-token'),
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
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
