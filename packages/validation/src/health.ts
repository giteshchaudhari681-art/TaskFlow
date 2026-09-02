import { z } from 'zod';

export const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number().nonnegative(),
});

export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
