import { z } from 'zod';
import { ProjectRole, ProjectStatus } from '@taskflow/shared';

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Project name must be at least 2 characters' })
    .max(80, { message: 'Project name cannot exceed 80 characters' }),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, {
      message:
        'Project key must be 2 to 10 uppercase alphanumeric characters (e.g. TASK, CRM, AI01)',
    }),
  description: z
    .string()
    .trim()
    .max(500, { message: 'Description cannot exceed 500 characters' })
    .nullable()
    .optional(),
  status: z
    .nativeEnum(ProjectStatus, {
      errorMap: () => ({ message: 'Invalid project status' }),
    })
    .default(ProjectStatus.PLANNING)
    .optional(),
  color: z
    .string()
    .trim()
    .max(30, { message: 'Color code cannot exceed 30 characters' })
    .nullable()
    .optional(),
  icon: z
    .string()
    .trim()
    .max(50, { message: 'Icon identifier cannot exceed 50 characters' })
    .nullable()
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Project name must be at least 2 characters' })
      .max(80, { message: 'Project name cannot exceed 80 characters' })
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, { message: 'Description cannot exceed 500 characters' })
      .nullable()
      .optional(),
    status: z
      .nativeEnum(ProjectStatus, {
        errorMap: () => ({ message: 'Invalid project status' }),
      })
      .optional(),
    color: z
      .string()
      .trim()
      .max(30, { message: 'Color code cannot exceed 30 characters' })
      .nullable()
      .optional(),
    icon: z
      .string()
      .trim()
      .max(50, { message: 'Icon identifier cannot exceed 50 characters' })
      .nullable()
      .optional(),
  })
  .refine(
    data =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.color !== undefined ||
      data.icon !== undefined,
    {
      message: 'At least one field must be provided for project update',
    }
  );

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  role: z
    .nativeEnum(ProjectRole, {
      errorMap: () => ({ message: 'Invalid project role' }),
    })
    .default(ProjectRole.MEMBER)
    .optional(),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

export const updateProjectMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole, {
    errorMap: () => ({ message: 'Invalid project role' }),
  }),
});

export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;
