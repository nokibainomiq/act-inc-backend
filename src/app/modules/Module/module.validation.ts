import { z } from 'zod';

// ── Question Schemas by Type ──

const baseQuestionSchema = {
  feedback: z.string().optional(),
};

const mcqQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('MCQ'),
  content: z.string().min(1, 'Question content is required'),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  options: z.array(z.string()).min(4, 'MCQ must have at least 4 options').optional(),
  correctAnswer: z.string().optional(),
});

const swipeQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Swipe'),
  content: z.string().optional(),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  leftLabel: z.string().min(1, 'leftLabel is required'),
  rightLabel: z.string().min(1, 'rightLabel is required'),
  correctDirection: z.enum(['left', 'right']).optional(),
});

const orderingQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Ordering'),
  content: z.string().min(1, 'Question content is required'),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  items: z.array(z.string()).min(2, 'Ordering must have at least 2 items'),
});

// ── Chat Scenario: Branching Option Schema ──
const chatStepOptionSchema = z.object({
  optionId: z.string().min(1, 'optionId is required'),
  text: z.string().min(1, 'option text is required'),
  nextStepId: z.string().nullable().optional(),  // null = end of path
  feedback: z.string().optional(),
  isCorrect: z.boolean().optional().default(false),
});

// ── Chat Scenario: Conversation Step Schema ──
const chatStepSchema = z.object({
  stepId: z.string().min(1, 'stepId is required'),
  messages: z.array(
    z.object({
      sender: z.string().min(1, 'sender is required'),
      text: z.string().min(1, 'text is required'),
      isUser: z.boolean().optional().default(false),
    }),
  ).min(1, 'At least one message is required per step'),
  options: z.array(chatStepOptionSchema).optional().default([]),
});

const chatScenarioQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Chat Scenario'),
  content: z.string().optional(),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  // ── New Branching Chat Fields ──
  senderName: z.string().optional(),
  senderAvatar: z.string().optional(),
  initialStepId: z.string().optional(),
  chatSteps: z.array(chatStepSchema).optional(),
  // ── Legacy Fields (backward compat) ──
  messages: z
    .array(
      z.object({
        sender: z.string().min(1, 'sender is required'),
        text: z.string().min(1, 'text is required'),
      }),
    )
    .optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
});

const videoQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Video'),
  content: z.string().optional(),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  videoUrl: z.string().url('videoUrl must be a valid URL'),
});

const ratingQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Rating'),
  content: z.string().min(1, 'Question content is required'),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  scale: z.number().int().min(2).max(10, 'Scale must be between 2 and 10'),
});

const freeInputQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Free Input'),
  content: z.string().min(1, 'Question content is required'),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
});

const informationQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Information'),
  content: z.string().min(1, 'Question content is required'),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
});

const simulatedCallQuestionSchema = z.object({
  id: z.string(),
  type: z.literal('Simulated Call'),
  content: z.string().optional(),
  image: z.string().optional(),
  explanation: z.string().optional(),
  incorrectExplanation: z.string().optional(),
  isScored: z.boolean(),
  colorCode: z.string().optional(),
  ...baseQuestionSchema,
  callerName: z.string().min(1, 'Caller name is required'),
  callerPhoto: z.string().optional(),
  postCallVideoUrl: z.string().optional(),
  postCallMessage: z.string().optional(),
});

// ── Discriminated Union for all question types ──
const questionSchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  swipeQuestionSchema,
  orderingQuestionSchema,
  chatScenarioQuestionSchema,
  videoQuestionSchema,
  ratingQuestionSchema,
  freeInputQuestionSchema,
  informationQuestionSchema,
  simulatedCallQuestionSchema,
]);

// ── Create Module ──
const createModuleSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Module title is required'),
    description: z.string().min(1, 'Module description is required'),
    status: z.enum(['draft', 'published']).optional().default('draft'),
    teamId: z.string().optional(),
    companyId: z.string().optional(),
    questions: z
      .array(questionSchema)
      .optional()
      .default([]),
  }),
});

// ── Update Module ──
const updateModuleSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    status: z.enum(['draft', 'published']).optional(),
    teamId: z.string().optional(),
    companyId: z.string().optional(),
    questions: z.array(questionSchema).optional(),
  }),
});

// ── Duplicate Module ──
const duplicateModuleSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'New title is required for the duplicated module'),
  }),
});

// ── Assign Modules to Team (under Company) ──
const assignModuleSchema = z.object({
  body: z.object({
    moduleId: z.string().optional(),
    moduleIds: z.array(z.string()).optional(),
    companyId: z.string().min(1, 'companyId is required'),
    teamId: z.string().min(1, 'teamId is required'),
  }).refine((data) => data.moduleId || (data.moduleIds && data.moduleIds.length > 0), {
    message: 'Either moduleId or moduleIds is required',
  }),
});

// ── Get Modules by Team ──
const getModulesByTeamSchema = z.object({
  params: z.object({
    teamId: z.string().min(1, 'teamId is required'),
  }),
});

// ── Get Modules by Company ──
const getModulesByCompanySchema = z.object({
  params: z.object({
    companyId: z.string().min(1, 'companyId is required'),
  }),
});

export const ModuleValidation = {
  createModuleSchema,
  updateModuleSchema,
  duplicateModuleSchema,
  assignModuleSchema,
  getModulesByTeamSchema,
  getModulesByCompanySchema,
};
