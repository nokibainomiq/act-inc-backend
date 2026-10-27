import { Schema, model } from 'mongoose';
import { ITopic, ITraining, TTopicModel, TTrainingModel } from './training.interface';

// ── Topic Schema ──
const topicSchema = new Schema<ITopic, TTopicModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    trainingId: { type: Schema.Types.ObjectId, ref: 'Training', required: true },
    moduleIds: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    order: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

topicSchema.index({ trainingId: 1 });
topicSchema.index({ isDeleted: 1 });

// ── Training Schema ──
const trainingSchema = new Schema<ITraining, TTrainingModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    thumbnailImage: { type: String, default: '' },
    companyId: { type: Schema.Types.ObjectId, ref: 'User' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' },
    authType: {
      type: String,
      enum: ['passcode', 'email', 'employeeId', 'guest'],
      default: 'guest',
    },
    passcode: { type: String },
    qrCodeUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true },
);

trainingSchema.index({ status: 1 });
trainingSchema.index({ companyId: 1 });
trainingSchema.index({ isDeleted: 1 });
trainingSchema.index({ title: 'text', description: 'text' });

export const Training = model<ITraining, TTrainingModel>('Training', trainingSchema);
export const Topic = model<ITopic, TTopicModel>('Topic', topicSchema);
