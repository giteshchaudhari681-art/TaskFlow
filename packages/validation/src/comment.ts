import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string({ required_error: 'Comment content is required' })
    .trim()
    .min(1, { message: 'Comment content cannot be empty' })
    .max(5000, { message: 'Comment content must not exceed 5000 characters' }),
});

export const updateCommentSchema = z.object({
  content: z
    .string({ required_error: 'Comment content is required' })
    .trim()
    .min(1, { message: 'Comment content cannot be empty' })
    .max(5000, { message: 'Comment content must not exceed 5000 characters' }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
