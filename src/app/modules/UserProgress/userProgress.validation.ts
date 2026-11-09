import { z } from 'zod';

const submitAnswerSchema = z.object({
  body: z.object({
    moduleId: z.string().min(1, 'moduleId is required'),
    questionId: z.string().min(1, 'questionId is required'),
    answer: z.any(),
    // Reported by the app; capped so a tab left open doesn't skew the reports.
    timeSpentSeconds: z.number().min(0).max(3600).optional(),
    watchedPercent: z.number().min(0).max(100).optional(),
  }),
});

const completeModuleSchema = z.object({
  params: z.object({
    moduleId: z.string().min(1, 'moduleId is required'),
  }),
});

export const UserProgressValidation = {
  submitAnswerSchema,
  completeModuleSchema,
};
