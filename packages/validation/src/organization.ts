import { z } from 'zod';
import { UserRole } from '@taskflow/shared';

export const updateOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Workspace name must be at least 2 characters' })
      .max(100, { message: 'Workspace name cannot exceed 100 characters' })
      .optional(),
    logoUrl: z
      .string()
      .trim()
      .max(500, { message: 'Logo URL cannot exceed 500 characters' })
      .nullable()
      .optional(),
  })
  .refine(data => data.name !== undefined || data.logoUrl !== undefined, {
    message: 'At least one field (name or logoUrl) must be provided for update',
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email address' }),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid role value' }),
  }),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Invalid role value' }),
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
