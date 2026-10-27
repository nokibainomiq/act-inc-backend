import { z } from 'zod';

const submitAnswerSchema = z.object({
  body: z.object({
    moduleId: z.string().min(1, 'moduleId is required'),
    questionId: z.string().min(1, 'questionId is required'),
    answer: z.any(),
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
