import { z } from 'zod';

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Team name is required'),
    companyId: z.string().min(1, 'Company ID is required'),
    passcode: z.string().min(4, 'Passcode must be at least 4 characters').optional(),
  }),
});

const updateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    passcode: z.string().min(4).optional(),
  }),
});

export const TeamValidation = {
  createTeamSchema,
  updateTeamSchema,
};
