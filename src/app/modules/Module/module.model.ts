import { Schema, model } from 'mongoose';
import { IModule, TModuleModel } from './module.interface';

// ── Question Sub-document Schema (flexible for dynamic types) ──
const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'MCQ',
        'Swipe',
        'Ordering',
        'Chat Scenario',
        'Video',
        'Free Input',
        'Rating',
        'Information',
        'Simulated Call',
      ],
      required: true,
    },
    content: { type: String },
    image: { type: String },
    explanation: { type: String },
    // Shown instead of explanation when a graded answer is wrong.
    incorrectExplanation: { type: String },
    isScored: { type: Boolean, default: true },
    colorCode: { type: String },
    feedback: { type: String },

    // MCQ
    options: [{ type: String }],
    correctAnswer: { type: String },

    // Swipe
    leftLabel: { type: String },
    rightLabel: { type: String },
    correctDirection: { type: String, enum: ['left', 'right'] },

    // Ordering
    items: [{ type: String }],

    // Chat Scenario — Branching Conversation
    senderName: { type: String },       // name of the other person
    senderAvatar: { type: String },     // avatar/photo URL of the other person
    initialStepId: { type: String },    // which step to start from
    chatSteps: [
      {
        stepId: { type: String, required: true },
        messages: [
          {
            sender: { type: String },
            text: { type: String },
            isUser: { type: Boolean, default: false },
          },
        ],
        options: [
          {
            optionId: { type: String },
            text: { type: String },
            nextStepId: { type: String, default: null },  // branching
            feedback: { type: String },
            isCorrect: { type: Boolean, default: false },
          },
        ],
      },
    ],
    // Legacy Chat Scenario fields (backward compat)
    messages: [
      {
        sender: { type: String },
        text: { type: String },
      },
    ],

    // Video
    videoUrl: { type: String },

    // Rating
    scale: { type: Number },

    // Simulated Call
    callerName: { type: String },
    callerPhoto: { type: String },
    postCallVideoUrl: { type: String },
    postCallMessage: { type: String },
  },
  { _id: false },
);

// ── Module Schema ──
const moduleSchema = new Schema<IModule, TModuleModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    thumbnailImage: { type: String, default: '' },
    questions: { type: [questionSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      ref: 'Topic',
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Indexes for performance ──
moduleSchema.index({ title: 'text', description: 'text' });
moduleSchema.index({ status: 1 });
moduleSchema.index({ createdBy: 1 });
moduleSchema.index({ companyId: 1 });
moduleSchema.index({ isDeleted: 1 });

export const Module = model<IModule, TModuleModel>('Module', moduleSchema);
