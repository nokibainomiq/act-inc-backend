import { z } from 'zod';

export const AdminValidation = {
  createAdminSchema: z.object({
    body: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      password: z.string().min(8),
      // role intentionally omitted — always defaults to 'admin'; superAdmin is auto-created
    }),
  }),

  loginSchema: z.object({
    body: z.object({
      identifier: z.string(), // email or phone
      password: z.string(),
      }),
  }),

  updateProfileSchema: z.object({
    body: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
    }),
  }),

  changePasswordSchema: z.object({
    body: z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }),
  }),

  forgotPasswordSchema: z.object({
    body: z.object({
      identifier: z.string(), // email or phone
    }),
  }),

  resetPasswordSchema: z.object({
    body: z.object({
      identifier: z.string(),
      otp: z.string().length(6),
      newPassword: z.string().min(8),
    }),
  }),
};