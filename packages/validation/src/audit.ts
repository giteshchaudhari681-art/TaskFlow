import { z } from 'zod';
import { AuditAction } from '@taskflow/shared';

export const auditEventsQuerySchema = z.object({
  action: z.nativeEnum(AuditAction).optional(),
  actorUserId: z.string().uuid('Invalid actor user ID').optional(),
  resourceType: z.string().max(50, 'Resource type must be at most 50 characters').optional(),
  projectId: z.string().uuid('Invalid project ID').optional(),
  from: z
    .string()
    .datetime({ offset: true, message: 'Invalid from timestamp' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'))
    .optional(),
  to: z
    .string()
    .datetime({ offset: true, message: 'Invalid to timestamp' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'))
    .optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(25),
});

export type AuditEventsQueryInput = z.infer<typeof auditEventsQuerySchema>;
