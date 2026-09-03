import { z } from 'zod';
import { MilestoneStatus } from '@taskflow/shared';

const dateOnlyString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'Invalid date format' })
  .optional()
  .nullable();

export const createMilestoneSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Milestone title cannot be empty' })
      .max(200, { message: 'Milestone title cannot exceed 200 characters' }),
    description: z
      .string()
      .trim()
      .max(5000, { message: 'Description cannot exceed 5000 characters' })
      .nullable()
      .optional(),
    startDate: dateOnlyString,
    dueDate: dateOnlyString,
    status: z
      .nativeEnum(MilestoneStatus, { errorMap: () => ({ message: 'Invalid milestone status' }) })
      .optional(),
    displayOrder: z
      .number()
      .int({ message: 'Display order must be an integer' })
      .min(0)
      .optional(),
  })
  .refine(
    data => {
      if (data.startDate && data.dueDate) {
        return new Date(data.startDate) <= new Date(data.dueDate);
      }
      return true;
    },
    { message: 'startDate must be on or before dueDate', path: ['startDate'] }
  );

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Milestone title cannot be empty' })
      .max(200, { message: 'Milestone title cannot exceed 200 characters' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, { message: 'Description cannot exceed 5000 characters' })
      .nullable()
      .optional(),
    startDate: dateOnlyString,
    dueDate: dateOnlyString,
    status: z
      .nativeEnum(MilestoneStatus, { errorMap: () => ({ message: 'Invalid milestone status' }) })
      .optional(),
    displayOrder: z
      .number()
      .int({ message: 'Display order must be an integer' })
      .min(0)
      .optional(),
  })
  .refine(
    data =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.startDate !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.displayOrder !== undefined,
    { message: 'At least one field must be provided for milestone update' }
  )
  .refine(
    data => {
      if (data.startDate && data.dueDate) {
        return new Date(data.startDate) <= new Date(data.dueDate);
      }
      return true;
    },
    { message: 'startDate must be on or before dueDate', path: ['startDate'] }
  );

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
