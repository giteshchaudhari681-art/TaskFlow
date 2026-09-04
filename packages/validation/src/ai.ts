import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@taskflow/shared';

export const aiAnalysisParamsSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID format'),
  projectId: z.string().uuid('Invalid project ID format'),
});

export const aiAnalysisBodySchema = z.object({
  operation: z.enum(
    ['PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT', 'TASK_DECOMPOSITION', 'TASK_ACTIONS'],
    {
      errorMap: () => ({
        message:
          "Operation must be one of: 'PROJECT_SUMMARY', 'TASK_SUMMARY', 'PROJECT_INSIGHT', 'TASK_DECOMPOSITION', 'TASK_ACTIONS'",
      }),
    }
  ),
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

export const aiTaskActionTypeSchema = z.enum([
  'UPDATE_STATUS',
  'UPDATE_PRIORITY',
  'UPDATE_DUE_DATE',
  'ASSIGN_TASK',
]);

export const aiActionConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const aiTaskActionExpectedStateSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
});

export const aiTaskActionProposalSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      const rawTarget = obj.target as Record<string, unknown> | undefined;
      return {
        ...obj,
        actionId: obj.actionId ?? obj.action_id,
        expectedCurrentState: obj.expectedCurrentState ?? obj.expected_current_state ?? {},
        target: rawTarget
          ? {
              taskId: rawTarget.taskId ?? rawTarget.task_id,
            }
          : obj.target,
      };
    }
    return val;
  },
  z.object({
    actionId: z.string().min(1, 'Action ID is required'),
    type: aiTaskActionTypeSchema,
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),
    reason: z
      .string()
      .min(1, 'Reason cannot be empty')
      .max(1000, 'Reason cannot exceed 1000 characters'),
    confidence: aiActionConfidenceSchema.default('HIGH'),
    target: z.object({
      taskId: z.string().uuid('Invalid target task ID format'),
    }),
    expectedCurrentState: aiTaskActionExpectedStateSchema.default({}),
    parameters: z.record(z.unknown()),
  })
);

export const aiAnalysisResponseSchema = z.object({
  request_id: z.string().min(1, 'Request ID is required'),
  operation: z.enum([
    'PROJECT_SUMMARY',
    'TASK_SUMMARY',
    'PROJECT_INSIGHT',
    'TASK_DECOMPOSITION',
    'TASK_ACTIONS',
  ]),
  summary: z.string().min(1, 'Summary cannot be empty'),
  recommendations: z.array(aiRecommendationSchema).default([]),
  attention_areas: z.array(aiAttentionAreaSchema).default([]),
  dependency_impact: aiDependencyImpactSchema.optional(),
  dependencyImpact: aiDependencyImpactSchema.optional(),
  subtasks: z.array(aiDecomposedSubtaskSchema).default([]),
  actions: z.array(aiTaskActionProposalSchema).max(5).default([]),
  notes: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export type AIAnalysisParamsInput = z.infer<typeof aiAnalysisParamsSchema>;
export type AIAnalysisBodyInput = z.infer<typeof aiAnalysisBodySchema>;
export type AIRecommendationInput = z.infer<typeof aiRecommendationSchema>;
export type AIAttentionAreaInput = z.infer<typeof aiAttentionAreaSchema>;
export type AIDependencyImpactInput = z.infer<typeof aiDependencyImpactSchema>;
export type AIDecomposedSubtaskInput = z.infer<typeof aiDecomposedSubtaskSchema>;
export type AITaskActionProposalInput = z.infer<typeof aiTaskActionProposalSchema>;
export type AIAnalysisResponseInput = z.infer<typeof aiAnalysisResponseSchema>;
