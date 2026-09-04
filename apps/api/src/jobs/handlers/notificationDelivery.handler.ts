import { Job } from '@prisma/client';
import { notificationDeliveryPayloadSchema } from '@taskflow/validation';
import { prisma } from '../../lib/prisma.js';
import { NonRetryableJobError, RetryableJobError } from '../errors.js';
import { JobType } from '@taskflow/shared';
import { jobRegistry } from './registry.js';

export async function handleNotificationDelivery(job: Job, rawPayload: unknown): Promise<void> {
  const parseResult = notificationDeliveryPayloadSchema.safeParse(rawPayload);
  if (!parseResult.success) {
    throw new NonRetryableJobError(
      `Invalid notification delivery payload: ${parseResult.error.message}`,
      'INVALID_PAYLOAD'
    );
  }

  const payload = parseResult.data;

  // Verify authoritative notification existence and tenant boundary
  const notification = await prisma.notification.findUnique({
    where: { id: payload.notificationId },
    include: { project: true },
  });

  if (!notification) {
    throw new NonRetryableJobError(
      `Notification ${payload.notificationId} not found in database`,
      'NOTIFICATION_NOT_FOUND'
    );
  }

  if (notification.userId !== payload.userId) {
    throw new NonRetryableJobError(
      `Notification ${payload.notificationId} user mismatch`,
      'TENANT_USER_MISMATCH'
    );
  }

  if (
    payload.organizationId &&
    notification.project &&
    notification.project.organizationId !== payload.organizationId
  ) {
    throw new NonRetryableJobError(
      `Notification project does not belong to organization ${payload.organizationId}`,
      'TENANT_ORGANIZATION_MISMATCH'
    );
  }

  try {
    // Record secondary delivery completion in notification metadata
    const existingMetadata = (notification.metadata as Record<string, unknown>) || {};
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        metadata: {
          ...existingMetadata,
          deliveredAt: new Date().toISOString(),
          deliveryChannel: payload.channel || 'IN_APP',
          jobId: job.id,
        },
      },
    });
  } catch (err: unknown) {
    if (err instanceof NonRetryableJobError) throw err;
    throw new RetryableJobError(
      `Failed to record notification delivery: ${err instanceof Error ? err.message : String(err)}`,
      'DELIVERY_DISPATCH_FAILED'
    );
  }
}

// Auto-register handler with registry
jobRegistry.register(JobType.NOTIFICATION_DELIVERY, handleNotificationDelivery);
