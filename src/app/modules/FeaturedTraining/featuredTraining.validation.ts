import { z } from 'zod';

const createFeaturedTrainingZodSchema = z.object({
  body: z.object({
    moduleId: z.string({
      required_error: 'Module ID is required',
    }),
    customText: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateFeaturedTrainingZodSchema = z.object({
  body: z.object({
    moduleId: z.string().optional(),
    customText: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const FeaturedTrainingValidation = {
  createFeaturedTrainingZodSchema,
  updateFeaturedTrainingZodSchema,
};
