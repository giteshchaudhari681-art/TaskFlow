import { z } from 'zod';

export const updatePlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'BUSINESS']),
  subscriptionStatus: z.enum(['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED']).optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;

export const usageQuerySchema = z.object({}).optional();
