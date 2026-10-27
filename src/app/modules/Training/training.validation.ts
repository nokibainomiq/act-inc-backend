import { z } from 'zod';

// ── Create Training ──
const createTrainingSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    status: z.enum(['draft', 'published']).optional().default('draft'),
    companyId: z.string().optional(),
    teamId: z.string().optional(),
    authType: z.enum(['passcode', 'email', 'employeeId', 'guest']).optional(),
    passcode: z.string().optional(),
  }),
});

// ── Update Training ──
const updateTrainingSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    status: z.enum(['draft', 'published']).optional(),
    companyId: z.string().optional(),
    teamId: z.string().optional(),
    authType: z.enum(['passcode', 'email', 'employeeId', 'guest']).optional(),
    passcode: z.string().optional(),
  }),
});

// ── Assign Training to Company ──
const assignTrainingSchema = z.object({
  body: z.object({
    companyId: z.string().min(1, 'companyId is required'),
    teamId: z.string().optional(),
  }),
});

// ── Add Topic to Training ──
const addTopicSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Topic title is required'),
    description: z.string().optional(),
    order: z.number().optional(),
  }),
});

// ── Duplicate Training ──
const duplicateTrainingSchema = z.object({
  body: z.object({
    newTitle: z.string().min(1, 'New title is required'),
  }),
});

// ── Update Topic ──
const updateTopicSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    order: z.number().optional(),
  }),
});

const addModuleToTopicSchema = z.object({
  body: z.object({
    moduleIds: z.array(z.string()).min(1, 'moduleIds array is required and cannot be empty'),
  }),
});

// ── Reorder Topics ──
const reorderTopicsSchema = z.object({
  body: z.object({
    topicIds: z.array(z.string()).min(1, 'topicIds array is required'),
  }),
});

export const TrainingValidation = {
  createTrainingSchema,
  updateTrainingSchema,
  assignTrainingSchema,
  duplicateTrainingSchema,
  addTopicSchema,
  updateTopicSchema,
  addModuleToTopicSchema,
  reorderTopicsSchema,
};
