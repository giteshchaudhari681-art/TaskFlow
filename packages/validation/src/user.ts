import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(100, { message: 'Name cannot exceed 100 characters' })
      .optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(500, { message: 'Avatar URL cannot exceed 500 characters' })
      .nullable()
      .optional(),
  })
  .refine(data => data.name !== undefined || data.avatarUrl !== undefined, {
    message: 'At least one field (name or avatarUrl) must be provided for update',
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: z
    .string()
    .min(8, { message: 'New password must be at least 8 characters' })
    .max(100, { message: 'New password cannot exceed 100 characters' })
    .regex(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'New password must contain at least one number' }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
