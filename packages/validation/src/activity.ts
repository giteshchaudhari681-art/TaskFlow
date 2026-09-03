import { z } from 'zod';

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  cursor: z.string().uuid().optional(),
  filterType: z.string().trim().optional(),
});

export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
