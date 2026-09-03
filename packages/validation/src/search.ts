import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z
    .string({ required_error: 'Search query is required' })
    .trim()
    .min(2, 'Search query must be at least 2 characters long')
    .max(100, 'Search query cannot exceed 100 characters'),
  type: z.enum(['all', 'project', 'task', 'milestone', 'user', 'label']).optional().default('all'),
  projectId: z.string().uuid('Invalid project ID format').optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
