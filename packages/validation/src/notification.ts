import { z } from 'zod';

export const updateNotificationPreferencesSchema = z
  .object({
    taskAssigned: z.boolean().optional(),
    comments: z.boolean().optional(),
    statusChanges: z.boolean().optional(),
    milestones: z.boolean().optional(),
    dependencies: z.boolean().optional(),
  })
  .strict();

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform(val => (typeof val === 'string' ? val === 'true' : Boolean(val))),
});

export const myWorkQuerySchema = z.object({
  filter: z
    .enum(['all', 'overdue', 'due_today', 'due_soon', 'blocked', 'in_progress', 'completed'])
    .default('all'),
  projectId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type MyWorkQueryInput = z.infer<typeof myWorkQuerySchema>;
