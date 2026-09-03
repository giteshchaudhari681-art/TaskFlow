import { z } from 'zod';

export const aiAnalysisParamsSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID format'),
  projectId: z.string().uuid('Invalid project ID format'),
});

export const aiAnalysisBodySchema = z.object({
  operation: z.enum(['PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT'], {
    errorMap: () => ({
      message: "Operation must be one of: 'PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT'",
    }),
  }),
  user_prompt: z
    .string()
    .trim()
    .max(2000, 'User prompt must not exceed 2000 characters')
    .optional(),
});

export const recommendationPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const recommendationCategorySchema = z.enum([
  'BLOCKER',
  'DELIVERY_RISK',
  'MILESTONE',
  'PRIORITY',
  'OWNERSHIP',
  'WORKLOAD',
  'PROCESS',
  'RISK_MITIGATION',
  'PLANNING',
  'QUALITY',
  'RESOURCE',
]);

export const aiRecommendationSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
  priority: recommendationPrioritySchema,
  category: recommendationCategorySchema,
});

export const aiAttentionAreaSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
  severity: recommendationPrioritySchema,
});

export const aiAnalysisResponseSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required'),
  operation: z.enum(['PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT']),
  summary: z.string().min(1, 'Summary cannot be empty'),
  recommendations: z.array(aiRecommendationSchema).default([]),
  attention_areas: z.array(aiAttentionAreaSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type AIAnalysisParamsInput = z.infer<typeof aiAnalysisParamsSchema>;
export type AIAnalysisBodyInput = z.infer<typeof aiAnalysisBodySchema>;
export type AIRecommendationInput = z.infer<typeof aiRecommendationSchema>;
export type AIAttentionAreaInput = z.infer<typeof aiAttentionAreaSchema>;
export type AIAnalysisResponseInput = z.infer<typeof aiAnalysisResponseSchema>;
