import { z } from 'zod';
import { LABEL_COLORS } from '@taskflow/shared';

export const createLabelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Label name cannot be empty' })
    .max(50, { message: 'Label name cannot exceed 50 characters' }),
  color: z
    .enum(LABEL_COLORS, {
      errorMap: () => ({ message: 'Invalid label color token' }),
    })
    .default('cyan'),
  description: z
    .string()
    .trim()
    .max(200, { message: 'Description cannot exceed 200 characters' })
    .nullable()
    .optional(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Label name cannot be empty' })
      .max(50, { message: 'Label name cannot exceed 50 characters' })
      .optional(),
    color: z
      .enum(LABEL_COLORS, {
        errorMap: () => ({ message: 'Invalid label color token' }),
      })
      .optional(),
    description: z
      .string()
      .trim()
      .max(200, { message: 'Description cannot exceed 200 characters' })
      .nullable()
      .optional(),
  })
  .refine(
    data => data.name !== undefined || data.color !== undefined || data.description !== undefined,
    {
      message: 'At least one field must be provided for label update',
    }
  );

export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;

export const assignTaskLabelSchema = z.object({
  labelId: z.string().uuid({ message: 'Invalid label ID format' }),
});

export type AssignTaskLabelInput = z.infer<typeof assignTaskLabelSchema>;
