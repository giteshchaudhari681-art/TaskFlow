import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@taskflow/shared';

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: 'Task title must be at least 2 characters' })
    .max(200, { message: 'Task title cannot exceed 200 characters' }),
  description: z
    .string()
    .trim()
    .max(5000, { message: 'Description cannot exceed 5000 characters' })
    .nullable()
    .optional(),
  status: z
    .nativeEnum(TaskStatus, {
      errorMap: () => ({ message: 'Invalid task status' }),
    })
    .default(TaskStatus.TODO)
    .optional(),
  priority: z
    .nativeEnum(TaskPriority, {
      errorMap: () => ({ message: 'Invalid task priority' }),
    })
    .default(TaskPriority.MEDIUM)
    .optional(),
  assigneeId: z.string().uuid({ message: 'Invalid assignee ID' }).nullable().optional(),
  dueDate: z.string().datetime({ message: 'Invalid ISO due date format' }).nullable().optional(),
  estimateHours: z
    .number()
    .min(0, { message: 'Estimate hours cannot be negative' })
    .max(1000, { message: 'Estimate hours cannot exceed 1000' })
    .nullable()
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, { message: 'Task title must be at least 2 characters' })
      .max(200, { message: 'Task title cannot exceed 200 characters' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, { message: 'Description cannot exceed 5000 characters' })
      .nullable()
      .optional(),
    status: z
      .nativeEnum(TaskStatus, {
        errorMap: () => ({ message: 'Invalid task status' }),
      })
      .optional(),
    priority: z
      .nativeEnum(TaskPriority, {
        errorMap: () => ({ message: 'Invalid task priority' }),
      })
      .optional(),
    assigneeId: z.string().uuid({ message: 'Invalid assignee ID' }).nullable().optional(),
    dueDate: z.string().datetime({ message: 'Invalid ISO due date format' }).nullable().optional(),
    estimateHours: z
      .number()
      .min(0, { message: 'Estimate hours cannot be negative' })
      .max(1000, { message: 'Estimate hours cannot exceed 1000' })
      .nullable()
      .optional(),
    milestoneId: z.string().uuid({ message: 'Invalid milestone ID' }).nullable().optional(),
    source: z.enum(['USER', 'SYSTEM', 'AI', 'AI_ASSISTED']).optional(),
    expectedCurrentState: z
      .object({
        status: z.nativeEnum(TaskStatus).optional(),
        priority: z.nativeEnum(TaskPriority).optional(),
        dueDate: z
          .string()
          .datetime({ message: 'Invalid ISO due date format' })
          .nullable()
          .optional(),
        assigneeId: z.string().uuid({ message: 'Invalid assignee ID' }).nullable().optional(),
      })
      .optional(),
  })
  .refine(
    data =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.assigneeId !== undefined ||
      data.dueDate !== undefined ||
      data.estimateHours !== undefined ||
      data.milestoneId !== undefined,
    {
      message: 'At least one field must be provided for task update',
    }
  );

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus, {
    errorMap: () => ({ message: 'Invalid task status' }),
  }),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const createSubtaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Subtask title cannot be empty' })
    .max(200, { message: 'Subtask title cannot exceed 200 characters' }),
  assigneeId: z.string().uuid({ message: 'Invalid assignee ID' }).nullable().optional(),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

export const updateSubtaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Subtask title cannot be empty' })
      .max(200, { message: 'Subtask title cannot exceed 200 characters' })
      .optional(),
    isCompleted: z.boolean().optional(),
    assigneeId: z.string().uuid({ message: 'Invalid assignee ID' }).nullable().optional(),
  })
  .refine(
    data =>
      data.title !== undefined || data.isCompleted !== undefined || data.assigneeId !== undefined,
    {
      message: 'At least one field must be provided for subtask update',
    }
  );

export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
