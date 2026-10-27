import { z } from 'zod';

export const updateUserValidationSchema = z.object({
  data: z.string().transform((str) => JSON.parse(str)).pipe(
    z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
    })
  ),
});

export const UserValidations = {
  updateUserValidationSchema,
};