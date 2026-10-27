import { z } from 'zod';

const translateScreenValidationSchema = z.object({
  body: z.object({
    targetLang: z.string({
      required_error: 'targetLang is required',
    }),
    sourceLang: z.string().optional(),
    screen: z.string().optional(),
    texts: z.array(z.string()).optional(),
    content: z.record(z.string()).optional(),
  }),
});

export const TranslationValidations = {
  translateScreenValidationSchema,
};
