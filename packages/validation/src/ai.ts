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

export type AIAnalysisParamsInput = z.infer<typeof aiAnalysisParamsSchema>;
export type AIAnalysisBodyInput = z.infer<typeof aiAnalysisBodySchema>;
