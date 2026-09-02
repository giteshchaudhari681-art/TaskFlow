import { z } from 'zod';
import { DependencyType } from '@taskflow/shared';

export const createDependencySchema = z.object({
  targetTaskId: z
    .string({ required_error: 'targetTaskId is required' })
    .uuid({ message: 'targetTaskId must be a valid UUID' }),
  type: z
    .nativeEnum(DependencyType, {
      errorMap: () => ({
        message: 'Invalid dependency type. Allowed types: BLOCKS, BLOCKED_BY, RELATES_TO',
      }),
    })
    .default(DependencyType.BLOCKS),
});

export type CreateDependencyInput = z.infer<typeof createDependencySchema>;
