import { z } from 'zod';

export const notificationDeliveryPayloadSchema = z.object({
  notificationId: z.string().uuid('Invalid notification ID'),
  userId: z.string().uuid('Invalid user ID'),
  organizationId: z.string().uuid('Invalid organization ID').optional().nullable(),
  projectId: z.string().uuid('Invalid project ID').optional().nullable(),
  channel: z.enum(['IN_APP', 'EMAIL', 'WEBHOOK']).optional(),
});

export type NotificationDeliveryPayloadInput = z.infer<typeof notificationDeliveryPayloadSchema>;

export const activityFanoutPayloadSchema = z.object({
  activityId: z.string().uuid('Invalid activity ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  projectId: z.string().uuid('Invalid project ID').optional().nullable(),
  taskId: z.string().uuid('Invalid task ID').optional().nullable(),
});

export type ActivityFanoutPayloadInput = z.infer<typeof activityFanoutPayloadSchema>;

export const jobSummaryQuerySchema = z.object({}).optional();
