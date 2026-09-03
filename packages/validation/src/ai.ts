import { z } from 'zod';

export const aiAnalysisParamsSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID format'),
  projectId: z.string().uuid('Invalid project ID format'),
});

export const aiAnalysisBodySchema = z.object({
  operation: z.enum(['PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT', 'TASK_DECOMPOSITION'], {
    errorMap: () => ({
      message:
        "Operation must be one of: 'PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT', 'TASK_DECOMPOSITION'",
    }),
  }),
  taskId: z.string().uuid('Invalid task ID format').optional(),
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
  'DEPENDENCY',
  'DEADLINE',
  'UNBLOCK',
  'EXECUTION',
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

export const aiDependencyImpactSchema = z.object({
  has_blocking_dependencies: z.boolean().optional(),
  hasBlockingDependencies: z.boolean().optional(),
  description: z.string().default(''),
});

export const aiDecomposedSubtaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(1000).optional(),
  priority: recommendationPrioritySchema.optional(),
  order: z.number().int().min(1),
});

export const aiAnalysisResponseSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required'),
  operation: z.enum(['PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT', 'TASK_DECOMPOSITION']),
  summary: z.string().min(1, 'Summary cannot be empty'),
  recommendations: z.array(aiRecommendationSchema).default([]),
  attention_areas: z.array(aiAttentionAreaSchema).default([]),
  dependency_impact: aiDependencyImpactSchema.optional(),
  dependencyImpact: aiDependencyImpactSchema.optional(),
  subtasks: z.array(aiDecomposedSubtaskSchema).default([]),
  notes: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type AIAnalysisParamsInput = z.infer<typeof aiAnalysisParamsSchema>;
export type AIAnalysisBodyInput = z.infer<typeof aiAnalysisBodySchema>;
export type AIRecommendationInput = z.infer<typeof aiRecommendationSchema>;
export type AIAttentionAreaInput = z.infer<typeof aiAttentionAreaSchema>;
export type AIDependencyImpactInput = z.infer<typeof aiDependencyImpactSchema>;
export type AIDecomposedSubtaskInput = z.infer<typeof aiDecomposedSubtaskSchema>;
export type AIAnalysisResponseInput = z.infer<typeof aiAnalysisResponseSchema>;
