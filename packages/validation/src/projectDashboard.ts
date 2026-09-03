import { z } from 'zod';

export const projectDashboardParamsSchema = z.object({
  organizationId: z.string().uuid({ message: 'Invalid organization ID format' }),
  projectId: z.string().uuid({ message: 'Invalid project ID format' }),
});

export type ProjectDashboardParams = z.infer<typeof projectDashboardParamsSchema>;
