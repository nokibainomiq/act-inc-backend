import { z } from 'zod';

const broadcastToCompaniesSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    message: z.string().min(1, 'Message is required'),
    targetType: z.enum(['global', 'targeted'], {
      required_error: 'targetType is required',
    }),
    companyId: z.string().optional(),
  }),
});

export const NotificationValidation = {
  broadcastToCompaniesSchema,
};
